import { currentUser } from '@clerk/nextjs/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppVolunteerSidebar } from '@/components/app-volunteer-sidebar'

export default async function VolunteerLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser()
  if (!user) redirect('/sign-in')
  const role = (user.publicMetadata as any)?.role
  if (role !== 'volunteer') redirect('/')

  return children
}


