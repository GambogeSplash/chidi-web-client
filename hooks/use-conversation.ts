/**
 * useConversation Hook
 * Manages the current conversation state, messages, and AI interactions
 */
import { useState, useCallback, useEffect } from 'react'
import { conversationsAPI } from '@/lib/api/conversations'
import type {
  ConversationResponse,
  MessageResponse,
  CreateConversationRequest,
  SendMessageRequest,
  ChatMessage,
} from '@/lib/types/conversation'
import { toUIMessage } from '@/lib/types/conversation'

interface UseConversationState {
  conversation: ConversationResponse | null
  messages: ChatMessage[]
  isLoading: boolean
  isSending: boolean
  error: string | null
}

interface UseConversationActions {
  loadConversation: (conversationId: string) => Promise<void>
  createConversation: (request: CreateConversationRequest) => Promise<ConversationResponse | null>
  sendMessage: (content: string, conversationId?: string) => Promise<void>
  /** 
   * Combined create + send for new conversations. 
   * Immediately shows the user message, creates conversation in background, then sends.
   * Returns the new conversation for sidebar updates.
   */
  createAndSendMessage: (content: string) => Promise<ConversationResponse | null>
  clearConversation: () => void
  clearError: () => void
}

export type UseConversationReturn = UseConversationState & UseConversationActions

export function useConversation(initialConversationId?: string): UseConversationReturn {
  const [conversation, setConversation] = useState<ConversationResponse | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Load a conversation and its messages
   */
  const loadConversation = useCallback(async (conversationId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch conversation details and messages in parallel
      const [conversationData, messagesData] = await Promise.all([
        conversationsAPI.getConversation(conversationId),
        conversationsAPI.getMessages(conversationId),
      ])

      setConversation(conversationData)
      setMessages(messagesData.map(toUIMessage))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversation'
      setError(errorMessage)
      console.error('Failed to load conversation:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Create a new conversation
   */
  const createConversation = useCallback(async (
    request: CreateConversationRequest
  ): Promise<ConversationResponse | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const newConversation = await conversationsAPI.createConversation(request)
      setConversation(newConversation)
      setMessages([])
      return newConversation
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create conversation'
      setError(errorMessage)
      console.error('Failed to create conversation:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Internal helper to add optimistic user message and send to API
   */
  const sendMessageInternal = useCallback(async (
    content: string, 
    convId: string,
    tempMessageId: string
  ): Promise<void> => {
    try {
      const userId = typeof window !== 'undefined' 
        ? localStorage.getItem('chidi_user_id') || 'user'
        : 'user'

      const request: SendMessageRequest = {
        user_id: userId,
        content,
        context_limit: 10,
      }

      const response = await conversationsAPI.sendMessage(convId, request)

      // Replace temp user message with real one and add AI response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempMessageId)
        const isAIResponse = response.role === 'assistant'
        
        // Create the confirmed user message
        const confirmedUserMessage: ChatMessage = {
          id: response.id ? `user_${response.id}` : `user_${Date.now()}`,
          conversationId: convId,
          role: 'user',
          content,
          timestamp: new Date(),
          isEdited: false,
          isLoading: false,
        }
        
        if (isAIResponse) {
          return [...filtered, confirmedUserMessage, toUIMessage(response)]
        } else {
          return [...filtered, confirmedUserMessage]
        }
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
      console.error('Failed to send message:', err)

      // Mark user message with error
      setMessages(prev => 
        prev.map(m => m.id === tempMessageId ? { ...m, error: errorMessage } : m)
      )
    }
  }, [])

  /**
   * Send a message to an existing conversation
   * @param content - Message content
   * @param targetConversationId - Optional conversation ID (use when conversation state hasn't updated yet)
   */
  const sendMessage = useCallback(async (content: string, targetConversationId?: string) => {
    const convId = targetConversationId || conversation?.id
    if (!convId) {
      setError('No active conversation')
      return
    }

    setIsSending(true)
    setError(null)

    // Optimistically add user message to UI
    const tempMessageId = `temp_${Date.now()}`
    const tempUserMessage: ChatMessage = {
      id: tempMessageId,
      conversationId: convId,
      role: 'user',
      content,
      timestamp: new Date(),
      isEdited: false,
      isLoading: false,
    }
    setMessages(prev => [...prev, tempUserMessage])

    try {
      await sendMessageInternal(content, convId, tempMessageId)
    } finally {
      setIsSending(false)
    }
  }, [conversation, sendMessageInternal])

  /**
   * Create a new conversation and send the first message in one optimistic flow.
   * Immediately shows the user message, creates conversation in background, then sends.
   * @returns The new conversation for sidebar updates, or null on failure
   */
  const createAndSendMessage = useCallback(async (content: string): Promise<ConversationResponse | null> => {
    // Immediately show sending state and user message (optimistic UI)
    setIsSending(true)
    setError(null)

    const tempMessageId = `temp_${Date.now()}`
    const tempUserMessage: ChatMessage = {
      id: tempMessageId,
      conversationId: 'pending',
      role: 'user',
      content,
      timestamp: new Date(),
      isEdited: false,
      isLoading: false,
    }
    setMessages([tempUserMessage])

    try {
      // Create conversation in background
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '')
      const newConversation = await conversationsAPI.createConversation({
        title,
        topic: 'general_inquiry',
      })
      
      setConversation(newConversation)
      
      // Update temp message with real conversation ID
      setMessages(prev => prev.map(m => 
        m.id === tempMessageId 
          ? { ...m, conversationId: newConversation.id }
          : m
      ))

      // Now send the message
      await sendMessageInternal(content, newConversation.id, tempMessageId)
      
      return newConversation
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create conversation'
      setError(errorMessage)
      console.error('Failed to create conversation:', err)
      
      // Mark message with error
      setMessages(prev => 
        prev.map(m => m.id === tempMessageId ? { ...m, error: errorMessage } : m)
      )
      return null
    } finally {
      setIsSending(false)
    }
  }, [sendMessageInternal])

  /**
   * Clear current conversation
   */
  const clearConversation = useCallback(() => {
    setConversation(null)
    setMessages([])
    setError(null)
  }, [])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Load initial conversation if provided, or clear if undefined (new chat)
  useEffect(() => {
    if (initialConversationId) {
      loadConversation(initialConversationId)
    } else {
      // Clear conversation when no ID is provided (new chat scenario)
      clearConversation()
    }
  }, [initialConversationId, loadConversation, clearConversation])

  return {
    conversation,
    messages,
    isLoading,
    isSending,
    error,
    loadConversation,
    createConversation,
    sendMessage,
    createAndSendMessage,
    clearConversation,
    clearError,
  }
}
