"use client"

import React, { useEffect, useState, use } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/contexts/toast-context"
import { Sparkles, Loader2, CheckCircle2, Globe } from "lucide-react"
import Script from "next/script"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"

const DEFAULT_PREDEFINED_AMOUNTS: Record<string, number[]> = {
  INR: [100, 500, 1000, 2500, 5000],
  USD: [10, 25, 50, 100, 250],
  EUR: [10, 25, 50, 100, 250],
  GBP: [10, 25, 50, 100, 250],
  AUD: [10, 25, 50, 100, 250],
  CAD: [10, 25, 50, 100, 250],
  SGD: [10, 25, 50, 100, 250],
  AED: [50, 100, 250, 500, 1000],
  JPY: [1000, 2500, 5000, 10000, 25000],
}

interface RazorpayPaymentResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

interface RazorpayError {
  error?: {
    description?: string
    reason?: string
  }
  message?: string
}

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  callback_url?: string
  redirect?: boolean
  handler?: (response: RazorpayPaymentResponse) => void | Promise<void>
  prefill?: Record<string, unknown>
  theme?: { color?: string }
  modal?: { ondismiss?: () => void }
  handler_error?: (error: RazorpayError) => void
}

interface RazorpayInstance {
  open: () => void
  close: () => void
}

interface RazorpayConstructor {
  new (options: RazorpayOptions): RazorpayInstance
}

declare global {
  interface Window {
    Razorpay: RazorpayConstructor
  }
}

interface CurrencyInfo {
  code: string
  isZeroDecimal: boolean
  isThreeDecimal?: boolean
  exponent?: number
}

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

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState<string>("")
  const [currency, setCurrency] = useState<string>("INR")
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>([])
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [razorpayLoaded, setRazorpayLoaded] = useState(false)
  const { showSuccess, showError } = useToast()
  const router = useRouter()

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:6001"
        const response = await fetch(`${base}/api/donations/currencies`)
        const data = await response.json()
        if (data.success && data.data.currencies.length > 0) {
          setCurrencies(data.data.currencies)
          const currentCurrencyExists = data.data.currencies.find((c: CurrencyInfo) => c.code === currency)
          if (!currentCurrencyExists) {
            setCurrency(data.data.currencies[0].code)
          }
        }
      } catch {
        showError("Failed to load currencies. Using default.", "Error")
      } finally {
        setIsLoadingCurrencies(false)
      }
    }
    void fetchCurrencies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && window.Razorpay) {
      setRazorpayLoaded(true)
    }
  }, [])

  // Handle Razorpay callback redirect (from backend callback endpoint) using server-provided params
  useEffect(() => {
    const paymentStatus = params.payment_status
    const paymentId = params.payment_id
    const orderId = params.order_id
    const amount = params.amount
    const currencyParam = params.currency
    const error = params.error
    const errorCode = params.error_code

    if (paymentStatus === "success" && paymentId && orderId && amount && currencyParam) {
      const donationAmount = parseFloat(amount)
      const donationCurrency = currencyParam
      showSuccess(
        `Thank you for your generous donation of ${formatCurrency(donationAmount, donationCurrency)}! Your contribution helps us reunite families.`,
        "Donation Successful"
      )
      setSelectedAmount(null)
      setCustomAmount("")
      router.replace("/donate")
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

  const handleRazorpayLoad = () => {
    setRazorpayLoaded(true)
  }

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
    if (amount <= 0) {
      showError(`Please enter a valid donation amount`, "Invalid Amount")
      return
    }
    if (!razorpayLoaded) {
      showError("Payment gateway is loading. Please wait a moment and try again.", "Loading")
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
      const { orderId, keyId } = orderData.data
      const backendBase = base
      const options: RazorpayOptions = {
        key: keyId,
        amount: orderData.data.amount,
        currency: orderData.data.currency,
        name: "Reunait",
        description: `Donation of ${formatCurrency(amount, currency)}`,
        order_id: orderId,
        callback_url: `${backendBase}/api/donations/callback`,
        redirect: true,
        handler: async function (response: RazorpayPaymentResponse) {
          try {
            const verifyResponse = await fetch(`${base}/api/donations/verify-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })
            const verifyData = await verifyResponse.json()
            if (verifyData.success) {
              const verifiedAmount = verifyData.data.amount
              const verifiedCurrency = verifyData.data.currency
              showSuccess(
                `Thank you for your generous donation of ${formatCurrency(verifiedAmount, verifiedCurrency)}! Your contribution helps us reunite families.`,
                "Donation Successful"
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
        },
        prefill: {},
        theme: { color: "#2563EB" },
        modal: { ondismiss: function () { setIsProcessing(false) } },
        handler_error: function (error: RazorpayError) {
          setIsProcessing(false)
          const errorMessage = error?.error?.description || error?.error?.reason || error?.message || "Payment failed"
          if (
            errorMessage.toLowerCase().includes("international") ||
            errorMessage.toLowerCase().includes("not supported")
          ) {
            showError(
              `International payments are not enabled. Please use INR currency or enable international payments in your Razorpay dashboard. Error: ${errorMessage}`,
              "International Payments Not Enabled"
            )
          } else {
            showError(`Payment failed: ${errorMessage}. Please try again or contact support.`, "Payment Error")
          }
        },
      }
      const razorpay = new window.Razorpay(options)
      razorpay.open()
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
    setCustomAmount(value)
    setSelectedAmount(null)
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
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={handleRazorpayLoad} strategy="lazyOnload" />
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
              <div className="block mt-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm font-semibold text-primary flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  We will start receiving donations soon. Thank you for your interest in supporting our mission!
                </p>
              </div>
              {currency !== "INR" && (
                <span className="block mt-2 text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Note: International payments (non-INR) require activation in your Razorpay dashboard. Use INR for testing without
                  activation.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingCurrencies ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">Loading currencies...</span>
              </div>
            ) : (
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
                    {currencies.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code}>
                        {curr.code} - {getCurrencyName(curr.code)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
                      disabled={isProcessing || isLoadingCurrencies}
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
              {customAmount && parseFloat(customAmount) > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  You are donating {formatCurrency(parseFloat(customAmount), currency)}
                </p>
              )}
            </div>
            {getDonationAmount() > 0 && (
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Donation Amount:</span>
                  <span className="text-2xl font-bold text-primary">{formatCurrency(getDonationAmount(), currency)}</span>
                </div>
              </div>
            )}
            <Button onClick={handleDonate} disabled={true} className="w-full h-12 text-base font-semibold" size="lg">
              <Sparkles className="w-5 h-5 mr-2" />
              Donate Now
            </Button>
            {!razorpayLoaded && <p className="text-sm text-muted-foreground text-center">Loading payment gateway...</p>}
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center">
                Your payment is secured by Razorpay. All transactions are encrypted and secure.
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







