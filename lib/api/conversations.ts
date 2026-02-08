/**
 * Conversations API service
 * Integrates with backend conversation endpoints
 */
import { apiClient } from './client'
import type {
  ConversationResponse,
  MessageResponse,
  CreateConversationRequest,
  SendMessageRequest,
  UpdateConversationRequest,
  ConversationStatus,
  ConversationTopic,
  ChatMessage,
  ChatConversation,
} from '../types/conversation'
import { toUIMessage, toUIConversation } from '../types/conversation'

// Re-export types for convenience
export type {
  ConversationResponse,
  MessageResponse,
  CreateConversationRequest,
  SendMessageRequest,
  ChatMessage,
  ChatConversation,
  ConversationStatus,
  ConversationTopic,
}

// === MOCK DATA (Development fallback) ===

const MOCK_CONVERSATIONS: ConversationResponse[] = [
  {
    id: 'conv_mock_1',
    workspace_id: 'ws_mock_1',
    user_id: 'user_mock_1',
    title: 'Inventory Analysis',
    description: 'Analyzing current stock levels',
    topic: 'inventory_analysis',
    status: 'active',
    tags: ['inventory', 'analysis'],
    pinned: false,
    archived: false,
    created_at: new Date().toISOString(),
    last_activity: new Date().toISOString(),
  }
]

const MOCK_MESSAGES: MessageResponse[] = [
  {
    id: 'msg_mock_1',
    conversation_id: 'conv_mock_1',
    user_id: 'user_mock_1',
    role: 'user',
    content: { text: 'What is my current inventory status?', type: 'text' },
    tokens: 10,
    edited: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'msg_mock_2',
    conversation_id: 'conv_mock_1',
    user_id: 'assistant',
    role: 'assistant',
    content: { 
      text: 'Based on your inventory data, you have 45 products in stock with a total value of ₦2,450,000. Would you like me to show you the low stock items?',
      type: 'text'
    },
    tokens: 35,
    edited: false,
    created_at: new Date().toISOString(),
  }
]

// === CONVERSATIONS API ===

export const conversationsAPI = {
  // ============================================================================
  // USER-CENTRIC ENDPOINTS (Recommended - uses JWT auth)
  // ============================================================================

  /**
   * Get all conversations for the authenticated user
   * Uses: GET /api/conversations/user/me
   */
  async getMyConversations(filters?: {
    status?: ConversationStatus
    limit?: number
    offset?: number
  }): Promise<ConversationResponse[]> {
    const params = new URLSearchParams()
    
    if (filters?.status) params.append('status_filter', filters.status)
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.offset) params.append('offset', filters.offset.toString())
    
    const query = params.toString()
    const endpoint = `/api/conversations/user/me${query ? `?${query}` : ''}`
    
    return apiClient.get<ConversationResponse[]>(endpoint)
  },

  /**
   * Create a new conversation for the authenticated user
   * Uses: POST /api/conversations/user/me
   */
  async createConversation(request: CreateConversationRequest): Promise<ConversationResponse> {
    // No mock fallback - must succeed on backend
    return apiClient.post<ConversationResponse>(
      '/api/conversations/user/me',
      request
    )
  },

  /**
   * Search conversations for the authenticated user
   * Uses: GET /api/conversations/user/me/search
   */
  async searchConversations(query: string, limit?: number): Promise<ConversationResponse[]> {
    const params = new URLSearchParams({ query })
    if (limit) params.append('limit', limit.toString())
    
    return apiClient.get<ConversationResponse[]>(
      `/api/conversations/user/me/search?${params.toString()}`
    )
  },

  // ============================================================================
  // CONVERSATION OPERATIONS
  // ============================================================================

  /**
   * Get a specific conversation by ID
   * Uses: GET /api/conversations/{id}
   */
  async getConversation(conversationId: string): Promise<ConversationResponse> {
    return apiClient.get<ConversationResponse>(
      `/api/conversations/${conversationId}`
    )
  },

  /**
   * Update a conversation
   * Uses: PUT /api/conversations/{id}
   */
  async updateConversation(
    conversationId: string,
    updates: UpdateConversationRequest
  ): Promise<ConversationResponse> {
    return apiClient.put<ConversationResponse>(
      `/api/conversations/${conversationId}`,
      updates
    )
  },

  /**
   * Delete a conversation for the authenticated user
   * Uses: DELETE /api/conversations/user/me/{id}
   */
  async deleteConversation(conversationId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/api/conversations/user/me/${conversationId}`)
  },

  /**
   * Archive a conversation
   * Uses: POST /api/conversations/{id}/archive
   */
  async archiveConversation(conversationId: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`/api/conversations/${conversationId}/archive`)
  },

  /**
   * Update conversation status
   * Uses: PUT /api/conversations/{id}/status
   */
  async updateConversationStatus(
    conversationId: string,
    status: ConversationStatus
  ): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>(
      `/api/conversations/${conversationId}/status?new_status=${status}`
    )
  },

  // ============================================================================
  // MESSAGE OPERATIONS
  // ============================================================================

  /**
   * Get messages for a conversation
   * Uses: GET /api/conversations/{id}/messages
   */
  async getMessages(
    conversationId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<MessageResponse[]> {
    const params = new URLSearchParams()
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.offset) params.append('offset', options.offset.toString())
    
    const query = params.toString()
    const endpoint = `/api/conversations/${conversationId}/messages${query ? `?${query}` : ''}`
    
    return apiClient.get<MessageResponse[]>(endpoint)
  },

  /**
   * Send a message and get AI response
   * Uses: POST /api/conversations/{id}/messages
   */
  async sendMessage(
    conversationId: string,
    request: SendMessageRequest
  ): Promise<MessageResponse> {
    return apiClient.post<MessageResponse>(
      `/api/conversations/${conversationId}/messages`,
      request
    )
  },
}
