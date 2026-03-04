// Authentication API service
import { apiClient } from './client'
import { setStoredInventoryId, clearStoredInventoryId } from './products'

export interface BusinessProfile {
  business_category?: string
  description?: string
  phone?: string
  whatsapp_number?: string
  instagram?: string
  website?: string
  address_line1?: string
  city?: string
  country?: string
}

export interface User {
  id: string
  email: string
  name: string
  businessId?: string
  businessName?: string
  businessSlug?: string  // Business slug for URL routing
  phone?: string
  category?: string
  createdAt: string
  profile?: BusinessProfile
  email_verified?: boolean
}

// Backend returns CompleteUserResponse from /auth/me
export interface CompleteUserResponse {
  user: User
  business_id?: string
  workspace_id?: string
  inventory_id?: string
  businessName?: string
  businessSlug?: string
  profile?: BusinessProfile
}

export interface LoginRequest {
  email: string
  password: string
}

export interface SignupRequest {
  email: string
  password: string
  name: string
}

export interface AuthResponse {
  user: User
  business_id: string
  workspace_id: string
  inventory_id: string
  businessName?: string  // Business name for display
  businessSlug?: string  // Business slug for URL routing
  tokens: TokenResponse
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface MagicLinkRequest {
  email: string
}

export interface MagicLinkResponse {
  success: boolean
  message: string
}

export interface MagicLinkCallbackRequest {
  auth_provider_id: string
  email: string
  access_token: string
  refresh_token: string
}

export interface MagicLinkCallbackResponse {
  user_id: string
  email: string
  name: string
  is_new_user: boolean
  needs_name_update: boolean
  access_token: string
  refresh_token: string
}

export interface SignupResponse {
  user_id: string
  email: string
  needs_verification: boolean
  message: string
}

export interface ResendVerificationResponse {
  success: boolean
  message: string
}

export const authAPI = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    console.log(' [AUTH] Attempting login for:', credentials.email)
    
    try {
      const response = await apiClient.post<AuthResponse>('/auth/signin', credentials)
      
      console.log(' [AUTH] Login successful for user:', response.user.email)
      console.log(' [AUTH] Received tokens:', {
        access_token: response.tokens.access_token.substring(0, 20) + '...',
        refresh_token: response.tokens.refresh_token.substring(0, 20) + '...',
        expires_in: response.tokens.expires_in
      })
      
      // Store tokens and inventory_id
      if (typeof window !== 'undefined') {
        localStorage.setItem('chidi_auth_token', response.tokens.access_token)
        localStorage.setItem('chidi_refresh_token', response.tokens.refresh_token)
        if (response.inventory_id) {
          setStoredInventoryId(response.inventory_id)
          console.log(' [AUTH] Inventory ID stored:', response.inventory_id)
        }
        console.log(' [AUTH] Tokens stored in localStorage')
      }
      
      return response
    } catch (error) {
      console.error(' [AUTH] Login failed:', error)
      throw error
    }
  },

  async signup(userData: SignupRequest): Promise<SignupResponse> {
    console.log(' [AUTH] Attempting signup for:', userData.email)
    
    try {
      const response = await apiClient.post<SignupResponse>('/auth/signup', userData)
      
      console.log(' [AUTH] Signup API response:', response)
      console.log(' [AUTH] Response type:', typeof response)
      console.log(' [AUTH] Response keys:', Object.keys(response || {}))
      
      if (response && response.needs_verification) {
        console.log(' [AUTH] Signup successful, verification email sent to:', response.email)
        console.log(' [AUTH] User must verify email before signing in')
      }
      
      return response
    } catch (error) {
      console.error(' [AUTH] Signup failed:', error)
      throw error
    }
  },

  async sendMagicLink(email: string): Promise<MagicLinkResponse> {
    console.log('🔗 [AUTH] Sending magic link to:', email)
    
    try {
      const response = await apiClient.post<MagicLinkResponse>('/auth/magic-link', { email })
      console.log('✅ [AUTH] Magic link sent:', response)
      return response
    } catch (error) {
      console.error('❌ [AUTH] Failed to send magic link:', error)
      throw error
    }
  },

  async processMagicLinkCallback(callbackData: MagicLinkCallbackRequest): Promise<MagicLinkCallbackResponse> {
    console.log('🔗 [AUTH] Processing magic link callback for:', callbackData.email)
    
    try {
      const response = await apiClient.post<MagicLinkCallbackResponse>('/auth/magic-link/callback', callbackData)
      console.log('✅ [AUTH] Magic link callback processed:', response)
      
      // Store tokens
      if (typeof window !== 'undefined') {
        localStorage.setItem('chidi_auth_token', response.access_token)
        localStorage.setItem('chidi_refresh_token', response.refresh_token)
        console.log('✅ [AUTH] Tokens stored from magic link callback')
      }
      
      return response
    } catch (error) {
      console.error('❌ [AUTH] Failed to process magic link callback:', error)
      throw error
    }
  },

  async resendVerification(email: string): Promise<ResendVerificationResponse> {
    console.log(' [AUTH] Resending verification email to:', email)
    
    try {
      const response = await apiClient.post<ResendVerificationResponse>('/auth/resend-verification', { email })
      console.log(' [AUTH] Resend verification response:', response)
      return response
    } catch (error) {
      console.error(' [AUTH] Resend verification failed:', error)
      throw error
    }
  },

  async getMe(): Promise<User> {
    console.log('👤 [AUTH] Fetching current user data...')
    try {
      // Backend returns CompleteUserResponse with nested user object
      const response = await apiClient.get<CompleteUserResponse>('/auth/me')
      console.log('✅ [AUTH] Raw response from /auth/me:', response)
      console.log('✅ [AUTH] response.user:', response.user)
      console.log('✅ [AUTH] response.businessName:', response.businessName)
      
      // Flatten the response to match frontend User interface
      // businessName and businessSlug are at the root level, not in user object
      const user: User = {
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        phone: response.user.phone,
        businessId: response.business_id,  // From root level
        businessName: response.businessName,  // From root level
        businessSlug: response.businessSlug,  // From root level
        createdAt: (response.user as any).created_at || (response.user as any).createdAt || new Date().toISOString(),
        profile: response.profile,  // Business profile data
        email_verified: (response.user as any).email_verified,  // Email verification status
      }
      
      console.log('✅ [AUTH] Flattened user:', user)
      console.log('✅ [AUTH] user.businessName:', user.businessName)
      console.log('✅ [AUTH] hasCompletedOnboarding:', !!user.businessName)
      return user
    } catch (error) {
      console.error('❌ [AUTH] Failed to get user data:', error)
      throw error
    }
  },

  async refreshToken(): Promise<TokenResponse> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }
    
    const response = await apiClient.post<TokenResponse>('/auth/refresh', {
      refresh_token: refreshToken
    })
    
    // Update stored tokens
    if (typeof window !== 'undefined') {
      localStorage.setItem('chidi_auth_token', response.access_token)
      localStorage.setItem('chidi_refresh_token', response.refresh_token)
    }
    
    return response
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout')
    } finally {
      // Clear tokens regardless of API response
      if (typeof window !== 'undefined') {
        localStorage.removeItem('chidi_auth_token')
        localStorage.removeItem('chidi_refresh_token')
      }
    }
  },

  async updateProfile(userData: Partial<User>): Promise<User> {
    return apiClient.put('/auth/profile', userData)
  },

  // Helper to check if user is authenticated
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false
    return !!localStorage.getItem('chidi_auth_token')
  },

  // Helper to get current token
  getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('chidi_auth_token')
  },

  // Helper to get refresh token
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('chidi_refresh_token')
  },

  // Complete onboarding by creating business profile
  async completeOnboarding(onboardingData: {
    name?: string  // User's name (required for magic link users)
    business_name: string
    business_industry?: string
    phone?: string
    categories?: string[]
    whatsapp_number?: string
    instagram_handle?: string
  }): Promise<AuthResponse> {
    // Include refresh token in header so backend can return it in the response
    const refreshToken = this.getRefreshToken()
    const customHeaders: Record<string, string> = {}
    if (refreshToken) {
      customHeaders['X-Refresh-Token'] = refreshToken
    }
    
    const response = await apiClient.post<AuthResponse>('/auth/complete-onboarding', onboardingData, customHeaders)
    
    // Update stored tokens and inventory_id
    if (typeof window !== 'undefined') {
      localStorage.setItem('chidi_auth_token', response.tokens.access_token)
      localStorage.setItem('chidi_refresh_token', response.tokens.refresh_token)
      if (response.inventory_id) {
        setStoredInventoryId(response.inventory_id)
        console.log(' [AUTH] Inventory ID stored after onboarding:', response.inventory_id)
      }
    }
    
    return response
  },

  // Helper to clear all stored auth data
  clearAllAuthData(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('chidi_auth_token')
      localStorage.removeItem('chidi_refresh_token')
      clearStoredInventoryId()
      // Clear any other cached data that might bypass onboarding
      localStorage.removeItem('chidi_user_data')
      localStorage.removeItem('chidi_onboarding_complete')
    }
  }
}
