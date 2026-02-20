// Memories API - AI Memory management
import { apiClient } from './client'

// Types
export type MemoryType = 'episodic' | 'semantic' | 'procedural'

export interface MemoryItem {
  id: string
  content: string
  summary: string | null
  memory_type: MemoryType
  importance_score: number
  access_count: number
  created_at: string
  source_type: string | null
}

export interface MemoryListResponse {
  memories: MemoryItem[]
  total: number
  limit: number
  offset: number
}

export interface MemoryListParams {
  limit?: number
  offset?: number
  memory_type?: MemoryType
}

// Memories API class
class MemoriesAPI {
  /**
   * List all memories for a business with pagination
   */
  async list(params?: MemoryListParams): Promise<MemoryListResponse> {
    const searchParams = new URLSearchParams()
    
    if (params?.limit) {
      searchParams.append('limit', params.limit.toString())
    }
    if (params?.offset !== undefined) {
      searchParams.append('offset', params.offset.toString())
    }
    if (params?.memory_type) {
      searchParams.append('memory_type', params.memory_type)
    }
    
    const queryString = searchParams.toString()
    const endpoint = `/api/insights/memories/list${queryString ? `?${queryString}` : ''}`
    
    return apiClient.get<MemoryListResponse>(endpoint)
  }

  /**
   * Delete a memory (soft delete)
   */
  async delete(memoryId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/api/insights/memories/${memoryId}`
    )
  }
}

export const memoriesAPI = new MemoriesAPI()
