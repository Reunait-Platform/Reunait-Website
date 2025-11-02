"use client"

import { useState, useEffect } from "react"
import { useSignIn, useAuth } from "@clerk/nextjs"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/contexts/toast-context"
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp"
import { createPortal } from "react-dom"
import { SimpleLoader } from "@/components/ui/simple-loader"

export default function ResetPasswordPage() {
  const router = useRouter()
  const search = useSearchParams()
  const pathname = usePathname()
  const returnTo = (search?.get("returnTo")
    || search?.get("returnBackUrl")
    || search?.get("redirect_url")
    || "/profile") as string
  const { isLoaded, signIn, setActive } = useSignIn()
  const { signOut } = useAuth()
  const { showSuccess, showError } = useToast()

  const [step, setStep] = useState<"request" | "verify">("request")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const getPasswordStrength = (value: string): { score: 0 | 1 | 2 | 3, label: string } => {
    const hasLength = value.length >= 7
    const hasCase = /[a-z]/.test(value) && /[A-Z]/.test(value)
    const hasNumber = /\d/.test(value)
    const hasSpecial = /[^A-Za-z0-9]/.test(value)
    let s = 0
    if (hasLength) s += 1
    if (hasNumber || hasSpecial) s += 1
    if (hasCase) s += 1
    const score = Math.min(s, 3) as 0 | 1 | 2 | 3
    const label = score === 0 ? "Very weak" : score === 1 ? "Weak" : score === 2 ? "Medium" : "Strong"
    return { score, label }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  // Hide loader when route changes
  useEffect(() => {
    if (isProcessing) {
      setIsProcessing(false)
    }
  }, [pathname])

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded) {
      showError("Please wait a second and try again.")
      return
    }
    setError(null)
    setLoading(true)
    setIsProcessing(true)
    try {
      const identifier = email.trim()
      await signIn.create({ strategy: "reset_password_email_code", identifier })
      setStep("verify")
      showSuccess("If this email exists, we sent a verification code.")
      setResendCooldown(30)
      setIsProcessing(false) // Clear loader when transitioning to verify step
    } catch (err: any) {
      // Show neutral message; don't reveal if email exists
      setStep("verify")
      showSuccess("If this email exists, we sent a verification code.")
      setResendCooldown(30)
      setIsProcessing(false) // Clear loader when transitioning to verify step
    } finally {
      setLoading(false)
    }
  }

  const verifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded) {
      showError("Please wait a second and try again.")
      return
    }
    setError(null)
    setLoading(true)
    setIsProcessing(true)
    try {
      const normalized = code.replace(/\D/g, "")
      if (normalized.length !== 6) {
        showError("Enter the 6-digit code.")
        setLoading(false)
        setIsProcessing(false)
        return
      }
      if (password.length < 7) {
        showError("Password must be at least 7 characters.")
        setLoading(false)
        setIsProcessing(false)
        return
      }
      if (password !== confirmPassword) {
        showError("Passwords do not match.")
        setLoading(false)
        setIsProcessing(false)
        return
      }
      const res = await signIn.attemptFirstFactor({ strategy: "reset_password_email_code", code: normalized, password })
      if (res.status === "complete") {
        showSuccess("Password updated. Please sign in with your new password.")
        try {
          // Ensure no active session remains to avoid "session already exists"
          await signOut({ redirectUrl: `/sign-in?returnTo=${encodeURIComponent(returnTo)}` })
          return
        } catch (_) {
          // Fallback: manual navigation
          router.replace(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`)
          return
        }
      }
    } catch (err: any) {
      const raw = err?.errors?.[0]?.message || ""
      const lower = String(raw).toLowerCase()
      const msg = lower.includes("incorrect") || lower.includes("invalid")
        ? "Invalid code. Please try again."
        : lower.includes("expired")
          ? "Code expired. Please request a new code."
          : "Verification failed. Check the code and try again."
      showError(msg)
      setIsProcessing(false)
    } finally {
      setLoading(false)
    }
  }

  const resendCode = async () => {
    if (!isLoaded || resendLoading || resendCooldown > 0 || !email) return
    setResendLoading(true)
    try {
      const identifier = email.trim()
      await signIn.create({ strategy: "reset_password_email_code", identifier })
      showSuccess("Verification code resent.")
      setResendCooldown(30)
    } catch (err: any) {
      const raw = err?.errors?.[0]?.message || ""
      const lower = String(raw).toLowerCase()
      const msg = lower.includes("rate") || lower.includes("too many")
        ? "Too many requests. Please wait a moment before trying again."
        : "Could not resend code. Please wait a moment and try again."
      showError(msg)
    } finally {
      setResendLoading(false)
    }
  }

  useEffect(() => {
    if (resendCooldown <= 0) return
    const id = setInterval(() => setResendCooldown(s => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [resendCooldown])

  return (
    <>
      {/* Full Screen Loader with Background Blur (Portal to body) */}
      {isProcessing && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-md">
          <SimpleLoader />
        </div>,
        document.body
      )}
      
      <div className="container mx-auto px-4 sm:px-6 md:px-4 lg:px-8 py-8 sm:py-10 md:py-12 lg:py-14 flex justify-center">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-lg">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
            <p className="text-sm text-muted-foreground mt-2">Enter your email to receive a verification code.</p>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className={`h-1 w-16 rounded-full ${step === "request" ? "bg-primary" : "bg-border"}`} />
              <span>{step === "request" ? "Step 1 of 2" : "Step 2 of 2"}</span>
              <div className={`h-1 w-16 rounded-full ${step === "verify" ? "bg-primary" : "bg-border"}`} />
            </div>
          </div>

          {/* Feedback provided via toasts for consistency */}

          {step === "request" ? (
            <form onSubmit={requestCode} className="space-y-5">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
                <p className="text-xs text-muted-foreground">We’ll send a 6‑digit code to this email.</p>
              </div>
              <Button type="submit" className="w-full h-11 cursor-pointer text-base font-medium" disabled={loading || isProcessing || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !isLoaded}>
                Send verification code
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyAndReset} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="code" className="text-sm font-medium">Verification code</Label>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} pattern="[0-9]*" value={code} onChange={setCode}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
              {code.replace(/\D/g, "").length === 6 && (
                <>
                  <div className="space-y-3">
                    <Label htmlFor="password" className="text-sm font-medium">New password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showNewPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        aria-invalid={password.length > 0 && password.length < 7}
                        aria-describedby="password-help"
                        className={(password.length > 0 && password.length < 7) ? "border-destructive focus-visible:ring-destructive/30 h-11 pr-10" : "h-11 pr-10"}
                      />
                      <button type="button" aria-label={showNewPassword ? "Hide password" : "Show password"} onClick={() => setShowNewPassword(v => !v)} className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground cursor-pointer">
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {password.length > 0 && password.length < 7 && (
                      <p id="password-help" className="text-xs text-destructive mt-1">Minimum 7 characters.</p>
                    )}
                    {password.length > 0 && (
                      <div className="mt-1 flex items-center gap-2">
                        {(() => { const s = getPasswordStrength(password); return (
                          <>
                            <div className="flex items-center gap-1">
                              <span className={`h-1.5 w-8 rounded ${s.score >= 1 ? 'bg-green-500' : 'bg-border'}`} />
                              <span className={`h-1.5 w-8 rounded ${s.score >= 2 ? 'bg-green-500' : 'bg-border'}`} />
                              <span className={`h-1.5 w-8 rounded ${s.score >= 3 ? 'bg-green-500' : 'bg-border'}`} />
                            </div>
                            <span className="text-xs text-muted-foreground">{s.label}</span>
                          </>
                        )})()}
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        aria-invalid={confirmPassword.length > 0 && confirmPassword !== password}
                        aria-describedby="confirm-help"
                        className={(confirmPassword.length > 0 && confirmPassword !== password) ? "border-destructive focus-visible:ring-destructive/30 h-11 pr-10" : "h-11 pr-10"}
                      />
                      <button type="button" aria-label={showConfirmPassword ? "Hide password" : "Show password"} onClick={() => setShowConfirmPassword(v => !v)} className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground cursor-pointer">
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmPassword.length > 0 && confirmPassword !== password && (
                      <p id="confirm-help" className="text-xs text-destructive mt-1">Passwords do not match.</p>
                    )}
                  </div>
                </>
              )}
              <div className="flex items-center justify-between pt-1">
                <Link href="/sign-in" className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">Back to sign in</Link>
                <Button type="submit" className="h-11 cursor-pointer text-base font-medium" disabled={loading || isProcessing || code.replace(/\D/g, "").length !== 6 || password.length < 7 || password !== confirmPassword || !isLoaded}>
                  Reset password
                </Button>
              </div>
              <div className="flex items-center justify-center">
                {resendCooldown > 0 ? (
                  <span className="text-sm text-muted-foreground text-center">Resend code in {String(Math.floor(resendCooldown / 60)).padStart(1, '0')}:{String(resendCooldown % 60).padStart(2, '0')}</span>
                ) : (
                  <Button type="button" variant="ghost" className="h-auto p-0 text-sm text-primary cursor-pointer font-medium" onClick={resendCode} disabled={resendLoading || isProcessing}>
                    {resendLoading ? "Resending..." : "Resend code"}
                  </Button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
    </>
  )
}


