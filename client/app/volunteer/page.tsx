// Empty dashboard landing per request

import { currentUser } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import VortexDemoSecond from '@/components/ui/vortex-demo-2'

export default async function VolunteerPage() {
  const user = await currentUser()
  if (!user) redirect('/sign-in')
  const role = (user.publicMetadata as any)?.role
  if (role !== 'volunteer') notFound()
  return (
    <div className="bg-background">
      <div className="relative w-full px-0 py-16 md:py-20 min-h-[calc(75vh-4rem)] sm:min-h-[calc(75vh-5rem)]">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <VortexDemoSecond containerClassName="absolute inset-0" />
        </div>
        <div className="relative z-10 w-full max-w-4xl mx-auto text-center py-12 md:py-16 px-4 sm:px-6 md:px-4 lg:px-8">
          <h1 className="text-balance text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight">
          Thank you for volunteering
          </h1>
          <p className="mt-6 md:mt-8 text-balance text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            Your time and dedication help families find hope faster. Get started whenever you’re ready—review pending police
            verifications or moderate flagged cases.
          </p>
          <div className="mt-8 md:mt-10 flex flex-wrap justify-center gap-4 md:gap-6">
            <Button asChild size="lg" className="cursor-pointer">
              <Link href="/volunteer/verifications">Go to Verifications</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="cursor-pointer">
              <Link href="/volunteer/flagged">Review Flagged Cases</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}


