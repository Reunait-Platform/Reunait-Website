import { MetadataRoute } from 'next'
import { fetchCases } from '@/lib/api'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://reunait.com'
  const currentDate = new Date().toISOString()

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/cases`,
      lastModified: currentDate,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/support`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ]

  try {
    // Dynamically fetch up to 100 cases to include in the search index
    const response = await fetchCases({ limit: 100 })
    const cases = response?.data || []
    
    const caseRoutes: MetadataRoute.Sitemap = cases.map((c) => ({
      url: `${baseUrl}/cases/${c._id}`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.8,
    }))

    return [...staticRoutes, ...caseRoutes]
  } catch (error) {
    console.error('[Sitemap] Failed to fetch dynamic cases — using static fallback:', error)
    return staticRoutes
  }
}


