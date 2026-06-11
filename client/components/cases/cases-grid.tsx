"use client"

import { memo } from "react"
import { CaseCard } from "./case-card"
import { Typography } from "@/components/ui/typography"
import { SearchX, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Case } from "@/lib/api"

interface CasesGridProps {
  cases: Case[]
  loading?: boolean
  emptyMessage?: string
  highlightQuery?: string
  getMuted?: (c: Case) => boolean
  showMutedHint?: boolean
  aspectRatio?: string
  onResetFilters?: () => void
}

// Optimized loading skeleton - matches actual case card dimensions
const LoadingSkeleton = memo(({ aspectRatio = "aspect-[4/5]" }: { aspectRatio?: string }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in fade-in-0 duration-300">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="overflow-hidden rounded-2xl border bg-card">
        {/* Image section - matches dynamic aspect ratio from actual case card */}
        <div className={`relative w-full ${aspectRatio} bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%]`}></div>
        
        {/* Content section - matches actual case card content */}
        <div className="px-6 -mt-2 pb-5 space-y-2">
          {/* Header section */}
          <div className="space-y-2 mt-4">
            <div className="h-6 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded w-3/4"></div>
            <div className="flex items-center justify-between">
              <div className="h-5 w-12 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded-full"></div>
              <div className="h-5 w-14 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded-full"></div>
            </div>
          </div>
          
          {/* Location section */}
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded-lg shrink-0"></div>
            <div className="h-4 w-32 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded"></div>
          </div>
          
          {/* Status section */}
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded-lg shrink-0"></div>
            <div className="h-4 w-40 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
))

LoadingSkeleton.displayName = "LoadingSkeleton"

// Optimized actionable empty state
const EmptyState = memo(({ message, onReset }: { message: string; onReset?: () => void }) => (
  <div className="text-center py-16 px-4 max-w-md mx-auto animate-in fade-in-0 slide-in-from-bottom-4 duration-300 space-y-6">
    <div className="inline-flex p-4 rounded-full bg-muted/50 text-muted-foreground">
      <SearchX className="w-12 h-12 stroke-[1.5]" />
    </div>
    <div className="space-y-2">
      <Typography variant="h3" as="h2" className="text-xl font-semibold">
        No Results Found
      </Typography>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {message}. Try clearing your search keyword, expanding your location radius, or resetting other filters.
      </p>
    </div>
    {onReset && (
      <Button 
        onClick={onReset}
        variant="outline"
        size="sm"
        className="inline-flex items-center gap-2 border-2 px-4 h-10 rounded-lg hover:scale-105 transition-all cursor-pointer font-medium"
      >
        <RotateCcw className="w-4 h-4" />
        Reset All Filters
      </Button>
    )}
  </div>
))

EmptyState.displayName = "EmptyState"

export const CasesGrid = memo(({ 
  cases, 
  loading = false,
  emptyMessage = "No cases found",
  highlightQuery = "",
  getMuted,
  showMutedHint = false,
  aspectRatio = "aspect-[4/5]",
  onResetFilters
}: CasesGridProps) => {
  if (loading) {
    return <LoadingSkeleton aspectRatio={aspectRatio} />
  }

  if (cases.length === 0) {
    return <EmptyState message={emptyMessage} onReset={onResetFilters} />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
      {cases.map((caseData, index) => {
        const stableKey = caseData._id || `case-${index}`
        return (
        <CaseCard
          key={stableKey}
          case={caseData}
          index={index}
          highlightQuery={highlightQuery}
          muted={getMuted ? getMuted(caseData) : false}
          showMutedHint={showMutedHint}
          priority={index < 4}
          aspectRatio={aspectRatio}
        />)
      })}
    </div>
  )
})

CasesGrid.displayName = "CasesGrid" 