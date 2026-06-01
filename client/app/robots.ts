import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://reunait.com'
  
  return {
    rules: [
      {
        userAgent: '*',
        disallow: [
          '/api',
          '/admin',
          '/_next',
          '/onboarding',
          '/profile',
          '/notifications',
          '/volunteer',
          '/register-case',
          '/caseOwnerProfile',
          '/user-profile',
          '/maintenance',
          '/maintenance-alt',
        ],
      },
      {
        userAgent: 'Googlebot',
        disallow: [
          '/api',
          '/admin',
          '/_next',
          '/onboarding',
          '/profile',
          '/notifications',
          '/volunteer',
          '/register-case',
          '/caseOwnerProfile',
          '/user-profile',
          '/maintenance',
          '/maintenance-alt',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

