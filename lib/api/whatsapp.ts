/**
 * WhatsApp API client for Chidi web client.
 */

import { apiClient } from './client';

// ============================================
// Types
// ============================================

export type WhatsAppConnectionStatus = 'PENDING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
export type WhatsAppConversationStatus = 'ACTIVE' | 'NEEDS_HUMAN' | 'RESOLVED';
export type WhatsAppMessageDirection = 'INBOUND' | 'OUTBOUND';
export type WhatsAppSenderType = 'CUSTOMER' | 'AI' | 'HUMAN';
export type WhatsAppIntent = 
  | 'PRODUCT_ENQUIRY' 
  | 'INVENTORY_AVAILABILITY' 
  | 'PRICE_ENQUIRY' 
  | 'BUSINESS_OPERATIONS' 
  | 'HUMAN_REQUEST' 
  | 'UNKNOWN';

export interface BusinessHours {
  start: string;
  end: string;
  days: number[];
  timezone: string;
}

export interface WhatsAppConnection {
  id: string;
  business_id: string;
  twilio_phone_number: string;
  status: WhatsAppConnectionStatus;
  ai_enabled: boolean;
  after_hours_only: boolean;
  business_hours?: BusinessHours;
  context_timeout_hours: number;
  connected_at?: string;
  last_message_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppStatus {
  connected: boolean;
  status?: WhatsAppConnectionStatus;
  phone_number?: string;
  ai_enabled?: boolean;
  after_hours_only?: boolean;
  last_message_at?: string;
  error_message?: string;
}

export interface WhatsAppConversation {
  id: string;
  connection_id: string;
  customer_phone: string;
  customer_name?: string;
  status: WhatsAppConversationStatus;
  last_activity: string;
  context_expires_at: string;
  last_intent?: WhatsAppIntent;
  unread_count: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  direction: WhatsAppMessageDirection;
  sender_type: WhatsAppSenderType;
  content: string;
  twilio_message_sid?: string;
  intent?: WhatsAppIntent;
  confidence?: number;
  delivered: boolean;
  delivered_at?: string;
  read: boolean;
  read_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationListResponse {
  conversations: WhatsAppConversation[];
  total: number;
  needs_human_count: number;
}

export interface MessageListResponse {
  messages: WhatsAppMessage[];
  total: number;
  conversation: WhatsAppConversation;
}

// ============================================
// Request Types
// ============================================

export interface ConnectWhatsAppRequest {
  twilio_phone_number: string;
  ai_enabled?: boolean;
  after_hours_only?: boolean;
  business_hours?: BusinessHours;
}

export interface UpdateWhatsAppSettingsRequest {
  ai_enabled?: boolean;
  after_hours_only?: boolean;
  business_hours?: BusinessHours;
  context_timeout_hours?: number;
}

export interface SendMessageRequest {
  content: string;
}

// ============================================
// API Functions
// ============================================

/**
 * Get WhatsApp connection status
 */
export async function getWhatsAppStatus(): Promise<WhatsAppStatus> {
  const response = await apiClient.get('/api/whatsapp/status');
  return response.data;
}

/**
 * Connect WhatsApp (save Twilio credentials)
 */
export async function connectWhatsApp(request: ConnectWhatsAppRequest): Promise<WhatsAppConnection> {
  const response = await apiClient.post('/api/whatsapp/connect', request);
  return response.data;
}

/**
 * Update WhatsApp settings
 */
export async function updateWhatsAppSettings(request: UpdateWhatsAppSettingsRequest): Promise<WhatsAppConnection> {
  const response = await apiClient.patch('/api/whatsapp/settings', request);
  return response.data;
}

/**
 * Disconnect WhatsApp
 */
export async function disconnectWhatsApp(): Promise<void> {
  await apiClient.delete('/api/whatsapp/disconnect');
}

/**
 * Get WhatsApp conversations
 */
export async function getConversations(
  status?: WhatsAppConversationStatus,
  limit: number = 50,
  offset: number = 0
): Promise<ConversationListResponse> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());
  
  const response = await apiClient.get(`/api/whatsapp/conversations?${params.toString()}`);
  return response.data;
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(
  conversationId: string,
  limit: number = 50,
  offset: number = 0
): Promise<MessageListResponse> {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());
  
  const response = await apiClient.get(
    `/api/whatsapp/conversations/${conversationId}/messages?${params.toString()}`
  );
  return response.data;
}

/**
 * Send a human reply to a conversation
 */
export async function sendReply(
  conversationId: string,
  content: string
): Promise<WhatsAppMessage> {
  const response = await apiClient.post(
    `/api/whatsapp/conversations/${conversationId}/reply`,
    { conversation_id: conversationId, content }
  );
  return response.data;
}

/**
 * Resolve a conversation
 */
export async function resolveConversation(
  conversationId: string,
  returnToAi: boolean = true
): Promise<WhatsAppConversation> {
  const response = await apiClient.post(
    `/api/whatsapp/conversations/${conversationId}/resolve?return_to_ai=${returnToAi}`
  );
  return response.data;
}

/**
 * Mark conversation as read
 */
export async function markConversationRead(conversationId: string): Promise<WhatsAppConversation> {
  const response = await apiClient.post(
    `/api/whatsapp/conversations/${conversationId}/read`
  );
  return response.data;
}

// Export as namespace for convenience
export const whatsappAPI = {
  getStatus: getWhatsAppStatus,
  connect: connectWhatsApp,
  updateSettings: updateWhatsAppSettings,
  disconnect: disconnectWhatsApp,
  getConversations,
  getMessages: getConversationMessages,
  sendReply,
  resolveConversation,
  markRead: markConversationRead,
};
