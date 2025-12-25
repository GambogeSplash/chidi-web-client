// Knowledge API - Business FAQs and Rules management
import { apiClient } from './client'

// Types
export type KnowledgeType = 'FAQ' | 'RULE'

export interface BusinessKnowledge {
  id: string
  business_id: string
  type: KnowledgeType
  title: string
  content: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateKnowledgeRequest {
  type: KnowledgeType
  title: string
  content: string
}

export interface UpdateKnowledgeRequest {
  type?: KnowledgeType
  title?: string
  content?: string
  is_active?: boolean
}

// Knowledge API class
class KnowledgeAPI {
  /**
   * List all knowledge entries for a business
   */
  async list(businessId: string, type?: KnowledgeType, activeOnly: boolean = true): Promise<BusinessKnowledge[]> {
    let endpoint = `/api/business/${businessId}/knowledge?active_only=${activeOnly}`
    if (type) {
      endpoint += `&type=${type}`
    }
    return apiClient.get<BusinessKnowledge[]>(endpoint)
  }

  /**
   * Get FAQs only
   */
  async getFAQs(businessId: string): Promise<BusinessKnowledge[]> {
    return this.list(businessId, 'FAQ')
  }

  /**
   * Get Rules only
   */
  async getRules(businessId: string): Promise<BusinessKnowledge[]> {
    return this.list(businessId, 'RULE')
  }

  /**
   * Get a single knowledge entry
   */
  async get(businessId: string, knowledgeId: string): Promise<BusinessKnowledge> {
    return apiClient.get<BusinessKnowledge>(`/api/business/${businessId}/knowledge/${knowledgeId}`)
  }

  /**
   * Create a new knowledge entry
   */
  async create(businessId: string, data: CreateKnowledgeRequest): Promise<BusinessKnowledge> {
    return apiClient.post<BusinessKnowledge>(`/api/business/${businessId}/knowledge`, data)
  }

  /**
   * Update a knowledge entry
   */
  async update(businessId: string, knowledgeId: string, data: UpdateKnowledgeRequest): Promise<BusinessKnowledge> {
    return apiClient.put<BusinessKnowledge>(`/api/business/${businessId}/knowledge/${knowledgeId}`, data)
  }

  /**
   * Delete a knowledge entry
   */
  async delete(businessId: string, knowledgeId: string): Promise<void> {
    return apiClient.delete<void>(`/api/business/${businessId}/knowledge/${knowledgeId}`)
  }

  /**
   * Initialize default FAQs and Rules for a business
   */
  async initializeDefaults(businessId: string): Promise<BusinessKnowledge[]> {
    return apiClient.post<BusinessKnowledge[]>(`/api/business/${businessId}/knowledge/defaults`)
  }

  /**
   * Search knowledge entries
   */
  async search(businessId: string, query: string, limit: number = 5): Promise<BusinessKnowledge[]> {
    return apiClient.post<BusinessKnowledge[]>(`/api/business/${businessId}/knowledge/search?query=${encodeURIComponent(query)}&limit=${limit}`)
  }
}

export const knowledgeAPI = new KnowledgeAPI()
