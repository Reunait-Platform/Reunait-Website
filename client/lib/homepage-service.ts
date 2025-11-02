import { HomepageResponse } from './homepage-types'

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
