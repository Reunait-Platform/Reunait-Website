'use client'

import { type ReactNode, createContext, useRef, useContext } from 'react'
import { useStore } from 'zustand'

import { type NotificationsStore, createNotificationsStore } from '@/stores/notifications-store'

export type NotificationsStoreApi = ReturnType<typeof createNotificationsStore>

export const NotificationsStoreContext = createContext<NotificationsStoreApi | undefined>(
  undefined,
)

export interface NotificationsStoreProviderProps {
  children: ReactNode
}

export const NotificationsStoreProvider = ({
  children,
}: NotificationsStoreProviderProps) => {
  const storeRef = useRef<NotificationsStoreApi | null>(null)
  if (storeRef.current === null) {
    storeRef.current = createNotificationsStore()
  }

  return (
    <NotificationsStoreContext.Provider value={storeRef.current}>
      {children}
    </NotificationsStoreContext.Provider>
  )
}

export const useNotificationsStore = <T,>(
  selector: (store: NotificationsStore) => T,
  equalityFn?: (a: T, b: T) => boolean,
): T => {
  const notificationsStoreContext = useContext(NotificationsStoreContext)

  if (!notificationsStoreContext) {
    throw new Error(`useNotificationsStore must be used within NotificationsStoreProvider`)
  }

  return useStore(notificationsStoreContext, selector, equalityFn)
}
