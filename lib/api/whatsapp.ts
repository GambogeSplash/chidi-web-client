/**
 * WhatsApp API compatibility layer.
 * 
 * Delegates all operations to the universal messaging API at /api/messaging/*.
 * Types are re-exported from the messaging module for backward compatibility.
 */

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

// Re-export messaging types under WhatsApp-specific aliases
export type WhatsAppStatus = ConnectionStatusResponse;
export type WhatsAppConversation = ChannelConversation;
export type WhatsAppMessage = ChannelMessage;
export type WhatsAppConversationStatus = ConversationStatus;

export type { ConversationListResponse, MessageListResponse };

// ============================================
// API Functions (delegating to messaging API)
// ============================================

export async function getWhatsAppStatus(): Promise<WhatsAppStatus> {
  return messagingAPI.getConnectionStatus('WHATSAPP');
}

export async function connectWhatsApp(request: {
  twilio_phone_number: string;
  ai_enabled?: boolean;
  after_hours_only?: boolean;
}): Promise<unknown> {
  return messagingAPI.connectWhatsApp(
    { phone_number: request.twilio_phone_number },
    { aiEnabled: request.ai_enabled, afterHoursOnly: request.after_hours_only },
  );
}

export async function updateWhatsAppSettings(request: UpdateChannelSettingsRequest): Promise<unknown> {
  return messagingAPI.updateChannelSettings('WHATSAPP', request);
}

export async function disconnectWhatsApp(): Promise<void> {
  return messagingAPI.disconnectChannel('WHATSAPP');
}

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
