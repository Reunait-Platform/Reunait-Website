/**
 * LocationDetector - Simple geolocation request on homepage
 * Uses navigator.geolocation API directly in browser
 */

'use client'

import { useEffect } from 'react'

export function LocationDetector() {
  useEffect(() => {
    // Only run in browser (client-side)
    if (typeof window === 'undefined') return

    const setLocationCookie = (data: { country: string; state: string; city: string }) => {
      try {
        const encoded = encodeURIComponent([data.country, data.state, data.city].join('|'))
        // 7 days TTL; path=/ so SSR can read it anywhere
        document.cookie = `loc=${encoded}; Max-Age=${7 * 24 * 60 * 60}; Path=/; SameSite=Lax`
      } catch {}
    }

    const requestLocation = () => {
      // Check if we already have location data
      const existingLocation = localStorage.getItem('userLocation')
      if (existingLocation) {
        try {
          const parsed = JSON.parse(existingLocation)
          if (parsed?.country && parsed?.state && parsed?.city) {
            setLocationCookie({ country: parsed.country, state: parsed.state, city: parsed.city })
          }
        } catch {}
        return
      }

      // Check if geolocation is supported
      if (!navigator.geolocation) {
        return
      }

      // Direct use of navigator.geolocation API
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Get location details using reverse geocoding
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&addressdetails=1`,
              {
                headers: {
                  'User-Agent': 'MissingPersonsApp/1.0'
                }
              }
            )
            
            if (response.ok) {
              const data = await response.json()
              
              // Store complete location data
              const locationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                country: data.address?.country || 'India',
                state: data.address?.state || data.address?.region || 'Karnataka',
                city: data.address?.city || data.address?.town || data.address?.village || 'Bangalore',
                timestamp: Date.now()
              }
              
              localStorage.setItem('userLocation', JSON.stringify(locationData))
            setLocationCookie({ country: locationData.country, state: locationData.state, city: locationData.city })
              // Notify any listeners (e.g., /cases page) immediately
              window.dispatchEvent(new CustomEvent('location:updated', { detail: locationData }))
            } else {
              // Fallback to coordinates only
              const fallback = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                country: 'India',
                state: 'Karnataka',
                city: 'Bangalore',
                timestamp: Date.now()
              }
              localStorage.setItem('userLocation', JSON.stringify(fallback))
            setLocationCookie({ country: fallback.country, state: fallback.state, city: fallback.city })
              window.dispatchEvent(new CustomEvent('location:updated', { detail: fallback }))
            }
          } catch {
            // Fallback to coordinates only
            const fallback = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              country: 'India',
              state: 'Karnataka',
              city: 'Bangalore',
              timestamp: Date.now()
            }
            localStorage.setItem('userLocation', JSON.stringify(fallback))
          setLocationCookie({ country: fallback.country, state: fallback.state, city: fallback.city })
            window.dispatchEvent(new CustomEvent('location:updated', { detail: fallback }))
          }
        },
        () => {
          // Silently handle errors
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    }

    // Request location after page loads
    setTimeout(requestLocation, 1000)
  }, [])

  return null
}
