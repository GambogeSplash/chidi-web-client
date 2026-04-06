/**
 * WhatsApp API client for Chidi web client.
 * 
 * Includes:
 * - Tech Provider / Embedded Signup endpoints (provider-config, complete-setup, setup-status)
 * - Conversation and message operations via the universal messaging API
 */

import { apiClient } from './client';
import {
  messagingAPI,
  type ConnectionStatusResponse,
  type ChannelConversation,
  type ChannelMessage,
  type ConversationStatus,
  type ConversationListResponse,
  type MessageListResponse,
  type UpdateChannelSettingsRequest,
} from './messaging';

// ============================================
// Tech Provider / Embedded Signup Types
// ============================================

export interface WhatsAppProviderConfig {
  meta_app_id: string;
  embedded_signup_config_id: string;
  twilio_partner_solution_id: string;
}

export interface CompleteWhatsAppSetupRequest {
  waba_id: string;
  phone_number: string;
  meta_phone_number_id: string;
  display_name: string;
  ai_enabled?: boolean;
  after_hours_only?: boolean;
}

export interface WhatsAppSetupStatus {
  connection_id: string;
  sender_status: string;
  twilio_sender_sid?: string;
  phone_number: string;
  display_name?: string;
  connected: boolean;
  error_message?: string;
}

// ============================================
// Re-export messaging types for compatibility
// ============================================

export type WhatsAppStatus = ConnectionStatusResponse;
export type WhatsAppConversation = ChannelConversation;
export type WhatsAppMessage = ChannelMessage;
export type WhatsAppConversationStatus = ConversationStatus;

export type { ConversationListResponse, MessageListResponse };

// ============================================
// Tech Provider / Embedded Signup API Functions
// ============================================

/**
 * Get WhatsApp Tech Provider configuration for Embedded Signup.
 * Returns the Meta App ID and config IDs needed by the Facebook SDK.
 */
export async function getProviderConfig(): Promise<WhatsAppProviderConfig> {
  return apiClient.get<WhatsAppProviderConfig>('/api/whatsapp/provider-config');
}

/**
 * Complete WhatsApp setup after Meta Embedded Signup.
 * 
 * This creates a Twilio subaccount, registers the WhatsApp sender,
 * and stores the connection. Poll getSetupStatus() until connected.
 */
export async function completeSetup(request: CompleteWhatsAppSetupRequest): Promise<WhatsAppSetupStatus> {
  return apiClient.post<WhatsAppSetupStatus>('/api/whatsapp/complete-setup', request);
}

/**
 * Get WhatsApp setup/registration status.
 * 
 * Poll this endpoint after completeSetup() until sender_status is "ONLINE"
 * or connected is true.
 */
export async function getSetupStatus(): Promise<WhatsAppSetupStatus> {
  return apiClient.get<WhatsAppSetupStatus>('/api/whatsapp/setup-status');
}

// ============================================
// Connection Status & Settings (via messaging API)
// ============================================

export async function getWhatsAppStatus(): Promise<WhatsAppStatus> {
  return messagingAPI.getConnectionStatus('WHATSAPP');
}

export async function updateWhatsAppSettings(request: UpdateChannelSettingsRequest): Promise<unknown> {
  return messagingAPI.updateChannelSettings('WHATSAPP', request);
}

export async function disconnectWhatsApp(): Promise<void> {
  return messagingAPI.disconnectChannel('WHATSAPP');
}

// ============================================
// Conversations & Messages (via messaging API)
// ============================================

export async function getConversations(
  status?: WhatsAppConversationStatus,
  limit: number = 50,
  offset: number = 0,
): Promise<ConversationListResponse> {
  return messagingAPI.getConversations({
    channelType: 'WHATSAPP',
    status,
    limit,
    offset,
  });
}

export async function getConversationMessages(
  conversationId: string,
  limit: number = 50,
  offset: number = 0,
): Promise<MessageListResponse> {
  return messagingAPI.getMessages(conversationId, limit, offset);
}

export async function sendReply(
  conversationId: string,
  content: string,
): Promise<ChannelMessage> {
  return messagingAPI.sendReply(conversationId, content);
}

export async function resolveConversation(
  conversationId: string,
  returnToAi: boolean = true,
): Promise<ChannelConversation> {
  return messagingAPI.resolveConversation(conversationId, returnToAi);
}

export async function markConversationRead(
  conversationId: string,
): Promise<ChannelConversation> {
  return messagingAPI.markConversationRead(conversationId);
}

// ============================================
// Export as namespace for convenience
// ============================================

export const whatsappAPI = {
  // Tech Provider / Embedded Signup
  getProviderConfig,
  completeSetup,
  getSetupStatus,
  // Connection status & settings
  getStatus: getWhatsAppStatus,
  updateSettings: updateWhatsAppSettings,
  disconnect: disconnectWhatsApp,
  // Conversations & messages
  getConversations,
  getMessages: getConversationMessages,
  sendReply,
  resolveConversation,
  markRead: markConversationRead,
};
