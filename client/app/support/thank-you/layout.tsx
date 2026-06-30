import type { Metadata } from "next"
import { SITE_CONFIG, OPEN_GRAPH_DEFAULTS, TWITTER_DEFAULTS } from "@/lib/seo-config"

export const metadata: Metadata = {
  title: `Thank You for Your Support | ${SITE_CONFIG.name}`,
  description: "Thank you for your generous contribution to Reunait. Your support helps us reunite families.",
  openGraph: {
    ...OPEN_GRAPH_DEFAULTS,
    title: `Thank You for Your Support | ${SITE_CONFIG.name}`,
    description: "Thank you for your generous contribution to Reunait. Your support helps us reunite families.",
    url: `${SITE_CONFIG.url}/support/thank-you`,
  },
  twitter: {
    ...TWITTER_DEFAULTS,
    title: `Thank You for Your Support | ${SITE_CONFIG.name}`,
    description: "Thank you for your generous contribution to Reunait. Your support helps us reunite families.",
  },
}

export default function ThankYouLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
