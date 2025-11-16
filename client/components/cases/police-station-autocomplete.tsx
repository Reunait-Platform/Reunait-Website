"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { createPortal } from "react-dom"
import { Input } from "@/components/ui/input"
import { useAuth } from "@clerk/nextjs"
import { ChevronRight } from "lucide-react"
import { CountriesStatesService } from "@/lib/countries-states"

interface PoliceStation {
  id: string
  name: string
  city: string
  state: string
  country: string
}

interface PoliceStationAutocompleteProps {
  value: string // Display value (station name)
  selectedStationId: string | null // Selected station ID
  onStationSelect: (station: PoliceStation | null) => void
  onInputChange: (value: string) => void
  country: string
  state: string
  city: string
  error?: string
  required?: boolean
  placeholder?: string
  id?: string
}

export function PoliceStationAutocomplete({
  value,
  selectedStationId,
  onStationSelect,
  onInputChange,
  country,
  state,
  city,
  error,
  placeholder = "Start typing to search...",
  id = "policeStationName"
}: PoliceStationAutocompleteProps) {
  const { getToken } = useAuth()
  const [stations, setStations] = useState<PoliceStation[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputWrapperRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const lastEmptyQueryRef = useRef<string | null>(null) // Track last query that returned empty results

  // Determine if location is complete based on country's state/city structure
  const isLocationComplete = useMemo(() => {
    if (!country || !country.trim()) return false
    
    // Get available states for the country
    const availableStates = CountriesStatesService.getStates(country.trim())
    
    // If country has states, state is required
    if (availableStates.length > 0) {
      if (!state || !state.trim()) return false
      
      // If state has cities, city is required
      const availableCities = CountriesStatesService.getCities(country.trim(), state.trim())
      if (availableCities.length > 0) {
        return Boolean(city && city.trim())
      }
      // State has no cities, so state alone is enough
      return true
    }
    
    // Country has no states, so country alone is enough
    return true
  }, [country, state, city])

  // Update dropdown position
  const updateDropdownPosition = useCallback(() => {
    if (!inputWrapperRef.current || typeof window === 'undefined') return
    const rect = inputWrapperRef.current.getBoundingClientRect()
    setDropdownRect({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: rect.width
    })
  }, [])

  // Debounced search function (query can be empty to show all stations)
  const searchStations = useCallback(async (query: string = "") => {
    if (!isLocationComplete) {
      setStations([])
      setShowDropdown(false)
      return
    }

    try {
      const token = await getToken()
      if (!token) {
        setStations([])
        setShowDropdown(false)
        return
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
      if (!backendUrl) {
        console.error('NEXT_PUBLIC_BACKEND_URL is not configured')
        setStations([])
        setShowDropdown(false)
        return
      }
      
      const url = new URL(`${backendUrl}/api/police-stations/search`)
      url.searchParams.append("country", country.trim())
      if (state && state.trim()) {
        url.searchParams.append("state", state.trim())
      }
      if (city && city.trim()) {
        url.searchParams.append("city", city.trim())
      }
      // Only append query if it's not empty (backend returns all stations if query is empty)
      if (query && query.trim()) {
        url.searchParams.append("query", query.trim())
      }

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
        setStations(data.data)
        if (data.data.length > 0) {
          // Reset last empty query since we got results
          lastEmptyQueryRef.current = null
          updateDropdownPosition()
          setShowDropdown(true)
        } else {
          // Track query that returned empty results (only if query is not empty)
          if (query && query.trim()) {
            lastEmptyQueryRef.current = query.trim().toLowerCase()
          } else {
            lastEmptyQueryRef.current = null
          }
          setShowDropdown(false)
        }
      } else {
        setStations([])
        if (query && query.trim()) {
          lastEmptyQueryRef.current = query.trim().toLowerCase()
        }
        setShowDropdown(false)
      }
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string }
      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        console.error("Request timeout: Backend server may not be responding")
      } else if (error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
        console.error("Connection timeout: Make sure the backend server is running")
      } else {
        console.error("Error searching police stations:", error.message || error)
      }
      setStations([])
      setShowDropdown(false)
    }
  }, [country, state, city, isLocationComplete, getToken, updateDropdownPosition])

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    const trimmedValue = newValue.trim().toLowerCase()
    onInputChange(newValue)

    // Clear selected station if user is typing
    if (selectedStationId) {
      onStationSelect(null)
    }

    // Optimize: Skip API call if extending a query that returned empty
    if (lastEmptyQueryRef.current && trimmedValue && trimmedValue.length > 0) {
      // If current query is longer and starts with the last empty query, skip API call
      if (trimmedValue.startsWith(lastEmptyQueryRef.current) && trimmedValue.length > lastEmptyQueryRef.current.length) {
        // User is extending an empty query - still will be empty, skip API call
        setStations([])
        setShowDropdown(false)
        return
      }
      // If query changed (not just extending), reset and allow API call
      if (!trimmedValue.startsWith(lastEmptyQueryRef.current)) {
        lastEmptyQueryRef.current = null
      }
    }

    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new debounce timer (500ms delay) - works with any length including empty
    debounceTimerRef.current = setTimeout(() => {
      if (isLocationComplete) {
        searchStations(newValue)
      } else {
        setStations([])
        setShowDropdown(false)
      }
    }, 500)
  }

  // Handle station selection
  const handleStationSelect = (station: PoliceStation) => {
    onStationSelect(station)
    onInputChange(station.name)
    setShowDropdown(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Keep dropdown aligned on resize/scroll while visible
  useEffect(() => {
    if (!showDropdown) return
    updateDropdownPosition()
    const onScroll = () => updateDropdownPosition()
    const onResize = () => updateDropdownPosition()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [showDropdown, updateDropdownPosition])

  // Reset dropdown when country changes (state/city are optional)
  useEffect(() => {
    setStations([])
    setShowDropdown(false)
    onStationSelect(null)
    lastEmptyQueryRef.current = null // Reset empty query tracking
  }, [country]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return (
    <div className="space-y-2 relative" ref={inputWrapperRef}>
      <Input
        id={id}
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onFocus={() => {
          if (isLocationComplete) {
            // Call API on focus to show all available stations for the location
            searchStations(value || "")
          } else if (stations.length > 0) {
            // If location incomplete but we have cached stations, show them
            updateDropdownPosition()
            setShowDropdown(true)
          }
        }}
        onBlur={() => {
          setTimeout(() => setShowDropdown(false), 150)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setShowDropdown(false)
          }
        }}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-autocomplete="list"
        aria-controls={showDropdown ? `${id}-listbox` : undefined}
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
        disabled={!isLocationComplete}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
      {!isLocationComplete && (
        <p className="text-xs text-muted-foreground">
          {!country || !country.trim() 
            ? "Please select country first"
            : (() => {
                const availableStates = CountriesStatesService.getStates(country.trim())
                if (availableStates.length > 0) {
                  if (!state || !state.trim()) {
                    return "Please select state"
                  }
                  const availableCities = CountriesStatesService.getCities(country.trim(), state.trim())
                  if (availableCities.length > 0 && (!city || !city.trim())) {
                    return "Please select city"
                  }
                }
                return "Please complete location selection"
              })()}
        </p>
      )}

      {/* Dropdown - only show when there are stations */}
      {showDropdown && stations.length > 0 && dropdownRect && typeof window !== 'undefined' && createPortal(
        <div
          id={`${id}-listbox`}
          ref={dropdownRef}
          role="listbox"
          aria-label="Police station search results"
          className="absolute z-40 bg-popover border border-border rounded-lg shadow-lg max-h-80 overflow-auto"
          style={{ top: dropdownRect.top, left: dropdownRect.left, width: dropdownRect.width, position: 'absolute' as const }}
        >
          {stations.map((station, idx) => (
            <button
              key={station.id}
              type="button"
              role="option"
              aria-selected={selectedStationId === station.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleStationSelect(station)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors duration-150 hover:bg-accent/50 focus:bg-accent focus:outline-none cursor-pointer ${idx > 0 ? 'border-t border-border/50' : ''}`}
            >
              <span className="text-sm font-medium text-foreground truncate flex-1 min-w-0" title={station.name}>
                {station.name}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 ml-1" />
            </button>
          ))}
        </div>, document.body
      )}
    </div>
  )
}

