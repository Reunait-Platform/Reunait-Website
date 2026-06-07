/**
 * LocationDetector - Simple geolocation request on homepage
 * Uses navigator.geolocation API directly in browser
 */

'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    __locationPromise?: Promise<void>
  }
}

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

      // Initialize the shared location promise
      let resolvePromise: () => void = () => {}
      window.__locationPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })

      // Direct use of navigator.geolocation API
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Get location details using BigDataCloud reverse geocoding client
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
            )
            
            if (response.ok) {
              const data = await response.json()
              
              // Store complete location data
              const locationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                country: data.countryName || 'India',
                state: data.principalSubdivision || 'Karnataka',
                city: data.city || data.locality || 'Bangalore',
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
          } finally {
            resolvePromise()
          }
        },
        () => {
          // Silently handle errors
          resolvePromise()
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
