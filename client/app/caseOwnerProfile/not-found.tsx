import { Component } from "@/components/404-page-not-found"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function CaseOwnerProfileNotFound() {
  return (
    <div className="container mx-auto px-3 sm:px-4 md:px-4 lg:px-8 xl:px-10 py-6 lg:py-8 max-w-full">
      <div className="mb-6">
        <Button variant="outline" asChild className="gap-2 hover:bg-muted/50 transition-colors cursor-pointer">
          <Link href="/cases">
            ← Back to Cases
          </Link>
        </Button>
      </div>
      
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Component />
      </div>
    </div>
  )
}
