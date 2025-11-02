"use client"
import { useNotificationsStore } from '@/providers/notifications-store-provider'

export function NotificationBell({ onClick }: { onClick?: () => void }) {
  const unread = useNotificationsStore(s => s.unreadCount)
  return (
    <button onClick={onClick} aria-label="Notifications" className="relative inline-flex items-center">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 01-3.46 0"/>
      </svg>
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] leading-none rounded-full px-1.5 py-0.5">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  )
}


