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
   * Send a message and receive AI response
   * @param content - Message content
   * @param targetConversationId - Optional conversation ID (use when conversation state hasn't updated yet)
   */
  const sendMessage = useCallback(async (content: string, targetConversationId?: string) => {
    console.log('🟢 [USE-CONV] sendMessage called, content:', content.slice(0, 30), 'targetConversationId:', targetConversationId)
    const convId = targetConversationId || conversation?.id
    console.log('🟢 [USE-CONV] Using convId:', convId)
    if (!convId) {
      console.log('🔴 [USE-CONV] No convId, setting error')
      setError('No active conversation')
      return
    }

    setIsSending(true)
    setError(null)

    // Optimistically add user message to UI
    const tempUserMessage: ChatMessage = {
      id: `temp_${Date.now()}`,
      conversationId: convId,
      role: 'user',
      content,
      timestamp: new Date(),
      isEdited: false,
      isLoading: false,
    }
    setMessages(prev => [...prev, tempUserMessage])

    // Note: We don't add a temp AI message here - the UI shows a typing indicator
    // via the isSending state instead. This prevents empty chat bubbles.

    try {
      // Get user_id from localStorage (set during auth)
      const userId = typeof window !== 'undefined' 
        ? localStorage.getItem('chidi_user_id') || 'user'
        : 'user'

      const request: SendMessageRequest = {
        user_id: userId,
        content,
        context_limit: 10,
      }

      console.log('🟢 [USE-CONV] Calling API sendMessage...')
      const response = await conversationsAPI.sendMessage(convId, request)
      console.log('🟢 [USE-CONV] API response received:', response)

      // Replace temp user message with real one and add AI response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempUserMessage.id)
        
        // Check if response is an AI message or just the echoed user message
        const isAIResponse = response.role === 'assistant'
        
        if (isAIResponse) {
          // Got AI response - add both user message and AI response
          return [
            ...filtered,
            { ...tempUserMessage, id: response.id ? `user_${response.id}` : `user_${Date.now()}` },
            toUIMessage(response),
          ]
        } else {
          // No AI response (workflow unavailable) - just confirm user message was saved
          return [
            ...filtered,
            { ...tempUserMessage, id: response.id || `user_${Date.now()}` },
          ]
        }
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
      console.error('Failed to send message:', err)

      // Mark user message with error
      setMessages(prev => 
        prev.map(m =>
          m.id === tempUserMessage.id ? { ...m, error: errorMessage } : m
        )
      )
    } finally {
      setIsSending(false)
    }
  }, [conversation])

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

  // Load initial conversation if provided
  useEffect(() => {
    if (initialConversationId) {
      loadConversation(initialConversationId)
    }
  }, [initialConversationId, loadConversation])

  return {
    conversation,
    messages,
    isLoading,
    isSending,
    error,
    loadConversation,
    createConversation,
    sendMessage,
    clearConversation,
    clearError,
  }
}
