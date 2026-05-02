'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ChidiMark } from '@/components/chidi/chidi-mark'
import { deriveCustomerMemory } from '@/lib/chidi/customer-memory'
import { 
  type ChannelConversation, 
  type ChannelMessage,
  type ChannelType,
  getChannelInfo,
  formatCustomerId,
} from '@/lib/api/messaging'
import {
  useConversationMessages,
  useMarkConversationRead,
  useSendReply,
  useResolveConversation,
  messagingKeys,
} from '@/lib/hooks/use-messaging'
import {
  useOrderByConversation,
  useConfirmOrder,
  useRejectOrder,
  ordersKeys,
} from '@/lib/hooks/use-orders'
import { OrderVerificationWidget } from '@/components/chidi/order-verification-widget'
import { VoiceButton } from '@/components/chidi/voice-button'
import { CustomerCharacter } from '@/components/chidi/customer-character'
import { CustomerProfileRail } from '@/components/chidi/customer-profile-rail'
import { chidiActed } from '@/lib/chidi/ai-toast'
import { draftReply } from '@/lib/chidi/draft-reply'
import { playTap } from '@/lib/chidi/sound'

interface ChannelChatProps {
  conversation: ChannelConversation
  onBack: () => void
  onConversationUpdate: (conversation: ChannelConversation) => void
  onViewCustomerOrders?: (customerName: string) => void
  onAskChidiAboutCustomer?: (customerName: string) => void
}

export function ChannelChat({ conversation, onBack, onConversationUpdate, onViewCustomerOrders, onAskChidiAboutCustomer }: ChannelChatProps) {
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const replyInputRef = useRef<HTMLInputElement>(null)
  // Track which AI messages we've already announced via toast — only the
  // *newest* AI reply should fire one, never the historical thread on mount.
  const announcedAIIdsRef = useRef<Set<string>>(new Set())
  const initialLoadDoneRef = useRef(false)

  // React Query hooks
  const { data: messagesData, isLoading: loadingMessages, isRefetching } = useConversationMessages(conversation.id)
  const { data: pendingOrder } = useOrderByConversation(conversation.id, 'PENDING_PAYMENT')
  
  const markAsRead = useMarkConversationRead()
  const sendReply = useSendReply()
  const resolveConversation = useResolveConversation()
  const confirmOrder = useConfirmOrder()
  const rejectOrder = useRejectOrder()

  const messages = messagesData?.messages ?? []

  // Mark as read when conversation opens
  useEffect(() => {
    if (conversation.unread_count > 0) {
      markAsRead.mutate(conversation.id, {
        onSuccess: (updated) => onConversationUpdate(updated),
      })
    }
  }, [conversation.id])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Announce new AI replies via toast — the trust foundation. The merchant
  // always knows what their AI just did. Skip the initial mount load so the
  // historical thread doesn't fire 12 toasts at once.
  useEffect(() => {
    if (!initialLoadDoneRef.current) {
      messages.forEach((m) => {
        if (m.sender_type === 'AI') announcedAIIdsRef.current.add(m.id)
      })
      if (messages.length > 0 || !loadingMessages) {
        initialLoadDoneRef.current = true
      }
      return
    }
    const newAI = messages.find(
      (m) => m.sender_type === 'AI' && !announcedAIIdsRef.current.has(m.id),
    )
    if (newAI) {
      announcedAIIdsRef.current.add(newAI.id)
      const customerName =
        conversation.customer_name ||
        formatCustomerId(conversation.customer_id, conversation.channel_type)
      playTap()
      chidiActed({
        verb: 'replied to',
        who: customerName,
        preview: newAI.content.length > 100 ? newAI.content.slice(0, 100) + '…' : newAI.content,
        onSee: () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }),
      })
    }
  }, [messages, loadingMessages, conversation.customer_name, conversation.customer_id, conversation.channel_type])

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: messagingKeys.messages(conversation.id) })
  }

  const handleConfirmOrder = async (): Promise<void> => {
    if (!pendingOrder) return
    return new Promise((resolve, reject) => {
      confirmOrder.mutate(
        pendingOrder.id,
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ordersKeys.byConversation(conversation.id, 'PENDING_PAYMENT') })
            queryClient.invalidateQueries({ queryKey: messagingKeys.messages(conversation.id) })
            resolve()
          },
          onError: (error) => reject(error),
        }
      )
    })
  }

  const handleRejectOrder = async (reason?: string): Promise<void> => {
    if (!pendingOrder) return
    return new Promise((resolve, reject) => {
      rejectOrder.mutate(
        { orderId: pendingOrder.id, reason },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: messagingKeys.messages(conversation.id) })
            resolve()
          },
          onError: (error) => reject(error),
        }
      )
    })
  }

  const handleSendReply = () => {
    const content = replyInputRef.current?.value?.trim()
    if (!content || sendReply.isPending) return

    sendReply.mutate(
      { conversationId: conversation.id, content },
      {
        onSuccess: () => {
          if (replyInputRef.current) {
            replyInputRef.current.value = ''
          }
        },
      }
    )
  }

  const handleResolve = (returnToAi: boolean) => {
    resolveConversation.mutate(
      { conversationId: conversation.id, returnToAi },
      {
        onSuccess: (updated) => onConversationUpdate(updated),
      }
    )
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendReply()
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString()
    }
  }

  const getChannelColor = (channelType?: ChannelType) => {
    switch (channelType) {
      case 'WHATSAPP':
        return '#25D366'
      case 'TELEGRAM':
        return '#0088CC'
      default:
        return '#6366f1'
    }
  }

  const channelInfo = conversation.channel_type ? getChannelInfo(conversation.channel_type) : null
  const customerDisplay = formatCustomerId(conversation.customer_id, conversation.channel_type)
  const customerMemory = deriveCustomerMemory({
    customerId: conversation.customer_id,
    customerName: conversation.customer_name,
    lastIntent: conversation.last_intent,
  })

  // The Chidi-drafted moment: when the last message is from the customer and
  // Chidi hasn't already replied + we're not in an order-verification flow,
  // surface a persistent draft card above the input. Skipping clears it for
  // this conversation only; switching threads resets.
  const [draftSkippedConvId, setDraftSkippedConvId] = useState<string | null>(null)
  const lastMessage = messages[messages.length - 1]
  const shouldOfferDraft =
    lastMessage?.sender_type === 'CUSTOMER' &&
    conversation.status === 'ACTIVE' &&
    !pendingOrder &&
    draftSkippedConvId !== conversation.id

  const draftSuggestion = useMemo(() => {
    if (!shouldOfferDraft) return null
    return draftReply({
      customerName: conversation.customer_name,
      lastCustomerMessage: lastMessage?.content,
      channelName: channelInfo?.name,
    })
  }, [shouldOfferDraft, conversation.customer_name, lastMessage?.content, channelInfo?.name])

  const groupedMessages: { date: string; messages: ChannelMessage[] }[] = []
  let currentDate = ''
  
  messages.forEach(message => {
    const messageDate = formatDate(message.created_at)
    if (messageDate !== currentDate) {
      currentDate = messageDate
      groupedMessages.push({ date: messageDate, messages: [message] })
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(message)
    }
  })

  const loading = loadingMessages && messages.length === 0

  return (
    <div className="flex h-full bg-white">
      <div className="flex flex-col flex-1 min-w-0">
      {/* Header — customer name + ambient memory line + status tag */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--chidi-border-subtle)] bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-8 w-8 text-[var(--chidi-text-secondary)] flex-shrink-0"
            aria-label="Back to inbox"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="relative flex-shrink-0">
            <CustomerCharacter
              name={conversation.customer_name}
              fallbackId={conversation.customer_id}
              size="md"
            />
            {channelInfo && (
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
                style={{ backgroundColor: channelInfo.color }}
                title={channelInfo.name}
                aria-label={channelInfo.name}
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[var(--chidi-text-primary)] font-medium text-sm truncate">
              {conversation.customer_name || customerDisplay}
            </p>
            <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice truncate">
              {customerMemory || customerDisplay}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {conversation.status === 'NEEDS_HUMAN' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--chidi-warning)]/15 text-[var(--chidi-warning)] font-medium font-chidi-voice whitespace-nowrap">
              Needs you
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={loading || isRefetching}
            className="h-8 w-8 text-[var(--chidi-text-secondary)]"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--chidi-surface)]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--chidi-accent)]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[var(--chidi-text-muted)]">
            No messages yet
          </div>
        ) : (
          groupedMessages.map((group, groupIndex) => (
            <div key={groupIndex}>
              {/* Date Separator */}
              <div className="flex items-center justify-center my-4">
                <span className="px-3 py-1 bg-white rounded-full text-xs text-[var(--chidi-text-muted)] shadow-sm">
                  {group.date}
                </span>
              </div>

              {/* Messages — WhatsApp-true: side encodes sender, no per-message avatars */}
              {group.messages.map((message, msgIdx) => {
                const isCustomer = message.sender_type === 'CUSTOMER'
                const isAI = message.sender_type === 'AI'
                const isLowConfidence =
                  isAI && message.confidence !== undefined && message.confidence < 0.7
                const prevMessage = msgIdx > 0 ? group.messages[msgIdx - 1] : null
                const isContinuation =
                  prevMessage?.sender_type === message.sender_type
                const tailCorner = isCustomer
                  ? (isContinuation ? 'rounded-bl-md' : 'rounded-bl-sm')
                  : (isContinuation ? 'rounded-br-md' : 'rounded-br-sm')

                return (
                  <div
                    key={message.id}
                    className={cn(
                      'flex',
                      isCustomer ? 'justify-start' : 'justify-end',
                      isContinuation ? 'mt-0.5' : 'mt-2',
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[78%] rounded-md px-2.5 py-1.5 relative',
                        tailCorner,
                        isCustomer
                          ? 'bg-white text-[var(--chidi-text-primary)] border border-[var(--chidi-border-subtle)]/40'
                          : 'bg-[#DCF8C6] text-[var(--chidi-text-primary)]',
                        isAI && 'chidi-bubble-settle',
                      )}
                    >
                      <p
                        className={cn(
                          'whitespace-pre-wrap break-words text-[14px] leading-snug',
                          isAI && 'font-chidi-voice',
                        )}
                      >
                        {message.content}
                      </p>

                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        {isAI && (
                          <ChidiMark
                            size={9}
                            variant="muted"
                            className="opacity-50 mr-auto"
                          />
                        )}
                        {isLowConfidence && (
                          <span
                            className="text-[10px] text-[var(--chidi-warning)] font-chidi-voice mr-auto"
                            title="Worth a glance before sending"
                          >
                            worth a glance
                          </span>
                        )}
                        <span className="text-[10px] text-[var(--chidi-text-muted)] tabular-nums">
                          {formatTime(message.created_at)}
                        </span>
                        {message.direction === 'OUTBOUND' && (
                          <span
                            className={cn(
                              'text-[10px] tabular-nums',
                              message.read
                                ? 'text-[#34B7F1]'
                                : 'text-[var(--chidi-text-muted)]',
                            )}
                          >
                            {message.delivered ? (message.read ? '✓✓' : '✓✓') : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Order Verification Widget */}
      {conversation.status === 'NEEDS_HUMAN' && pendingOrder && (
        <div className="px-4 pt-3">
          <OrderVerificationWidget
            order={pendingOrder}
            onConfirm={handleConfirmOrder}
            onReject={handleRejectOrder}
            onDismiss={() => {
              queryClient.invalidateQueries({ queryKey: ordersKeys.byConversation(conversation.id, 'PENDING_PAYMENT') })
            }}
          />
        </div>
      )}

      {/* NEEDS_HUMAN handoff bar — header already says "Needs you", so this
          is the quiet back-to-AI affordance, not another alarm. */}
      {conversation.status === 'NEEDS_HUMAN' && (
        <div className="px-4 py-2 bg-[var(--chidi-warning)]/5 border-t border-[var(--chidi-warning)]/15">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] font-chidi-voice text-[var(--chidi-text-secondary)]">
              {pendingOrder
                ? 'Verify the payment above, or reply by hand.'
                : 'You\'re on this one.'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleResolve(true)}
              disabled={resolveConversation.isPending}
              className="h-7 px-2 text-[12px] font-chidi-voice text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)]"
            >
              {resolveConversation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              )}
              Hand back to Chidi
            </Button>
          </div>
        </div>
      )}

      {/* Chidi-drafted moment — appears when last message is from customer
          and Chidi has a ready reply. Cleo pattern: "I drafted this. Send?" */}
      {draftSuggestion && (
        <div className="px-4 pt-3">
          <div className="rounded-lg bg-[var(--chidi-win-soft,rgba(108,249,216,0.12))] border border-[var(--chidi-win)]/25 p-3 chidi-brief-card">
            <div className="flex items-start gap-2.5">
              <ChidiMark size={14} variant="default" className="mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice mb-1">
                  Chidi drafted
                </p>
                <p className="text-[13px] text-[var(--chidi-text-primary)] font-chidi-voice leading-snug mb-3">
                  {draftSuggestion}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      sendReply.mutate(
                        { conversationId: conversation.id, content: draftSuggestion },
                        {
                          onSuccess: () => {
                            if (replyInputRef.current) replyInputRef.current.value = ''
                          },
                        },
                      )
                    }}
                    disabled={sendReply.isPending}
                    className="h-8 px-3 bg-[var(--chidi-win)] hover:bg-[var(--chidi-win)]/90 text-white text-xs font-medium"
                  >
                    {sendReply.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      'Send it'
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      if (replyInputRef.current) {
                        replyInputRef.current.value = draftSuggestion
                        replyInputRef.current.focus()
                        replyInputRef.current.setSelectionRange(draftSuggestion.length, draftSuggestion.length)
                      }
                      setDraftSkippedConvId(conversation.id)
                    }}
                    className="h-8 px-3 text-xs font-chidi-voice text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)]"
                  >
                    Edit first
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftSkippedConvId(conversation.id)}
                    className="h-8 px-2 text-xs font-chidi-voice text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-secondary)] ml-auto"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reply Input */}
      <div className="px-4 py-3 border-t border-[var(--chidi-border-subtle)] bg-white">
        <div className="flex gap-2 items-center">
          <Input
            ref={replyInputRef}
            onKeyPress={handleKeyPress}
            placeholder="Type your reply..."
            className="flex-1 bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)]"
            disabled={sendReply.isPending}
          />
          <VoiceButton
            size="md"
            onTranscript={(t) => {
              if (replyInputRef.current) replyInputRef.current.value = t
            }}
            onCommit={(t) => {
              if (replyInputRef.current) {
                replyInputRef.current.value = t
                replyInputRef.current.focus()
              }
            }}
          />
          <Button
            onClick={handleSendReply}
            disabled={sendReply.isPending}
            style={{ backgroundColor: getChannelColor(conversation.channel_type) }}
            className="hover:opacity-90"
            aria-label="Send"
          >
            {sendReply.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-[var(--chidi-text-muted)] font-chidi-voice mt-2 text-right">
          Sending via {channelInfo?.name || 'connected channel'}
        </p>
      </div>
      </div>

      {/* Customer profile rail — desktop only (xl+), shows accumulated context */}
      <CustomerProfileRail
        customerName={conversation.customer_name}
        customerId={conversation.customer_id}
        customerPhone={customerDisplay}
        channelName={channelInfo?.name}
        onViewAllOrders={onViewCustomerOrders}
        onAskChidiAbout={onAskChidiAboutCustomer}
      />
    </div>
  )
}
