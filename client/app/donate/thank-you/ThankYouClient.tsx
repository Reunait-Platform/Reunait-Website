"use client"

import React, { use, useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Heart, Copy } from "lucide-react"
import { useToast } from "@/contexts/toast-context"
import { useUser } from "@clerk/nextjs"
import dynamic from "next/dynamic"

const DotLottieReact = dynamic(
  () => import("@lottiefiles/dotlottie-react").then((mod) => ({ default: mod.DotLottieReact })),
  { ssr: false }
)

const formatCurrency = (amount: number, code: string): string => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: code }).format(amount)
  } catch {
    return `${code} ${amount.toLocaleString()}`
  }
}

export default function ThankYouClient({
  searchParams,
}: {
  searchParams: Promise<{
    payment_id?: string
    order_id?: string
    amount?: string
    currency?: string
    method?: string
  }>
}) {
  const params = use(searchParams)
  const { user } = useUser()
  const { showSuccess } = useToast()
  const [mounted, setMounted] = useState(false)

  const amount = params.amount ? parseFloat(params.amount) : 0
  const currency = params.currency || "INR"
  const paymentId = params.payment_id || ""
  const orderId = params.order_id || ""
  const method = params.method || ""
  const firstName = user?.firstName || ""

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleCopyId = () => {
    if (paymentId) {
      navigator.clipboard.writeText(paymentId)
      showSuccess("Payment ID copied to clipboard!", "Copied")
    }
  }

  // If no payment data, show a generic thank you
  const hasPaymentData = amount > 0 && paymentId

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
      </div>

      <div className="relative z-10 py-0 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg mx-auto">
          {/* Lottie Animation */}
          <div className={`flex justify-center mb-2 transition-all duration-700 ${mounted ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}>
            <div className="w-80 h-80 sm:w-96 sm:h-96">
              <DotLottieReact
                src="/lotties/Thank you with confetti.lottie"
                autoplay
                loop
                speed={1}
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          </div>

          {/* Thank You Message */}
          <div className={`text-center mb-8 transition-all duration-700 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <h1 className="text-4xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-emerald-500 via-primary to-emerald-500 bg-clip-text text-transparent">
              Thank You{firstName ? `, ${firstName}` : ""}!
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
              Your generosity brings us one step closer to reuniting families and bringing hope to those in need.
            </p>
          </div>

          {/* Donation Details Card */}
          {hasPaymentData && (
            <Card className={`mb-6 overflow-hidden transition-all duration-700 delay-400 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-primary to-emerald-400" />
              <CardContent className="pt-6 pb-6">
                {/* Amount */}
                <div className="text-center mb-6">
                  <p className="text-sm text-muted-foreground mb-1">You donated</p>
                  <p className="text-4xl sm:text-5xl font-bold text-primary">
                    {formatCurrency(amount, currency)}
                  </p>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-6" />

                {/* Transaction Details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Payment ID</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono max-w-[180px] truncate">
                        {paymentId}
                      </code>
                      <button
                        onClick={handleCopyId}
                        className="p-1 hover:bg-muted rounded transition-colors cursor-pointer"
                        title="Copy Payment ID"
                      >
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                  {orderId && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Order ID</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono max-w-[180px] truncate">
                        {orderId}
                      </code>
                    </div>
                  )}
                  {method && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Payment Method</span>
                      <span className="text-sm font-medium capitalize">{method}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Impact Message */}
          <Card className={`mb-6 bg-gradient-to-br from-primary/5 to-emerald-500/5 border-primary/10 transition-all duration-700 delay-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <CardContent className="pt-6 pb-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Heart className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Your Impact</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Every donation directly supports our platform.
                    Your contribution fuels the technology, infrastructure, and community efforts that make reunification possible.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Receipt Note */}
          <p className={`text-xs text-muted-foreground text-center mt-6 transition-all duration-700 delay-[800ms] ${mounted ? "opacity-100" : "opacity-0"}`}>
            A confirmation has been sent to your email. Save your Payment ID for reference.
          </p>
        </div>
      </div>
    </div>
  )
}
