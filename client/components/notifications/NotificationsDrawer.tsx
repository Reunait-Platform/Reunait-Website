"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso"
import { useNotificationsStore } from "@/providers/notifications-store-provider"
import { useAuth } from "@clerk/nextjs"
import { Bell } from "lucide-react"
import * as React from "react"
import { createPortal } from "react-dom"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useNavigationLoader } from "@/hooks/use-navigation-loader"
import { SimpleLoader } from "@/components/ui/simple-loader"
import { cn } from "@/lib/utils"

type NotificationsDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  anchorRef?: React.RefObject<HTMLElement>
}

export default function NotificationsDrawer({ open, onOpenChange, anchorRef }: NotificationsDrawerProps) {
  const notifications = useNotificationsStore(s => s.notifications)
  const unreadCount = useNotificationsStore(s => s.unreadCount)
  const pagination = useNotificationsStore(s => s.pagination)
  const isFetching = useNotificationsStore(s => s.isFetching)
  const fetchNotifications = useNotificationsStore(s => s.fetchNotifications)
  const enqueueRead = useNotificationsStore(s => s.enqueueRead)
  const flushPendingReads = useNotificationsStore(s => s.flushPendingReads)
  const markAllReadOptimistic = useNotificationsStore(s => s.markAllReadOptimistic)
  const setLastSeenAt = useNotificationsStore(s => s.setLastSeenAt)
  const { getToken } = useAuth()
  const router = useRouter()
  const { isLoading: isNavigating, mounted, startLoading } = useNavigationLoader()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [unreadOnly, setUnreadOnly] = React.useState(false)
  const [atBottom, setAtBottom] = React.useState(true)
  const virtuosoRef = React.useRef<VirtuosoHandle | null>(null)
  const shouldStickAfterAppendRef = React.useRef(false)
  const prevLenRef = React.useRef(0)
  const prevDataLenRef = React.useRef(0)
  const inFlightRef = React.useRef(false)
  const prevPageRef = React.useRef(pagination.currentPage)
  
  // Virtuoso-based pagination
  const wasFetchingRef = React.useRef(false)
  
  // Stabilize pagination/isFetching with refs to prevent observer recreation
  const paginationRef = React.useRef(pagination)
  const isFetchingRef = React.useRef(isFetching)
  
  // Update refs on changes
  React.useEffect(() => { paginationRef.current = pagination }, [pagination])
  React.useEffect(() => { isFetchingRef.current = isFetching }, [isFetching])
  
  // Debounce ref to prevent rapid calls
  const loadMoreTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  
  // Stable loadMore callback using refs
  const loadMore = React.useCallback(async () => {
    if (isFetchingRef.current || !paginationRef.current.hasNextPage) return
    
    // Smart loading: Don't load more than 100 notifications total (5 pages)
    // This prevents memory issues with very large notification counts
    const maxNotifications = 100
    if (notifications.length >= maxNotifications) {
      return
    }
    
    // Clear any existing timeout
    if (loadMoreTimeoutRef.current) {
      clearTimeout(loadMoreTimeoutRef.current)
    }
    
    // Debounce the call by 100ms
    loadMoreTimeoutRef.current = setTimeout(async () => {
      const token = await getToken()
      if (token) {
        await fetchNotifications(token, paginationRef.current.currentPage + 1)
      }
    }, 100)
  }, [getToken, fetchNotifications, notifications.length, unreadOnly])
  
  // Track fetch transitions for optional state handling
  React.useEffect(() => { wasFetchingRef.current = isFetching }, [isFetching])

  // Eager prefetch page 2 on open to eliminate first-append gap under fast scroll
  React.useEffect(() => {
    const prefetch = async () => {
      if (!open) return
      // Only prefetch when we're on page 1 and next page exists
      if (pagination.currentPage === 1 && pagination.hasNextPage && notifications.length <= 20 && !isFetching && !inFlightRef.current) {
        try {
          inFlightRef.current = true
          shouldStickAfterAppendRef.current = true
          const token = await getToken()
          if (token) {
            await fetchNotifications(token, 2)
          }
        } finally {
          // Let the length-change effect clear inFlight after reveal
        }
      }
    }
    prefetch()
  }, [open, pagination.currentPage, pagination.hasNextPage, notifications.length, isFetching, getToken, fetchNotifications])

  // Force reveal immediately after the first append (page 1 -> 2), even if not at bottom
  React.useEffect(() => {
    const prev = prevPageRef.current
    const curr = pagination.currentPage
    if (prev === 1 && curr === 2 && visible.length > prevDataLenRef.current) {
      try {
        virtuosoRef.current?.scrollToIndex({ index: visible.length - 1, align: 'end' })
      } catch {}
      shouldStickAfterAppendRef.current = false
      inFlightRef.current = false
    }
    prevPageRef.current = curr
  }, [pagination.currentPage, visible.length])

  // When data length grows after a fetch while near bottom, stick to the end
  React.useEffect(() => {
    const dataLen = visible.length
    const grew = dataLen > prevDataLenRef.current
    if (grew && shouldStickAfterAppendRef.current) {
      try {
        virtuosoRef.current?.scrollToIndex({ index: dataLen - 1, align: 'end' })
      } catch {}
      shouldStickAfterAppendRef.current = false
      inFlightRef.current = false
    }
    prevLenRef.current = notifications.length
    prevDataLenRef.current = dataLen
  }, [notifications.length, visible.length])

  const visible = React.useMemo(() => unreadOnly ? notifications.filter(n => !n.isRead) : notifications, [notifications, unreadOnly])
  const listData = React.useMemo(() => {
    const base = visible
    if (!pagination.hasNextPage) return base
    if (notifications.length < 100) return [...base, { id: '__loader__' } as any]
    // After 100 items, replace loader with a stable in-list "show all" row to avoid layout shifts
    return [...base, { id: '__show_all__' } as any]
  }, [visible, pagination.hasNextPage, notifications.length])

  const handleOpenChange = async (next: boolean) => {
    if (next) setLastSeenAt()
    onOpenChange(next)
  }

  const handleMarkAll = async () => {
    const token = await getToken()
    if (token) markAllReadOptimistic(token)
  }

  const handleItemClick = async (n: any) => {
    enqueueRead(n.id)
    const token = await getToken()
    if (token) flushPendingReads(token)
    if (n.isClickable && n.navigateTo) {
      // Close the drawer immediately
      onOpenChange(false)

      // Check if it's an internal route or external URL
      const isInternal = n.navigateTo.startsWith('/')
      if (isInternal) {
        // Parse target path and query for same-route detection
        const [targetPath, targetQuery = ""] = n.navigateTo.split('?')
        const currentQuery = searchParams?.toString() || ""
        const treatAsSameRoute = pathname === targetPath && currentQuery === targetQuery

        startLoading({ expectRouteChange: !treatAsSameRoute })
        if (treatAsSameRoute) {
          // Do not push the same route; loader will auto-stop via no-route-change fallback
          return
        }
        router.push(n.navigateTo)
      } else {
        // External URL - use full navigation
        startLoading({ expectRouteChange: true })
        window.location.href = n.navigateTo
      }
    }
  }

  const timeAgo = (iso?: string | null) => {
    if (!iso) return ""
    const d = new Date(iso)
    const diff = Math.floor((Date.now() - d.getTime()) / 1000)
    if (diff < 60) return `${diff}s ago`
    const m = Math.floor(diff / 60)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    const days = Math.floor(h / 24)
    return `${days}d ago`
  }

  return (
    <>
      {/* Navigation Loader */}
      {isNavigating && mounted && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-md">
          <SimpleLoader />
        </div>,
        document.body
      )}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="fixed right-0 top-0 h-[100dvh] w-full sm:w-[440px] p-0 m-0 rounded-none border-l bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right"
        >
        {anchorRef && (
          <Popover open>
            <PopoverAnchor asChild>
              {/* invisible anchor to compute transform origin near the icon */}
              <div ref={anchorRef as any} />
            </PopoverAnchor>
            <PopoverContent align="end" sideOffset={10} className="pointer-events-none bg-transparent border-0 p-0 shadow-none">
              <div className="h-2 w-2 rotate-45 bg-background border-l border-t" />
            </PopoverContent>
          </Popover>
        )}
        <DialogHeader className="px-5 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bell className="h-4 w-4" />
              </span>
              <DialogTitle className="text-base font-semibold tracking-tight">Notifications</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-full border p-0.5 bg-muted/40 dark:bg-muted/30 dark:border-muted/40">
                <button
                  className={cn(
                    "px-2 h-6 text-xs rounded-full transition-colors",
                    !unreadOnly
                      ? "bg-background shadow-sm dark:bg-primary/15 dark:text-primary dark:ring-1 dark:ring-primary/30 dark:shadow-sm"
                      : "text-muted-foreground dark:text-muted-foreground"
                  )}
                  aria-pressed={!unreadOnly}
                  onClick={() => setUnreadOnly(false)}
                >
                  All
                </button>
                <button
                  className={cn(
                    "px-2 h-6 text-xs rounded-full transition-colors",
                    unreadOnly
                      ? "bg-background shadow-sm dark:bg-primary/15 dark:text-primary dark:ring-1 dark:ring-primary/30 dark:shadow-sm"
                      : "text-muted-foreground dark:text-muted-foreground"
                  )}
                  aria-pressed={unreadOnly}
                  onClick={() => setUnreadOnly(true)}
                >
                  Unread
                </button>
              </div>
              {unreadCount > 0 && (
                <button onClick={handleMarkAll} className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer">Mark all as read</button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex h-[calc(100dvh-56px)] flex-col">
          {visible.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground px-6 text-center">
              You have no {unreadOnly ? 'unread ' : ''}notifications.
            </div>
          ) : (
            <div className="flex-1 px-2">
              <div className="py-2 h-full">
                <Virtuoso
                  ref={virtuosoRef}
                  style={{ height: '100%' }}
                  data={listData}
                  increaseViewportBy={{ top: 200, bottom: 1200 }}
                  computeItemKey={(_index, item: any) => item.id}
                  atBottomThreshold={200}
                  atBottomStateChange={setAtBottom}
                  followOutput={atBottom ? 'auto' : false}
                  defaultItemHeight={88}
                  rangeChanged={async ({ endIndex }) => {
                    // Trigger fetch when the loader row comes into view
                    const nearEnd = endIndex >= listData.length - 1
                    if (nearEnd && listData[listData.length - 1]?.id === '__loader__') {
                      if (!isFetching && !inFlightRef.current && pagination.hasNextPage && notifications.length < 100) {
                        // Always reveal newly appended items immediately when loader is reached
                        shouldStickAfterAppendRef.current = true
                        inFlightRef.current = true
                        const token = await getToken()
                        try {
                          if (token) {
                            await fetchNotifications(token, pagination.currentPage + 1)
                          }
                        } finally {
                          inFlightRef.current = false
                        }
                      }
                    }
                  }}
                  endReached={async () => {
                    if (!isFetching && !inFlightRef.current && pagination.hasNextPage && notifications.length < 100) {
                      // Redundant safety trigger to handle fast scrolls on some platforms
                      shouldStickAfterAppendRef.current = true
                      inFlightRef.current = true
                      const token = await getToken()
                      try {
                        if (token) {
                          await fetchNotifications(token, pagination.currentPage + 1)
                        }
                      } finally {
                        inFlightRef.current = false
                      }
                    }
                  }}
                  // No footer; we render loader/show-all as in-list rows to keep height stable
                  itemContent={(index, n: any) => {
                    if (n?.id === '__loader__') {
                      return (
                        <div className="py-2">
                          <div data-testid="notif-loadmore" className="flex justify-center items-center py-3 min-h-10">
                            <div className="text-xs text-muted-foreground">
                              {isFetching ? 'Loading...' : 'Load more'}
                            </div>
                          </div>
                        </div>
                      )
                    }
                    if (n?.id === '__show_all__') {
                      return (
                        <div className="py-2">
                          <div className="flex justify-center items-center py-3 min-h-10">
                            <button
                              onClick={() => {
                                // Close the drawer immediately
                                onOpenChange(false)
                                // Same-route aware navigation
                                const target = '/notifications'
                                const [targetPath, targetQuery = ""] = target.split('?')
                                const currentQuery = searchParams?.toString() || ""
                                const treatAsSameRoute = pathname === targetPath && currentQuery === targetQuery
                                startLoading({ expectRouteChange: !treatAsSameRoute })
                                if (!treatAsSameRoute) router.push(target)
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                            >
                              Show all notifications
                            </button>
                          </div>
                        </div>
                      )
                    }
                    return (
                      <div className="py-2">
                        <div className={cn(
                          "group relative rounded-xl transition-colors",
                          n.isRead
                            ? "border border-border/60 bg-muted/20 hover:bg-muted/40"
                            : "border border-primary/20 bg-primary/5 hover:bg-primary/10 shadow-sm"
                        )}>
                          <div
                            onClick={() => handleItemClick(n)}
                            role="button"
                            tabIndex={0}
                            className="w-full cursor-pointer text-left px-4 py-3 focus:outline-none"
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn("mt-1 h-2 w-2 rounded-full", n.isRead ? "bg-muted-foreground/30" : "bg-blue-500")} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                  <div className={cn("text-sm break-words", n.isRead ? "text-muted-foreground" : "font-medium")}>{n.message}</div>
                                  <div className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0">{timeAgo(n.time)}</div>
                                </div>
                                {n.navigateTo && (
                                  <div className="mt-1 text-xs text-primary/80 truncate">View details</div>
                                )}
                              </div>
                              {!n.isRead && (
                                <button
                                  type="button"
                                  onClick={async (e) => { e.stopPropagation(); await handleItemClick(n) }}
                                  className="opacity-0 group-hover:opacity-100 text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                                  aria-label="Mark as read"
                                >
                                  Mark read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }}
                />
              </div>
            </div>
          )}

          <div className="border-t p-3 flex items-center gap-2">
            <Button variant="outline" className="w-full cursor-pointer" onClick={() => handleOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}


