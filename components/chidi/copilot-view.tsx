"use client"

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Send, History, Loader2, Package, TrendingUp, MessageCircle, Brain, ChevronDown, Plus, Phone } from "lucide-react"
import { ChidiAvatar } from "./chidi-mark"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useConversation } from "@/hooks/use-conversation"
import { useConversationList } from "@/hooks/use-conversation-list"
import { conversationsAPI } from "@/lib/api/conversations"
import { CopilotHistoryPanel } from "./copilot-history-panel"
import { CopilotMessageContent } from "./copilot-blocks"
import { VoiceButton } from "./voice-button"
import { useFirstTimeHint } from "@/lib/hooks/use-first-time-hint"
import { useSalesOverview } from "@/lib/hooks/use-analytics"
import { useOrders } from "@/lib/hooks/use-orders"
import { useConversations as useMessagingConversations } from "@/lib/hooks/use-messaging"
import { formatCurrency } from "@/lib/utils/currency"
import Image from "next/image"
import type { ConversationResponse, ChatMessage } from "@/lib/types/conversation"
import type { DisplayProduct } from "@/lib/types/product"
import { cn } from "@/lib/utils"

interface CopilotViewProps {
  conversationId?: string
  onConversationCreated?: (conversation: ConversationResponse) => void
  onConversationSelect?: (conversationId: string | undefined) => void
  products?: DisplayProduct[]
}

interface PromptCategory {
  id: string
  label: string
  icon: LucideIcon
  prompts: string[]
}

const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    id: "inventory",
    label: "Review my inventory",
    icon: Package,
    prompts: [
      "What should I restock soon?",
      "How much is my total inventory worth?",
      "Am I overstocked on anything?",
      "Show me everything in a category",
    ],
  },
  {
    id: "strategy",
    label: "Help with pricing",
    icon: TrendingUp,
    prompts: [
      "What's my highest-margin product?",
      "Is my inventory mix balanced?",
      "Help me think about pricing",
      "What would you focus on if this was your shop?",
    ],
  },
  {
    id: "customers",
    label: "Understand my customers",
    icon: MessageCircle,
    prompts: [
      "What are customers asking about on WhatsApp?",
      "Any repeat customers I should know about?",
      "What product questions come up most?",
      "Help me draft a reply about our return policy",
    ],
  },
  {
    id: "memory",
    label: "What have you learned?",
    icon: Brain,
    prompts: [
      "What patterns have you noticed in my business?",
      "What have you learned about my business so far?",
      "What did we last discuss?",
      "Any new insights since I was last here?",
    ],
  },
]

// Loading messages that rotate while waiting for AI response
const LOADING_MESSAGES = [
  "Let me check...",
  "Wait small...",
  "I'm coming...",
  "Working on it...",
]

// Format timestamps
const formatTimestamp = (timestamp: Date): string => {
  const now = new Date()
  const diff = now.getTime() - timestamp.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  return timestamp.toLocaleDateString([], { month: "short", day: "numeric" })
}

export function CopilotView({ 
  conversationId, 
  onConversationCreated,
  onConversationSelect,
  products = []
}: CopilotViewProps) {
  const [inputValue, setInputValue] = useState("")
  const [showHistory, setShowHistory] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0])
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const messageIndexRef = useRef(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // First-time hint
  const { shouldShow: showCopilotHint, dismiss: dismissCopilotHint } = useFirstTimeHint("copilot_intro")

  // Use the conversation hook for state management
  const {
    conversation,
    messages,
    isLoading,
    isSending,
    isStreaming,
    error,
    sendMessage,
    sendMessageStreaming,
    createAndSendMessage,
    clearConversation,
  } = useConversation(conversationId)

  // Use conversation list for history
  const {
    conversations: chatHistory,
    isLoading: historyLoading,
    loadConversations: loadHistory,
    addConversation,
    removeConversation,
  } = useConversationList(false)

  // Track if history has been loaded at least once
  const historyLoadedRef = useRef(false)

  // Load history when panel opens (only if not already loaded)
  useEffect(() => {
    if (showHistory && !historyLoadedRef.current) {
      historyLoadedRef.current = true
      loadHistory()
    }
  }, [showHistory, loadHistory])

  // Rotate loading messages while waiting for first token
  useEffect(() => {
    // Stop rotating once we have streaming content
    const hasStreamingContent = messages.some(m => m.isStreaming && m.content.length > 0)
    if (!isSending || hasStreamingContent) return

    messageIndexRef.current = 0
    setLoadingMessage(LOADING_MESSAGES[0])

    const interval = setInterval(() => {
      messageIndexRef.current = (messageIndexRef.current + 1) % LOADING_MESSAGES.length
      setLoadingMessage(LOADING_MESSAGES[messageIndexRef.current])
    }, 4000)

    return () => clearInterval(interval)
  }, [isSending, messages])

  // Auto-scroll to bottom when new messages arrive or streaming updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isSending, isStreaming])

  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return

    setInputValue("")

    if (!conversation) {
      // Use streaming for new conversations
      const newConversation = await createAndSendMessage(content, true)
      if (newConversation) {
        addConversation(newConversation)
        onConversationCreated?.(newConversation)
      }
    } else {
      // Use streaming for existing conversations
      await sendMessageStreaming(content)
    }
  }, [conversation, createAndSendMessage, sendMessageStreaming, addConversation, onConversationCreated])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSendMessage(inputValue)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(inputValue)
    }
  }

  const handlePromptChipClick = (prompt: string) => {
    handleSendMessage(prompt)
  }

  const handleNewConversation = () => {
    clearConversation()
    onConversationSelect?.(undefined)
  }

  const handleSelectConversation = (id: string) => {
    onConversationSelect?.(id)
  }

  const handleDeleteConversation = async (id: string) => {
    try {
      await conversationsAPI.deleteConversation(id)
      removeConversation(id)
      // If we deleted the active conversation, clear it
      if (conversationId === id) {
        clearConversation()
        onConversationSelect?.(undefined)
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err)
    }
  }

  useEffect(() => {
    if (inputRef.current && messages.length === 0) {
      inputRef.current.focus()
    }
  }, [messages.length])

  // Loading skeleton for existing conversation
  if (isLoading && conversationId) {
    return (
      <div className="flex-1 flex flex-col bg-[var(--chidi-surface)]">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <div className="flex justify-end">
                <div className="bg-white rounded-2xl px-4 py-3 w-[65%] animate-pulse">
                  <div className="h-4 bg-[var(--chidi-surface)] rounded w-full" />
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl px-4 py-3 w-[75%] animate-pulse">
                  <div className="space-y-2">
                    <div className="h-4 bg-[var(--chidi-surface)] rounded w-full" />
                    <div className="h-4 bg-[var(--chidi-surface)] rounded w-[80%]" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Empty state (new chat) — proactive briefing seeded from real business state
  if (messages.length === 0 && !isLoading) {
    return (
      <CopilotEmptyState
        onShowHistory={() => setShowHistory(true)}
        onPromptClick={handlePromptChipClick}
      >
        {/* Input - fixed at bottom */}
        <div className="flex-shrink-0 p-4 pb-4 bg-[var(--chidi-surface)] border-t border-[var(--chidi-border-subtle)]">
          <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
            <div className="relative">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Chidi anything about your business..."
                className="pr-24 pl-4 h-12 bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] rounded-xl font-chidi-voice"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <VoiceButton
                  size="sm"
                  onTranscript={(t) => setInputValue(t)}
                  onCommit={(t) => {
                    setInputValue(t)
                    setTimeout(() => handleSendMessage(t), 100)
                  }}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!inputValue.trim()}
                  className={cn(
                    "h-8 w-8 rounded-lg transition-opacity",
                    inputValue.trim()
                      ? "btn-cta opacity-100"
                      : "bg-[var(--chidi-surface)] text-[var(--chidi-text-muted)] opacity-50"
                  )}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* History panel */}
        <CopilotHistoryPanel
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          conversations={chatHistory}
          isLoading={historyLoading}
          activeConversationId={conversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
        />
      </CopilotEmptyState>
    )
  }

  // History panel mounted alongside conversation state too
  // Conversation state
  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] min-h-0 overflow-hidden relative">
      {/* Top right controls — quiet glyph buttons */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.dispatchEvent(new CustomEvent("chidi:open-call"))}
          aria-label="Call Chidi"
          title="Call Chidi (⌘⇧C)"
          className="h-9 px-2.5 text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] rounded-lg gap-1.5 font-chidi-voice"
        >
          <Phone className="w-4 h-4" />
          <span className="text-[12px] font-medium hidden sm:inline">Call Chidi</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNewConversation}
          aria-label="New conversation"
          title="New conversation"
          className="h-9 w-9 text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] rounded-lg"
        >
          <Plus className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowHistory(true)}
          aria-label="Chat history"
          title="Chat history"
          className="h-9 w-9 text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] rounded-lg"
        >
          <History className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages — centered column (Claude pattern) */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6 pt-14 space-y-6">
          {messages
            .filter(m => !(m.isStreaming && m.content.length === 0))
            .map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start gap-3",
                )}
              >
                {/* Assistant identity glyph on the left, user has nothing */}
                {message.role !== "user" && (
                  <div className="flex-shrink-0 mt-0.5">
                    <ChidiAvatar size="sm" />
                  </div>
                )}

                <div
                  className={cn(
                    message.role === "user"
                      ? "max-w-[78%] bg-[var(--chidi-surface)] text-[var(--chidi-text-primary)] rounded-2xl px-4 py-2.5 border border-[var(--chidi-border-subtle)]"
                      : "max-w-[calc(100%-2.5rem)] bg-transparent",
                  )}
                >
                  <CopilotMessageContent
                    content={message.content}
                    role={message.role}
                    products={products}
                    isStreaming={message.isStreaming}
                  />
                  {!message.isStreaming && (
                    <p
                      className={cn(
                        "text-[10px] mt-2 font-chidi-voice tabular-nums",
                        message.role === "user"
                          ? "text-[var(--chidi-text-muted)] text-right"
                          : "text-[var(--chidi-text-muted)]",
                      )}
                    >
                      {formatTimestamp(message.timestamp)}
                    </p>
                  )}
                </div>
              </div>
            ))}

          {/* Typing indicator — three dots beside Chidi's avatar (Claude pattern) */}
          {isSending && !messages.some(m => m.isStreaming && m.content.length > 0) && (
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <ChidiAvatar size="sm" expression="thinking" />
              </div>
              <div className="flex items-center gap-1.5 pt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--chidi-text-muted)] chidi-typing-dot" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--chidi-text-muted)] chidi-typing-dot" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--chidi-text-muted)] chidi-typing-dot" style={{ animationDelay: "300ms" }} />
                <span className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice ml-2">
                  {loadingMessage}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input — Claude-style large rounded bubble with send inside */}
      <div className="flex-shrink-0 px-4 lg:px-6 pb-6 pt-2 bg-[var(--background)]">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="relative bg-white border border-[var(--chidi-border-default)] rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] focus-within:border-[var(--chidi-text-muted)]/40 focus-within:shadow-[0_4px_18px_-4px_rgba(0,0,0,0.10)] transition-all">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Chidi about your business..."
              className="pr-14 pl-4 py-4 h-14 bg-transparent border-0 text-[15px] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus-visible:ring-0 font-chidi-voice"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!inputValue.trim() || isSending}
              aria-label="Send"
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg transition-all",
                inputValue.trim() && !isSending
                  ? "bg-[var(--chidi-text-primary)] text-[var(--chidi-bg-primary)] hover:opacity-90"
                  : "bg-[var(--chidi-surface)] text-[var(--chidi-text-muted)] opacity-50 cursor-not-allowed",
              )}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-[var(--chidi-text-muted)] font-chidi-voice text-center mt-2">
            Chidi can make mistakes. Verify anything important.
          </p>
        </form>
      </div>

      {/* History panel */}
      <CopilotHistoryPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        conversations={chatHistory}
        isLoading={historyLoading}
        activeConversationId={conversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
      />
    </div>
  )
}

// =============================================================================
// CopilotEmptyState — proactive briefing instead of "How can I help today?"
// =============================================================================

interface CopilotEmptyStateProps {
  onShowHistory: () => void
  onPromptClick: (prompt: string) => void
  children: React.ReactNode
}

// Short, evergreen example prompts. Chips, not cards. The merchant scans
// them in <2s. Different from the verbose 5-card "proactive prompts" we
// removed — those duplicated other tabs and felt loud.
const QUICK_ASKS = [
  "How are sales today?",
  "What should I restock?",
  "Draft a chase message",
  "Best customers this month",
] as const

function CopilotEmptyState({
  onShowHistory,
  onPromptClick,
  children,
}: CopilotEmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col bg-[var(--chidi-surface)] min-h-0 overflow-hidden relative">
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.dispatchEvent(new CustomEvent("chidi:open-call"))}
          aria-label="Call Chidi"
          title="Call Chidi (⌘⇧C)"
          className="h-9 px-2.5 text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:bg-white rounded-full gap-1.5 font-chidi-voice"
        >
          <Phone className="w-4 h-4" />
          <span className="text-[12px] font-medium hidden sm:inline">Call Chidi</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onShowHistory}
          className="h-9 w-9 text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:bg-white rounded-full"
        >
          <History className="w-5 h-5" />
        </Button>
      </div>

      {/* Quiet empty state — big mark + tagline + 4 example chips.
          Merchant types into the input bar at the bottom OR taps a chip
          to seed the input with one of the canonical asks. */}
      <div className="flex-1 flex items-center justify-center px-6 pb-6">
        <div className="flex flex-col items-center text-center max-w-md w-full">
          <Image
            src="/logo.png"
            alt="Chidi"
            width={220}
            height={220}
            priority
            className="w-[200px] h-[200px] object-contain mb-6 chidi-brief-card"
          />
          <p className="ty-body-voice text-[var(--chidi-text-secondary)] chidi-brief-card mb-6" style={{ animationDelay: "120ms" }}>
            Ask me anything about your shop.
          </p>
          <ul className="flex flex-wrap justify-center gap-2">
            {QUICK_ASKS.map((q, i) => (
              <li key={q} className="chidi-brief-card" style={{ animationDelay: `${200 + i * 60}ms` }}>
                <button
                  onClick={() => onPromptClick(q)}
                  className={cn(
                    "px-3.5 py-2 rounded-full text-[13px] font-chidi-voice",
                    "bg-white border border-[var(--chidi-border-subtle)]",
                    "text-[var(--chidi-text-primary)]",
                    "hover:border-[var(--chidi-border-default)] hover:shadow-card",
                    "transition-all duration-200 active:scale-[0.97]",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-win)] focus-visible:ring-offset-2",
                  )}
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {children}
    </div>
  )
}

