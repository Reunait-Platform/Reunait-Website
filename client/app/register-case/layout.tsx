import type { Metadata } from "next"
import { SITE_CONFIG, METADATA_TEMPLATES, OPEN_GRAPH_DEFAULTS, TWITTER_DEFAULTS, getPageKeywords } from "@/lib/seo-config"

// SEO-optimized metadata for register case page
export const metadata: Metadata = {
  title: METADATA_TEMPLATES.registerCase.title,
  description: METADATA_TEMPLATES.registerCase.description,
  keywords: getPageKeywords("registerCase"),
  openGraph: {
    ...OPEN_GRAPH_DEFAULTS,
    title: METADATA_TEMPLATES.registerCase.title,
    description: METADATA_TEMPLATES.registerCase.description,
    url: `${SITE_CONFIG.url}/register-case`,
  },
  twitter: {
    ...TWITTER_DEFAULTS,
    title: METADATA_TEMPLATES.registerCase.title,
    description: METADATA_TEMPLATES.registerCase.description,
  },
  alternates: {
    canonical: `${SITE_CONFIG.url}/register-case`,
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RegisterCaseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

