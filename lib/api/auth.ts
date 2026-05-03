// Authentication API service
import { apiClient } from './client'
import { setStoredInventoryId, clearStoredInventoryId } from './products'
import { setStoredBusinessId, clearStoredBusinessId } from './categories'
import {
  isDevBypassActive,
  buildDevBypassUser,
  setDevBypassSession,
  getDevBypassUser,
  clearDevBypassSession,
} from '@/lib/chidi/dev-bypass'

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
  redirect_url?: string  // Origin URL for email verification redirect
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
  redirect_url?: string  // Origin URL for magic link redirect
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

export interface ForgotPasswordResponse {
  success: boolean
  message: string
}

export interface ResetPasswordRequest {
  access_token: string
  new_password: string
}

export interface ResetPasswordResponse {
  success: boolean
  message: string
}

export const authAPI = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    if (isDevBypassActive()) {
      const user = buildDevBypassUser(credentials.email)
      setDevBypassSession(credentials.email)
      return {
        user,
        access_token: 'dev-bypass-token',
        refresh_token: 'dev-bypass-refresh',
        token_type: 'bearer',
        expires_in: 86400,
        business_id: user.businessId,
        businessName: user.businessName,
        businessSlug: user.businessSlug,
        inventory_id: 'dev-inventory',
      } as unknown as AuthResponse
    }

    try {
      const response = await apiClient.post<AuthResponse>('/auth/signin', credentials)
      
      console.log(' [AUTH] Login successful for user:', response.user.email)
      
      // Store inventory_id and business_id (tokens are in httpOnly cookies)
      if (typeof window !== 'undefined') {
        if (response.inventory_id) {
          setStoredInventoryId(response.inventory_id)
          console.log(' [AUTH] Inventory ID stored:', response.inventory_id)
        }
        if (response.business_id) {
          setStoredBusinessId(response.business_id)
          console.log(' [AUTH] Business ID stored:', response.business_id)
        }
      }
      
      return response
    } catch (error) {
      console.error(' [AUTH] Login failed:', error)
      throw error
    }
  },

  async signup(userData: SignupRequest): Promise<SignupResponse> {
    if (isDevBypassActive()) {
      // Stash the email so the verification screen can find it; full session
      // gets written when the OTP is "verified" in EmailVerificationPending.
      if (typeof window !== 'undefined') {
        localStorage.setItem('chidi_dev_pending_email', userData.email)
      }
      return {
        needs_verification: true,
        email: userData.email,
        message: 'Verification code sent (dev bypass — any code works)',
      } as SignupResponse
    }

    try {
      // Include redirect_url if not provided (defaults to current origin)
      const requestData = {
        ...userData,
        redirect_url: userData.redirect_url || (typeof window !== 'undefined' ? window.location.origin : undefined)
      }
      const response = await apiClient.post<SignupResponse>('/auth/signup', requestData)
      
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

  async sendMagicLink(email: string, redirectUrl?: string): Promise<MagicLinkResponse> {
    console.log('🔗 [AUTH] Sending magic link to:', email)
    
    try {
      const response = await apiClient.post<MagicLinkResponse>('/auth/magic-link', { 
        email,
        redirect_url: redirectUrl || (typeof window !== 'undefined' ? window.location.origin : undefined)
      })
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
      // Tokens are set via httpOnly cookies by the server
      return response
    } catch (error) {
      console.error('❌ [AUTH] Failed to process magic link callback:', error)
      throw error
    }
  },

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    console.log('🔑 [AUTH] Requesting password reset for:', email)
    
    try {
      const response = await apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', { email })
      console.log('✅ [AUTH] Password reset email sent:', response)
      return response
    } catch (error) {
      console.error('❌ [AUTH] Failed to send password reset:', error)
      throw error
    }
  },

  async resetPassword(accessToken: string, newPassword: string): Promise<ResetPasswordResponse> {
    console.log('🔑 [AUTH] Resetting password')
    
    try {
      const response = await apiClient.post<ResetPasswordResponse>('/auth/reset-password', {
        access_token: accessToken,
        new_password: newPassword
      })
      console.log('✅ [AUTH] Password reset successful:', response)
      return response
    } catch (error) {
      console.error('❌ [AUTH] Failed to reset password:', error)
      throw error
    }
  },

  async resendVerification(email: string, redirectUrl?: string): Promise<ResendVerificationResponse> {
    console.log(' [AUTH] Resending verification email to:', email)
    
    try {
      const response = await apiClient.post<ResendVerificationResponse>('/auth/resend-verification', { 
        email,
        redirect_url: redirectUrl || (typeof window !== 'undefined' ? window.location.origin : undefined)
      })
      console.log(' [AUTH] Resend verification response:', response)
      return response
    } catch (error) {
      console.error(' [AUTH] Resend verification failed:', error)
      throw error
    }
  },

  async getMe(): Promise<User> {
    if (isDevBypassActive()) {
      const cached = getDevBypassUser()
      if (cached) return cached as User
      const fallback = buildDevBypassUser('demo@chidi.app')
      setDevBypassSession(fallback.email)
      return fallback as User
    }

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
    // Refresh token is sent automatically via httpOnly cookie
    const response = await apiClient.post<TokenResponse>('/auth/refresh', {})
    // New tokens are set via httpOnly cookies by the server
    return response
  },

  async logout(): Promise<void> {
    if (isDevBypassActive()) {
      clearDevBypassSession()
      return
    }
    try {
      // Call backend to clear httpOnly cookies
      await apiClient.post('/auth/logout')
    } catch (error) {
      console.warn('[AUTH] Logout API call failed:', error)
    }
  },

  async updateProfile(userData: Partial<User>): Promise<User> {
    return apiClient.put('/auth/profile', userData)
  },

  // Helper to check if user is authenticated
  // Uses the non-httpOnly indicator cookie set by the server
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false
    return document.cookie.includes('chidi_logged_in=true')
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
    default_currency?: string  // Currency code (NGN, GHS, KES)
  }): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/complete-onboarding', onboardingData)
    
    // Store inventory_id and business_id (tokens are in httpOnly cookies)
    if (typeof window !== 'undefined') {
      if (response.inventory_id) {
        setStoredInventoryId(response.inventory_id)
        console.log(' [AUTH] Inventory ID stored after onboarding:', response.inventory_id)
      }
      if (response.business_id) {
        setStoredBusinessId(response.business_id)
        console.log(' [AUTH] Business ID stored after onboarding:', response.business_id)
      }
    }
    
    return response
  },

  // Helper to clear all stored auth data
  clearAllAuthData(): void {
    if (typeof window !== 'undefined') {
      // Clear stored IDs
      clearStoredInventoryId()
      clearStoredBusinessId()
      // Clear any other cached data
      localStorage.removeItem('chidi_user_data')
      localStorage.removeItem('chidi_onboarding_complete')
      
      // Call backend to clear httpOnly cookies (fire and forget)
      apiClient.post('/auth/logout').catch(() => {
        // Ignore errors - we're just cleaning up
      })
    }
  }
}
