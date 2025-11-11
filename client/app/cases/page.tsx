import { CasesSection } from "@/components/cases/cases-section"
import { fetchCases, type CasesParams } from "@/lib/api"
import { cookies } from "next/headers"
import type { Metadata } from "next"
import { SITE_CONFIG, PAGE_KEYWORDS, METADATA_TEMPLATES, OPEN_GRAPH_DEFAULTS, TWITTER_DEFAULTS, getPageKeywords } from "@/lib/seo-config"

export const dynamic = 'force-dynamic'
export const revalidate = 0

// SEO-optimized metadata for cases page
export const metadata: Metadata = {
  title: METADATA_TEMPLATES.cases.title,
  description: METADATA_TEMPLATES.cases.description,
  keywords: getPageKeywords("cases"),
  openGraph: {
    ...OPEN_GRAPH_DEFAULTS,
    title: METADATA_TEMPLATES.cases.title,
    description: METADATA_TEMPLATES.cases.description,
    url: `${SITE_CONFIG.url}/cases`,
    images: [...OPEN_GRAPH_DEFAULTS.images],
  },
  twitter: {
    ...TWITTER_DEFAULTS,
    title: METADATA_TEMPLATES.cases.title,
    description: METADATA_TEMPLATES.cases.description,
  },
  alternates: {
    canonical: `${SITE_CONFIG.url}/cases`,
  },
}

interface PageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function CasesPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {}
  const page = typeof sp.page === 'string' ? parseInt(sp.page, 10) || 1 : 1

  // Resolve location from URL first; if missing, fall back to cookie
  let country: string | undefined = typeof sp.country === 'string' ? sp.country : undefined
  let state: string | null = typeof sp.state === 'string' && sp.state.length > 0 ? sp.state : null
  let city: string | null = typeof sp.city === 'string' && sp.city.length > 0 ? sp.city : null

  if (!country) {
    const jar = await cookies()
    const loc = jar.get('loc')?.value
    if (loc) {
      try {
        const [c, s, ci] = decodeURIComponent(loc).split('|')
        country = c || undefined
        state = s || null
        city = ci || null
      } catch {}
    }
  }

  // Final fallbacks
  country = country || 'India'

  const params: CasesParams = { page, country, state, city }
  const initial = await fetchCases(params)

  const initialFilters = {
    keyword: "",
    country: country,
    state: state ?? 'all',
    city: city ?? 'all',
    status: undefined,
    gender: undefined,
    dateFrom: undefined,
    dateTo: undefined,
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full md:max-w-none lg:max-w-screen-2xl px-1 sm:px-2 md:px-3 lg:px-4 xl:px-5 py-0 -mt-4">
        <CasesSection
          initialCases={initial.data}
          initialPagination={initial.pagination}
          initialFilters={initialFilters}
        />
      </div>
    </div>
  )
}