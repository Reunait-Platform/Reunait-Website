export async function fetchWithNotifications(input: RequestInfo | URL, init: RequestInit = {}) {
  // Legacy helper retained for compatibility; header-based notifications are deprecated.
  // Simply delegates to fetch without adding any custom headers.
  const res = await fetch(input, init)
  return res
}


