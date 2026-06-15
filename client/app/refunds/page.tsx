"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"
import { SimpleLoader } from "@/components/ui/simple-loader"

interface Section {
  title: string
  content: string[]
}

interface PolicyData {
  title: string
  subtitle: string
  sections: Section[]
}

export default function RefundPolicy() {
  const [data, setData] = useState<PolicyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"
        const res = await fetch(`${base}/api/policies/refunds`)
        if (!res.ok) {
          throw new Error("Failed to load refund policy")
        }
        const json = await res.json()
        if (json.success && json.data) {
          setData(json.data)
        } else {
          throw new Error(json.message || "Invalid policy response")
        }
      } catch (err: any) {
        console.error(err)
        setError(err.message || "An error occurred while fetching the policy.")
      } finally {
        setLoading(false)
      }
    }

    fetchPolicy()
  }, [])

  return (
    <div className="min-h-screen bg-background relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8">
      {/* Background blur decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/3 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-1/3 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse [animation-delay:1.5s]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32">
            <SimpleLoader />
          </div>
        )}

        {/* Error state */}
        {error && (
          <Card className="border-destructive/30 bg-destructive/5 overflow-hidden">
            <div className="h-1 bg-destructive" />
            <CardContent className="flex items-start gap-4 pt-6">
              <AlertTriangle className="h-6 w-6 text-destructive mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-destructive">Could not load policy data</h3>
                <p className="text-muted-foreground text-sm mt-1">{error}</p>
                <button
                  onClick={() => {
                    setLoading(true)
                    setError(null)
                    window.location.reload()
                  }}
                  className="mt-3 text-xs font-semibold text-primary hover:underline"
                >
                  Try Again
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content list */}
        {data && (
          <div className="space-y-8 transition-all duration-700">
            {/* Header section */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-emerald-500 via-primary to-emerald-500 bg-clip-text text-transparent pb-2">
                {data.title}
              </h1>
              <p className="mt-3 text-lg text-muted-foreground">
                {data.subtitle}
              </p>
            </div>

            {data.sections.map((section, idx) => (
              <Card key={idx} className="border-border/60 bg-card/40 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-6 sm:p-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 border-b pb-2 border-border/40">
                    {section.title}
                  </h2>
                  <div className="space-y-4">
                    {section.content.map((p, pIdx) => (
                      <p key={pIdx} className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                        {p}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
