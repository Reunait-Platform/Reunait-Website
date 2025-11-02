"use client"

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useNotificationsFetch } from '@/hooks/use-notifications-fetch';
import { useNotificationsSSE } from '@/hooks/use-notifications-sse';

/**
 * NotificationFetcher component
 * Handles both initial notification fetching (API) and real-time updates (SSE)
 */
export function NotificationFetcher() {
  const { isSignedIn } = useAuth();
  const { fetchIfNeeded } = useNotificationsFetch();
  
  // Initialize SSE for real-time updates (only if signed in)
  useNotificationsSSE();

  useEffect(() => {
    // Only fetch initial notifications if user is signed in
    if (isSignedIn) {
      fetchIfNeeded();
    }
  }, [isSignedIn, fetchIfNeeded]);

  // This component doesn't render anything, it just handles notification fetching
  return null;
}
