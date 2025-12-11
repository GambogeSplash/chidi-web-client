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
    const response = await apiClient.post<AuthResponse>('/auth/signin', credentials, undefined, MOCK_LOGIN_RESPONSE)
    
    // Store tokens
    if (typeof window !== 'undefined') {
      localStorage.setItem('chidi_auth_token', response.tokens.access_token)
      localStorage.setItem('chidi_refresh_token', response.tokens.refresh_token)
    }
    
    return response
  },

  async signup(userData: SignupRequest): Promise<AuthResponse> {
    const mockSignupResponse = {
      ...MOCK_LOGIN_RESPONSE,
      user: {
        ...MOCK_USER,
        email: userData.email,
        name: userData.name
      }
    }
    
    const response = await apiClient.post<AuthResponse>('/auth/signup', userData, undefined, mockSignupResponse)
    
    // Store tokens
    if (typeof window !== 'undefined') {
      localStorage.setItem('chidi_auth_token', response.tokens.access_token)
      localStorage.setItem('chidi_refresh_token', response.tokens.refresh_token)
    }
    
    return response
  },

  async sendMagicLink(email: string): Promise<{ success: boolean }> {
    const mockResponse = { success: true }
    return apiClient.post('/auth/magic-link', { email }, undefined, mockResponse)
  },

  async getMe(): Promise<User> {
    return apiClient.get('/auth/me', undefined, MOCK_USER)
  },

  async refreshToken(): Promise<{ token: string; refreshToken: string }> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }
    
    const mockTokenResponse = {
      token: 'new-mock-jwt-token-' + Date.now(),
      refreshToken: 'new-mock-refresh-token-' + Date.now()
    }
    
    const response = await apiClient.post<{ token: string; refreshToken: string }>('/auth/refresh', {
      refreshToken
    }, undefined, mockTokenResponse)
    
    // Update stored tokens
    if (typeof window !== 'undefined') {
      localStorage.setItem('chidi_auth_token', response.token)
      localStorage.setItem('chidi_refresh_token', response.refreshToken)
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
    
    const response = await apiClient.post<AuthResponse>('/auth/complete-onboarding', onboardingData, undefined, mockOnboardingResponse)
    
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
