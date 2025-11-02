"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { CasesSearch, SearchFilters } from "./cases-search"
import { CasesGrid } from "./cases-grid"
import { Pagination } from "@/components/ui/pagination"
import { Toast } from "@/components/ui/toast"
import { fetchCases, type Case, type CasesParams } from "@/lib/api"

// Initial state constants
const INITIAL_PAGINATION = {
  currentPage: 1,
  totalPages: 1,
  totalCases: 0,
  hasNextPage: false,
  hasPrevPage: false,
  limit: 40
}

const INITIAL_FILTERS: SearchFilters = {
  keyword: "",
  country: "India",
  state: "all",
  city: "all",
  status: undefined,
  gender: undefined,
  dateFrom: undefined,
  dateTo: undefined
}

interface CasesSectionProps {
  initialCases?: Case[]
  initialPagination?: typeof INITIAL_PAGINATION
  initialFilters?: Partial<SearchFilters>
}

export function CasesSection({ initialCases, initialPagination, initialFilters }: CasesSectionProps) {
  const [cases, setCases] = useState<Case[]>(initialCases || [])
  // If SSR provided initial data, don't show loading
  const [loading, setLoading] = useState<boolean>(!initialCases)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState(initialPagination || INITIAL_PAGINATION)
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    ...INITIAL_FILTERS,
    ...(initialFilters || {})
  })
  const [hasAppliedLocationFilters, setHasAppliedLocationFilters] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)
  const lastFetchKeyRef = useRef<string>("")
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Memoized API parameters to prevent unnecessary object recreation
  const apiParams = useMemo(() => ({
    page: pagination.currentPage,
    country: searchFilters.country,
    state: searchFilters.state === "all" ? null : searchFilters.state,
    city: searchFilters.city === "all" ? null : searchFilters.city,
    status: searchFilters.status,
    gender: searchFilters.gender,
    dateFrom: searchFilters.dateFrom,
    dateTo: searchFilters.dateTo,
    keyword: searchFilters.keyword || undefined
  }), [pagination.currentPage, searchFilters])

  // Memoized cases with stable reference for child components
  const memoizedCases = useMemo(() => cases, [cases])

  // Display loading when waiting for location-based fetch to avoid empty flicker
  const isDisplayLoading = useMemo(() => {
    return loading || (!hasAppliedLocationFilters && cases.length === 0)
  }, [loading, hasAppliedLocationFilters, cases.length])

  // Consolidated data fetching function
  const fetchData = useCallback(async (params: CasesParams, updateFilters = false) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetchCases(params)
      
      setCases(response.data)
      setPagination(response.pagination)
      
      if (updateFilters) {
        setSearchFilters(prev => ({
          ...prev,
          country: response.filters.country,
          state: response.filters.state || "all",
          city: response.filters.city || "all"
        }))
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load cases"
      setError(errorMessage)
      setCases([])
    } finally {
      setLoading(false)
    }
  }, [])

  // If SSR provided initial data/filters, mark as initialized to avoid client re-fetch
  useEffect(() => {
    if (!hasInitialized && (initialCases || initialFilters)) {
      setHasAppliedLocationFilters(true)
      setHasInitialized(true)
      if (initialCases && initialPagination) {
        setCases(initialCases)
        setPagination(initialPagination)
        setLoading(false)
      }
      if (initialFilters) {
        setSearchFilters(prev => ({ ...prev, ...initialFilters }))
      }
      // Prime the last fetch key to match the SSR params so the effect won't immediately refetch
      const initCountry = (initialFilters && initialFilters.country) ? initialFilters.country : "India"
      const initState = (initialFilters && typeof initialFilters.state === 'string' && initialFilters.state !== 'all') ? initialFilters.state : null
      const initCity = (initialFilters && typeof initialFilters.city === 'string' && initialFilters.city !== 'all') ? initialFilters.city : null
      const initStatus = (initialFilters && initialFilters.status && initialFilters.status !== 'all') ? initialFilters.status : undefined
      const initGender = (initialFilters && initialFilters.gender && initialFilters.gender !== 'all') ? initialFilters.gender : undefined
      const initKeyword = (initialFilters && initialFilters.keyword && initialFilters.keyword.trim()) ? initialFilters.keyword.trim() : undefined
      const initDateFrom = initialFilters?.dateFrom instanceof Date ? initialFilters.dateFrom.toISOString() : undefined
      const initDateTo = initialFilters?.dateTo instanceof Date ? initialFilters.dateTo.toISOString() : undefined
      const initialKey = JSON.stringify({
        page: (initialPagination && initialPagination.currentPage) ? initialPagination.currentPage : 1,
        country: initCountry,
        state: initState,
        city: initCity,
        status: initStatus,
        gender: initGender,
        keyword: initKeyword,
        dateFrom: initDateFrom,
        dateTo: initDateTo
      })
      lastFetchKeyRef.current = initialKey
    }
  }, [hasInitialized, initialCases, initialFilters, initialPagination])

  // Initialize using URL query params first, then fall back to localStorage, then default India (single-call)
  useEffect(() => {
    const initializeData = async () => {
      if (hasInitialized || initialCases || initialFilters) return

      try {
        // 1) Try URL params
        const qCountry = searchParams.get('country')
        const qState = searchParams.get('state') || undefined
        const qCity = searchParams.get('city') || undefined
        if (qCountry) {
          const params: CasesParams = {
            page: 1,
            country: qCountry,
            state: qState || null,
            city: qCity || null
          }
          await fetchData(params, true)
          setHasAppliedLocationFilters(true)
          setHasInitialized(true)
          return
        }

        // 2) Fall back to localStorage
        const stored = localStorage.getItem('userLocation')
        if (stored) {
          const loc = JSON.parse(stored)
          const params: CasesParams = {
            page: 1,
            country: loc.country || 'India',
            state: loc.state && loc.state !== 'Unknown' ? loc.state : null,
            city: loc.city && loc.city !== 'Unknown' ? loc.city : null
          }
          await fetchData(params, true)
          setHasAppliedLocationFilters(true)
          setHasInitialized(true)
          return
        }

        // 3) Default India
        await fetchData({ page: 1, country: 'India', state: null, city: null }, true)
        setHasAppliedLocationFilters(true)
        
        setHasInitialized(true)
      } catch (error) {
        setHasInitialized(true)
      }
    }

    initializeData()
  }, [hasInitialized, fetchData, searchParams])

  // Listen for location updates in localStorage
  useEffect(() => {
    const applyFromData = async (locationData: any) => {
      const locationFilters: SearchFilters = {
        keyword: "",
        country: locationData.country,
        state: locationData.state !== 'Unknown' ? locationData.state : 'all',
        city: locationData.city !== 'Unknown' ? locationData.city : 'all',
        status: undefined,
        gender: undefined,
        dateFrom: undefined,
        dateTo: undefined
      }
        
      setHasAppliedLocationFilters(true)

      // Fetch cases with location-based filters
      const params: CasesParams = {
        page: 1,
        country: locationData.country,
        state: locationData.state !== 'Unknown' ? locationData.state : null,
        city: locationData.city !== 'Unknown' ? locationData.city : null,
        status: undefined,
        gender: undefined,
        dateFrom: undefined,
        dateTo: undefined,
        keyword: undefined
      }

      await fetchData(params, true)
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userLocation' && e.newValue && !hasAppliedLocationFilters) {
        const locationData = JSON.parse(e.newValue)
        applyFromData(locationData)
      }
    }

    const handleCustomEvent = (e: Event) => {
      if (!hasAppliedLocationFilters) {
        const custom = e as CustomEvent
        const locationData = custom.detail
        if (locationData) {
          applyFromData(locationData)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('location:updated', handleCustomEvent as EventListener)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [hasAppliedLocationFilters, fetchData])

  // Search handler
  const handleSearch = useCallback(async (filters: SearchFilters) => {
    // Reset to first page for a new search
    setPagination(prev => ({ ...prev, currentPage: 1 }))
    setSearchFilters(filters)
    const sp = new URLSearchParams()
    sp.set('page', '1')
    sp.set('country', filters.country)
    if (filters.state && filters.state !== 'all') sp.set('state', filters.state)
    if (filters.city && filters.city !== 'all') sp.set('city', filters.city)
    if (filters.status && filters.status !== 'all') sp.set('status', filters.status)
    if (filters.gender && filters.gender !== 'all') sp.set('gender', filters.gender)
    if (filters.keyword && filters.keyword.trim()) sp.set('keyword', filters.keyword.trim())
    router.replace(`${pathname}?${sp.toString()}`)
  }, [router, pathname])

  // Clear handler
  const handleClear = useCallback(async () => {
    setPagination(prev => ({ ...prev, currentPage: 1 }))
    setSearchFilters(INITIAL_FILTERS)
    const sp = new URLSearchParams()
    sp.set('page', '1')
    sp.set('country', 'India')
    router.replace(`${pathname}?${sp.toString()}`)
  }, [router, pathname])

  // Page change handler
  const handlePageChange = useCallback(async (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }))
    const sp = new URLSearchParams()
    sp.set('page', String(page))
    sp.set('country', searchFilters.country)
    if (searchFilters.state && searchFilters.state !== 'all') sp.set('state', searchFilters.state)
    if (searchFilters.city && searchFilters.city !== 'all') sp.set('city', searchFilters.city)
    if (searchFilters.status && searchFilters.status !== 'all') sp.set('status', searchFilters.status)
    if (searchFilters.gender && searchFilters.gender !== 'all') sp.set('gender', searchFilters.gender)
    if (searchFilters.keyword && searchFilters.keyword.trim()) sp.set('keyword', searchFilters.keyword.trim())
    router.replace(`${pathname}?${sp.toString()}`)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [router, pathname, searchFilters])

  // Unified client-side fetch when filters/page change (after SSR initialization)
  useEffect(() => {
    if (!hasInitialized) return
    const key = JSON.stringify({
      page: apiParams.page || 1,
      country: apiParams.country,
      state: apiParams.state ?? null,
      city: apiParams.city ?? null,
      status: apiParams.status,
      gender: apiParams.gender,
      keyword: apiParams.keyword || undefined,
      dateFrom: apiParams.dateFrom instanceof Date ? apiParams.dateFrom.toISOString() : undefined,
      dateTo: apiParams.dateTo instanceof Date ? apiParams.dateTo.toISOString() : undefined
    })
    if (lastFetchKeyRef.current === key) return
    lastFetchKeyRef.current = key
    // Fire and forget; internal loading state manages UI
    void fetchData(apiParams)
  }, [apiParams, hasInitialized, fetchData])

  // Memoized pagination props to prevent unnecessary re-renders
  const paginationProps = useMemo(() => ({
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    onPageChange: handlePageChange
  }), [pagination.currentPage, pagination.totalPages, handlePageChange])

  // Error dismiss handler
  const handleErrorDismiss = useCallback(() => setError(null), [])

  // Generate results summary text
  const getResultsSummary = useCallback(() => {
    const parts: string[] = []
    
    // Always show country (default is India)
    const country = searchFilters.country || "India"
    parts.push(`in ${country}`)
    
    // Add state if not "all"
    if (searchFilters.state && searchFilters.state !== "all") {
      parts.push(searchFilters.state)
    }
    
    // Add city if not "all"
    if (searchFilters.city && searchFilters.city !== "all") {
      parts.push(searchFilters.city)
    }
    
    // Add status with proper formatting
    if (searchFilters.status && searchFilters.status !== "all") {
      const statusText = searchFilters.status === "missing" ? "missing persons" : 
                        searchFilters.status === "found" ? "found persons" : 
                        `${searchFilters.status} cases`
      parts.push(`for ${statusText}`)
    }
    
    // Add gender with proper formatting
    if (searchFilters.gender && searchFilters.gender !== "all") {
      parts.push(`(${searchFilters.gender})`)
    }
    
    // Add date range with proper formatting
    if (searchFilters.dateFrom || searchFilters.dateTo) {
      const fromDate = searchFilters.dateFrom?.toLocaleDateString() || "any date"
      const toDate = searchFilters.dateTo?.toLocaleDateString() || "present"
      parts.push(`reported between ${fromDate} and ${toDate}`)
    }
    
    // Add keyword search with proper formatting
    if (searchFilters.keyword && searchFilters.keyword.trim()) {
      parts.push(`matching "${searchFilters.keyword.trim()}"`)
    }
    
    return `Showing cases ${parts.join(" ")}`
  }, [searchFilters])

  return (
    <div className="mx-auto w-full md:max-w-none lg:max-w-screen-2xl px-1 sm:px-2 md:px-3 lg:px-4 xl:px-5 py-6">
      {error && (
        <Toast
          message={error}
          type="error"
          onClose={handleErrorDismiss}
        />
      )}

      <CasesSearch 
        onSearch={handleSearch}
        onClear={handleClear}
        loading={loading}
        hasCasesDisplayed={cases.length > 0}
        presetFilters={{ country: searchFilters.country, state: searchFilters.state, city: searchFilters.city }}
        
      />


      {/* Results Summary */}
      <div className="mt-6 px-1">
        <div className="flex items-start gap-2 sm:gap-3 px-4 py-3">
          {isDisplayLoading ? (
            <>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="h-2 w-2 rounded-full bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] flex-shrink-0"></div>
                <div className="h-6 w-64 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded"></div>
              </div>
              <div className="ml-auto mt-0">
                <div className="h-6 w-16 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded-full"></div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2.5"></div>
                <span className="text-base sm:text-lg md:text-xl font-semibold text-foreground leading-snug tracking-tight break-words whitespace-normal">
                  {getResultsSummary()}
                </span>
              </div>
              {pagination.totalCases > 0 && (
                <div className="ml-auto mt-0">
                  <span
                    className="inline-flex items-center px-3 py-1 md:px-3 md:py-1.5 rounded-full text-xs md:text-sm font-medium bg-primary/10 text-primary border border-primary/20 whitespace-nowrap"
                    title={`${pagination.totalCases.toLocaleString()} results`}
                    aria-label={`${pagination.totalCases.toLocaleString()} results`}
                  >
                    {new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(pagination.totalCases)} results
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-6">
        <CasesGrid
          cases={memoizedCases}
          loading={isDisplayLoading}
          emptyMessage="No cases found for the selected criteria"
          highlightQuery={searchFilters.keyword}
        />
      </div>

      {!isDisplayLoading && cases.length > 0 && (
        <div className="mt-8">
          <Pagination {...paginationProps} />
        </div>
      )}
    </div>
  )
} 