"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { Send, History, Loader2, Package, TrendingUp, MessageCircle, Brain, ChevronDown, Plus } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useConversation } from "@/hooks/use-conversation"
import { useConversationList } from "@/hooks/use-conversation-list"
import { conversationsAPI } from "@/lib/api/conversations"
import { CopilotHistoryPanel } from "./copilot-history-panel"
import { CopilotMessageContent } from "./copilot-blocks"
import { useFirstTimeHint } from "@/lib/hooks/use-first-time-hint"
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

  // Empty state (new chat)
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex flex-col bg-[var(--chidi-surface)] min-h-0 overflow-hidden relative">
        {/* History button - top right corner */}
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowHistory(true)}
            className="h-9 w-9 text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:bg-white rounded-full"
          >
            <History className="w-5 h-5" />
          </Button>
        </div>

        {/* Centered content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-0 overflow-auto">
          <Image
            src="/logo.png"
            alt="Chidi"
            width={200}
            height={200}
            className="mb-2 drop-shadow-md mix-blend-multiply"
          />
          <p className="text-2xl font-semibold text-[var(--chidi-text-primary)] text-center mb-2">
            How can I help today?
          </p>
          
          {/* First-time hint */}
          {showCopilotHint ? (
            <button 
              onClick={dismissCopilotHint}
              className="text-xs text-[var(--chidi-text-muted)] text-center mb-4 hover:text-[var(--chidi-text-secondary)] transition-colors"
            >
              My answers draw from your inventory, orders, conversations and more.
            </button>
          ) : (
            <div className="mb-4" />
          )}

          {/* Prompt categories */}
          <div className="w-full max-w-sm flex flex-col gap-1">
            {PROMPT_CATEGORIES.map((category) => {
              const Icon = category.icon
              const isExpanded = expandedCategory === category.id
              return (
                <div key={category.id} className="flex flex-col">
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                    className="flex items-center gap-2 px-2 py-2 rounded-lg text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:bg-white/60 transition-colors group"
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-base flex-1 text-left">
                      {category.label}
                    </span>
                    <ChevronDown 
                      className={cn(
                        "w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-all duration-200",
                        isExpanded && "rotate-180"
                      )} 
                    />
                  </button>
                  <div
                    className={cn(
                      "grid transition-all duration-200 ease-out",
                      isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="flex flex-col gap-0.5 pt-1 ml-6">
                        {category.prompts.map((prompt) => (
                          <button
                            key={prompt}
                            onClick={() => handlePromptChipClick(prompt)}
                            className="text-base text-[var(--chidi-text-secondary)] text-left py-1.5 px-2 rounded-lg hover:text-[var(--chidi-text-primary)] hover:bg-white/60 transition-colors"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Input - fixed at bottom */}
        <div className="flex-shrink-0 p-4 pb-4 bg-[var(--chidi-surface)] border-t border-[var(--chidi-border-subtle)]">
          <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
            <div className="relative">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Chidi about your business..."
                className="pr-12 h-12 bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] rounded-xl"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!inputValue.trim()}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg transition-opacity",
                  inputValue.trim() 
                    ? "bg-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)] opacity-100" 
                    : "bg-[var(--chidi-surface)] text-[var(--chidi-text-muted)] opacity-50"
                )}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-[var(--chidi-text-muted)] text-center mt-2">
              Uses your inventory, orders, and conversations.
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

  // Conversation state
  return (
    <div className="flex-1 flex flex-col bg-[var(--chidi-surface)] min-h-0 overflow-hidden relative">
      {/* Top right controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNewConversation}
          className="h-9 w-9 text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:bg-white/80 backdrop-blur-sm rounded-full shadow-sm"
        >
          <Plus className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowHistory(true)}
          className="h-9 w-9 text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:bg-white/80 backdrop-blur-sm rounded-full shadow-sm"
        >
          <History className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 pt-14 space-y-4 min-h-0">
        {messages
          // Don't render streaming messages with no content yet (show loading instead)
          .filter(m => !(m.isStreaming && m.content.length === 0))
          .map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "rounded-2xl px-4 py-3",
                message.role === "user"
                  ? "max-w-[80%] bg-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)]"
                  : "max-w-[95%] bg-transparent"
              )}
            >
              <CopilotMessageContent 
                content={message.content} 
                role={message.role}
                products={products}
                isStreaming={message.isStreaming}
              />
              {/* Only show timestamp when not streaming */}
              {!message.isStreaming && (
                <p className={cn(
                  "text-[10px] mt-2",
                  message.role === "user" 
                    ? "text-[var(--chidi-accent-foreground)]/70" 
                    : "text-[var(--chidi-text-muted)]"
                )}>
                  {formatTimestamp(message.timestamp)}
                </p>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator - show when sending and no content has arrived yet */}
        {isSending && !messages.some(m => m.isStreaming && m.content.length > 0) && (
          <div className="flex justify-start">
            <div className="bg-white border border-[var(--chidi-border-subtle)] rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[var(--chidi-text-muted)]" />
                <span className="text-sm text-[var(--chidi-text-secondary)]">
                  {loadingMessage}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-[var(--chidi-border-subtle)] bg-white">
        <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
          <div className="relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Chidi about your business..."
              className="pr-12 h-12 bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] rounded-xl"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!inputValue.trim() || isSending}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg transition-opacity",
                inputValue.trim() && !isSending
                  ? "bg-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)] opacity-100" 
                  : "bg-[var(--chidi-surface)] text-[var(--chidi-text-muted)] opacity-50"
              )}
            >
              <Send className="w-4 h-4" />
            </Button>
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
    </div>
  )
}
