"use client"

import React from "react"
import { useAuth, useUser } from "@clerk/nextjs"

export const OnboardingGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn } = useAuth()
  const { isLoaded: userLoaded } = useUser()

  // Show loading state while authentication is being determined
  // This prevents any flicker by not rendering content until auth state is clear
  if (!isLoaded || !userLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // If not signed in, render children (middleware will handle redirects)
  if (!isSignedIn) {
    return <>{children}</>
  }

  // If signed in, render children (middleware will handle onboarding redirects)
  return <>{children}</>
}


