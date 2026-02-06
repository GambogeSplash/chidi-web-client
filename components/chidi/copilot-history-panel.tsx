"use client"

import { X, Plus, MessageSquare, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ChatConversation } from "@/lib/types/conversation"
import { cn } from "@/lib/utils"

interface CopilotHistoryPanelProps {
  isOpen: boolean
  onClose: () => void
  conversations: ChatConversation[]
  isLoading: boolean
  activeConversationId?: string
  onSelectConversation: (conversationId: string) => void
  onNewConversation: () => void
}

export function CopilotHistoryPanel({
  isOpen,
  onClose,
  conversations,
  isLoading,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
}: CopilotHistoryPanelProps) {
  if (!isOpen) return null

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--chidi-border-subtle)]">
          <h2 className="font-semibold text-[var(--chidi-text-primary)]">History</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-[var(--chidi-text-secondary)]"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* New conversation button */}
        <div className="p-3 border-b border-[var(--chidi-border-subtle)]">
          <Button
            onClick={() => {
              onNewConversation()
              onClose()
            }}
            className="w-full bg-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)] hover:bg-[var(--chidi-accent)]/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            New conversation
          </Button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && conversations.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--chidi-text-muted)]" />
            </div>
          ) : !isLoading && conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare className="w-8 h-8 text-[var(--chidi-text-muted)] mb-3" />
              <p className="text-sm text-[var(--chidi-text-muted)]">
                No conversations yet
              </p>
            </div>
          ) : (
            <div className="py-2">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => {
                    onSelectConversation(conversation.id)
                    onClose()
                  }}
                  className={cn(
                    "w-full px-4 py-3 text-left transition-colors hover:bg-[var(--chidi-surface)]",
                    activeConversationId === conversation.id && "bg-[var(--chidi-surface)]"
                  )}
                >
                  <p className="font-medium text-sm text-[var(--chidi-text-primary)] truncate mb-0.5">
                    {conversation.title}
                  </p>
                  <p className="text-xs text-[var(--chidi-text-muted)]">
                    {formatDate(conversation.lastActivity)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
