/**
 * Universal Messaging API client for Chidi web client.
 * 
 * Channel-agnostic API for WhatsApp, Telegram, and other messaging platforms.
 */

import { apiClient } from './client';

// ============================================
// Types
// ============================================

export type ChannelType = 'WHATSAPP' | 'TELEGRAM' | 'INSTAGRAM' | 'SMS';
export type ConnectionStatus = 'PENDING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
export type ConversationStatus = 'ACTIVE' | 'NEEDS_HUMAN' | 'RESOLVED';
export type MessageDirection = 'INBOUND' | 'OUTBOUND';
export type SenderType = 'CUSTOMER' | 'AI' | 'HUMAN';
export type MessageIntent = 
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

export interface ChannelConnection {
  id: string;
  business_id: string;
  channel_type: ChannelType;
  channel_identifier: string;
  credentials: Record<string, unknown>;
  status: ConnectionStatus;
  ai_enabled: boolean;
  after_hours_only: boolean;
  business_hours?: BusinessHours;
  context_timeout_hours: number;
  platform_metadata: Record<string, unknown>;
  connected_at?: string;
  last_message_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ConnectionStatusResponse {
  connected: boolean;
  channel_type: ChannelType;
  status?: ConnectionStatus;
  channel_identifier?: string;
  ai_enabled?: boolean;
  after_hours_only?: boolean;
  last_message_at?: string;
  error_message?: string;
  platform_metadata?: Record<string, unknown>;
}

export interface ConnectionListResponse {
  connections: ChannelConnection[];
  total: number;
}

export interface ChannelConversation {
  id: string;
  connection_id: string;
  customer_id: string;
  customer_name?: string;
  status: ConversationStatus;
  last_activity: string;
  context_expires_at: string;
  last_intent?: MessageIntent;
  unread_count: number;
  metadata?: Record<string, unknown>;
  channel_type?: ChannelType;
  created_at: string;
  updated_at: string;
}

export interface ChannelMessage {
  id: string;
  conversation_id: string;
  direction: MessageDirection;
  sender_type: SenderType;
  content: string;
  external_message_id?: string;
  intent?: MessageIntent;
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
  conversations: ChannelConversation[];
  total: number;
  needs_human_count: number;
}

export interface MessageListResponse {
  messages: ChannelMessage[];
  total: number;
  conversation: ChannelConversation;
}

// ============================================
// Request Types
// ============================================

export interface ConnectChannelRequest {
  credentials: Record<string, unknown>;
  channel_identifier: string;
  ai_enabled?: boolean;
  after_hours_only?: boolean;
  business_hours?: BusinessHours;
}

export interface UpdateChannelSettingsRequest {
  ai_enabled?: boolean;
  after_hours_only?: boolean;
  business_hours?: BusinessHours;
  context_timeout_hours?: number;
}

export interface SendMessageRequest {
  content: string;
}

// Channel-specific credential helpers
export interface WhatsAppCredentials {
  account_sid?: string;
  auth_token?: string;
  phone_number: string;
  subaccount_sid?: string;
  subaccount_token?: string;
}

export interface TelegramCredentials {
  bot_token: string;
}

// ============================================
// API Functions
// ============================================

const API_BASE = '/api/messaging';

/**
 * Get all channel connections
 */
export async function getConnections(): Promise<ConnectionListResponse> {
  return apiClient.get<ConnectionListResponse>(`${API_BASE}/connections`);
}

/**
 * Get connection status for a specific channel
 */
export async function getConnectionStatus(channelType: ChannelType): Promise<ConnectionStatusResponse> {
  return apiClient.get<ConnectionStatusResponse>(`${API_BASE}/connections/${channelType}/status`);
}

/**
 * Connect a messaging channel
 */
export async function connectChannel(
  channelType: ChannelType,
  request: ConnectChannelRequest
): Promise<ChannelConnection> {
  return apiClient.post<ChannelConnection>(`${API_BASE}/connections/${channelType}/connect`, request);
}

/**
 * Disconnect a channel
 */
export async function disconnectChannel(channelType: ChannelType): Promise<void> {
  await apiClient.delete(`${API_BASE}/connections/${channelType}/disconnect`);
}

/**
 * Update channel settings
 */
export async function updateChannelSettings(
  channelType: ChannelType,
  request: UpdateChannelSettingsRequest
): Promise<ChannelConnection> {
  return apiClient.patch<ChannelConnection>(`${API_BASE}/connections/${channelType}/settings`, request);
}

/**
 * Get conversations (unified inbox)
 */
export async function getConversations(params?: {
  channelType?: ChannelType;
  status?: ConversationStatus;
  limit?: number;
  offset?: number;
}): Promise<ConversationListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.channelType) searchParams.append('channel_type', params.channelType);
  if (params?.status) searchParams.append('status', params.status);
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.offset) searchParams.append('offset', params.offset.toString());
  
  const query = searchParams.toString();
  return apiClient.get<ConversationListResponse>(`${API_BASE}/conversations${query ? `?${query}` : ''}`);
}

/**
 * Get a specific conversation
 */
export async function getConversation(conversationId: string): Promise<ChannelConversation> {
  return apiClient.get<ChannelConversation>(`${API_BASE}/conversations/${conversationId}`);
}

/**
 * Get messages for a conversation
 */
export async function getMessages(
  conversationId: string,
  limit: number = 50,
  offset: number = 0
): Promise<MessageListResponse> {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());
  
  return apiClient.get<MessageListResponse>(
    `${API_BASE}/conversations/${conversationId}/messages?${params.toString()}`
  );
}

/**
 * Send a human reply to a conversation
 */
export async function sendReply(
  conversationId: string,
  content: string
): Promise<ChannelMessage> {
  return apiClient.post<ChannelMessage>(
    `${API_BASE}/conversations/${conversationId}/reply`,
    { content }
  );
}

/**
 * Resolve a conversation
 */
export async function resolveConversation(
  conversationId: string,
  returnToAi: boolean = true
): Promise<ChannelConversation> {
  return apiClient.post<ChannelConversation>(
    `${API_BASE}/conversations/${conversationId}/resolve`,
    { return_to_ai: returnToAi }
  );
}

/**
 * Mark conversation as read
 */
export async function markConversationRead(conversationId: string): Promise<ChannelConversation> {
  return apiClient.post<ChannelConversation>(
    `${API_BASE}/conversations/${conversationId}/read`
  );
}

// ============================================
// Channel-specific helpers
// ============================================

/**
 * Connect WhatsApp using the universal messaging API
 */
export async function connectWhatsApp(
  credentials: WhatsAppCredentials,
  options?: {
    aiEnabled?: boolean;
    afterHoursOnly?: boolean;
    businessHours?: BusinessHours;
  }
): Promise<ChannelConnection> {
  return connectChannel('WHATSAPP', {
    credentials,
    channel_identifier: credentials.phone_number,
    ai_enabled: options?.aiEnabled ?? true,
    after_hours_only: options?.afterHoursOnly ?? false,
    business_hours: options?.businessHours,
  });
}

/**
 * Connect Telegram bot
 */
export async function connectTelegram(
  botToken: string,
  options?: {
    aiEnabled?: boolean;
    afterHoursOnly?: boolean;
    businessHours?: BusinessHours;
  }
): Promise<ChannelConnection> {
  return connectChannel('TELEGRAM', {
    credentials: { bot_token: botToken },
    channel_identifier: botToken.split(':')[0], // Bot ID from token
    ai_enabled: options?.aiEnabled ?? true,
    after_hours_only: options?.afterHoursOnly ?? false,
    business_hours: options?.businessHours,
  });
}

// ============================================
// Utility functions
// ============================================

/**
 * Get channel display info
 */
export function getChannelInfo(channelType: ChannelType): {
  name: string;
  icon: string;
  color: string;
} {
  switch (channelType) {
    case 'WHATSAPP':
      return { name: 'WhatsApp', icon: '💬', color: '#25D366' };
    case 'TELEGRAM':
      return { name: 'Telegram', icon: '✈️', color: '#0088CC' };
    case 'INSTAGRAM':
      return { name: 'Instagram', icon: '📷', color: '#E4405F' };
    case 'SMS':
      return { name: 'SMS', icon: '📱', color: '#4A90D9' };
    default:
      return { name: 'Unknown', icon: '❓', color: '#666666' };
  }
}

/**
 * Format customer ID for display (channel-specific)
 */
export function formatCustomerId(customerId: string, channelType?: ChannelType): string {
  if (!customerId) return 'Unknown';
  
  switch (channelType) {
    case 'WHATSAPP':
      // WhatsApp: whatsapp:+1234567890 -> +1234567890
      return customerId.replace('whatsapp:', '');
    case 'TELEGRAM':
      // Telegram: chat_id (number) - just return as is
      return `@${customerId}`;
    default:
      return customerId;
  }
}

// Export as namespace for convenience
export const messagingAPI = {
  getConnections,
  getConnectionStatus,
  connectChannel,
  disconnectChannel,
  updateChannelSettings,
  getConversations,
  getConversation,
  getMessages,
  sendReply,
  resolveConversation,
  markConversationRead,
  connectWhatsApp,
  connectTelegram,
  getChannelInfo,
  formatCustomerId,
};
