export interface ClerkMetadata {
  onboardingCompleted: boolean
  role: 'general_user' | 'police' | 'NGO' | 'volunteer' | 'police_denied' | null
  lastUpdated: string
}

interface ClerkLikeWithMetadata {
  publicMetadata?: {
    onboardingCompleted?: boolean
    role?: string
    // Allow additional metadata fields without loosening to `any`
    [key: string]: unknown
  }
  __raw?: unknown
}

/**
 * Extract onboarding status from Clerk user object or session claims
 * @param userOrSessionClaims - Clerk user object or session claims object
 * @returns boolean | null - onboardingCompleted status or null if not found
 */
export const getOnboardingStatus = (
  userOrSessionClaims: ClerkLikeWithMetadata | null | undefined
): boolean | null => {
  try {
    // Try to get metadata from user object first (preferred method)
    let metadata = userOrSessionClaims?.publicMetadata
    
    // If not found, try sessionClaims (fallback)
    if (!metadata && userOrSessionClaims?.__raw) {
      metadata = userOrSessionClaims?.publicMetadata
    }
    
    if (!metadata) {
      return null
    }
    
    // Validate metadata structure
    if (typeof metadata.onboardingCompleted !== 'boolean') {
      console.warn('Invalid onboardingCompleted metadata:', metadata)
      return null
    }
    
    return metadata.onboardingCompleted
  } catch (error) {
    console.error('Error reading Clerk metadata:', error)
    return null
  }
}

/**
 * Extract user role from Clerk session claims
 * @param sessionClaims - Clerk session claims object
 * @returns string | null - user role or null if not found
 */
export const getUserRole = (sessionClaims: ClerkLikeWithMetadata | null | undefined): string | null => {
  try {
    const metadata = sessionClaims?.publicMetadata
    if (!metadata) return null
    
    const role = metadata.role
    if (!role || typeof role !== 'string') {
      return null
    }
    
    return role
  } catch (error) {
    console.error('Error reading user role from Clerk metadata:', error)
    return null
  }
}

/**
 * Check if user has completed onboarding
 * @param sessionClaims - Clerk session claims object
 * @returns boolean - true if onboarding is completed
 */
export const isOnboardingCompleted = (sessionClaims: ClerkLikeWithMetadata | null | undefined): boolean => {
  return getOnboardingStatus(sessionClaims) === true
}

/**
 * Check if user has a specific role
 * @param sessionClaims - Clerk session claims object
 * @param role - Role to check for
 * @returns boolean - true if user has the specified role
 */
export const hasRole = (sessionClaims: ClerkLikeWithMetadata | null | undefined, role: string): boolean => {
  return getUserRole(sessionClaims) === role
}

/**
 * Check if user is police, NGO, or volunteer (for bypassing rate limits)
 * @param sessionClaims - Clerk session claims object
 * @returns boolean - true if user is police, NGO, or volunteer
 */
export const isPrivilegedUser = (sessionClaims: ClerkLikeWithMetadata | null | undefined): boolean => {
  const role = getUserRole(sessionClaims)
  return role === 'police' || role === 'NGO' || role === 'volunteer'
}
