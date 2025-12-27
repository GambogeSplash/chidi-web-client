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
      const response = await apiClient.post<SuccessResponse>(
        '/api/settings/logout',
        undefined,
        undefined,
        { success: true, message: 'Logged out successfully' }
      )
      
      // Clear local storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('chidi_auth_token')
        localStorage.removeItem('chidi_refresh_token')
        localStorage.removeItem('chidi_inventory_id')
      }
      
      console.log('✅ [SETTINGS] Logged out successfully')
      return response
    } catch (error) {
      // Even if API fails, clear local tokens
      if (typeof window !== 'undefined') {
        localStorage.removeItem('chidi_auth_token')
        localStorage.removeItem('chidi_refresh_token')
        localStorage.removeItem('chidi_inventory_id')
      }
      console.log('⚠️ [SETTINGS] Logout API failed but tokens cleared')
      return { success: true, message: 'Logged out locally' }
    }
  },

  /**
   * Logout from all devices
   */
  async logoutAllSessions(): Promise<LogoutAllResponse> {
    console.log('🚪 [SETTINGS] Logging out from all devices...')
    try {
      const response = await apiClient.post<LogoutAllResponse>(
        '/api/settings/logout-all',
        undefined,
        undefined,
        { success: true, message: 'Logged out from all devices', sessions_terminated: 1 }
      )
      
      // Clear local storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('chidi_auth_token')
        localStorage.removeItem('chidi_refresh_token')
        localStorage.removeItem('chidi_inventory_id')
      }
      
      console.log('✅ [SETTINGS] Logged out from all devices')
      return response
    } catch (error) {
      console.error('❌ [SETTINGS] Failed to logout all sessions:', error)
      throw error
    }
  }
}
