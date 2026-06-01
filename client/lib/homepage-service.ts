import { HomepageResponse, HomepageSection } from './homepage-types'

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL as string

export class HomepageService {
  /**
   * Fetch homepage data from the API
   * This is a public endpoint - no authentication required
   */
  static async getHomepageData(): Promise<HomepageResponse> {
    const response = await fetch(`${API_BASE_URL}/api/homepage`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
        // Always fetch fresh homepage data
        cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: HomepageResponse = await response.json()
    return data
  }
}

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSection[] = [
  {
    section: "hero",
    title: "Reuniting Families Through Technology",
    subtitle: "",
    data: { casesRoute: "/cases" },
    order: 1,
    isActive: true,
  },
  {
    section: "features",
    title: "How We Help Find Missing Persons",
    subtitle: "Reunait combines community efforts with modern technology to search and match missing persons.",
    data: {
      features: [
        {
          icon: "Search",
          title: "AI Search",
          description: "Use advanced AI-powered facial recognition to search missing persons from photos.",
        },
        {
          icon: "Users",
          title: "Volunteer Network",
          description: "Join a network of thousands of verified community volunteers helping search the ground.",
        },
        {
          icon: "Shield",
          title: "Police Verified",
          description: "All cases are cross-referenced with official police records and FIR registration details.",
        },
        {
          icon: "Heart",
          title: "Free Support",
          description: "Our platform is completely free to use for families, NGOs, and law enforcement agencies.",
        },
      ],
    },
    order: 2,
    isActive: true,
  },
  {
    section: "impact",
    title: "Making a Real Impact",
    subtitle: "Every case registered is a family we strive to bring back together.",
    data: {
      stats: [
        { value: "10,000+", label: "Volunteers", description: "Active members in our community network." },
        { value: "500+", label: "Reunited", description: "Families brought back together through the platform." },
        { value: "98%", label: "Accuracy", description: "High-precision matches in facial recognition queries." },
      ],
    },
    order: 3,
    isActive: true,
  },
  {
    section: "guidance",
    title: "Step-by-Step Reporting Guide",
    subtitle: "Understand how to register or help identify missing cases.",
    data: {
      steps: [
        { type: "missing", step: 1, title: "Report Details", description: "Submit details, locations, and photos of the missing person." },
        { type: "missing", step: 2, title: "Verify Case", description: "Our NGO and Police volunteers verify the case and update details." },
        { type: "found", step: 1, title: "Report Sighting", description: "Volunteers and public upload photos and report sightings." },
        { type: "found", step: 2, title: "Confirm Match", description: "Facial matching identifies potential matches and alerts the family." },
      ],
    },
    order: 4,
    isActive: true,
  },
  {
    section: "testimonials",
    title: "Stories of Reunion",
    subtitle: "Hear from families and volunteers who used Reunait to bring loved ones back home.",
    data: {
      testimonials: [
        { name: "Aarav Mehta", role: "NGO Coordinator", content: "Reunait has revolutionized how we coordinate missing person searches. The AI matching is fast and accurate.", rating: 5 },
        { name: "Priya Sharma", role: "Mother", content: "I found my son after two years thanks to a volunteer who reported a sighting on Reunait. God bless the team.", rating: 5 },
        { name: "Inspector Rajesh Kumar", role: "Police Officer", content: "A vital tool for law enforcement. The verification pipeline helps us double-check reports instantly.", rating: 5 },
      ],
    },
    order: 5,
    isActive: true,
  },
]

