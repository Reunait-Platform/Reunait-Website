"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import dynamic from "next/dynamic"

const SmartDateRangePicker = dynamic(
  () => import("@/components/ui/smart-date-range-picker").then((mod) => mod.SmartDateRangePicker),
  {
    loading: () => <div className="h-10 w-full border-2 border-border rounded-lg bg-muted/30 animate-pulse" />,
    ssr: false
  }
)
import { Search, User, Shield, MapPin, ChevronDown, ChevronUp, Filter, ChevronRight, X } from "lucide-react"
import { CountriesStatesService } from "@/lib/countries-states"
import { type Case } from "@/lib/api"
import { useRouter } from "next/navigation"
import { useUser, useAuth } from "@clerk/nextjs"
import { useNavigationLoader } from "@/hooks/use-navigation-loader"
import { SimpleLoader } from "@/components/ui/simple-loader"
import { SITE_CONFIG } from "@/lib/seo-config"

const defaultCountry = SITE_CONFIG.region.toLowerCase() === "global" ? "India" : SITE_CONFIG.region

export interface SearchFilters {
  keyword: string
  country: string
  state: string
  city: string
  status: "missing" | "found" | "all" | undefined
  gender: "male" | "female" | "other" | "all" | undefined
  dateFrom: Date | undefined
  dateTo: Date | undefined
}

interface SuggestionItem {
  _id: string
  fullName: string
  age?: string | number
  gender?: "male" | "female" | "other"
}

interface UserSearchResult {
  clerkUserId: string
  fullName?: string
  email?: string
  phoneNumber?: string
  age?: number
  gender?: string
  url?: string
}

// Type for user suggestions displayed in dropdown (extends Case but makes location fields optional)
type UserSuggestion = Omit<Case, 'status' | 'city' | 'state' | 'country' | 'dateMissingFound' | 'reportedBy'> & {
  email?: string
  phoneNumber?: string
  url: string | null
  clerkUserId: string | null
}

interface CasesSearchProps {
  onSearch: (filters: SearchFilters) => void
  onClear: () => void
  loading?: boolean
  hasCasesDisplayed?: boolean
  presetFilters?: Partial<SearchFilters>
}

// Initial filter state
const INITIAL_FILTERS: SearchFilters = {
  keyword: "",
  country: defaultCountry,
  state: "all",
  city: "all",
  status: undefined,
  gender: undefined,
  dateFrom: undefined,
  dateTo: undefined
}

export function CasesSearch({ onSearch, onClear, hasCasesDisplayed = false, presetFilters }: CasesSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>(INITIAL_FILTERS)
  const [mounted, setMounted] = useState(false)
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()
  const { isLoading: isNavigating, mounted: loaderMounted, startLoading } = useNavigationLoader()
  const inputWrapperRef = useRef<HTMLDivElement | null>(null)
  const { user } = useUser()
  const { getToken } = useAuth()
  const skipFirstFilterSearchRef = useRef(true)
  const skipFirstKeywordSearchRef = useRef(true)
  const skipNormalizeOnceRef = useRef(false)

  // Derived location lists based on selected country and state
  const countries = useMemo(() => {
    return CountriesStatesService.getCountries()
  }, [])

  const states = useMemo(() => {
    return filters.country ? CountriesStatesService.getStates(filters.country) : []
  }, [filters.country])

  const cities = useMemo(() => {
    return filters.country && filters.state && filters.state !== 'all'
      ? CountriesStatesService.getCities(filters.country, filters.state)
      : []
  }, [filters.country, filters.state])

  // Avoid SSR rendering of Radix Select to prevent hydration ID mismatches and check screen size
  useEffect(() => {
    setMounted(true)
    const checkMobile = () => {
      setIsMobileDevice(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Get user role from Clerk metadata
  const userRole = useMemo(() => {
    if (!user?.publicMetadata) return 'general_user'
    return (user.publicMetadata as { role?: string })?.role || 'general_user'
  }, [user])

  // Check if current search is a user search (police or volunteer typing "user:")
  const isUserSearch = useMemo(() => {
    const keyword = (filters.keyword || "").toLowerCase().trim()
    return (userRole === 'police' || userRole === 'volunteer') && keyword.startsWith('user:')
  }, [filters.keyword, userRole])

  // Show dropdown only when: police/volunteer + user: search + no cases displayed
  const shouldShowDropdown = useMemo(() => {
    return isUserSearch && !hasCasesDisplayed
  }, [isUserSearch, hasCasesDisplayed])


  // Memoized active filters count (excludes status since it has dedicated buttons)
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.country !== defaultCountry) count++
    if (filters.state !== "all") count++
    if (filters.city !== "all") count++
    if (filters.gender && filters.gender !== "all") count++
    // Count date filter as 1 if either date is set
    if (filters.dateFrom instanceof Date || filters.dateTo instanceof Date) count++
    return count
  }, [filters])

  // Memoized filter change handler to prevent recreation
  const createFilterChangeHandler = useMemo(() => {
    return (key: keyof SearchFilters) => (value: string | Date | undefined) => {
      setFilters(prev => ({ ...prev, [key]: value }))
    }
  }, [])

  // Memoized status filter handlers
  const handleMissingFilter = useCallback(() => 
    createFilterChangeHandler("status")(filters.status === "missing" ? "all" : "missing"), 
    [createFilterChangeHandler, filters.status]
  )

  const handleFoundFilter = useCallback(() => 
    createFilterChangeHandler("status")(filters.status === "found" ? "all" : "found"), 
    [createFilterChangeHandler, filters.status]
  )

  // Update filters when cached location is available (only if no preset filters were provided)
  useEffect(() => {
    if (presetFilters) return
    const storedLocation = localStorage.getItem('userLocation')
    if (storedLocation) {
      const locationData = JSON.parse(storedLocation)
      const locationFilters = {
        country: locationData.country,
        state: locationData.state !== 'Unknown' ? locationData.state : 'all',
        city: locationData.city !== 'Unknown' ? locationData.city : 'all'
      }
      skipNormalizeOnceRef.current = true
      skipFirstFilterSearchRef.current = true
      skipFirstKeywordSearchRef.current = true
      setFilters(prev => ({ ...prev, ...locationFilters }))
    }
  }, [presetFilters])

  // Sync initial preset filters from URL/localStorage without triggering auto-search
  // This should run only once for initial hydration, not on every user filter change
  const presetAppliedRef = useRef(false)
  useEffect(() => {
    if (!presetFilters || presetAppliedRef.current) return
    const next: Partial<SearchFilters> = {}
    if (presetFilters.country && presetFilters.country !== filters.country) next.country = presetFilters.country
    // Only override state/city if provided in preset; otherwise preserve existing selections
    if (typeof presetFilters.state === 'string' && presetFilters.state.length > 0 && presetFilters.state !== filters.state) next.state = presetFilters.state
    if (typeof presetFilters.city === 'string' && presetFilters.city.length > 0 && presetFilters.city !== filters.city) next.city = presetFilters.city
    if (Object.keys(next).length > 0) {
      presetAppliedRef.current = true
      skipNormalizeOnceRef.current = true
      skipFirstFilterSearchRef.current = true
      skipFirstKeywordSearchRef.current = true
      setFilters(prev => ({ ...prev, ...next }))
    } else {
      // Mark as applied to avoid re-running for the same preset set
      presetAppliedRef.current = true
    }
  }, [presetFilters])

  const handleCountryChange = useCallback((value: string) => {
    setFilters(prev => ({
      ...prev,
      country: value,
      state: "all",
      city: "all"
    }))
  }, [])

  const handleStateChange = useCallback((value: string) => {
    setFilters(prev => ({
      ...prev,
      state: value,
      city: "all"
    }))
  }, [])

  // Memoized handlers

  const handleClear = useCallback(() => {
    setFilters(INITIAL_FILTERS)
    onClear()
  }, [onClear])

  // Auto-search when filters change (except keyword for debounced suggestions)
  useEffect(() => {
    if (skipFirstFilterSearchRef.current) {
      skipFirstFilterSearchRef.current = false
      return
    }
    const timeoutId = setTimeout(() => {
      onSearch(filters)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [filters, onSearch])

  // Get active filter chips (excludes status since it has dedicated buttons)
  const getActiveFilters = useCallback(() => {
    const active: Array<{ key: string; label: string; value: string }> = []
    
    if (filters.country !== defaultCountry) {
      active.push({ key: "country", label: "Country", value: filters.country })
    }
    if (filters.state !== "all") {
      active.push({ key: "state", label: "State", value: filters.state })
    }
    if (filters.city !== "all") {
      active.push({ key: "city", label: "City", value: filters.city })
    }
    // Note: Status is excluded since it has dedicated Missing/Found buttons
    if (filters.gender && filters.gender !== "all") {
      active.push({ key: "gender", label: "Gender", value: filters.gender })
    }
    if (filters.dateFrom || filters.dateTo) {
      const dateRange = `${filters.dateFrom?.toLocaleDateString() || "..."} - ${filters.dateTo?.toLocaleDateString() || "..."}`
      active.push({ key: "dateRange", label: "Date Range", value: dateRange })
    }
    
    return active
  }, [filters])

  const removeFilter = useCallback((key: string) => {
    setFilters(prev => {
      const newFilters = { ...prev }
      switch (key) {
        case "country":
          newFilters.country = defaultCountry
          break
        case "state":
          newFilters.state = "all"
          break
        case "city":
          newFilters.city = "all"
          break
        case "status":
          newFilters.status = undefined
          break
        case "gender":
          newFilters.gender = undefined
          break
        case "dateRange":
          newFilters.dateFrom = undefined
          newFilters.dateTo = undefined
          break
      }
      return newFilters
    })
  }, [])

  const toggleAdvancedFilters = useCallback(() => {
    setIsAdvancedOpen(prev => !prev)
  }, [])

  // Debounced user search suggestions (only for police typing "user:")
  useEffect(() => {
    const keyword = (filters.keyword || "").trim()
    if (debounceRef.current) clearTimeout(debounceRef.current)

    // Only show suggestions for police user searches
    if (!isUserSearch || keyword.length === 0) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    // Extract search term after "user:" and check minimum length before setting timeout
    const searchTerm = keyword.substring(5).trim() // Remove "user:" prefix
    
    // Require minimum 3 characters - don't even set timeout if less than 3
    if (searchTerm.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      setSuggestionsLoading(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {

        // Only set loading and make API call if we have at least 3 characters
        setSuggestionsLoading(true)
        
        // Call user search API
        const token = await getToken()
        
        if (!token) {
          setSuggestions([])
          setShowSuggestions(false)
          return
        }

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
        if (!backendUrl) {
          console.error('NEXT_PUBLIC_BACKEND_URL is not configured')
        setSuggestions([])
          setShowSuggestions(false)
          return
        }

        const url = new URL(`${backendUrl}/api/users/search`)
        url.searchParams.append("query", searchTerm)

        const response = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: AbortSignal.timeout(10000)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        
        if (data.success && Array.isArray(data.data)) {
          // Transform user data to UserSuggestion type for dropdown display
          const userSuggestions: UserSuggestion[] = (data.data as UserSearchResult[]).map((user) => ({
            _id: user.clerkUserId || `user-${Math.random()}`, // Use clerkUserId as _id for React key compatibility
            fullName: user.fullName || user.email || "Unknown User",
            age: user.age?.toString() || "",
            gender: (user.gender as "male" | "female" | "other") || "other",
            // Location fields are optional for user suggestions
            email: user.email,
            phoneNumber: user.phoneNumber,
            url: user.url || null,
            clerkUserId: user.clerkUserId || null
          }))
          
          setSuggestions(userSuggestions)
          setShowSuggestions(true)
        } else {
          setSuggestions([])
          setShowSuggestions(true)
        }
      } catch (error: unknown) {
        const err = error as { name?: string; message?: string }
        if (err.name === 'AbortError' || err.name === 'TimeoutError') {
          console.error("Request timeout: Backend server may not be responding")
        } else {
          console.error("Error searching users:", err.message || error)
        }
        setSuggestions([])
        setShowSuggestions(false)
      } finally {
        setSuggestionsLoading(false)
      }
    }, 300) // Restored original 300ms debouncing

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [filters.keyword, isUserSearch, getToken])

  // Auto-search when keyword changes (restored original debouncing)
  useEffect(() => {
    const keyword = (filters.keyword || "").trim()
    if (keyword.length === 0) {
      if (skipFirstKeywordSearchRef.current) {
        skipFirstKeywordSearchRef.current = false
        return
      }
      onSearch(filters)
      return
    }
    
    // Require minimum 3 characters before making API call
    if (keyword.length < 3) {
      return // Don't set timeout, don't make API call
    }
    
    const timeoutId = setTimeout(() => {
      onSearch(filters)
    }, 300) // Restored original 300ms debouncing

    return () => clearTimeout(timeoutId)
  }, [filters, onSearch])




  const handleSuggestionClick = useCallback((item: SuggestionItem) => {
    setShowSuggestions(false)
    
    // Type guard: check if item is a UserSuggestion (has email or phoneNumber)
    const userItem = item as UserSuggestion
    const isUserResult = 'email' in userItem && (userItem.email || userItem.phoneNumber)
    if (isUserResult && userItem.url) {
      // For user results, navigate to user profile using url
      startLoading({ expectRouteChange: true })
      router.push(userItem.url)
    } else {
      // For case results, navigate to case detail page
      startLoading({ expectRouteChange: true })
      router.push(`/cases/${item._id}`)
    }
  }, [router, startLoading])

  // Simple highlighter for matched query
  const Highlight = useCallback(({ text, query }: { text?: string; query: string }) => {
    const value = text || ""
    if (!query) return <span className="tracking-normal leading-tight">{value}</span>
    const lower = value.toLowerCase()
    const q = query.toLowerCase()
    const idx = lower.indexOf(q)
    if (idx === -1) return <span className="tracking-normal leading-tight">{value}</span>

    const before = value.slice(0, idx)
    const match = value.slice(idx, idx + query.length)
    const after = value.slice(idx + query.length)

    return (
      <span className="tracking-normal leading-tight">
        {before}
        {<mark className="bg-yellow-200/60 dark:bg-yellow-300/30 rounded-[2px] px-0 py-0 m-0 align-baseline">{match}</mark>}
        {after}
      </span>
    )
  }, [])

  return (
    <>
    <Card className="border border-border bg-card/90 backdrop-blur-md overflow-hidden">
      <CardContent className="pt-0 -mb-4 px-4">
        <div className="space-y-4">

          {/* Search Bar and Quick Actions */}
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 lg:gap-6 items-stretch md:items-center">
            {/* Compact Search Input */}
            <div ref={inputWrapperRef} className="relative w-full md:flex-1 lg:flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Name, mobile, or case reference number..."
                value={filters.keyword}
                onChange={(e) => createFilterChangeHandler("keyword")(e.target.value)}
                className="pl-10 h-10 text-sm md:text-base border-2 border-border bg-background/80 focus:bg-background transition-all duration-300 hover:bg-background/90 rounded-lg cursor-text"
                onFocus={() => { if (shouldShowDropdown) { setShowSuggestions(true) } }}
                onBlur={() => { 
                  setTimeout(() => {
                    setShowSuggestions(false)
                  }, 150) 
                }}
                disabled={isNavigating}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowSuggestions(false)
                  }
                }}
              />

              {shouldShowDropdown && showSuggestions && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 bg-popover border border-border rounded-lg shadow-lg max-h-80 overflow-auto w-full">
                  {suggestionsLoading && (
                    <div className="px-4 py-4 text-sm text-muted-foreground text-center">Searching users…</div>
                  )}
                  {!suggestionsLoading && suggestions.length === 0 && (
                    <div className="px-4 py-4 text-sm text-muted-foreground text-center">No users found. Try searching by name, email, or phone number.</div>
                  )}
                  {!suggestionsLoading && suggestions.map((item, idx) => {
                    // Extract search term after "user:" for highlighting
                    const searchTerm = (filters.keyword || "").substring(5).trim()
                    // Check if this is a user result (has email or phoneNumber)
                    const userItem = item as Case & { email?: string; phoneNumber?: string; age?: string | number; gender?: string }
                    const isUserResult = userItem.email || userItem.phoneNumber
                    
                    return (
                    <button
                      key={item._id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSuggestionClick(item)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors duration-150 hover:bg-accent/50 focus:bg-accent focus:outline-none cursor-pointer ${idx > 0 ? 'border-t border-border/50' : ''}`}
                    >
                        <div className="flex-1 min-w-0 space-y-1.5 overflow-hidden">
                          {/* Name row with badge */}
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium text-foreground truncate min-w-0 flex-1" title={item.fullName}>
                              <Highlight text={item.fullName} query={searchTerm} />
                            </span>
                            <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-md bg-primary/10 text-primary shrink-0">
                              User
                            </span>
                          </div>
                          
                          {/* Details row */}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground min-w-0">
                            {isUserResult ? (
                              <>
                                {userItem.email && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 text-foreground/70 min-w-0 max-w-[calc(100%-8px)] overflow-hidden" title={userItem.email}>
                                    <span className="truncate block">
                                      <Highlight text={userItem.email} query={searchTerm} />
                                    </span>
                                  </span>
                                )}
                                {userItem.phoneNumber && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 text-foreground/70 min-w-0 max-w-[calc(100%-8px)] overflow-hidden" title={userItem.phoneNumber}>
                                    <span className="truncate block">
                                      <Highlight text={userItem.phoneNumber} query={searchTerm} />
                                    </span>
                                  </span>
                                )}
                                {userItem.age !== undefined && userItem.age !== null && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 text-foreground/70 shrink-0 whitespace-nowrap">
                                    {userItem.age} years
                                  </span>
                                )}
                                {userItem.gender && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 text-foreground/70 capitalize shrink-0 whitespace-nowrap">
                                    {String(userItem.gender)}
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                          {item.age && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 text-foreground/70 shrink-0 whitespace-nowrap">{item.age} years</span>
                          )}
                          {item.gender && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 text-foreground/70 capitalize shrink-0 whitespace-nowrap">{item.gender}</span>
                                )}
                              </>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 ml-1" />
                    </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Main Action Buttons + Advanced Filters Toggle */}
            <div className="relative flex-1 min-w-0">
              <div className="flex items-center gap-2 md:gap-3 overflow-x-auto no-scrollbar pb-1 md:pb-0 w-full md:w-auto min-w-0 pr-6 md:pr-0">
                <Button
                  variant={filters.status === "missing" ? "default" : "outline"}
                  size="sm"
                  onClick={handleMissingFilter}
                  className="flex items-center gap-1 sm:gap-1.5 h-11 md:h-9 px-3.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer shrink-0"
                >
                  <User className="w-3 h-3 sm:w-4 sm:h-4" />
                  Missing
                </Button>
                <Button
                  variant={filters.status === "found" ? "default" : "outline"}
                  size="sm"
                  onClick={handleFoundFilter}
                  className="flex items-center gap-1 sm:gap-1.5 h-11 md:h-9 px-3.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer shrink-0"
                >
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                  Found
                </Button>
                
                {/* Advanced Filters Popover (Desktop) / Drawer (Mobile) */}
                {isMobileDevice ? (
                  <Drawer open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                    <DrawerTrigger asChild>
                      <Button 
                        variant="outline"
                        className="flex items-center gap-1 sm:gap-1.5 h-11 md:h-9 px-3.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer shrink-0"
                      >
                        <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">More Filters</span>
                        <span className="sm:hidden">More</span>
                        {activeFiltersCount > 0 && (
                          <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary rounded-full shrink-0">
                            {activeFiltersCount}
                          </span>
                        )}
                        <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                      </Button>
                    </DrawerTrigger>
                    <DrawerContent className="px-6 pb-8">
                      <DrawerHeader className="px-0">
                        <DrawerTitle>Refine Search</DrawerTitle>
                        <DrawerDescription>Filter missing cases by location, gender, or date range.</DrawerDescription>
                      </DrawerHeader>
                      <div className="space-y-4 pt-2 overflow-y-auto max-h-[50vh]">
                        {/* Country Filter */}
                        <div className="space-y-1.5 min-w-0">
                          <Label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            Country
                          </Label>
                          {mounted ? (
                            <Select value={filters.country} onValueChange={handleCountryChange}>
                              <SelectTrigger className="h-10 w-full min-w-0 border-2 border-border bg-background/80 focus:bg-background transition-all duration-300 hover:bg-background/90 rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0 focus-visible:border-ring cursor-pointer">
                                <SelectValue placeholder="Select country" className="truncate" />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                {countries.map((country) => (
                                  <SelectItem key={country} value={country} className="text-sm">
                                    {country}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="h-10 w-full border-2 border-border rounded-lg bg-muted/30" />
                          )}
                        </div>

                        {/* State Filter */}
                        <div className="space-y-1.5 min-w-0">
                          <Label className="text-xs sm:text-sm font-semibold text-foreground">State</Label>
                          {mounted ? (
                            <Select value={filters.state} onValueChange={handleStateChange}>
                              <SelectTrigger className="h-10 w-full min-w-0 border-2 border-border bg-background/80 focus:bg-background transition-all duration-300 hover:bg-background/90 rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0 focus-visible:border-ring cursor-pointer">
                                <SelectValue placeholder="Select state" className="truncate" />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                <SelectItem value="all" className="text-sm">All States</SelectItem>
                                {states.map((state) => (
                                  <SelectItem key={state} value={state} className="text-sm">
                                    {state}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="h-10 w-full border-2 border-border rounded-lg bg-muted/30" />
                          )}
                        </div>

                        {/* City Filter */}
                        <div className="space-y-1.5 min-w-0">
                          <Label className="text-xs sm:text-sm font-semibold text-foreground">City</Label>
                          {mounted ? (
                            <Select value={filters.city} onValueChange={(value) => createFilterChangeHandler("city")(value)}>
                              <SelectTrigger className="h-10 w-full min-w-0 border-2 border-border bg-background/80 focus:bg-background transition-all duration-300 hover:bg-background/90 rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0 focus-visible:border-ring cursor-pointer">
                                <SelectValue placeholder="Select city" className="truncate" />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                <SelectItem value="all" className="text-sm">All Cities</SelectItem>
                                {cities.map((city) => (
                                  <SelectItem key={city} value={city} className="text-sm">
                                    {city}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="h-10 w-full border-2 border-border rounded-lg bg-muted/30" />
                          )}
                        </div>

                        {/* Gender Filter */}
                        <div className="space-y-1.5 min-w-0">
                          <Label className="text-xs sm:text-sm font-semibold text-foreground">Gender</Label>
                          {mounted ? (
                            <Select value={filters.gender || "all"} onValueChange={(value) => createFilterChangeHandler("gender")(value)}>
                              <SelectTrigger className="h-10 w-full min-w-0 border-2 border-border bg-background/80 focus:bg-background transition-all duration-300 hover:bg-background/90 rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0 focus-visible:border-ring cursor-pointer">
                                <SelectValue placeholder="Select gender" className="truncate" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all" className="text-sm">All Genders</SelectItem>
                                <SelectItem value="male" className="text-sm">Male</SelectItem>
                                <SelectItem value="female" className="text-sm">Female</SelectItem>
                                <SelectItem value="other" className="text-sm">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="h-10 w-full border-2 border-border rounded-lg bg-muted/30" />
                          )}
                        </div>

                        {/* Smart Date Range Picker */}
                        <div className="space-y-1.5 min-w-0 col-span-2">
                          <Label className="text-xs sm:text-sm font-semibold text-foreground">Date Range</Label>
                          {mounted ? (
                            <SmartDateRangePicker
                              dateFrom={filters.dateFrom}
                              dateTo={filters.dateTo}
                              onDateChange={(dateFrom, dateTo) => {
                                createFilterChangeHandler("dateFrom")(dateFrom)
                                createFilterChangeHandler("dateTo")(dateTo)
                              }}
                              placeholder="Select date or range"
                              className="w-full"
                            />
                          ) : (
                            <div className="h-10 w-full border-2 border-border rounded-lg bg-muted/30" />
                          )}
                        </div>
                      </div>
                    </DrawerContent>
                  </Drawer>
                ) : (
                  <Popover open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline"
                        className="flex items-center gap-1 sm:gap-1.5 h-11 md:h-9 px-3.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer shrink-0"
                      >
                        <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">
                          {isAdvancedOpen ? "Hide Filters" : "More Filters"}
                        </span>
                        <span className="sm:hidden">
                          {isAdvancedOpen ? "Hide" : "More"}
                        </span>
                        {activeFiltersCount > 0 && (
                          <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary rounded-full shrink-0">
                            {activeFiltersCount}
                          </span>
                        )}
                        {isAdvancedOpen ? (
                          <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                        ) : (
                          <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[500px] p-6" align="end">
                      <h4 className="font-semibold leading-none mb-4 text-base">Refine Search</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Country Filter */}
                        <div className="space-y-1.5 min-w-0">
                          <Label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            Country
                          </Label>
                          {mounted ? (
                            <Select value={filters.country} onValueChange={handleCountryChange}>
                              <SelectTrigger className="h-10 w-full min-w-0 border-2 border-border bg-background/80 focus:bg-background transition-all duration-300 hover:bg-background/90 rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0 focus-visible:border-ring cursor-pointer">
                                <SelectValue placeholder="Select country" className="truncate" />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                {countries.map((country) => (
                                  <SelectItem key={country} value={country} className="text-sm">
                                    {country}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="h-10 w-full border-2 border-border rounded-lg bg-muted/30" />
                          )}
                        </div>

                        {/* State Filter */}
                        <div className="space-y-1.5 min-w-0">
                          <Label className="text-xs sm:text-sm font-semibold text-foreground">State</Label>
                          {mounted ? (
                            <Select value={filters.state} onValueChange={handleStateChange}>
                              <SelectTrigger className="h-10 w-full min-w-0 border-2 border-border bg-background/80 focus:bg-background transition-all duration-300 hover:bg-background/90 rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0 focus-visible:border-ring cursor-pointer">
                                <SelectValue placeholder="Select state" className="truncate" />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                <SelectItem value="all" className="text-sm">All States</SelectItem>
                                {states.map((state) => (
                                  <SelectItem key={state} value={state} className="text-sm">
                                    {state}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="h-10 w-full border-2 border-border rounded-lg bg-muted/30" />
                          )}
                        </div>

                        {/* City Filter */}
                        <div className="space-y-1.5 min-w-0">
                          <Label className="text-xs sm:text-sm font-semibold text-foreground">City</Label>
                          {mounted ? (
                            <Select value={filters.city} onValueChange={(value) => createFilterChangeHandler("city")(value)}>
                              <SelectTrigger className="h-10 w-full min-w-0 border-2 border-border bg-background/80 focus:bg-background transition-all duration-300 hover:bg-background/90 rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0 focus-visible:border-ring cursor-pointer">
                                <SelectValue placeholder="Select city" className="truncate" />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                <SelectItem value="all" className="text-sm">All Cities</SelectItem>
                                {cities.map((city) => (
                                  <SelectItem key={city} value={city} className="text-sm">
                                    {city}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="h-10 w-full border-2 border-border rounded-lg bg-muted/30" />
                          )}
                        </div>

                        {/* Gender Filter */}
                        <div className="space-y-1.5 min-w-0">
                          <Label className="text-xs sm:text-sm font-semibold text-foreground">Gender</Label>
                          {mounted ? (
                            <Select value={filters.gender || "all"} onValueChange={(value) => createFilterChangeHandler("gender")(value)}>
                              <SelectTrigger className="h-10 w-full min-w-0 border-2 border-border bg-background/80 focus:bg-background transition-all duration-300 hover:bg-background/90 rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0 focus-visible:border-ring cursor-pointer">
                                <SelectValue placeholder="Select gender" className="truncate" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all" className="text-sm">All Genders</SelectItem>
                                <SelectItem value="male" className="text-sm">Male</SelectItem>
                                <SelectItem value="female" className="text-sm">Female</SelectItem>
                                <SelectItem value="other" className="text-sm">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="h-10 w-full border-2 border-border rounded-lg bg-muted/30" />
                          )}
                        </div>

                        {/* Smart Date Range Picker */}
                        <div className="space-y-1.5 min-w-0 col-span-2">
                          <Label className="text-xs sm:text-sm font-semibold text-foreground">Date Range</Label>
                          {mounted ? (
                            <SmartDateRangePicker
                              dateFrom={filters.dateFrom}
                              dateTo={filters.dateTo}
                              onDateChange={(dateFrom, dateTo) => {
                                createFilterChangeHandler("dateFrom")(dateFrom)
                                createFilterChangeHandler("dateTo")(dateTo)
                              }}
                              placeholder="Select date or range"
                              className="w-full"
                            />
                          ) : (
                            <div className="h-10 w-full border-2 border-border rounded-lg bg-muted/30" />
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                {/* Clear All Filters Button */}
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  disabled={activeFiltersCount === 0}
                  className="flex items-center gap-1.5 h-11 md:h-9 px-3.5 rounded-lg text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer shrink-0"
                >
                  <span className="hidden sm:inline">Clear All</span>
                  <span className="sm:hidden">Clear</span>
                </Button>
              {/* Fade out right indicator for mobile quick action scroll */}
              <div className="absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-card to-transparent pointer-events-none block md:hidden" />
            </div>
          </div>
        </div>

          {/* Active Filter Chips */}
          {getActiveFilters().length > 0 && (
            <div className="px-1 relative">
              <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap sm:flex-wrap sm:overflow-visible sm:whitespace-normal no-scrollbar pr-8 sm:pr-0">
                <span className="text-sm text-muted-foreground font-medium flex-shrink-0">Active filters:</span>
                {getActiveFilters().map((filter) => (
                  <div
                    key={filter.key}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-medium flex-shrink-0 sm:flex-shrink"
                    title={`${filter.label}: ${filter.value}`}
                  >
                    <span className="max-w-[60vw] sm:max-w-xs md:max-w-none truncate">
                      {filter.label}: {filter.value}
                    </span>
                    <button
                      onClick={() => removeFilter(filter.key)}
                      className="ml-1 hover:bg-primary/20 rounded-full p-0.5 transition-colors cursor-pointer"
                      aria-label={`Remove ${filter.label}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              {/* Fade out right indicator for active chips scroll on mobile */}
              <div className="absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-card to-transparent pointer-events-none block sm:hidden" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    {loaderMounted && isNavigating && typeof window !== 'undefined' && createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <SimpleLoader />
      </div>,
      document.body
    )}
  </>
  )
} 