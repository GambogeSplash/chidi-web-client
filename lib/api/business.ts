// Business API service for managing business profile and preferences
import { apiClient } from './client'

export interface UpdateBusinessProfileRequest {
  legal_name?: string
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

export interface BusinessProfileResponse {
  id: string
  business_id: string
  legal_name?: string
  business_category?: string
  description?: string
  phone?: string
  whatsapp_number?: string
  instagram?: string
  website?: string
  logo_url?: string
  address_line1?: string
  city?: string
  country?: string
  timezone: string
  created_at: string
  updated_at: string
}

export const businessAPI = {
  /**
   * Update business profile
   */
  async updateProfile(businessId: string, data: UpdateBusinessProfileRequest): Promise<BusinessProfileResponse> {
    return apiClient.put<BusinessProfileResponse>(`/api/business/${businessId}/profile`, data)
  },

  /**
   * Get business profile
   */
  async getProfile(businessId: string): Promise<BusinessProfileResponse> {
    return apiClient.get<BusinessProfileResponse>(`/api/business/${businessId}/profile`)
  }
}
