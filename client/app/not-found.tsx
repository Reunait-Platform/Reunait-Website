import { Suspense } from "react"
import { Component } from "@/components/404-page-not-found"

export default function NotFound() {
  return (
    <Suspense fallback={
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center py-16 md:py-24">
        <div className="text-3xl md:text-4xl lg:text-5xl text-foreground mt-12">
          Page Not Found
        </div>
        <p className="md:text-lg lg:text-xl text-muted-foreground mt-8">
          Loading...
        </p>
      </div>
    }>
      <Component />
    </Suspense>
  )
}
