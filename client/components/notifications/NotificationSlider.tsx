"use client"
import { useEffect, useRef } from 'react'
import { useNotificationsStore } from '@/providers/notifications-store-provider'
import { useAuth } from '@clerk/nextjs'

export function NotificationSlider({ open, onClose }: { open: boolean, onClose: () => void }) {
  const { getToken } = useAuth()
  const notifications = useNotificationsStore(s => s.notifications)
  const enqueueRead = useNotificationsStore(s => s.enqueueRead)
  const flushPendingReads = useNotificationsStore(s => s.flushPendingReads)
  const markAllReadOptimistic = useNotificationsStore(s => s.markAllReadOptimistic)
  const setLastSeenAt = useNotificationsStore(s => s.setLastSeenAt)

  const markedRef = useRef(false)

  useEffect(() => {
    if (open && !markedRef.current) {
      setLastSeenAt()
      markedRef.current = true
    }
    if (!open && markedRef.current) {
      getToken().then(token => flushPendingReads(token ?? undefined))
      markedRef.current = false
    }
  }, [open, setLastSeenAt, flushPendingReads, getToken])

  if (!open) return null

  return (
    <div className="fixed top-12 right-4 w-96 max-w-[95vw] bg-white dark:bg-zinc-900 border rounded-lg shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="font-medium">Notifications</div>
        <button className="text-sm text-blue-600" onClick={() => getToken().then(token => markAllReadOptimistic(token ?? undefined))}>Mark all as read</button>
      </div>
      <div className="max-h-[60vh] overflow-y-auto divide-y">
        {notifications.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No notifications</div>
        ) : notifications.map(n => (
          <div key={n.id} className="flex items-start gap-2 px-3 py-2 hover:bg-muted/40 cursor-pointer" onClick={async () => {
            // Always mark as read when clicked, regardless of current status
            enqueueRead(n.id)
            
            // Flush the pending read immediately to ensure API call
            const token = await getToken()
            if (token) {
              flushPendingReads(token)
            }
            
            if (n.isClickable && n.navigateTo) {
              window.location.href = n.navigateTo
            }
          }}>
            {!n.isRead ? (
              <button className="mt-2 w-2.5 h-2.5 rounded-full bg-blue-600 flex-shrink-0" onClick={async (e) => { 
                e.stopPropagation(); 
                enqueueRead(n.id);
                const token = await getToken();
                if (token) {
                  flushPendingReads(token);
                }
              }} aria-label="Mark as read" />
            ) : (
              <span className="mt-2 w-2.5 h-2.5 rounded-full bg-transparent border flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className={`text-sm ${n.isRead ? 'text-foreground' : 'font-medium'}`}>{n.message}</div>
              {n.time && <div className="text-xs text-muted-foreground">{new Date(n.time).toLocaleString()}</div>}
            </div>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 text-right border-t">
        <button className="text-sm" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}


