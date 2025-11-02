import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GradientButton } from "@/components/ui/gradient-button"
import { Share2, Megaphone, Activity, Brain, Loader, Lock, Users } from "lucide-react"
import { CaseProgressTimeline } from "./CaseProgressTimeline"
import { FloatingDock } from "@/components/ui/floating-dock"
import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"

interface CaseActionsProps {
  onAiSearch: () => void
  onReportInfo: () => void
  onShare: () => void
  isAiSearchLoading?: boolean
  aiSearchRemainingTime?: number
  isAiSearchEnabled?: boolean
  remainingTimeFormatted?: string
  hasSimilarResults?: boolean
  onOpenSimilar?: () => void
  notifications?: Array<{
    message: string
    time: string
    ipAddress?: string
    phoneNumber?: string
    isRead: boolean
  }>
  // New permission props
  isCaseOwner?: boolean
  canCloseCase?: boolean
  canFlag?: boolean
  isSignedIn?: boolean
}

export function CaseActions({ 
  onAiSearch, 
  onReportInfo, 
  onShare, 
  isAiSearchLoading = false,
  aiSearchRemainingTime = 0,
  isAiSearchEnabled = true,
  remainingTimeFormatted = '',
  hasSimilarResults = false,
  onOpenSimilar,
  notifications = [],
  // New permission props
  isCaseOwner = false,
  canCloseCase = false,
  canFlag = false,
  isSignedIn = false,
}: CaseActionsProps) {
  
  const [isProgressOpen, setIsProgressOpen] = useState(false)
  const { user } = useUser()
  // No placeholder: countdown text is stable due to SSR timestamp sync

  // Get user role from Clerk
  const userRole = user?.publicMetadata?.role || 'general_user'
  const isPolice = userRole === 'police'
  const isVolunteer = userRole === 'volunteer'

  // Derive permissions from backend keys
  const canAISearch = isSignedIn && (isCaseOwner || isPolice || isVolunteer)
  const canViewSimilar = isCaseOwner
  const canViewProgress = isCaseOwner
  // Allow reporting for general users (guest tips supported by backend)
  const canReportInfo = true
  const canShare = true // Always visible

  const formatRemainingTime = (ms: number): string => {
    if (ms <= 0) return "Available"
    
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (!hasSimilarResults) {
    return (
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 pb-6">
        <GradientButton 
          onClick={canAISearch ? onAiSearch : undefined}
          disabled={!canAISearch || !isAiSearchEnabled}
          className={`min-w-[120px] sm:min-w-[140px] h-10 px-3 sm:px-4 text-sm ${
            (!canAISearch || !isAiSearchEnabled) ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            {isAiSearchLoading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (!canAISearch || !isAiSearchEnabled) ? (
              <Lock className="w-4 h-4" />
            ) : (
              <Brain className="w-4 h-4" />
            )}
            <span>
              {isAiSearchLoading
                ? "Searching..."
                : !isAiSearchEnabled
                  ? `Available in ${formatRemainingTime(aiSearchRemainingTime)}`
                  : "AI Search"}
            </span>
          </div>
        </GradientButton>

        {/* Report Info Button */}
        {canReportInfo ? (
          <Button
            variant="outline"
            onClick={onReportInfo}
            className="gap-2 px-3 sm:px-5 py-2.5 sm:py-3 border-border dark:border-border/80 hover:bg-muted/50 font-semibold text-xs sm:text-sm min-w-[100px] sm:min-w-[120px] justify-center cursor-pointer"
            aria-label="Report information"
          >
            <Megaphone className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Report Info</span>
            <span className="sm:hidden">Report</span>
          </Button>
        ) : null}
        
        <Button
          variant="outline"
          onClick={onShare}
          className="gap-2 px-3 sm:px-5 py-2.5 sm:py-3 border-border dark:border-border/80 hover:bg-muted/50 font-semibold text-xs sm:text-sm min-w-[90px] sm:min-w-[100px] justify-center cursor-pointer"
          aria-label="Share this case"
        >
          <Share2 className="w-3 h-3 sm:w-4 sm:h-4" />
          Share
        </Button>
        
        {/* Progress Button */}
        {canViewProgress ? (
          <CaseProgressTimeline notifications={notifications}>
            <Button 
              variant="outline" 
              className="gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 border-border dark:border-border/80 hover:bg-muted/50 font-semibold text-xs sm:text-sm min-w-[100px] sm:min-w-[120px] justify-center cursor-pointer"
            >
              <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Track Progress</span>
              <span className="sm:hidden">Progress</span>
              <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                {notifications?.length || 0}
              </Badge>
            </Button>
          </CaseProgressTimeline>
        ) : null}
      </div>
    )
  }

  const dockItems = [
    ...(canReportInfo ? [{
      title: "Report Info",
      icon: <Megaphone className="w-5 h-5" />,
      onClick: onReportInfo,
    }] : []),
    {
      title: "Share",
      icon: <Share2 className="w-5 h-5" />,
      onClick: onShare,
    },
    ...(canViewProgress ? [{
      title: "Progress",
      icon: <Activity className="w-5 h-5" />,
      onClick: () => setIsProgressOpen(true),
      badge: notifications?.length || 0,
    }] : []),
  ]

  return (
    <div className="w-full pb-6">
      {/* Desktop / Tablet layout */}
      <div className="hidden md:flex items-center">
        <div className="flex items-center gap-3">
          <GradientButton 
            onClick={canAISearch ? onAiSearch : undefined}
            disabled={!canAISearch || !isAiSearchEnabled}
            className={`min-w-[140px] h-10 px-4 text-sm ${
              (!canAISearch || !isAiSearchEnabled) ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              {isAiSearchLoading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (!canAISearch || !isAiSearchEnabled) ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Brain className="w-4 h-4" />
              )}
              <span>
                {isAiSearchLoading
                  ? "Searching..."
                  : !isAiSearchEnabled
                    ? `Available in ${formatRemainingTime(aiSearchRemainingTime)}`
                    : "AI Search"}
              </span>
            </div>
          </GradientButton>

          {canViewSimilar ? (
            <Button
              variant="outline"
              onClick={onOpenSimilar}
              className="gap-2 px-4 py-2.5 border-border dark:border-border/80 hover:bg-muted/50 font-semibold text-sm min-w-[140px] whitespace-nowrap justify-center cursor-pointer"
              aria-label="View similar people"
            >
              <Users className="w-4 h-4" />
              View Similar People
            </Button>
          ) : null}

          {isSignedIn ? (
            <div className="pl-3">
              <FloatingDock items={dockItems} />
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={onShare}
              className="gap-2 px-4 py-2.5 border-border dark:border-border/80 hover:bg-muted/50 font-semibold text-sm min-w-[120px] whitespace-nowrap justify-center cursor-pointer"
              aria-label="Share this case"
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          )}
        </div>
      </div>

      {/* Mobile layout */}
      <div className="flex flex-col gap-2 md:hidden">
        {!isSignedIn ? (
          // Logged out: AI Search + Share in the same row
          <div className="flex items-center gap-2">
            <GradientButton 
              onClick={canAISearch ? onAiSearch : undefined}
              disabled={!canAISearch || !isAiSearchEnabled}
              className={`flex-1 min-w-[150px] h-11 px-3 text-sm ${
                (!canAISearch || !isAiSearchEnabled) ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {isAiSearchLoading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (!canAISearch || !isAiSearchEnabled) ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <Brain className="w-4 h-4" />
                )}
                <span className="whitespace-nowrap text-sm leading-none">
                  {isAiSearchLoading
                    ? "Searching..."
                    : !isAiSearchEnabled
                      ? `Available in ${formatRemainingTime(aiSearchRemainingTime)}`
                      : "AI Search"}
                </span>
              </div>
            </GradientButton>

            <Button
              variant="outline"
              onClick={onShare}
              className="flex-1 min-w-[150px] h-11 gap-2 px-3 border-border dark:border-border/80 hover:bg-muted/50 font-semibold text-sm whitespace-nowrap justify-center cursor-pointer"
              aria-label="Share this case"
            >
              <Share2 className="w-4 h-4" />
              <span className="leading-none">Share</span>
            </Button>
          </div>
        ) : (
          <>
            {/* Row 1: AI Search + View Similar People (signed-in) */}
            <div className="flex items-center gap-2">
              <GradientButton 
                onClick={canAISearch ? onAiSearch : undefined}
                disabled={!canAISearch || !isAiSearchEnabled}
                className={`flex-1 min-w-[150px] h-11 px-3 text-sm ${
                  (!canAISearch || !isAiSearchEnabled) ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  {isAiSearchLoading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (!canAISearch || !isAiSearchEnabled) ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Brain className="w-4 h-4" />
                  )}
                  <span className="whitespace-nowrap text-sm leading-none">
                    {isAiSearchLoading
                      ? "Searching..."
                      : !isAiSearchEnabled
                        ? `Available in ${formatRemainingTime(aiSearchRemainingTime)}`
                        : "AI Search"}
                  </span>
                </div>
              </GradientButton>

              {/* View Similar Button */}
              {canViewSimilar ? (
                <Button
                  variant="outline"
                  onClick={onOpenSimilar}
                  className="flex-1 min-w-[150px] h-11 gap-2 px-3 border-border dark:border-border/80 hover:bg-muted/50 font-semibold text-xs sm:text-sm whitespace-nowrap justify-center cursor-pointer"
                  aria-label="View similar people"
                >
                  <Users className="w-4 h-4" />
                  <span className="leading-none">View Similar People</span>
                </Button>
              ) : null}
            </div>

            {/* Row 2: secondary actions with text (signed-in) */}
            <div className="flex items-center gap-2 pt-1">
              {/* Report Info Button */}
              {canReportInfo ? (
                <Button
                  variant="outline"
                  onClick={onReportInfo}
                  className="flex-1 h-11 gap-2 px-3 border-border dark:border-border/80 hover:bg-muted/50 font-semibold text-xs min-w-0 justify-center"
                  aria-label="Report information"
                >
                  <Megaphone className="w-3 h-3" />
                  <span className="leading-none">Report Info</span>
                </Button>
              ) : null}

              <Button
                variant="outline"
                onClick={onShare}
                className="flex-1 h-11 gap-2 px-3 border-border dark:border-border/80 hover:bg-muted/50 font-semibold text-xs min-w-0 justify-center cursor-pointer"
                aria-label="Share this case"
              >
                <Share2 className="w-3 h-3" />
                <span className="leading-none">Share</span>
              </Button>

              {/* Progress Button */}
              {canViewProgress ? (
                <Button
                  variant="outline"
                  onClick={() => setIsProgressOpen(true)}
                  className="flex-1 gap-1 px-2 py-2 border-border dark:border-border/80 hover:bg-muted/50 font-semibold text-xs min-w-0 justify-center"
                  aria-label="Progress"
                >
                  <Activity className="w-3 h-3" />
                  <span>Progress</span>
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                    {notifications?.length || 0}
                  </Badge>
                </Button>
              ) : null}
            </div>
          </>
        )}
      </div>

      <CaseProgressTimeline 
        open={isProgressOpen} 
        onOpenChange={setIsProgressOpen} 
        notifications={notifications}
      />
    </div>
  )
}
