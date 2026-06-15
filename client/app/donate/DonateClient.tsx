"use client"

import React, { useEffect, useState, use, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/contexts/toast-context"
import { Sparkles, Loader2, CheckCircle2, Globe } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { DodoPayments } from "dodopayments-checkout"

const isDonationsEnabled = process.env.NEXT_PUBLIC_DONATIONS_ENABLED === "true"

const MAX_DONATION = 500000


const SUPPORTED_CURRENCIES = [
  "INR", "USD", "EUR", "GBP", "AED", "SAR",
  "SGD", "AUD", "CAD", "JPY", "CHF", "NZD",
]

const DEFAULT_PREDEFINED_AMOUNTS: Record<string, number[]> = {
  INR: [100, 500, 1000, 2500, 5000],
  USD: [10, 25, 50, 100, 250],
  EUR: [10, 25, 50, 100, 250],
  GBP: [10, 25, 50, 100, 250],
  AUD: [10, 25, 50, 100, 250],
  CAD: [10, 25, 50, 100, 250],
  SGD: [10, 25, 50, 100, 250],
  AED: [50, 100, 250, 500, 1000],
  SAR: [50, 100, 250, 500, 1000],
  JPY: [1000, 2500, 5000, 10000, 25000],
  CHF: [10, 25, 50, 100, 250],
  NZD: [10, 25, 50, 100, 250],
}

// Dodo Payments type declarations not needed since SDK exports them



const currencyDisplayNames =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(undefined, { type: "currency" })
    : null

const getCurrencyName = (code: string): string => {
  try {
    return currencyDisplayNames?.of?.(code) || code
  } catch {
    return code
  }
}

const formatCurrency = (amount: number, code: string): string => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: code }).format(amount)
  } catch {
    return `${code} ${amount.toLocaleString()}`
  }
}

const getCurrencySymbol = (code: string): string => {
  try {
    const parts = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0)
    const sym = parts.find((p) => p.type === "currency")?.value
    return sym || code
  } catch {
    return code
  }
}

export default function DonateClient({
  searchParams,
}: {
  searchParams: Promise<{
    payment_status?: string
    payment_id?: string
    order_id?: string
    amount?: string
    currency?: string
    error?: string
    error_code?: string
  }>
}) {
  const params = use(searchParams)
  const { user } = useUser()

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState<string>("")
  const [currency, setCurrency] = useState<string>("INR")
  const [isProcessing, setIsProcessing] = useState(false)
  const { showSuccess, showError } = useToast()
  const router = useRouter()
  const verifyPaymentRef = useRef<((paymentId: string) => Promise<void>) | null>(null)

  const verifyPayment = async (paymentId: string) => {
    setIsProcessing(true)
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:6001"
      const verifyResponse = await fetch(`${base}/api/donations/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: paymentId }),
      })
      const verifyData = await verifyResponse.json()
      if (verifyData.success) {
        const verifiedAmount = verifyData.data.amount
        const verifiedCurrency = verifyData.data.currency
        router.push(
          `/donate/thank-you?payment_id=${paymentId}&order_id=${paymentId}&amount=${verifiedAmount}&currency=${verifiedCurrency}`
        )
        setSelectedAmount(null)
        setCustomAmount("")
      } else {
        throw new Error(verifyData.message || "Payment verification failed")
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Payment verification failed. Please contact support if the amount was deducted."
      showError(errorMessage, "Verification Error")
    } finally {
      setIsProcessing(false)
    }
  }

  // Update validation ref to avoid stale closures
  useEffect(() => {
    verifyPaymentRef.current = verifyPayment
  })

  // Initialize Dodo Payments SDK
  useEffect(() => {
    DodoPayments.Initialize({
      mode: process.env.NEXT_PUBLIC_DODO_PAYMENTS_MODE === "live" ? "live" : "test",
      displayType: "overlay",
      onEvent: (event) => {
        if (event.event_type === "checkout.status") {
          const status = event.data?.status
          if (status === "succeeded" || status === "completed") {
            const paymentId = String(event.data?.payment_id || event.data?.id || "")
            if (paymentId && verifyPaymentRef.current) {
              verifyPaymentRef.current(paymentId)
            }
          }
        } else if (event.event_type === "checkout.closed") {
          setIsProcessing(false)
        }
      }
    })
  }, [])

  // Handle Dodo callback redirect (from backend callback endpoint) using server-provided params
  useEffect(() => {
    const paymentStatus = params.payment_status
    const paymentId = params.payment_id
    const orderId = params.order_id
    const amount = params.amount
    const currencyParam = params.currency
    const error = params.error
    const errorCode = params.error_code

    if (paymentStatus === "success" && paymentId && orderId && amount && currencyParam) {
      // Redirect to thank you page with payment details
      router.replace(
        `/donate/thank-you?payment_id=${paymentId}&order_id=${orderId}&amount=${amount}&currency=${currencyParam}`
      )
      return
    }

    if (paymentStatus === "failed" && error) {
      const errorMessage = decodeURIComponent(error)
      showError(
        errorMessage || "Payment failed. Please try again or contact support if the amount was deducted.",
        errorCode === "PAYMENT_FAILED" ? "Payment Failed" : "Payment Error"
      )
      router.replace("/donate")
      return
    }

    if (paymentStatus === "error" && error) {
      const errorMessage = decodeURIComponent(error)
      showError(
        errorMessage || "An error occurred during payment processing. Please contact support if the amount was deducted.",
        "Payment Error"
      )
      router.replace("/donate")
    }
    // Only run once on mount since params come from server
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getDonationAmount = (): number => {
    if (selectedAmount !== null) return selectedAmount
    if (customAmount.trim()) {
      const parsed = parseFloat(customAmount)
      return isNaN(parsed) ? 0 : parsed
    }
    return 0
  }

  const handleDonate = async () => {
    const amount = getDonationAmount()
    
    if (amount < 1) {
      showError(`Minimum donation amount is ${formatCurrency(1, currency)}`, "Invalid Amount")
      return
    }
    if (amount > MAX_DONATION) {
      showError(`Maximum online donation limit is ${formatCurrency(MAX_DONATION, currency)}. For larger amounts, please contact us for direct bank transfer.`, "Limit Exceeded")
      return
    }
    setIsProcessing(true)
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:6001"
      if (!base) {
        throw new Error("Backend URL is not configured")
      }
      const orderResponse = await fetch(`${base}/api/donations/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currency }),
      })
      const orderData = await orderResponse.json()
      if (!orderData.success) {
        throw new Error(orderData.message || "Failed to create donation order")
      }
      const { checkoutUrl } = orderData.data

      // Open Dodo Payments overlay checkout modal
      DodoPayments.Checkout.open({ checkoutUrl })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to process donation. Please try again."
      showError(errorMessage, "Donation Error")
      setIsProcessing(false)
    }
  }

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount)
    setCustomAmount("")
  }
  const handleCustomAmountChange = (value: string) => {
    // Restrict input to maximum 7 digits before decimal, and 2 digits after decimal
    if (value === "" || /^\d{0,7}(\.\d{0,2})?$/.test(value)) {
      setCustomAmount(value)
      setSelectedAmount(null)
    }
  }
  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency)
    setSelectedAmount(null)
    setCustomAmount("")
  }
  const getPredefinedAmounts = (): number[] => {
    return DEFAULT_PREDEFINED_AMOUNTS[currency] || []
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3">Support Our Mission</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto text-center">
            Your generous donation helps us reunite families and bring hope to those searching for their loved ones.
            Every contribution makes a difference.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Make a Donation</CardTitle>
            <CardDescription>
              Select a predefined amount or enter a custom amount.
              {!isDonationsEnabled && (
                <div className="block mt-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-sm font-semibold text-primary flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    We will start receiving donations soon. Thank you for your interest in supporting our mission!
                  </p>
                </div>
              )}
              {currency !== "INR" && (
                <span className="block mt-2 text-xs text-muted-foreground">
                  Note: Dodo Payments handles international currency conversion automatically.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="currency" className="mb-3 block">
                Select Currency
              </Label>
              <Select value={currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger id="currency" className="w-full h-12">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      <span>
                        {currency} - {getCurrencyName(currency)}
                      </span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code} - {getCurrencyName(code)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {getPredefinedAmounts().length > 0 && (
              <div>
                <Label className="mb-3 block">Choose an Amount</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {getPredefinedAmounts().map((amount) => (
                    <Button
                      key={amount}
                      variant={selectedAmount === amount ? "default" : "outline"}
                      className="h-12 text-base font-semibold"
                      onClick={() => handleAmountSelect(amount)}
                      disabled={isProcessing}
                    >
                      {formatCurrency(amount, currency)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="custom-amount">Or Enter Custom Amount</Label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground font-medium">
                  {getCurrencySymbol(currency)}
                </span>
                <Input
                  id="custom-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  className="pl-10 h-12 text-base"
                  min="0.01"
                  step="0.01"
                  disabled={isProcessing}
                />
              </div>

            </div>
            {getDonationAmount() > 0 && (
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Donation Amount:</span>
                  <span className="text-2xl font-bold text-primary">{formatCurrency(getDonationAmount(), currency)}</span>
                </div>
              </div>
            )}
            <Button
              onClick={handleDonate}
              disabled={!isDonationsEnabled || isProcessing || getDonationAmount() <= 0}
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              {isProcessing ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
              ) : (
                <><Sparkles className="w-5 h-5 mr-2" /> Donate Now</>
              )}
            </Button>
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center">
                Your payment is secured by Dodo Payments. All transactions are encrypted and secure.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>How Your Donation Helps</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Support our platform infrastructure and technology</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Enable AI-powered matching to connect missing persons with families</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Maintain secure data storage and privacy protection</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}







