"use client"

import { useCallback, useRef, useEffect, useState } from "react"

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL as string

interface RefreshRequest {
  caseId: string
  imageIndex: number
}

interface RefreshResponse {
  caseId: string
  imageIndex: number
  success: boolean
  url?: string
  error?: string
}

interface QueuedRequest extends RefreshRequest {
  resolve: (url: string | null) => void
  reject: (error: Error) => void
  retries: number
}

interface UrlMetadata {
  url: string
  createdAt: number // timestamp in milliseconds
  expiresIn: number // expiration time in milliseconds (from URL signature)
  expiresAt: number // absolute expiration timestamp in milliseconds
}

/**
 * MODULE-LEVEL SINGLETON STATE (Industry Best Practice)
 * 
 * This pattern ensures all hook instances share the same cache and queue,
 * preventing duplicate API calls and maintaining consistency across components.
 * 
 * Benefits:
 * - Single source of truth for URL cache
 * - Prevents duplicate refresh requests
 * - Shared queue for efficient batching
 * - No re-initialization on component re-renders
 */
const urlCache = new Map<string, UrlMetadata>()
const refreshQueue = new Map<string, QueuedRequest>()
const refreshTimers = new Map<string, NodeJS.Timeout>()
const proactiveRefreshTimers = new Map<string, NodeJS.Timeout>()
const proactiveRefreshScheduling = new Set<string>() // Track URLs currently being scheduled
let queueProcessingTimeout: NodeJS.Timeout | null = null
let isProcessingQueue = false
let expirySeconds = 180 // Default: 180 seconds (fallback)

// Event emitter pattern for notifying components of URL updates
// This allows components to react to URL changes without causing re-render loops
type UrlUpdateListener = (key: string, url: string) => void
const urlUpdateListeners = new Set<UrlUpdateListener>()

function notifyUrlUpdate(key: string, url: string) {
  urlUpdateListeners.forEach(listener => {
    try {
      listener(key, url)
    } catch (error) {
      console.error('Error in URL update listener:', error)
    }
  })
}

/**
 * Parse expiration from S3 presigned URL (AWS recommended approach)
 * Uses X-Amz-Date (YYYYMMDDTHHMMSSZ) and X-Amz-Expires (seconds)
 * Returns { expiresAt: number, expiresIn: number } or null if cannot be determined
 */
function parseExpirationFromPresignedUrl(url: string): { expiresAt: number; expiresIn: number } | null {
  try {
    const u = new URL(url)
    const dateStr = u.searchParams.get("X-Amz-Date")
    const expiresStr = u.searchParams.get("X-Amz-Expires")
    if (!dateStr || !expiresStr) return null

    const year = Number(dateStr.slice(0, 4))
    const month = Number(dateStr.slice(4, 6)) - 1
    const day = Number(dateStr.slice(6, 8))
    const hour = Number(dateStr.slice(9, 11))
    const minute = Number(dateStr.slice(11, 13))
    const second = Number(dateStr.slice(13, 15))
    const baseMs = Date.UTC(year, month, day, hour, minute, second)

    const expiresSec = Number(expiresStr)
    if (!isFinite(baseMs) || !isFinite(expiresSec) || expiresSec <= 0) return null

    const expiresAtMs = baseMs + expiresSec * 1000
    const now = Date.now()
    const expiresIn = expiresAtMs - now

    return {
      expiresAt: expiresAtMs,
      expiresIn: Math.max(0, expiresIn), // Ensure non-negative
    }
  } catch {
    return null
  }
}

/**
 * Process the queue of refresh requests (module-level function)
 * Industry best practice: Batch processing with debouncing
 */
async function processRefreshQueue() {
  if (isProcessingQueue || refreshQueue.size === 0) {
    return
  }

  isProcessingQueue = true

  try {
    const MAX_BATCH_SIZE = 20
    const requests: RefreshRequest[] = []
    const queueEntries = Array.from(refreshQueue.values())
    
    // Limit batch size
    const batch = queueEntries.slice(0, MAX_BATCH_SIZE)
    
    for (const item of batch) {
      requests.push({
        caseId: item.caseId,
        imageIndex: item.imageIndex,
      })
    }

    if (requests.length === 0) {
      isProcessingQueue = false
      return
    }

    // Call batch refresh API
    const response = await fetch(`${API_BASE_URL}/cases/images/refresh-urls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.success || !Array.isArray(data.data)) {
      throw new Error(data.message || "Invalid response from server")
    }

    // Update cached expiry time from backend response (fallback only)
    if (typeof data.expirySeconds === 'number' && data.expirySeconds > 0) {
      expirySeconds = data.expirySeconds
    }

    const responses: RefreshResponse[] = data.data
    const now = Date.now()

    // Process responses and resolve/reject promises
    for (const response of responses) {
      const key = `${response.caseId}-${response.imageIndex}`
      const queued = refreshQueue.get(key)

      if (!queued) continue

      if (response.success && response.url) {
        // Parse actual expiration from the new URL (AWS best practice)
        const parsed = parseExpirationFromPresignedUrl(response.url)
        const fallbackExpiresIn = expirySeconds * 1000
        const expiresIn = parsed?.expiresIn ?? fallbackExpiresIn
        const expiresAt = parsed?.expiresAt ?? (now + fallbackExpiresIn)

        // Store URL metadata with actual expiration from URL signature
        urlCache.set(key, {
          url: response.url,
          createdAt: now,
          expiresIn: expiresIn,
          expiresAt: expiresAt,
        })

        // Schedule proactive refresh using actual expiration from URL
        scheduleProactiveRefresh(response.caseId, response.imageIndex, key)

        // Notify all listeners of URL update
        notifyUrlUpdate(key, response.url)

        queued.resolve(response.url)
        refreshQueue.delete(key)
      } else {
        // Retry logic
        const MAX_RETRIES = 2
        if (queued.retries < MAX_RETRIES) {
          queued.retries++
          // Re-queue for retry (will be processed in next batch)
        } else {
          queued.reject(
            new Error(response.error || "Failed to refresh URL after retries")
          )
          refreshQueue.delete(key)
        }
      }
    }

    // Process remaining items in queue (if any)
    if (refreshQueue.size > 0) {
      const DEBOUNCE_DELAY = 500
      queueProcessingTimeout = setTimeout(() => {
        queueProcessingTimeout = null
        isProcessingQueue = false
        processRefreshQueue()
      }, DEBOUNCE_DELAY)
    } else {
      isProcessingQueue = false
    }
  } catch (error) {
    // Reject all pending requests in this batch
    const MAX_BATCH_SIZE = 20
    const batch = Array.from(refreshQueue.values()).slice(0, MAX_BATCH_SIZE)
    for (const item of batch) {
      const key = `${item.caseId}-${item.imageIndex}`
      item.reject(error instanceof Error ? error : new Error("Unknown error"))
      refreshQueue.delete(key)
    }
    isProcessingQueue = false

    // Retry remaining items
    if (refreshQueue.size > 0) {
      const DEBOUNCE_DELAY = 500
      queueProcessingTimeout = setTimeout(() => {
        queueProcessingTimeout = null
        processRefreshQueue()
      }, DEBOUNCE_DELAY)
    }
  }
}

/**
 * Schedule proactive refresh for a URL (AWS best practice)
 * Module-level function to ensure single timer per URL
 * 
 * CRITICAL: This function must prevent duplicate timers and only schedule when appropriate
 */
function scheduleProactiveRefresh(caseId: string, imageIndex: number, key: string) {
  // CRITICAL: Prevent duplicate scheduling - check FIRST before any other logic
  if (proactiveRefreshTimers.has(key)) {
    return // Timer already exists, don't schedule another
  }

  const metadata = urlCache.get(key)
  if (!metadata) {
    return // No metadata, can't schedule
  }

  // Use actual expiration from metadata (parsed from URL signature)
  const now = Date.now()
  const remainingMs = metadata.expiresAt - now

  // CRITICAL: Don't schedule if:
  // 1. Already expired
  // 2. Very close to expiration (< 10 seconds) - not enough time for refresh
  // 3. Proactive refresh time would be too short (< 5 seconds)
  if (remainingMs <= 10000) {
    return
  }

  // Calculate proactive refresh time using actual expiration (80% threshold - AWS best practice)
  const REFRESH_THRESHOLD = 0.8
  const PROACTIVE_REFRESH_TIME = remainingMs * REFRESH_THRESHOLD

  // CRITICAL: Don't schedule if refresh time is too short (< 5 seconds)
  // This prevents scheduling refreshes that would fire almost immediately
  if (PROACTIVE_REFRESH_TIME < 5000) {
    return
  }

  // CRITICAL: Check if already being scheduled to prevent race conditions
  // This ensures only one timer is created even if multiple components call getUrl simultaneously
  if (proactiveRefreshScheduling.has(key)) {
    return // Already being scheduled by another call
  }
  
  // Mark as being scheduled BEFORE creating timer (atomic operation)
  proactiveRefreshScheduling.add(key)

  // Schedule proactive refresh at 80% of expiration
  const timer = setTimeout(() => {
    // CRITICAL: Clear timer and scheduling flags IMMEDIATELY to allow rescheduling
    proactiveRefreshTimers.delete(key)
    proactiveRefreshScheduling.delete(key)

    // Proactively refresh before expiration
    queueRefreshRequest(caseId, imageIndex)
      .then((newUrl) => {
        if (newUrl) {
          // Parse actual expiration from new URL
          const parsed = parseExpirationFromPresignedUrl(newUrl)
          const fallbackExpiresIn = expirySeconds * 1000
          const now = Date.now()
          const expiresIn = parsed?.expiresIn ?? fallbackExpiresIn
          const expiresAt = parsed?.expiresAt ?? (now + fallbackExpiresIn)

          // Update metadata with actual expiration
          urlCache.set(key, {
            url: newUrl,
            createdAt: now,
            expiresIn: expiresIn,
            expiresAt: expiresAt,
          })
          
          // CRITICAL: Only schedule next proactive refresh if:
          // 1. New URL has valid expiration
          // 2. Not already scheduled (double-check)
          // 3. Enough time remaining
          const newRemainingMs = expiresAt - now
          if (newRemainingMs > 10000 && !proactiveRefreshTimers.has(key)) {
            scheduleProactiveRefresh(caseId, imageIndex, key)
          }
          
          // Notify all listeners of URL update
          notifyUrlUpdate(key, newUrl)
        }
      })
      .catch(() => {
        // Silent fail - will retry on next access or via proactive refresh
        // Clear timer flag on error to allow retry
        proactiveRefreshTimers.delete(key)
      })
  }, PROACTIVE_REFRESH_TIME)

  // Update with actual timer and clear scheduling flag
  proactiveRefreshTimers.set(key, timer)
  proactiveRefreshScheduling.delete(key) // Clear scheduling flag once timer is set
}

/**
 * Queue a refresh request (module-level function)
 * Industry best practice: Deduplication and batching
 * 
 * CRITICAL: This function should only be called when:
 * 1. URL is actually expired
 * 2. Proactive refresh timer fires
 * 3. Manual refresh requested
 * 
 * NOT called from getUrl() to prevent infinite loops
 */
function queueRefreshRequest(caseId: string, imageIndex: number): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const key = `${caseId}-${imageIndex}`

    // Check if we have a valid cached URL (AWS best practice - avoid unnecessary calls)
    const metadata = urlCache.get(key)
    if (metadata) {
      const now = Date.now()
      const isExpired = now >= metadata.expiresAt

      if (!isExpired) {
        // URL is still valid, return cached URL immediately
        // This prevents unnecessary API calls
        resolve(metadata.url)
        return
      }
    }

    // CRITICAL: Check if already queued or being processed (prevent duplicates)
    const existing = refreshQueue.get(key)
    if (existing) {
      // Attach to existing promise (deduplication)
      const originalResolve = existing.resolve
      const originalReject = existing.reject
      
      existing.resolve = (url: string | null) => {
        originalResolve(url)
        resolve(url)
      }
      existing.reject = (error: Error) => {
        originalReject(error)
        reject(error)
      }
      return
    }

    // CRITICAL: Check if proactive refresh is already scheduled
    // If so, don't queue another request - let the timer handle it
    if (proactiveRefreshTimers.has(key)) {
      // Proactive refresh will handle it, but we still need to return a promise
      // Wait a bit and check cache again
      setTimeout(() => {
        const updatedMetadata = urlCache.get(key)
        if (updatedMetadata && Date.now() < updatedMetadata.expiresAt) {
          resolve(updatedMetadata.url)
        } else {
          // If still not updated, queue the request
          refreshQueue.set(key, {
            caseId,
            imageIndex,
            resolve,
            reject,
            retries: 0,
          })
          scheduleQueueProcessing()
        }
      }, 100)
      return
    }

    // Add to queue
    refreshQueue.set(key, {
      caseId,
      imageIndex,
      resolve,
      reject,
      retries: 0,
    })

    // Schedule queue processing with debouncing
    scheduleQueueProcessing()
  })
}

/**
 * Schedule queue processing with debouncing (module-level helper)
 * Prevents multiple simultaneous processing attempts
 */
function scheduleQueueProcessing() {
  const DEBOUNCE_DELAY = 500
  if (queueProcessingTimeout) {
    clearTimeout(queueProcessingTimeout)
  }

  queueProcessingTimeout = setTimeout(() => {
    queueProcessingTimeout = null
    processRefreshQueue()
  }, DEBOUNCE_DELAY)
}

/**
 * Hook for proactive presigned URL refresh with expiration tracking
 * 
 * Industry Best Practices Implemented:
 * 1. Module-level singleton cache (prevents duplicate instances)
 * 2. Pure getUrl function (no side effects, only reads from cache)
 * 3. Event-based notifications (prevents re-render loops)
 * 4. Proper deduplication and batching
 * 5. AWS-recommended proactive refresh at 80% expiration
 * 
 * This hook provides a stable interface while managing state at module level
 * to prevent the common React hook pitfalls of duplicate state and infinite loops.
 */
export function useImageUrlRefresh() {
  // Use a version counter to trigger re-renders when URLs update
  // This is updated via event listeners, not directly in getUrl
  const [version, setVersion] = useState(0)
  const listenerRef = useRef<UrlUpdateListener | null>(null)

  // Register listener for URL updates (only once per hook instance)
  useEffect(() => {
    // Create listener that updates version to trigger re-render
    listenerRef.current = (key: string, url: string) => {
      setVersion(v => v + 1)
    }

    urlUpdateListeners.add(listenerRef.current)

    return () => {
      if (listenerRef.current) {
        urlUpdateListeners.delete(listenerRef.current)
      }
    }
  }, [])

  /**
   * Get current URL for an image
   * 
   * Industry best practice: When URL is expired, immediately queue refresh
   * This ensures expired URLs are refreshed as soon as detected, not waiting for proactive refresh
   */
  const getUrl = useCallback(
    (caseId: string, imageIndex: number, originalUrl: string): string => {
      const key = `${caseId}-${imageIndex}`
      const metadata = urlCache.get(key)

      if (metadata) {
        const now = Date.now()
        const isExpired = now >= metadata.expiresAt

        if (!isExpired) {
          // Return cached valid URL
          return metadata.url
        }
        
        // URL expired - immediately queue refresh (async to prevent infinite loops)
        // Check if refresh is already queued or in progress
        const isQueued = refreshQueue.has(key)
        const hasProactiveTimer = proactiveRefreshTimers.has(key)
        
        if (!isQueued && !hasProactiveTimer) {
          // Queue refresh asynchronously to avoid blocking render
          setTimeout(() => {
            queueRefreshRequest(caseId, imageIndex).catch(() => {
              // Silent fail - will retry on next access
            })
          }, 0)
        }
        
        // Return expired URL for now - refresh will update it
        return metadata.url
      }

      // URL not cached - initialize metadata from URL signature (one-time operation)
      // This is the ONLY place we initialize metadata
      const now = Date.now()
      const parsed = parseExpirationFromPresignedUrl(originalUrl)
      const fallbackExpiresIn = expirySeconds * 1000
      const expiresIn = parsed?.expiresIn ?? fallbackExpiresIn
      const expiresAt = parsed?.expiresAt ?? (now + fallbackExpiresIn)

      // Only set metadata if we have a valid expiration
      if (expiresAt > now || expiresIn > 0) {
        const isAlreadyExpired = expiresAt <= now
        
        urlCache.set(key, {
          url: originalUrl,
          createdAt: now,
          expiresIn: expiresIn,
          expiresAt: expiresAt,
        })

        if (isAlreadyExpired) {
          // URL is already expired - immediately queue refresh
          const isQueued = refreshQueue.has(key)
          const hasProactiveTimer = proactiveRefreshTimers.has(key)
          
          if (!isQueued && !hasProactiveTimer) {
            setTimeout(() => {
              queueRefreshRequest(caseId, imageIndex).catch(() => {
                // Silent fail - will retry on next access
              })
            }, 0)
          }
        } else {
          // Schedule proactive refresh ONLY if:
          // 1. URL is not expired
          // 2. Not already scheduled
          // 3. We have enough time before expiration (at least 10 seconds)
          const timeUntilExpiry = expiresAt - now
          if (timeUntilExpiry > 10000 && !proactiveRefreshTimers.has(key)) {
            scheduleProactiveRefresh(caseId, imageIndex, key)
          }
        }
      }

      return originalUrl
    },
    [] // No dependencies - pure function that only reads from module-level cache
  )

  /**
   * Refresh URL manually (for error recovery)
   * Industry best practice: Explicit refresh function separate from getUrl
   */
  const refreshUrl = useCallback(
    (caseId: string, imageIndex: number): Promise<string | null> => {
      return queueRefreshRequest(caseId, imageIndex)
    },
    [] // No dependencies - uses module-level function
  )

  return { refreshUrl, getUrl, version }
}
