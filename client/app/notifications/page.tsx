import { Suspense } from 'react'
import { AllNotificationsView } from '@/components/notifications/AllNotificationsView'

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">All Notifications</h1>
            <p className="text-muted-foreground mt-2">
              View and manage all your notifications
            </p>
          </div>
          
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading notifications...</div>
            </div>
          }>
            <AllNotificationsView />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
