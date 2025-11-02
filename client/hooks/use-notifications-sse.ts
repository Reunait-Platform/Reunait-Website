import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { EventSourcePolyfill } from 'event-source-polyfill';
import { useNotificationsStore } from '@/providers/notifications-store-provider';

/**
 * Custom hook for SSE (Server-Sent Events) notification streaming using EventSourcePolyfill
 * Handles real-time notification updates with automatic reconnection
 */
export function useNotificationsSSE() {
  const { getToken, isSignedIn } = useAuth();
  const addNotification = useNotificationsStore(s => s.addNotification);
  const ingestInitial = useNotificationsStore(s => (s as any).ingestInitial);
  const eventSourceRef = useRef<EventSourcePolyfill | null>(null);
  const isManuallyClosedRef = useRef(false);
  const connectRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const hasConnectedRef = useRef(false); // Track if we've already established a connection

  // Note: We rely on the polyfill's native auto-reconnect. No manual retry logic here.

  // Connect to SSE stream
  const connect = useCallback(async () => {
    // Don't connect if manually closed
    if (isManuallyClosedRef.current) {
      return;
    }

    // Don't connect if user is not signed in
    if (!isSignedIn) {
      return;
    }

    // If already connected, don't reconnect
    if (eventSourceRef.current?.readyState === 1) {
      return;
    }

    // Close existing connection if any (but not if already connected)
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const base = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!base) {
      return; // Backend URL must be configured
    }
    const url = `${base}/api/notifications/stream`;

    try {
      const token = await getToken();
      if (!token) {
        return;
      }

      // Create EventSourcePolyfill with authentication headers
      const eventSource = new EventSourcePolyfill(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        withCredentials: false, // CORS credentials handled via Authorization header
      });

      eventSourceRef.current = eventSource;
      hasConnectedRef.current = true;

      // Handle custom event types (Better SSE sends named events)
      eventSource.addEventListener('notification', (event: any) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          addNotification(data);
        } catch (parseError) {
          // Silently ignore parse errors
        }
      });

      eventSource.addEventListener('initial', (event: any) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data && Array.isArray(data.notifications)) {
            // Prefer ingestInitial to set pagination + unreadCount if provided
            if (typeof ingestInitial === 'function') {
              ingestInitial(
                data.notifications,
                data.pagination,
                data.unreadCount,
              );
            } else {
              // Fallback: add one by one
              data.notifications.forEach((notif: any) => addNotification(notif));
            }
          }
        } catch (parseError) {
          // Silently ignore parse errors
        }
      });

      // Handle generic messages (fallback)
      eventSource.onmessage = (event: MessageEvent) => {
        // Better SSE uses named events, so this is just a fallback
        try {
          const data = JSON.parse(event.data);
          if (data.notifications && Array.isArray(data.notifications)) {
            data.notifications.forEach((notif: any) => {
              addNotification(notif);
            });
          } else {
            addNotification(data);
          }
        } catch (parseError) {
          // Ignore parse errors for fallback handler
        }
      };

      // Handle errors: let polyfill auto-reconnect.
      // Special-case unauthorized (401): close and stop retrying.
      eventSource.onerror = async (_error: Event) => {
        // Attempt a lightweight auth check: if we cannot get a token, treat as unauthorized
        try {
          const fresh = await getToken();
          if (!fresh) {
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
              eventSourceRef.current = null;
            }
            isManuallyClosedRef.current = true; // stop further reconnects
            return;
          }
        } catch {}
        // Otherwise, do nothing; polyfill will retry automatically
      };

    } catch (error: any) {
      // Silently handle connection errors - polyfill will auto-reconnect
      // Do not manually retry; rely on polyfill auto-reconnect on its own
    }
  }, [getToken, addNotification, isSignedIn]);

  // Update ref whenever connect changes
  connectRef.current = connect;

  // Cleanup function
  const disconnect = useCallback(() => {
    isManuallyClosedRef.current = true;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    hasConnectedRef.current = false;
  }, []);

  // Connect on mount when user is signed in, disconnect when user signs out
  // Note: We only depend on isSignedIn to avoid unnecessary re-renders
  // connect and disconnect are intentionally omitted from deps to prevent re-connections on navigation
  useEffect(() => {
    // Only connect if user is signed in and we haven't connected yet
    if (isSignedIn && !hasConnectedRef.current) {
      connect();
    }

    // Disconnect if user signs out
    if (!isSignedIn && eventSourceRef.current) {
      disconnect();
      // Reset flags to allow reconnection when user signs back in
      isManuallyClosedRef.current = false;
      hasConnectedRef.current = false;
    }

    // No cleanup needed - connection persists across navigation since component is in layout
    // Only disconnect when user signs out (handled above) or app closes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]); // Only depend on isSignedIn - connect/disconnect are stable via refs

  return {
    connect,
    disconnect,
    isConnected: eventSourceRef.current?.readyState === 1, // EventSource.OPEN = 1
  };
}
