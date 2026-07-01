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
      next: {
        revalidate: 86400,
        tags: ['homepage']
      }
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
    section: "faq",
    title: "Frequently Asked Questions",
    subtitle: "Have questions about the platform, security, or matching? Find direct answers below.",
    data: {
      faqs: [
        {
          question: "How does Reunait help find missing people?",
          answer: "Reunait compares photos of missing individuals with sightings uploaded by families, NGOs, police, our verified volunteer network, and the public. When you search or register a case, our AI algorithm checks visual details against all registered cases within your country to instantly identify similarities, helping connect families."
        },
        {
          question: "What should I do if I see someone who appears lost?",
          answer: "First, assist them to the nearest NGO or police station to register an official report, as you will need an official case or report number to register them on Reunait. Then, click \"Register Case\" on our platform, select the \"Found\" option, upload clear photos of their face, and provide a detailed description. This allows families to instantly match details and establish contact."
        },
        {
          question: "Is there a fee to report a case or search the database?",
          answer: "No. As a computer science enthusiast and the sole developer behind Reunait, I started this platform as a personal college project dedicated to finding missing people in India. After seeing the profound impact it had, I scaled it into a global cause. Although running a global matching network single-handedly carries significant server and hosting costs, I will try my absolute best to keep the platform free."
        },
        {
          question: "How is my family’s privacy and data protected?",
          answer: "Privacy is our highest priority. We process photos securely and solely for the purpose of matching faces in missing person reports. We do not sell personal data to third parties, and all case details are strictly protected under industry-standard security safeguards."
        },
        {
          question: "How does everyone collaborate and use Reunait?",
          answer: "Anyone can browse active cases on the platform. If you grant location permission, Reunait automatically highlights active cases in your immediate area, and you can customize your search using filters like date and location. If you have information about a case, you can submit details directly on the platform—either anonymously or with your contact details if you are willing to help further. You can also share these sightings directly with the nearest police station or local NGO."
        },
        {
          question: "Can I find someone who has been missing for a long time if I only have old photos?",
          answer: "Yes. Our AI algorithm is smart and capable enough to identify matches even with significant changes in facial features over time. It focuses on permanent structural details of the face that remain relatively stable as a person grows. When registering a case with older photos, we also recommend providing a detailed description of any permanent identifying marks—such as birthmarks, scars, tattoos, or unique physical characteristics. This combination of visual matching and detailed descriptions helps our system identify potential matches even after years have passed."
        },
        {
          question: "How many AI searches can I perform, and why is there a limit?",
          answer: "To optimize system performance and manage database resources, general users can perform an AI match search on a specific case once every 4 hours (up to 6 times per day). This cooldown limit is completely waived for verified police, NGO, and volunteer accounts, who can perform search scans without any restrictions."
        },
        {
          question: "What should I do if I see photos or details on the platform that are not suitable?",
          answer: "If you encounter any inappropriate photos, false details, or unsuitable content, you can click the Flag icon on that case detail page. Once flagged, our system registers the report for immediate review. If the content violates our guidelines, the listing is hidden from public view, and our moderation network (consisting of verified volunteers and law enforcement) will verify and take final action on the report."
        }
      ]
    },
    order: 5,
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
    order: 6,
    isActive: true,
  },
]

