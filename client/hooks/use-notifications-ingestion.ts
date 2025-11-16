'use client'

import { useNotificationsStore } from '@/providers/notifications-store-provider'

export function useNotificationsIngestion() {
  const ingestFromMeta = useNotificationsStore(state => state.ingestFromMeta)
  
  /**
   * Safely ingest notifications metadata from any API response.
   *
   * Accepts a broad `unknown` type so it can be used with multiple API shapes
   * (e.g. case detail, profile, notifications endpoints) without forcing
   * each call site to conform to a specific interface.
   */
  const handleApiResponse = (data: unknown) => {
    if (!data || typeof data !== 'object') return

    // Narrow to objects that actually carry a _meta field
    if ('_meta' in data) {
      const meta = (data as { _meta?: { [key: string]: unknown } })._meta
      if (meta && typeof meta === 'object') {
        ingestFromMeta(meta)
      }
    }
  }
  
  return { handleApiResponse }
}
