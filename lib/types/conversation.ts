/**
 * Conversation and Message types aligned with backend models.
 * These types match the Pydantic models in chidi/models/conversation_models.py
 */

// === ENUMS ===

export type MessageRole = 'user' | 'assistant' | 'system'

export type ConversationStatus = 'active' | 'archived' | 'deleted'

export type ConversationTopic = 
  | 'inventory_analysis'
  | 'sales_insights'
  | 'stock_management'
  | 'business_analytics'
  | 'product_performance'
  | 'general_inquiry'

// === CONVERSATION TYPES ===

export interface ConversationResponse {
  id: string
  workspace_id: string
  user_id: string
  title: string
  description: string | null
  topic: ConversationTopic
  status: ConversationStatus
  tags: string[]
  pinned: boolean
  archived: boolean
  created_at: string
  last_activity: string
}

export interface CreateConversationRequest {
  title: string
  description?: string
  topic?: ConversationTopic
  context?: Record<string, unknown>
}

export interface UpdateConversationRequest {
  title?: string
  description?: string
  topic?: ConversationTopic
  tags?: string[]
  pinned?: boolean
  archived?: boolean
}

// === MESSAGE TYPES ===

export interface MessageContent {
  text: string
  type?: string
  [key: string]: unknown
}

export interface MessageResponse {
  id: string
  conversation_id: string
  user_id: string
  role: MessageRole
  content: MessageContent
  tokens: number | null
  edited: boolean
  created_at: string
}

export interface SendMessageRequest {
  user_id: string
  content: string
  context_limit?: number
}

// === UTILITY TYPES ===

export interface ConversationSummary {
  id: string
  title: string
  topic: ConversationTopic
  status: ConversationStatus
  message_count: number
  last_activity: string
  pinned: boolean
}

export interface ConversationStats {
  total_messages: number
  user_messages: number
  assistant_messages: number
  total_tokens: number
  first_message: string | null
  last_message: string | null
}

// === API RESPONSE TYPES ===

export interface ConversationListResponse {
  conversations: ConversationResponse[]
  total?: number
}

export interface AIAnalysisResponse {
  intent: {
    type: string
    confidence: number
    entities?: Record<string, unknown>
  }
  response: string
  suggested_actions?: Array<{
    type: string
    label: string
    data?: Record<string, unknown>
  }>
}

// === FRONTEND UI TYPES ===

/**
 * Extended message type for UI rendering
 * Includes display-friendly properties
 */
export interface ChatMessage {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  timestamp: Date
  isEdited: boolean
  isLoading?: boolean
  isStreaming?: boolean
  error?: string
}

/**
 * Extended conversation type for UI rendering
 * Includes computed properties for display
 */
export interface ChatConversation {
  id: string
  title: string
  topic: ConversationTopic
  status: ConversationStatus
  isPinned: boolean
  isArchived: boolean
  lastActivity: Date
  createdAt: Date
  messageCount?: number
  lastMessage?: string
}

// === TYPE CONVERTERS ===

/**
 * Convert backend MessageResponse to frontend ChatMessage
 */
export function toUIMessage(msg: MessageResponse): ChatMessage {
  return {
    id: msg.id,
    conversationId: msg.conversation_id,
    role: msg.role,
    content: msg.content.text || JSON.stringify(msg.content),
    timestamp: new Date(msg.created_at),
    isEdited: msg.edited,
  }
}

/**
 * Convert backend ConversationResponse to frontend ChatConversation
 */
export function toUIConversation(conv: ConversationResponse): ChatConversation {
  return {
    id: conv.id,
    title: conv.title,
    topic: conv.topic,
    status: conv.status,
    isPinned: conv.pinned,
    isArchived: conv.archived,
    lastActivity: new Date(conv.last_activity),
    createdAt: new Date(conv.created_at),
  }
}
