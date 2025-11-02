import { currentUser } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppVolunteerSidebar } from '@/components/app-volunteer-sidebar'

export default async function VolunteerWithSidebarLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser()
  if (!user) redirect('/sign-in')
  const role = (user.publicMetadata as any)?.role
  if (role !== 'volunteer') notFound()

  return (
    <SidebarProvider>
      <AppVolunteerSidebar />
      <SidebarInset className="md:peer-data-[variant=inset]:m-0 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-none md:peer-data-[variant=inset]:shadow-none">
        <div className="px-2 pt-2 md:hidden">
          <SidebarTrigger />
        </div>
        <main className="relative z-10 min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-5rem)] bg-background">
          <div className="container mx-auto px-4 sm:px-6 md:px-4 lg:px-8 py-6 lg:py-8 pb-28 lg:pb-32">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}


