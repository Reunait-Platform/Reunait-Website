import React from "react"

interface StructuredDataProps {
  data: object
}

/**
 * Component to inject JSON-LD structured data for SEO/GEO
 * Renders statically on the server so that LLM crawlers and search engines
 * can read the entity structure in the raw HTML payload.
 */
export function StructuredData({ data }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

