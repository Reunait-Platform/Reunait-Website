export interface HomepageSection {
  section: string
  title: string
  subtitle: string
  data: unknown
  order: number
  isActive: boolean
}

export interface HomepageResponse {
  success: boolean
  data: HomepageSection[]
}
