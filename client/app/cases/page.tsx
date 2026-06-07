import { CasesSection } from "@/components/cases/cases-section"
import { fetchCases, type CasesParams } from "@/lib/api"
import { cookies } from "next/headers"
import type { Metadata } from "next"
import { SITE_CONFIG, METADATA_TEMPLATES, OPEN_GRAPH_DEFAULTS, TWITTER_DEFAULTS, getPageKeywords } from "@/lib/seo-config"

export const dynamic = 'force-dynamic'
export const revalidate = 0

// SEO-optimized dynamic metadata based on search location
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = (await searchParams) ?? {}
  const country = typeof sp.country === 'string' ? sp.country : undefined
  const state = typeof sp.state === 'string' && sp.state !== 'all' ? sp.state : undefined
  const city = typeof sp.city === 'string' && sp.city !== 'all' ? sp.city : undefined

  let locationText = ""
  if (city && state) {
    locationText = ` in ${city}, ${state}`
  } else if (state) {
    locationText = ` in ${state}`
  } else if (country) {
    locationText = ` in ${country}`
  } else {
    locationText = SITE_CONFIG.region.toLowerCase() === "global" ? "" : ` across ${SITE_CONFIG.region}`
  }

  const title = `Search Missing Person Cases${locationText} | Reunait`
  const description = `Browse and search missing person cases by location, age, gender, and status. Help find missing persons and reunite families. Search cases${locationText || " globally"} with AI-powered matching.`
  
  const keywords = [...getPageKeywords("cases")]
  if (country) keywords.push(`missing person ${country}`, `find missing person ${country}`)
  if (state) keywords.push(`missing person ${state}`)
  if (city) keywords.push(`missing person ${city}`)

  return {
    title,
    description,
    keywords,
    openGraph: {
      ...OPEN_GRAPH_DEFAULTS,
      title,
      description,
      url: `${SITE_CONFIG.url}/cases`,
      images: [...OPEN_GRAPH_DEFAULTS.images],
    },
    twitter: {
      ...TWITTER_DEFAULTS,
      title,
      description,
    },
    alternates: {
      canonical: `${SITE_CONFIG.url}/cases`,
    },
  }
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

  // Final fallbacks - If site region is 'Global' or country query param is 'Global', fall back to 'India' for DB search default
  const defaultCountry = SITE_CONFIG.region.toLowerCase() === "global" ? "India" : SITE_CONFIG.region
  if (!country || country.toLowerCase() === "global") {
    country = defaultCountry
  }

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