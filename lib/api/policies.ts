// Policies API - Business FAQs and Rules management
import { apiClient } from './client'

// Types
export type PolicyType = 'FAQ' | 'RULE'

export interface BusinessPolicy {
  id: string
  business_id: string
  type: PolicyType
  title: string
  content: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreatePolicyRequest {
  type: PolicyType
  title: string
  content: string
}

export interface UpdatePolicyRequest {
  type?: PolicyType
  title?: string
  content?: string
  is_active?: boolean
}

// Policies API class
class PoliciesAPI {
  /**
   * List all policy entries for a business
   */
  async list(businessId: string, type?: PolicyType, activeOnly: boolean = true): Promise<BusinessPolicy[]> {
    let endpoint = `/api/business/${businessId}/policies?active_only=${activeOnly}`
    if (type) {
      endpoint += `&type=${type}`
    }
    return apiClient.get<BusinessPolicy[]>(endpoint)
  }

  /**
   * Get FAQs only
   */
  async getFAQs(businessId: string): Promise<BusinessPolicy[]> {
    return this.list(businessId, 'FAQ')
  }

  /**
   * Get Rules only
   */
  async getRules(businessId: string): Promise<BusinessPolicy[]> {
    return this.list(businessId, 'RULE')
  }

  /**
   * Get a single policy entry
   */
  async get(businessId: string, policyId: string): Promise<BusinessPolicy> {
    return apiClient.get<BusinessPolicy>(`/api/business/${businessId}/policies/${policyId}`)
  }

  /**
   * Create a new policy entry
   */
  async create(businessId: string, data: CreatePolicyRequest): Promise<BusinessPolicy> {
    return apiClient.post<BusinessPolicy>(`/api/business/${businessId}/policies`, data)
  }

  /**
   * Update a policy entry
   */
  async update(businessId: string, policyId: string, data: UpdatePolicyRequest): Promise<BusinessPolicy> {
    return apiClient.put<BusinessPolicy>(`/api/business/${businessId}/policies/${policyId}`, data)
  }

  /**
   * Delete a policy entry
   */
  async delete(businessId: string, policyId: string): Promise<void> {
    return apiClient.delete<void>(`/api/business/${businessId}/policies/${policyId}`)
  }

  /**
   * Initialize default FAQs and Rules for a business
   */
  async initializeDefaults(businessId: string): Promise<BusinessPolicy[]> {
    return apiClient.post<BusinessPolicy[]>(`/api/business/${businessId}/policies/defaults`)
  }

  /**
   * Search policy entries
   */
  async search(businessId: string, query: string, limit: number = 5): Promise<BusinessPolicy[]> {
    return apiClient.post<BusinessPolicy[]>(`/api/business/${businessId}/policies/search?query=${encodeURIComponent(query)}&limit=${limit}`)
  }
}

export const policiesAPI = new PoliciesAPI()
