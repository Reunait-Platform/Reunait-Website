export async function fetchWithNotifications(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {})
  headers.set('X-Include-Notifications', '1')
  const res = await fetch(input, { ...init, headers })
  return res
}


