"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  messagingAPI,
  type ChannelType,
  type ConversationStatus,
  type ConnectionListResponse,
  type ConversationListResponse,
  type MessageListResponse,
  type ChannelConversation,
  type ChannelMessage,
} from "@/lib/api/messaging"

export const messagingKeys = {
  all: ["messaging"] as const,
  connections: () => [...messagingKeys.all, "connections"] as const,
  conversations: (status?: ConversationStatus, channelType?: ChannelType) =>
    [...messagingKeys.all, "conversations", status, channelType] as const,
  conversation: (id: string) => [...messagingKeys.all, "conversation", id] as const,
  messages: (conversationId: string) =>
    [...messagingKeys.all, "messages", conversationId] as const,
}

/**
 * Hook for fetching channel connections
 */
export function useConnections() {
  return useQuery<ConnectionListResponse>({
    queryKey: messagingKeys.connections(),
    queryFn: () => messagingAPI.getConnections(),
  })
}

/**
 * Hook for fetching conversations with optional filters
 */
export function useConversations(
  status?: ConversationStatus,
  channelType?: ChannelType
) {
  return useQuery<ConversationListResponse>({
    queryKey: messagingKeys.conversations(status, channelType),
    queryFn: () =>
      messagingAPI.getConversations({
        status,
        channelType,
      }),
    staleTime: 30 * 1000, // 30 seconds - conversations need fresher data
  })
}

/**
 * Hook for fetching a single conversation
 */
export function useConversation(conversationId: string | null) {
  return useQuery<ChannelConversation>({
    queryKey: messagingKeys.conversation(conversationId || ""),
    queryFn: () => messagingAPI.getConversation(conversationId!),
    enabled: !!conversationId,
  })
}

/**
 * Hook for fetching messages for a conversation
 */
export function useConversationMessages(conversationId: string | null) {
  return useQuery<MessageListResponse>({
    queryKey: messagingKeys.messages(conversationId || ""),
    queryFn: () => messagingAPI.getMessages(conversationId!),
    enabled: !!conversationId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook for marking a conversation as read
 */
export function useMarkConversationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (conversationId: string) =>
      messagingAPI.markConversationRead(conversationId),
    onSuccess: (updatedConversation) => {
      queryClient.setQueryData(
        messagingKeys.conversation(updatedConversation.id),
        updatedConversation
      )
      queryClient.invalidateQueries({
        queryKey: messagingKeys.conversations(),
        exact: false,
      })
    },
  })
}

/**
 * Hook for sending a reply message
 */
export function useSendReply() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      conversationId,
      content,
    }: {
      conversationId: string
      content: string
    }) => messagingAPI.sendReply(conversationId, content),
    onSuccess: (newMessage, { conversationId }) => {
      queryClient.setQueryData<MessageListResponse>(
        messagingKeys.messages(conversationId),
        (old) => {
          if (!old) return old
          return {
            ...old,
            messages: [...old.messages, newMessage],
            total: old.total + 1,
          }
        }
      )
    },
  })
}

/**
 * Hook for resolving a conversation
 */
export function useResolveConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      conversationId,
      returnToAi = true,
    }: {
      conversationId: string
      returnToAi?: boolean
    }) => messagingAPI.resolveConversation(conversationId, returnToAi),
    onSuccess: (updatedConversation) => {
      queryClient.setQueryData(
        messagingKeys.conversation(updatedConversation.id),
        updatedConversation
      )
      queryClient.invalidateQueries({
        queryKey: messagingKeys.conversations(),
        exact: false,
      })
    },
  })
}

/**
 * Hook for connecting Telegram
 */
export function useConnectTelegram() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (botToken: string) => messagingAPI.connectTelegram(botToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.connections() })
    },
  })
}
