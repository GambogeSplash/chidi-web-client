"use client"

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Send, History, Loader2, Package, TrendingUp, MessageCircle, Brain, ChevronDown, Plus, Phone, BookmarkPlus } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { useConversation } from "@/hooks/use-conversation"
import { useConversationList } from "@/hooks/use-conversation-list"
import { conversationsAPI } from "@/lib/api/conversations"
import { CopilotHistoryPanel } from "./copilot-history-panel"
import { CopilotMessageContent } from "./copilot-blocks"
import { VoiceButton } from "./voice-button"
import { AttachmentChips, CopilotAttachButton } from "./copilot-attachments"
import { useFirstTimeHint } from "@/lib/hooks/use-first-time-hint"
import { useSalesOverview } from "@/lib/hooks/use-analytics"
import { useOrders } from "@/lib/hooks/use-orders"
import { useConversations as useMessagingConversations } from "@/lib/hooks/use-messaging"
import { formatCurrency } from "@/lib/utils/currency"
import Image from "next/image"
import type { ConversationResponse, ChatMessage } from "@/lib/types/conversation"
import type { DisplayProduct } from "@/lib/types/product"
import { cn } from "@/lib/utils"
import {
  readFileAsAttachment,
  isAcceptedFile,
  buildPayloadWithAttachments,
  type CopilotAttachment,
} from "@/lib/chidi/copilot-attachments"
import {
  extractPlayDraft,
  saveChatAsPlay,
  persistAuthoredPlay,
  AUDIENCE_LABEL,
  type SavePlayAudience,
} from "@/lib/chidi/save-as-play"

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
      "What are customers asking about across my channels?",
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
  const router = useRouter()
  const params = useParams()
  const slug = (params?.slug as string) ?? ""

  const [inputValue, setInputValue] = useState("")
  const [showHistory, setShowHistory] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0])
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  // Attachments — held as data URLs in component state, capped per file at 2MB.
  // Real upload is phase-2 backend; here we prepend `[attachment: name]` text
  // so the merchant SEES the chip in their sent message.
  const [attachments, setAttachments] = useState<CopilotAttachment[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  // Save-chat-as-play sheet
  const [showSavePlay, setShowSavePlay] = useState(false)
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
    // Attachments alone (no typed text) are still a valid send — the chip
    // becomes the message body via buildPayloadWithAttachments.
    const hasAttachments = attachments.length > 0
    if (!content.trim() && !hasAttachments) return

    const payload = buildPayloadWithAttachments(content, attachments)

    setInputValue("")
    setAttachments([])

    if (!conversation) {
      // Use streaming for new conversations
      const newConversation = await createAndSendMessage(payload, true)
      if (newConversation) {
        addConversation(newConversation)
        onConversationCreated?.(newConversation)
      }
    } else {
      // Use streaming for existing conversations
      await sendMessageStreaming(payload)
    }
  }, [conversation, createAndSendMessage, sendMessageStreaming, addConversation, onConversationCreated, attachments])

  // ---------- Attachment handling -------------------------------------------
  // Pulled into a single helper so the paperclip button + drag-and-drop both
  // funnel through here. Quietly toasts on rejected types / oversize files.
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files)
    for (const file of list) {
      if (!isAcceptedFile(file)) {
        toast("This file type isn't supported yet", {
          description: "Try a JPG, PNG, WebP, PDF, or CSV.",
        })
        continue
      }
      try {
        const att = await readFileAsAttachment(file)
        setAttachments((prev) => [...prev, att])
      } catch (err) {
        const msg =
          err instanceof Error && err.message.includes("too large")
            ? "That file is over 2MB"
            : "Couldn't read that file"
        toast(msg, { description: "Try a smaller version." })
      }
    }
  }, [])

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  // Drag-and-drop into the input area. We attach to the form/input wrapper
  // so the merchant can drop anywhere inside it.
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragOver) setIsDragOver(true)
  }, [isDragOver])
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  // ---------- Save chat as play ---------------------------------------------
  const playDraft = useMemo(
    () => extractPlayDraft(messages.map((m) => ({ role: m.role, content: m.content }))),
    [messages],
  )

  const handleSavePlay = useCallback((input: { name: string; trigger: string; message: string; audience: SavePlayAudience }) => {
    const play = saveChatAsPlay(input)
    persistAuthoredPlay(play)
    setShowSavePlay(false)
    toast.success("Saved as a play", { description: `"${play.title}" is now in your playbook.` })
    if (slug) {
      router.push(`/dashboard/${slug}/notebook`)
    }
  }, [router, slug])

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
          <form
            onSubmit={handleSubmit}
            className="max-w-lg mx-auto"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <AttachmentChips attachments={attachments} onRemove={handleRemoveAttachment} />
            <div
              className={cn(
                "relative rounded-xl transition-shadow",
                isDragOver && "ring-2 ring-[var(--chidi-text-primary)]/40 ring-offset-2",
              )}
            >
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  isDragOver
                    ? "Drop to attach"
                    : "Ask Chidi anything about your business..."
                }
                className="pr-32 pl-4 h-12 bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] rounded-xl font-chidi-voice"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <CopilotAttachButton onFiles={handleFiles} size="sm" />
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
                  disabled={!inputValue.trim() && attachments.length === 0}
                  className={cn(
                    "h-8 w-8 rounded-lg transition-opacity",
                    inputValue.trim() || attachments.length > 0
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
        {/* Save chat as a play — convert this conversation into a recurring
            move in the merchant's playbook. Disabled until there's at least
            one assistant message worth saving. */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSavePlay(true)}
          disabled={!messages.some((m) => m.role === "assistant" && m.content.trim().length > 0)}
          aria-label="Save chat as a play"
          title="Save chat as a play"
          className="h-9 px-2.5 text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] rounded-lg gap-1.5 font-chidi-voice disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--chidi-text-secondary)]"
        >
          <BookmarkPlus className="w-4 h-4" />
          <span className="text-[12px] font-medium hidden sm:inline">Save as play</span>
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
                    <Image src="/logo.png" alt="Chidi" width={28} height={28} className="w-7 h-7 object-contain" />
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
                <Image src="/logo.png" alt="Chidi" width={28} height={28} className="w-7 h-7 object-contain" />
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
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <AttachmentChips attachments={attachments} onRemove={handleRemoveAttachment} />
          <div
            className={cn(
              "relative bg-white border border-[var(--chidi-border-default)] rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] focus-within:border-[var(--chidi-text-muted)]/40 focus-within:shadow-[0_4px_18px_-4px_rgba(0,0,0,0.10)] transition-all",
              isDragOver && "border-[var(--chidi-text-primary)]/50 ring-2 ring-[var(--chidi-text-primary)]/20",
            )}
          >
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isDragOver ? "Drop to attach" : "Ask Chidi about your business..."}
              className="pr-24 pl-4 py-4 h-14 bg-transparent border-0 text-[15px] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus-visible:ring-0 font-chidi-voice"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <CopilotAttachButton onFiles={handleFiles} disabled={isSending} />
              <Button
                type="submit"
                size="icon"
                disabled={(!inputValue.trim() && attachments.length === 0) || isSending}
                aria-label="Send"
                className={cn(
                  "h-9 w-9 rounded-lg transition-all",
                  (inputValue.trim() || attachments.length > 0) && !isSending
                    ? "bg-[var(--chidi-text-primary)] text-[var(--chidi-bg-primary)] hover:opacity-90"
                    : "bg-[var(--chidi-surface)] text-[var(--chidi-text-muted)] opacity-50 cursor-not-allowed",
                )}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
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

      {/* Save chat as play sheet */}
      <SaveAsPlaySheet
        open={showSavePlay}
        onOpenChange={setShowSavePlay}
        defaultName={playDraft.name}
        defaultTrigger={playDraft.trigger}
        defaultMessage={playDraft.message}
        onSave={handleSavePlay}
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

// =============================================================================
// SaveAsPlaySheet — turn this Ask-Chidi conversation into a recurring play.
// Auto-fills name (first user line), trigger (paraphrased from messages), and
// the message template (last AI draft). Audience picker is cosmetic for now.
// On save: writes via persistAuthoredPlay(...) and navigates to the playbook.
// =============================================================================

const AUDIENCE_OPTIONS: SavePlayAudience[] = [
  "this-customer",
  "customers-like-this",
  "all-customers",
]

interface SaveAsPlaySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultName: string
  defaultTrigger: string
  defaultMessage: string
  onSave: (input: { name: string; trigger: string; message: string; audience: SavePlayAudience }) => void
}

function SaveAsPlaySheet({
  open,
  onOpenChange,
  defaultName,
  defaultTrigger,
  defaultMessage,
  onSave,
}: SaveAsPlaySheetProps) {
  const [name, setName] = useState(defaultName)
  const [trigger, setTrigger] = useState(defaultTrigger)
  const [message, setMessage] = useState(defaultMessage)
  const [audience, setAudience] = useState<SavePlayAudience>("this-customer")

  // Reset to fresh draft each time the sheet opens — the merchant might
  // have added more turns to the chat between opens.
  useEffect(() => {
    if (open) {
      setName(defaultName)
      setTrigger(defaultTrigger)
      setMessage(defaultMessage)
      setAudience("this-customer")
    }
  }, [open, defaultName, defaultTrigger, defaultMessage])

  const handleSave = () => {
    if (!name.trim()) return
    onSave({ name, trigger, message, audience })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-[var(--background)] p-0 flex flex-col gap-0 w-full sm:max-w-[440px] max-w-full"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-[var(--chidi-border-subtle)]">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-[var(--chidi-surface)] flex items-center justify-center text-[var(--chidi-text-primary)]">
              <BookmarkPlus className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold mb-0.5">
                Playbook
              </p>
              <SheetTitle className="text-[15px] font-semibold text-[var(--chidi-text-primary)] leading-snug">
                Save this chat as a play
              </SheetTitle>
              <SheetDescription className="text-[12px] text-[var(--chidi-text-secondary)] font-chidi-voice mt-1 leading-snug">
                Chidi will run this whenever the trigger fires.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="play-name" className="text-[11px] uppercase tracking-[0.14em] text-[var(--chidi-text-muted)] font-semibold">
              Name
            </label>
            <Input
              id="play-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What is this play called?"
              className="h-10 bg-white border-[var(--chidi-border-subtle)] text-[14px] font-chidi-voice text-[var(--chidi-text-primary)]"
            />
          </div>

          {/* Trigger */}
          <div className="space-y-1.5">
            <label htmlFor="play-trigger" className="text-[11px] uppercase tracking-[0.14em] text-[var(--chidi-text-muted)] font-semibold">
              Trigger
            </label>
            <Input
              id="play-trigger"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              placeholder="When should Chidi run this?"
              className="h-10 bg-white border-[var(--chidi-border-subtle)] text-[14px] font-chidi-voice text-[var(--chidi-text-primary)]"
            />
          </div>

          {/* Message template */}
          <div className="space-y-1.5">
            <label htmlFor="play-message" className="text-[11px] uppercase tracking-[0.14em] text-[var(--chidi-text-muted)] font-semibold">
              Message template
            </label>
            <textarea
              id="play-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="What does Chidi send when this play runs?"
              className="w-full rounded-md border border-[var(--chidi-border-subtle)] bg-white px-3 py-2 text-[14px] font-chidi-voice text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--chidi-text-primary)]/20 resize-none"
            />
          </div>

          {/* Audience */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-[0.14em] text-[var(--chidi-text-muted)] font-semibold">
              Audience
            </label>
            <div className="flex flex-wrap gap-2">
              {AUDIENCE_OPTIONS.map((opt) => {
                const active = audience === opt
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAudience(opt)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-[12px] font-chidi-voice border transition-colors",
                      active
                        ? "bg-[var(--chidi-text-primary)] text-[var(--chidi-bg-primary)] border-[var(--chidi-text-primary)]"
                        : "bg-white text-[var(--chidi-text-secondary)] border-[var(--chidi-border-subtle)] hover:border-[var(--chidi-border-default)] hover:text-[var(--chidi-text-primary)]",
                    )}
                  >
                    {AUDIENCE_LABEL[opt]}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <SheetFooter className="px-5 py-3 border-t border-[var(--chidi-border-subtle)] flex-row items-center justify-end gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-[12px] font-chidi-voice px-3 py-1.5 rounded-md text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className={cn(
              "text-[12px] font-medium font-chidi-voice px-3.5 py-1.5 rounded-md transition-colors",
              name.trim()
                ? "bg-[var(--chidi-text-primary)] text-[var(--chidi-bg-primary)] hover:opacity-90"
                : "bg-[var(--chidi-surface)] text-[var(--chidi-text-muted)] cursor-not-allowed",
            )}
          >
            Save as play
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
