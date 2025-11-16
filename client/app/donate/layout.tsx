import type { Metadata } from "next"
import { SITE_CONFIG, METADATA_TEMPLATES, OPEN_GRAPH_DEFAULTS, TWITTER_DEFAULTS, getPageKeywords } from "@/lib/seo-config"

// SEO-optimized metadata for donate page
export const metadata: Metadata = {
  title: METADATA_TEMPLATES.donate.title,
  description: METADATA_TEMPLATES.donate.description,
  keywords: getPageKeywords("donate"),
  openGraph: {
    ...OPEN_GRAPH_DEFAULTS,
    title: METADATA_TEMPLATES.donate.title,
    description: METADATA_TEMPLATES.donate.description,
    url: `${SITE_CONFIG.url}/donate`,
  },
  twitter: {
    ...TWITTER_DEFAULTS,
    title: METADATA_TEMPLATES.donate.title,
    description: METADATA_TEMPLATES.donate.description,
  },
  alternates: {
    canonical: `${SITE_CONFIG.url}/donate`,
  },
}

export default function DonateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

