import ProfileClient from "@/components/profile/ProfileClient"
import { auth } from "@clerk/nextjs/server"

export default async function ProfilePage() {
  const { getToken, userId } = await auth()
  if (!userId) {
    return <ProfileClient />
  }

  let initialProfile: any = null
  try {
    const token = await getToken()
    if (token) {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL as string
      const res = await fetch(`${base}/api/users/profile`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.success) {
        initialProfile = data.data
      }
    }
  } catch {}

  return (
    <ProfileClient initialProfile={initialProfile} />
  )
}


