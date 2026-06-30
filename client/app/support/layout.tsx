import type { Metadata } from "next"
import { SITE_CONFIG, METADATA_TEMPLATES, OPEN_GRAPH_DEFAULTS, TWITTER_DEFAULTS, getPageKeywords } from "@/lib/seo-config"

// SEO-optimized metadata for support page
export const metadata: Metadata = {
  title: METADATA_TEMPLATES.support.title,
  description: METADATA_TEMPLATES.support.description,
  keywords: getPageKeywords("support"),
  openGraph: {
    ...OPEN_GRAPH_DEFAULTS,
    title: METADATA_TEMPLATES.support.title,
    description: METADATA_TEMPLATES.support.description,
    url: `${SITE_CONFIG.url}/support`,
  },
  twitter: {
    ...TWITTER_DEFAULTS,
    title: METADATA_TEMPLATES.support.title,
    description: METADATA_TEMPLATES.support.description,
  },
  alternates: {
    canonical: `${SITE_CONFIG.url}/support`,
  },
}

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

