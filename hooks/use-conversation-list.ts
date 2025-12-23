/**
 * useConversationList Hook
 * Manages the list of conversations (chat history) for the sidebar
 */
import { useState, useCallback, useEffect } from 'react'
import { conversationsAPI } from '@/lib/api/conversations'
import type {
  ConversationResponse,
  ConversationStatus,
  ChatConversation,
} from '@/lib/types/conversation'
import { toUIConversation } from '@/lib/types/conversation'

interface UseConversationListState {
  conversations: ChatConversation[]
  isLoading: boolean
  error: string | null
  hasMore: boolean
}

interface UseConversationListFilters {
  status?: ConversationStatus
  limit?: number
}

interface UseConversationListActions {
  loadConversations: (filters?: UseConversationListFilters) => Promise<void>
  loadMore: () => Promise<void>
  searchConversations: (query: string) => Promise<void>
  refreshConversations: () => Promise<void>
  addConversation: (conversation: ConversationResponse) => void
  removeConversation: (conversationId: string) => void
  updateConversationInList: (conversationId: string, updates: Partial<ChatConversation>) => void
  clearError: () => void
}

export type UseConversationListReturn = UseConversationListState & UseConversationListActions

const DEFAULT_LIMIT = 20

export function useConversationList(
  autoLoad: boolean = true
): UseConversationListReturn {
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [currentFilters, setCurrentFilters] = useState<UseConversationListFilters>({
    limit: DEFAULT_LIMIT,
  })
  const [offset, setOffset] = useState(0)

  /**
   * Load conversations with optional filters
   */
  const loadConversations = useCallback(async (filters?: UseConversationListFilters) => {
    setIsLoading(true)
    setError(null)
    setOffset(0)

    const appliedFilters = { ...currentFilters, ...filters }
    setCurrentFilters(appliedFilters)

    try {
      const data = await conversationsAPI.getMyConversations({
        status: appliedFilters.status,
        limit: appliedFilters.limit || DEFAULT_LIMIT,
        offset: 0,
      })

      const uiConversations = data.map(toUIConversation)
      setConversations(uiConversations)
      setHasMore(data.length === (appliedFilters.limit || DEFAULT_LIMIT))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversations'
      setError(errorMessage)
      console.error('Failed to load conversations:', err)
    } finally {
      setIsLoading(false)
    }
  }, [currentFilters])

  /**
   * Load more conversations (pagination)
   */
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    setError(null)

    const newOffset = offset + (currentFilters.limit || DEFAULT_LIMIT)

    try {
      const data = await conversationsAPI.getMyConversations({
        status: currentFilters.status,
        limit: currentFilters.limit || DEFAULT_LIMIT,
        offset: newOffset,
      })

      const uiConversations = data.map(toUIConversation)
      setConversations(prev => [...prev, ...uiConversations])
      setOffset(newOffset)
      setHasMore(data.length === (currentFilters.limit || DEFAULT_LIMIT))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load more conversations'
      setError(errorMessage)
      console.error('Failed to load more conversations:', err)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, hasMore, offset, currentFilters])

  /**
   * Search conversations by query
   */
  const searchConversations = useCallback(async (query: string) => {
    if (!query.trim()) {
      // If empty query, reload all conversations
      await loadConversations()
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await conversationsAPI.searchConversations(query, DEFAULT_LIMIT)
      const uiConversations = data.map(toUIConversation)
      setConversations(uiConversations)
      setHasMore(false) // Search results don't support pagination
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search conversations'
      setError(errorMessage)
      console.error('Failed to search conversations:', err)
    } finally {
      setIsLoading(false)
    }
  }, [loadConversations])

  /**
   * Refresh the conversation list
   */
  const refreshConversations = useCallback(async () => {
    await loadConversations(currentFilters)
  }, [loadConversations, currentFilters])

  /**
   * Add a new conversation to the list (optimistic update)
   */
  const addConversation = useCallback((conversation: ConversationResponse) => {
    const uiConversation = toUIConversation(conversation)
    setConversations(prev => [uiConversation, ...prev])
  }, [])

  /**
   * Remove a conversation from the list
   */
  const removeConversation = useCallback((conversationId: string) => {
    setConversations(prev => prev.filter(c => c.id !== conversationId))
  }, [])

  /**
   * Update a conversation in the list
   */
  const updateConversationInList = useCallback((
    conversationId: string,
    updates: Partial<ChatConversation>
  ) => {
    setConversations(prev =>
      prev.map(c => (c.id === conversationId ? { ...c, ...updates } : c))
    )
  }, [])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Auto-load conversations on mount if enabled
  useEffect(() => {
    if (autoLoad) {
      loadConversations()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    conversations,
    isLoading,
    error,
    hasMore,
    loadConversations,
    loadMore,
    searchConversations,
    refreshConversations,
    addConversation,
    removeConversation,
    updateConversationInList,
    clearError,
  }
}
