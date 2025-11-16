/**
 * Centralized SEO Configuration for Reunait Platform
 * 
 * This file contains all SEO-related constants, keywords, and metadata templates
 * following industry best practices for maintainability and consistency.
 */

// Base site information
export const SITE_CONFIG = {
  name: "Reunait",
  tagline: "Reuniting Families Through Technology",
  description: "AI-powered missing person search platform helping reunite families across India",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://reunait.com",
  locale: "en_IN",
  region: "India",
} as const

// Base keywords - Common across all pages
export const BASE_KEYWORDS = [
  // Core platform
  "Reunait",
  "missing person platform",
  "find missing person",
  "missing person search",
  "family reunification",
  
  // Technology
  "AI missing person search",
  "artificial intelligence missing person",
  "facial recognition search",
  "AI-powered search platform",
  "vector search technology",
  "similar case matching",
  
  // Location
  "missing person India",
  "find missing person India",
  "missing person search India",
  
  // Community
  "community support",
  "volunteer network",
  "help find missing persons",
  "reunite families",
] as const

// Feature-specific keywords
export const FEATURE_KEYWORDS = {
  // AI & Technology
  ai: [
    "AI facial recognition",
    "artificial intelligence search",
    "vector embeddings",
    "similar case finder",
    "AI matching technology",
    "machine learning search",
    "intelligent case matching",
    "automated case matching",
  ],
  
  // Case Management
  caseManagement: [
    "missing person case registration",
    "report missing person",
    "register missing person case",
    "file missing person report",
    "case status update",
    "case assignment",
    "case verification",
    "case flagging",
    "case moderation",
  ],
  
  // Search & Discovery
  search: [
    "search missing persons",
    "browse missing person cases",
    "location-based search",
    "filter missing person cases",
    "find similar cases",
    "missing person database",
    "missing person registry",
    "case search engine",
  ],
  
  // User Roles
  police: [
    "police missing person verification",
    "police case management",
    "police station integration",
    "law enforcement platform",
    "police case assignment",
    "verified police cases",
  ],
  
  ngo: [
    "NGO missing person support",
    "non-profit missing person",
    "NGO case registration",
    "community organization",
    "social service platform",
  ],
  
  volunteer: [
    "volunteer missing person",
    "volunteer verification",
    "volunteer case moderation",
    "community volunteer network",
    "help find missing persons",
    "volunteer platform",
  ],
  
  // Reporting & Information
  reporting: [
    "report missing person info",
    "submit case information",
    "share missing person details",
    "provide case updates",
    "report sighting",
    "case information submission",
  ],
  
  // Donations & Support
  donations: [
    "donate missing person platform",
    "support family reunification",
    "fund missing person search",
    "contribute to reunite families",
    "donation platform",
    "support missing person cause",
  ],
  
  // Location Features
  location: [
    "location-based case search",
    "city missing person search",
    "state missing person search",
    "local missing person cases",
    "geographic case search",
    "location detection",
  ],
  
  // Image & Media
  images: [
    "upload missing person photo",
    "photo search missing person",
    "image recognition",
    "facial recognition from photo",
    "photo matching technology",
  ],
  
  // Notifications & Updates
  notifications: [
    "real-time case updates",
    "missing person notifications",
    "case status alerts",
    "notification system",
    "case update alerts",
  ],
} as const

// Page-specific keyword sets
export const PAGE_KEYWORDS = {
  home: [
    ...BASE_KEYWORDS,
    ...FEATURE_KEYWORDS.ai,
    ...FEATURE_KEYWORDS.search,
    "missing person platform India",
    "AI-powered family reunification",
    "technology for finding missing persons",
  ],
  
  cases: [
    ...BASE_KEYWORDS,
    ...FEATURE_KEYWORDS.search,
    ...FEATURE_KEYWORDS.location,
    "browse missing person cases",
    "search missing person database",
    "filter cases by location",
    "missing person case list",
  ],
  
  registerCase: [
    ...BASE_KEYWORDS,
    ...FEATURE_KEYWORDS.caseManagement,
    ...FEATURE_KEYWORDS.images,
    "register new missing person",
    "file missing person report online",
    "submit missing person case",
    "create missing person case",
  ],
  
  caseDetail: [
    ...BASE_KEYWORDS,
    ...FEATURE_KEYWORDS.ai,
    ...FEATURE_KEYWORDS.reporting,
    "missing person case details",
    "case information",
    "help find this person",
    "case status",
  ],
  
  volunteer: [
    ...BASE_KEYWORDS,
    ...FEATURE_KEYWORDS.volunteer,
    ...FEATURE_KEYWORDS.caseManagement,
    "become a volunteer",
    "volunteer verification",
    "moderate cases",
  ],
  
  donate: [
    ...BASE_KEYWORDS,
    ...FEATURE_KEYWORDS.donations,
    "support Reunait",
    "fund missing person search",
    "donate to reunite families",
  ],
} as const

// Metadata templates for different page types
export const METADATA_TEMPLATES = {
  home: {
    title: "Reunait - AI-Powered Missing Person Search Platform | Find Missing Persons",
    description: "Find missing persons faster with Reunait's AI-powered search platform. Report missing persons, search cases by location, age, gender, and help reunite families. Trusted by police, NGOs, and thousands of volunteers across India.",
  },
  
  cases: {
    title: "Missing Person Cases - Search & Browse All Cases | Reunait",
    description: "Browse and search missing person cases by location, age, gender, and status. Help find missing persons and reunite families. Search cases across India with AI-powered matching.",
  },
  
  registerCase: {
    title: "Report Missing Person - Register Case | Reunait",
    description: "Report a missing person case on Reunait. Register missing person details, upload photos, and get help from our AI-powered search platform. Trusted by police and NGOs across India.",
  },
  
  caseDetail: {
    title: (name: string) => `Missing: ${name} | Reunait - Missing Person Case`,
    description: (name: string, description?: string) => 
      description 
        ? `${description.substring(0, 150)}... Help find ${name}.`
        : `Help find ${name}. Report information, share details, and help reunite this person with their family.`,
  },
  
  volunteer: {
    title: "Volunteer - Help Find Missing Persons | Reunait",
    description: "Join Reunait as a volunteer to help find missing persons. Review cases, verify information, and help reunite families. Make a difference in your community.",
  },
  
  donate: {
    title: "Donate - Support Missing Person Search | Reunait",
    description: "Support Reunait's mission to help find missing persons. Your donation helps maintain our AI-powered platform, support families, and reunite loved ones. Every contribution makes a difference.",
  },
} as const

// Open Graph default configuration
export const OPEN_GRAPH_DEFAULTS = {
  type: "website" as const,
  locale: SITE_CONFIG.locale,
  siteName: SITE_CONFIG.name,
  images: [
    {
      url: "/og-image.jpg",
      width: 1200,
      height: 630,
      alt: `${SITE_CONFIG.name} - Missing Person Platform`,
    },
  ],
}

// Twitter Card defaults
export const TWITTER_DEFAULTS = {
  card: "summary_large_image" as const,
  creator: "@reunait",
} as const

// Structured data schemas
export const STRUCTURED_DATA = {
  organization: {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
    logo: `${SITE_CONFIG.url}/logo.png`,
    description: SITE_CONFIG.description,
    foundingDate: "2024",
    areaServed: {
      "@type": "Country",
      name: SITE_CONFIG.region,
    },
    knowsAbout: [
      "Missing Person Search",
      "AI Technology",
      "Facial Recognition",
      "Family Reunification",
      "Community Support",
      "Vector Search",
      "Case Management",
    ],
  },
  
  website: {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_CONFIG.name,
    alternateName: `${SITE_CONFIG.name} - Missing Person Platform`,
    url: SITE_CONFIG.url,
    description: SITE_CONFIG.description,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_CONFIG.url}/cases?keyword={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  },
} as const

// Helper function to get keywords for a page
export function getPageKeywords(page: keyof typeof PAGE_KEYWORDS): string[] {
  return [...PAGE_KEYWORDS[page]]
}

// Helper function to merge keywords
export function mergeKeywords(...keywordSets: (readonly string[])[]): string[] {
  return Array.from(new Set(keywordSets.flat()))
}

// Helper function to generate page-specific keywords with location
export function getLocationKeywords(
  baseKeywords: readonly string[],
  city?: string,
  state?: string,
  country?: string
): string[] {
  const locationKeywords: string[] = [...baseKeywords]
  
  if (city) {
    locationKeywords.push(`missing person ${city}`)
    locationKeywords.push(`find missing person ${city}`)
  }
  
  if (state) {
    locationKeywords.push(`missing person ${state}`)
    locationKeywords.push(`find missing person ${state}`)
  }
  
  if (country) {
    locationKeywords.push(`missing person ${country}`)
  }
  
  return locationKeywords
}

