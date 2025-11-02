'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Share2, Copy, Mail, Twitter, Facebook, Link, MessageSquare, MoreHorizontal, MessageCircleReply } from "lucide-react"
import { useToast } from "@/contexts/toast-context"
import type { CaseDetail } from "@/lib/api"

interface ShareDialogProps {
  isOpen: boolean
  onClose: () => void
  caseData: CaseDetail | null
}

export function ShareDialog({ isOpen, onClose, caseData }: ShareDialogProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const { showSuccess, showError } = useToast()

  if (!caseData) return null

  const publicBase = process.env.NEXT_PUBLIC_SITE_URL || ''
  const siteNameEnv = process.env.NEXT_PUBLIC_SITE_NAME || ''
  const fallbackUrl = typeof window !== 'undefined' ? window.location.href : ''
  const canonical = (publicBase && caseData?._id) ? `${publicBase.replace(/\/$/, '')}/cases/${caseData._id}` : fallbackUrl
  const shareUrl = canonical ? (canonical.startsWith('http://') || canonical.startsWith('https://') ? canonical : `http://${canonical}`) : ''
  const shareTitle = caseData.fullName ? `${caseData.fullName} - Missing Person Case` : 'Missing Person Case'

  // Compose detailed, multi-line message
  const name = caseData.fullName || 'Unknown person'
  const status = caseData.status ? String(caseData.status).toUpperCase() : 'UNKNOWN'
  const gender = caseData.gender ? String(caseData.gender).toUpperCase() : undefined
  const age = caseData.age ? String(caseData.age) : undefined
  const date = caseData.dateMissingFound ? new Date(caseData.dateMissingFound).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown date'
  const locationParts = [caseData.city, caseData.state, caseData.country].filter(Boolean)
  const location = locationParts.length ? locationParts.join(', ') : undefined
  const reward = caseData.reward ? String(caseData.reward) : undefined
  const description = (caseData.description || '').trim()
  const descriptionShort = description ? (description.length > 200 ? description.slice(0, 197) + '…' : description) : undefined

  const lines: string[] = []
  lines.push(`Name: ${name}`)
  lines.push(`Status: ${status}`)
  if (gender) lines.push(`Gender: ${gender}`)
  if (age) lines.push(`Age: ${age}`)
  lines.push(`Date: ${date}`)
  if (location) lines.push(`Location: ${location}`)
  if (reward) lines.push(`Reward: ${reward}`)
  if (descriptionShort) {
    lines.push('')
    lines.push(descriptionShort)
  }
  if (shareUrl) {
    let siteName = siteNameEnv
    if (!siteName) {
      try {
        siteName = new URL(shareUrl).hostname.replace(/^www\./, '')
      } catch {}
    }
    lines.push('')
    lines.push(`*View this case on ${siteName || 'our website'}:*`)
    lines.push(shareUrl)
  }
  const composedText = lines.join('\n')

  const handleCopyLink = async () => {
    setIsLoading('copy')
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        showSuccess('Link copied to clipboard')
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea')
        textarea.value = shareUrl
        textarea.style.position = 'absolute'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        showSuccess('Link copied to clipboard')
      }
    } catch (error) {
      showError('Failed to copy link')
    } finally {
      setIsLoading(null)
    }
  }

  const handleEmail = () => {
    const subject = encodeURIComponent(shareTitle)
    const body = encodeURIComponent(composedText)
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
  }

  const handleWhatsApp = () => {
    const text = encodeURIComponent(composedText)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const handleTwitter = () => {
    // Keep Twitter concise; include URL for preview
    const max = 220
    const base = composedText.replace(/\n+/g, ' ')
    const trimmed = base.length > max ? base.slice(0, max - 1) + '…' : base
    const text = encodeURIComponent(`${trimmed}`)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`, '_blank')
  }

  const handleFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank')
  }

  const handleSms = () => {
    const smsBody = encodeURIComponent(composedText)
    const href = `sms:?body=${smsBody}`
    window.open(href, '_blank')
  }

  const handleMore = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, text: composedText, url: shareUrl })
      }
    } catch {}
  }

  const canWebShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const baseOptions = [
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircleReply, onClick: handleWhatsApp, tint: 'bg-green-50 text-green-700 border-green-100' },
    { id: 'sms', label: 'Messages', icon: MessageSquare, onClick: handleSms, tint: 'bg-amber-50 text-amber-700 border-amber-100' },
    { id: 'email', label: 'Email', icon: Mail, onClick: handleEmail, tint: 'bg-blue-50 text-blue-700 border-blue-100' },
    { id: 'twitter', label: 'Twitter', icon: Twitter, onClick: handleTwitter, tint: 'bg-sky-50 text-sky-700 border-sky-100' },
    { id: 'facebook', label: 'Facebook', icon: Facebook, onClick: handleFacebook, tint: 'bg-blue-50 text-blue-700 border-blue-100' },
    { id: 'copy', label: 'Copy Link', icon: Copy, onClick: handleCopyLink, tint: 'bg-gray-50 text-gray-700 border-gray-100' },
  ] as const

  const shareOptions = (canWebShare
    ? [...baseOptions, { id: 'more', label: 'More', icon: MoreHorizontal, onClick: handleMore, tint: 'bg-gray-50 text-gray-700 border-gray-100' }]
    : [...baseOptions])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[100vw] max-w-[720px] mx-auto mt-auto mb-0 p-0 overflow-hidden flex flex-col bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/60 dark:border-gray-800/60 shadow-xl rounded-t-2xl max-h-[85vh]">
        <DialogHeader className="px-4 pt-3 pb-2 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-foreground/90">
            <Share2 className="h-4 w-4 text-blue-500" />
            Share
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0 px-4 pt-1 pb-3 space-y-3">
          {/* Case Preview (subtle) */}
          <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/40">
            {caseData.imageUrls && caseData.imageUrls.length > 0 && (
              <img
                src={caseData.imageUrls[0]}
                alt={caseData.fullName || 'Case image'}
                className="w-10 h-10 rounded-md object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm text-foreground truncate">
                {caseData.fullName || 'Missing Person'}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                {caseData.description || 'Help find this person'}
              </p>
            </div>
          </div>

          {/* Circular Share Options: 2 rows on mobile; single 7-col grid on larger screens without scroll */}
          <div className="grid grid-cols-4 gap-4 place-items-center pb-2 sm:grid sm:grid-cols-7 sm:gap-4 w-full">
            {shareOptions.map((option) => {
              const Icon = option.icon
              const isBusy = isLoading === option.id
              return (
                <button
                  key={option.id}
                  onClick={option.onClick}
                  aria-label={`Share via ${option.label}`}
                  className="flex flex-col items-center gap-2 focus:outline-none"
                  disabled={isBusy}
                >
                  <div className={`h-14 w-14 rounded-full border ${option.tint} flex items-center justify-center transition-colors`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] text-foreground/80 truncate max-w-[72px] text-center">{option.label}</span>
                </button>
              )})}
          </div>

          {/* Footer: subtle dismiss */}
          <div className="flex items-center justify-end pt-2">
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
