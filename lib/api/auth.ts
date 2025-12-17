// Authentication API service
import { apiClient } from './client'

// Mock data for testing - New user without completed onboarding
const MOCK_USER = {
  id: 'user_123',
  email: 'demo@business.com',
  name: 'Demo User',
  // businessName: undefined, // No business name = needs onboarding
  phone: '+234-800-123-4567',
  role: 'owner',
  avatar: '/images/avatar.jpg',
  createdAt: new Date().toISOString()
}

const MOCK_LOGIN_RESPONSE = {
  user: MOCK_USER,
  business_id: 'mock-business-id',
  workspace_id: 'mock-workspace-id',
  inventory_id: 'mock-inventory-id',
  tokens: {
    access_token: 'mock-jwt-token-for-testing-123456',
    refresh_token: 'mock-refresh-token-654321',
    token_type: 'bearer',
    expires_in: 86400
  }
}

export interface User {
  id: string
  email: string
  name: string
  businessName?: string
  businessSlug?: string  // Business slug for URL routing
  phone?: string
  category?: string
  createdAt: string
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

export const authAPI = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    console.log(' [AUTH] Attempting login for:', credentials.email)
    const mockResponse = MOCK_LOGIN_RESPONSE
    
    try {
      const response = await apiClient.post<AuthResponse>('/auth/signin', credentials, undefined, undefined)
      
      console.log(' [AUTH] Login successful for user:', response.user.email)
      console.log(' [AUTH] Received tokens:', {
        access_token: response.tokens.access_token.substring(0, 20) + '...',
        refresh_token: response.tokens.refresh_token.substring(0, 20) + '...',
        expires_in: response.tokens.expires_in
      })
      
      // Store tokens
      if (typeof window !== 'undefined') {
        localStorage.setItem('chidi_auth_token', response.tokens.access_token)
        localStorage.setItem('chidi_refresh_token', response.tokens.refresh_token)
        console.log(' [AUTH] Tokens stored in localStorage')
      }
      
      return response
    } catch (error) {
      console.error(' [AUTH] Login failed:', error)
      throw error
    }
  },

  async signup(userData: SignupRequest): Promise<User> {
    console.log(' [AUTH] Attempting signup for:', userData.email)
    const mockSignupResponse = {
      user: { ...MOCK_USER, name: userData.name, email: userData.email },
      business_id: 'mock-business-id',
      workspace_id: 'mock-workspace-id',
      inventory_id: 'mock-inventory-id',
      tokens: {
        access_token: 'mock-jwt-token-signup-' + Date.now(),
        refresh_token: 'mock-refresh-token-signup-' + Date.now(),
        token_type: 'bearer',
        expires_in: 86400
      }
    }
    
    try {
      const response = await apiClient.post<User>('/auth/signup', userData, undefined, undefined)
      
      console.log(' [AUTH] Signup API response:', response)
      console.log(' [AUTH] Response type:', typeof response)
      console.log(' [AUTH] Response keys:', Object.keys(response || {}))
      
      if (response && response.email) {
        console.log(' [AUTH] Signup successful for user:', response.email)
        console.log(' [AUTH] User created without business context - onboarding needed')
      } else {
        console.warn(' [AUTH] Warning: Response missing email property')
        console.log(' [AUTH] Full response:', JSON.stringify(response, null, 2))
      }
      
      // Auto-signin after successful signup to get tokens
      console.log(' [AUTH] Signup successful, auto-signing in to get tokens...')
      
      try {
        const signinResponse = await this.login({
          email: userData.email,
          password: userData.password
        })
        console.log(' [AUTH] Auto-signin successful, tokens stored')
        return response // Return the original user object, not the signin response
      } catch (signinError) {
        console.error(' [AUTH] Auto-signin failed after signup:', signinError)
        console.log(' [AUTH] User created but not signed in - manual signin required')
        return response
      }
    } catch (error) {
      console.error(' [AUTH] Signup failed:', error)
      throw error
    }
  },

  async sendMagicLink(email: string): Promise<{ success: boolean }> {
    const mockResponse = { success: true }
    return apiClient.post('/auth/magic-link', { email }, undefined, mockResponse)
  },

  async getMe(): Promise<User> {
    console.log('👤 [AUTH] Fetching current user data...')
    try {
      const user = await apiClient.get<User>('/auth/me', undefined, undefined)
      console.log('✅ [AUTH] User data retrieved:', {
        id: user.id,
        email: user.email,
        name: user.name,
        businessName: user.businessName || 'Not set',
        hasCompletedOnboarding: !!user.businessName
      })
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
    
    const mockTokenResponse = {
      access_token: 'new-mock-jwt-token-' + Date.now(),
      refresh_token: 'new-mock-refresh-token-' + Date.now(),
      token_type: 'bearer',
      expires_in: 86400
    }
    
    const response = await apiClient.post<TokenResponse>('/auth/refresh', {
      refresh_token: refreshToken
    }, undefined, mockTokenResponse)
    
    // Update stored tokens
    if (typeof window !== 'undefined') {
      localStorage.setItem('chidi_auth_token', response.access_token)
      localStorage.setItem('chidi_refresh_token', response.refresh_token)
    }
    
    return response
  },

  async logout(): Promise<void> {
    try {
      const mockResponse = { success: true }
      await apiClient.post('/auth/logout', undefined, undefined, mockResponse)
    } finally {
      // Clear tokens regardless of API response
      if (typeof window !== 'undefined') {
        localStorage.removeItem('chidi_auth_token')
        localStorage.removeItem('chidi_refresh_token')
      }
    }
  },

  async updateProfile(userData: Partial<User>): Promise<User> {
    const mockUpdatedUser = { ...MOCK_USER, ...userData }
    return apiClient.put('/auth/profile', userData, undefined, mockUpdatedUser)
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
    business_name: string
    business_industry?: string
    phone?: string
    categories?: string[]
    whatsapp_number?: string
    instagram_handle?: string
  }): Promise<AuthResponse> {
    const mockOnboardingResponse = {
      user: MOCK_USER,
      business_id: 'mock-business-id',
      workspace_id: 'mock-workspace-id',
      inventory_id: 'mock-inventory-id',
      tokens: {
        access_token: 'mock-jwt-token-onboarding-' + Date.now(),
        refresh_token: 'mock-refresh-token-onboarding-' + Date.now(),
        token_type: 'bearer',
        expires_in: 86400
      }
    }
    
    // Include refresh token in header so backend can return it in the response
    const refreshToken = this.getRefreshToken()
    const customHeaders: Record<string, string> = {}
    if (refreshToken) {
      customHeaders['X-Refresh-Token'] = refreshToken
    }
    
    const response = await apiClient.post<AuthResponse>('/auth/complete-onboarding', onboardingData, customHeaders, mockOnboardingResponse)
    
    // Update stored tokens
    if (typeof window !== 'undefined') {
      localStorage.setItem('chidi_auth_token', response.tokens.access_token)
      localStorage.setItem('chidi_refresh_token', response.tokens.refresh_token)
    }
    
    return response
  },

  // Helper to clear all stored auth data
  clearAllAuthData(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('chidi_auth_token')
      localStorage.removeItem('chidi_refresh_token')
      // Clear any other cached data that might bypass onboarding
      localStorage.removeItem('chidi_user_data')
      localStorage.removeItem('chidi_onboarding_complete')
    }
  }
}
