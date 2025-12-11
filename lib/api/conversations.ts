// AI/Conversations API service
import { apiClient } from './client'

// Mock data for testing
const MOCK_CONVERSATIONS = [
  {
    id: 'conv_1',
    customerId: 'cust_1',
    customerName: 'John Doe',
    messages: [
      { id: 'msg_1', content: 'Hi, do you have any laptops in stock?', sender: 'customer', timestamp: '2024-01-15T10:00:00Z' },
      { id: 'msg_2', content: 'Yes! We have several laptop models available. What are you looking for specifically?', sender: 'business', timestamp: '2024-01-15T10:05:00Z' }
    ],
    status: 'active',
    priority: 'medium',
    lastActivity: '2024-01-15T10:05:00Z'
  }
]

const MOCK_AI_RESPONSE = {
  message: 'I understand you\'re interested in our products. Based on your inquiry, I\'d recommend checking out our premium laptop stand and wireless headphones. They\'re very popular with our customers!',
  confidence: 0.85,
  suggestedActions: [
    { type: 'show_products', label: 'View Electronics', data: { category: 'electronics' } },
    { type: 'create_order', label: 'Create Order', data: {} }
  ]
}

const MOCK_ANALYTICS = {
  totalRevenue: 245000,
  totalOrders: 45,
  averageOrderValue: 5444,
  topProducts: [
    { name: 'Premium Laptop Stand', sales: 12 },
    { name: 'Wireless Headphones', sales: 8 }
  ],
  monthlySales: {
    January: 245000,
    February: 198000
  }
}

export interface CustomerIntent {
  type: "product_inquiry" | "price_check" | "availability" | "order_status" | "return_policy" | "delivery" | "general"
  confidence: number
  entities: {
    productName?: string
    location?: string
    orderNumber?: string
  }
  sentiment?: "positive" | "neutral" | "negative" | "angry" | "urgent"
}

export interface AIResponse {
  message: string
  suggestedActions?: Array<{
    label: string
    action: string
  }>
  requiresHumanReview: boolean
  confidence: number
}

export interface MessageAnalysisRequest {
  message: string
  customerContext?: {
    id?: string
    previousOrders?: any[]
    preferences?: string[]
  }
  businessContext?: {
    products?: any[]
    businessName?: string
    returnPolicy?: string
  }
}

export interface ConversationMessage {
  id: string
  content: string
  sender: 'customer' | 'agent' | 'ai'
  timestamp: string
  platform?: 'whatsapp' | 'instagram' | 'web'
  customerId?: string
  metadata?: any
}

export interface Conversation {
  id: string
  customerId: string
  customerName: string
  customerPhone: string
  platform: 'whatsapp' | 'instagram' | 'web'
  status: 'new' | 'active' | 'waiting' | 'resolved' | 'closed'
  messages: ConversationMessage[]
  assignedTo?: string
  createdAt: string
  updatedAt: string
}

export interface SmartSuggestion {
  label: string
  message: string
  confidence: number
  category: 'quick_reply' | 'upsell' | 'cross_sell' | 'follow_up'
}

export const conversationsAPI = {
  async analyzeMessage(request: MessageAnalysisRequest): Promise<{
    intent: CustomerIntent
    aiResponse: AIResponse
    suggestedReplies: string[]
  }> {
    // Simple intent detection for testing
    const message = request.message.toLowerCase()
    let intent = { type: 'general_inquiry', confidence: 0.7 }
    
    if (message.includes('order') || message.includes('buy')) {
      intent = { type: 'business_command', action: 'create_order', confidence: 0.9 }
    } else if (message.includes('analytics') || message.includes('sales') || message.includes('performance')) {
      intent = { type: 'business_command', action: 'show_analytics', confidence: 0.9 }
    } else if (message.includes('stock') || message.includes('inventory')) {
      intent = { type: 'business_command', action: 'check_inventory', confidence: 0.8 }
    }
    
    const mockResponse = {
      intent,
      aiResponse: {
        message: request.tone === 'nigerian-gen-z' 
          ? 'Oya boss! I don understand wetin you dey talk. Make I help you quick quick! 🔥'
          : MOCK_AI_RESPONSE.message,
        suggestedActions: MOCK_AI_RESPONSE.suggestedActions
      }
    }
    
    return apiClient.post('/conversations/analyze', request, undefined, mockResponse)
  },

  async generateResponse(intent: CustomerIntent, context?: any): Promise<AIResponse> {
    return await apiClient.post('/conversations/respond', { intent, context })
  },

  async getConversations(filters?: {
    status?: Conversation['status']
    platform?: Conversation['platform']
    customerId?: string
    limit?: number
    offset?: number
  }): Promise<{
    conversations: Conversation[]
    total: number
  }> {
    const queryParams = new URLSearchParams()
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString())
        }
      })
    }
    
    const endpoint = `/conversations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return await apiClient.get(endpoint, undefined, MOCK_CONVERSATIONS)
  },

  async getConversation(id: string): Promise<Conversation> {
    return await apiClient.get<Conversation>(`/conversations/${id}`, undefined, MOCK_CONVERSATIONS[0])
  },

  async createMessage(conversationId: string, message: {
    content: string
    sender: 'customer' | 'agent' | 'ai'
    metadata?: any
  }): Promise<ConversationMessage> {
    return await apiClient.post(`/conversations/${conversationId}/messages`, message)
  },

  async updateConversationStatus(id: string, status: Conversation['status']): Promise<Conversation> {
    return await apiClient.put(`/conversations/${id}/status`, { status })
  },

  async assignConversation(id: string, agentId: string): Promise<Conversation> {
    return await apiClient.put(`/conversations/${id}/assign`, { agentId })
  },

  async getSmartSuggestions(conversationId: string): Promise<SmartSuggestion[]> {
    return await apiClient.get<SmartSuggestion[]>(`/conversations/${conversationId}/suggestions`)
  },

  async markAsRead(conversationId: string): Promise<void> {
    return await apiClient.post(`/conversations/${conversationId}/read`)
  }
}
