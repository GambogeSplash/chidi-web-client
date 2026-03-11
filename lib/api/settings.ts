// Settings API service for user preferences, account management, and security
import { apiClient } from './client'

// === NOTIFICATION PREFERENCES ===
export interface NotificationPreferences {
  email_notifications: boolean
  push_notifications: boolean
  stock_alerts: boolean
  order_updates: boolean
  weekly_reports: boolean
  daily_summary: boolean
  marketing_emails: boolean
}

// === UI PREFERENCES ===
export interface UIPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  date_format: string
  compact_mode: boolean
}

// === USER PREFERENCES (Combined) ===
export interface UserPreferences {
  notifications: NotificationPreferences
  ui: UIPreferences
}

export interface UserPreferencesUpdate {
  notifications?: Partial<NotificationPreferences>
  ui?: Partial<UIPreferences>
}

// === ACCOUNT ===
export interface AccountInfo {
  id: string
  email: string
  name: string
  avatar_url?: string
  email_verified: boolean
  auth_provider: string
  created_at: string
  updated_at: string
}

export interface UpdateAccountRequest {
  name?: string
  email?: string
  avatar_url?: string
}

// === SECURITY ===
export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}

export interface SecuritySettings {
  two_factor_enabled: boolean
  last_password_change?: string
  active_sessions: number
  auth_provider: string
}

// === BUSINESS PREFERENCES ===
export interface BusinessPreferences {
  id: string
  business_id: string
  default_currency: string
  date_format: string
  fiscal_year_start: string
  low_stock_threshold: number
  created_at: string
  updated_at: string
}

export interface UpdateBusinessPreferencesRequest {
  default_currency?: string
  date_format?: string
  fiscal_year_start?: string
  low_stock_threshold?: number
}

// === PAYMENT SETTINGS ===
export interface PaymentSettings {
  bank_name: string | null
  account_name: string | null
  account_number: string | null
  payment_instructions: string | null
}

export interface UpdatePaymentSettingsRequest {
  bank_name?: string | null
  account_name?: string | null
  account_number?: string | null
  payment_instructions?: string | null
}

// === RESPONSES ===
export interface SuccessResponse {
  success: boolean
  message: string
}

export interface LogoutAllResponse extends SuccessResponse {
  sessions_terminated: number
}

// === DEFAULT VALUES ===
const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  email_notifications: true,
  push_notifications: true,
  stock_alerts: true,
  order_updates: true,
  weekly_reports: false,
  daily_summary: false,
  marketing_emails: false
}

const DEFAULT_UI_PREFERENCES: UIPreferences = {
  theme: 'dark',
  language: 'en',
  timezone: 'Africa/Lagos',
  date_format: 'DD/MM/YYYY',
  compact_mode: false
}

const DEFAULT_USER_PREFERENCES: UserPreferences = {
  notifications: DEFAULT_NOTIFICATION_PREFERENCES,
  ui: DEFAULT_UI_PREFERENCES
}

// === SETTINGS API ===
export const settingsAPI = {
  // =========================================================================
  // USER PREFERENCES
  // =========================================================================
  
  /**
   * Get user preferences (notifications, UI settings)
   */
  async getPreferences(): Promise<UserPreferences> {
    console.log('⚙️ [SETTINGS] Fetching user preferences...')
    try {
      const response = await apiClient.get<UserPreferences>(
        '/api/settings/preferences',
        undefined,
        DEFAULT_USER_PREFERENCES
      )
      console.log('✅ [SETTINGS] Preferences fetched:', response)
      return response
    } catch (error) {
      console.error('❌ [SETTINGS] Failed to fetch preferences:', error)
      throw error
    }
  },

  /**
   * Update user preferences
   */
  async updatePreferences(data: UserPreferencesUpdate): Promise<UserPreferences> {
    console.log('⚙️ [SETTINGS] Updating preferences:', data)
    try {
      const response = await apiClient.put<UserPreferences>(
        '/api/settings/preferences',
        data,
        undefined,
        DEFAULT_USER_PREFERENCES
      )
      console.log('✅ [SETTINGS] Preferences updated:', response)
      return response
    } catch (error) {
      console.error('❌ [SETTINGS] Failed to update preferences:', error)
      throw error
    }
  },

  // =========================================================================
  // ACCOUNT MANAGEMENT
  // =========================================================================

  /**
   * Get user account details
   */
  async getAccount(): Promise<AccountInfo> {
    console.log('👤 [SETTINGS] Fetching account info...')
    try {
      const response = await apiClient.get<AccountInfo>('/api/settings/account')
      console.log('✅ [SETTINGS] Account info fetched:', response)
      return response
    } catch (error) {
      console.error('❌ [SETTINGS] Failed to fetch account:', error)
      throw error
    }
  },

  /**
   * Update account details (name, avatar)
   */
  async updateAccount(data: UpdateAccountRequest): Promise<AccountInfo> {
    console.log('👤 [SETTINGS] Updating account:', data)
    try {
      const response = await apiClient.put<AccountInfo>('/api/settings/account', data)
      console.log('✅ [SETTINGS] Account updated:', response)
      return response
    } catch (error) {
      console.error('❌ [SETTINGS] Failed to update account:', error)
      throw error
    }
  },

  /**
   * Delete user account and all associated data
   * WARNING: This action is irreversible
   */
  async deleteAccount(password: string): Promise<SuccessResponse> {
    console.log('🗑️ [SETTINGS] Deleting account...')
    try {
      const response = await apiClient.post<SuccessResponse>(
        '/api/settings/account/delete',
        { password, confirmation: 'DELETE' }
      )
      console.log('✅ [SETTINGS] Account deleted')
      return response
    } catch (error) {
      console.error('❌ [SETTINGS] Failed to delete account:', error)
      throw error
    }
  },

  // =========================================================================
  // SECURITY / PASSWORD
  // =========================================================================

  /**
   * Get security settings
   */
  async getSecuritySettings(): Promise<SecuritySettings> {
    console.log('🔒 [SETTINGS] Fetching security settings...')
    try {
      const response = await apiClient.get<SecuritySettings>('/api/settings/security')
      console.log('✅ [SETTINGS] Security settings fetched:', response)
      return response
    } catch (error) {
      console.error('❌ [SETTINGS] Failed to fetch security settings:', error)
      throw error
    }
  },

  /**
   * Change user password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<SuccessResponse> {
    console.log('🔑 [SETTINGS] Changing password...')
    try {
      const response = await apiClient.post<SuccessResponse>(
        '/api/settings/security/change-password',
        {
          current_password: currentPassword,
          new_password: newPassword
        }
      )
      console.log('✅ [SETTINGS] Password changed successfully')
      return response
    } catch (error) {
      console.error('❌ [SETTINGS] Failed to change password:', error)
      throw error
    }
  },

  // =========================================================================
  // LOGOUT
  // =========================================================================

  /**
   * Logout current session
   */
  async logout(): Promise<SuccessResponse> {
    console.log('🚪 [SETTINGS] Logging out...')
    try {
      // Call auth logout to clear httpOnly cookies
      await apiClient.post('/auth/logout')
      
      // Also call settings logout for any server-side session cleanup
      const response = await apiClient.post<SuccessResponse>(
        '/api/settings/logout',
        undefined,
        undefined,
        { success: true, message: 'Logged out successfully' }
      )
      
      // Clear stored IDs
      if (typeof window !== 'undefined') {
        localStorage.removeItem('chidi_inventory_id')
        localStorage.removeItem('chidi_business_id')
      }
      
      console.log('✅ [SETTINGS] Logged out successfully')
      return response
    } catch (error) {
      // Even if API fails, try to clear cookies
      try {
        await apiClient.post('/auth/logout')
      } catch {
        // Ignore - best effort
      }
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('chidi_inventory_id')
        localStorage.removeItem('chidi_business_id')
      }
      console.log('⚠️ [SETTINGS] Logout API failed but cookies cleared')
      return { success: true, message: 'Logged out locally' }
    }
  },

  /**
   * Logout from all devices
   */
  async logoutAllSessions(): Promise<LogoutAllResponse> {
    console.log('🚪 [SETTINGS] Logging out from all devices...')
    try {
      // Call auth logout to clear httpOnly cookies for this session
      await apiClient.post('/auth/logout')
      
      const response = await apiClient.post<LogoutAllResponse>(
        '/api/settings/logout-all',
        undefined,
        undefined,
        { success: true, message: 'Logged out from all devices', sessions_terminated: 1 }
      )
      
      // Clear stored IDs
      if (typeof window !== 'undefined') {
        localStorage.removeItem('chidi_inventory_id')
        localStorage.removeItem('chidi_business_id')
      }
      
      console.log('✅ [SETTINGS] Logged out from all devices')
      return response
    } catch (error) {
      // Try to clear cookies even if logout-all fails
      try {
        await apiClient.post('/auth/logout')
      } catch {
        // Ignore - best effort
      }
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('chidi_inventory_id')
        localStorage.removeItem('chidi_business_id')
      }
      
      console.error('❌ [SETTINGS] Failed to logout all sessions:', error)
      throw error
    }
  },

  // =========================================================================
  // BUSINESS PREFERENCES
  // =========================================================================

  /**
   * Get business preferences (currency, low stock threshold, etc.)
   */
  async getBusinessPreferences(businessId: string): Promise<BusinessPreferences> {
    console.log('🏢 [SETTINGS] Fetching business preferences...')
    try {
      const response = await apiClient.get<BusinessPreferences>(
        `/api/business/${businessId}/preferences`
      )
      console.log('✅ [SETTINGS] Business preferences fetched:', response)
      return response
    } catch (error) {
      console.error('❌ [SETTINGS] Failed to fetch business preferences:', error)
      throw error
    }
  },

  /**
   * Update business preferences
   */
  async updateBusinessPreferences(
    businessId: string, 
    data: UpdateBusinessPreferencesRequest
  ): Promise<BusinessPreferences> {
    console.log('🏢 [SETTINGS] Updating business preferences:', data)
    try {
      const response = await apiClient.put<BusinessPreferences>(
        `/api/business/${businessId}/preferences`,
        data
      )
      console.log('✅ [SETTINGS] Business preferences updated:', response)
      return response
    } catch (error) {
      console.error('❌ [SETTINGS] Failed to update business preferences:', error)
      throw error
    }
  },

  // =========================================================================
  // PAYMENT SETTINGS
  // =========================================================================

  /**
   * Get payment settings (bank details for receiving customer payments)
   */
  async getPaymentSettings(businessId: string): Promise<PaymentSettings> {
    console.log('💳 [SETTINGS] Fetching payment settings...')
    try {
      const response = await apiClient.get<PaymentSettings>(
        `/api/business/${businessId}/payment-settings`
      )
      console.log('✅ [SETTINGS] Payment settings fetched:', response)
      return response
    } catch (error) {
      console.error('❌ [SETTINGS] Failed to fetch payment settings:', error)
      throw error
    }
  },

  /**
   * Update payment settings
   */
  async updatePaymentSettings(
    businessId: string, 
    data: UpdatePaymentSettingsRequest
  ): Promise<PaymentSettings> {
    console.log('💳 [SETTINGS] Updating payment settings:', data)
    try {
      const response = await apiClient.put<PaymentSettings>(
        `/api/business/${businessId}/payment-settings`,
        data
      )
      console.log('✅ [SETTINGS] Payment settings updated:', response)
      return response
    } catch (error) {
      console.error('❌ [SETTINGS] Failed to update payment settings:', error)
      throw error
    }
  }
}
