"use client"

import { AuthenticateWithRedirectCallback, ClerkLoaded, ClerkLoading } from "@clerk/nextjs"

export default function SsoCallbackPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        {/* Show this while Clerk is performing the authentication/loading */}
        <ClerkLoading>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Completing sign-in...</p>
        </ClerkLoading>

        {/* Show this only after Clerk has finished initializing */}
        <ClerkLoaded>
          {/* CAPTCHA Widget - Required for Clerk OAuth flows */}
          <div id="clerk-captcha" data-cl-theme="auto" data-cl-size="normal" data-cl-language="auto" />
          <AuthenticateWithRedirectCallback />
        </ClerkLoaded>
      </div>
    </div>
  )
}
