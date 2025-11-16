import ProfileClient from "@/components/profile/ProfileClient"
import { auth } from "@clerk/nextjs/server"

type ProfileData = {
  onboardingCompleted: boolean
  email?: string
  fullName?: string
  orgName?: string
  governmentIdNumber?: string
  phoneNumber?: string
  address?: string
  dateOfBirth?: string | Date | null
  gender?: "male" | "female" | "other"
  city?: string
  state?: string
  country?: string
  pincode?: string
  role?: "general_user" | "police" | "NGO" | "volunteer" | "police_denied"
  isVerified?: boolean | null
  cases?: unknown[]
  casesPagination?: {
    currentPage: number
    totalCases: number
    hasMoreCases: boolean
    casesPerPage: number
  }
}

export default async function ProfilePage() {
  const { getToken, userId } = await auth()
  if (!userId) {
    return <ProfileClient />
  }

  let initialProfile: ProfileData | null = null
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


