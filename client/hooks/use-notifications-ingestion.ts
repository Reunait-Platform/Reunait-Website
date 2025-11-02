'use client'

import { useNotificationsStore } from '@/providers/notifications-store-provider'

export function useNotificationsIngestion() {
  const ingestFromMeta = useNotificationsStore(state => state.ingestFromMeta)
  
  const handleApiResponse = (data: any) => {
    if (data && typeof data === 'object' && data._meta) {
      ingestFromMeta(data._meta)
    }
  }
  
  return { handleApiResponse }
}
