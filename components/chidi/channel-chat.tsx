'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle,
  RefreshCw,
  Columns2,
} from 'lucide-react'
import { ArcFace } from '@/components/chidi/arc-face'
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
import { PaymentConfirmationWidget } from '@/components/chidi/payment-confirmation-widget'
import { DeliveryTrackingWidget } from '@/components/chidi/delivery-tracking-widget'
import {
  DELIVERY_CHANGED_EVENT,
  getDelivery,
} from '@/lib/chidi/deliveries'
import {
  PAYMENT_CONFIRMED_EVENT,
  formatConfirmedAgo,
  getConfirmation,
  type PaymentConfirmation,
} from '@/lib/chidi/payment-confirmations'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useIsMobile } from '@/components/ui/use-mobile'
import { Wallet, Check } from 'lucide-react'
import { formatOrderAmount } from '@/lib/api/orders'
import { AISuggestStrip } from '@/components/chidi/ai-suggest-strip'
import { VoiceButton } from '@/components/chidi/voice-button'
import { CustomerCharacter } from '@/components/chidi/customer-character'
import { CustomerProfileRail, CustomerProfileRailMobile } from '@/components/chidi/customer-profile-rail'
import { User as UserIcon } from 'lucide-react'
import { chidiActed } from '@/lib/chidi/ai-toast'
import { draftReply } from '@/lib/chidi/draft-reply'
import { playTap } from '@/lib/chidi/sound'
import { BoostsPanel } from '@/components/chidi/boosts-panel'
import { ChatSplitView } from '@/components/chidi/chat-split-view'
import { ChatSummarySheet } from '@/components/chidi/chat-summary-sheet'
import {
  applyBoosts,
  countActive as countActiveBoosts,
  getBoosts,
  subscribe as subscribeBoosts,
} from '@/lib/chidi/boosts'

interface ChannelChatProps {
  conversation: ChannelConversation
  onBack: () => void
  onConversationUpdate: (conversation: ChannelConversation) => void
  onViewCustomerOrders?: (customerName: string) => void
  onOpenOrder?: (orderId: string) => void
  onAskChidiAboutCustomer?: (customerName: string) => void
}

export function ChannelChat({ conversation, onBack, onConversationUpdate, onViewCustomerOrders, onOpenOrder, onAskChidiAboutCustomer }: ChannelChatProps) {
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
  // Any order linked to the conversation (no status filter) — used to look
  // up an active delivery for the in-chat tracking widget. Falls back to the
  // pendingOrder so we never query when nothing exists.
  const { data: anyOrder } = useOrderByConversation(conversation.id)
  
  const markAsRead = useMarkConversationRead()
  const sendReply = useSendReply()
  const resolveConversation = useResolveConversation()
  const confirmOrder = useConfirmOrder()
  const rejectOrder = useRejectOrder()

  const messages = messagesData?.messages ?? []

  // Local payment-confirmation log — keeps the sticky banner in lock-step
  // with whatever the merchant did from the orders list (or here).
  const pendingOrderId = pendingOrder?.id ?? null
  const [paymentConfirmation, setPaymentConfirmation] = useState<PaymentConfirmation | null>(
    () => (pendingOrderId ? getConfirmation(pendingOrderId) : null),
  )
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false)
  const isMobileViewport = useIsMobile()

  // Split view (Arc-style "split with order"). Toggles a side-by-side
  // panel showing the linked order. Only enabled when an order exists.
  const [splitOpen, setSplitOpen] = useState(false)

  // Chidi-summarized recap sheet — Arc-style "summarize this thread."
  const [summaryOpen, setSummaryOpen] = useState(false)

  // Mobile profile rail — desktop has a permanent xl+ rail; below xl the
  // merchant pulls it up as a bottom sheet from the chat header.
  const [profileSheetOpen, setProfileSheetOpen] = useState(false)

  // Active-delivery flag for the linked order — drives whether the in-chat
  // DeliveryTrackingWidget mounts. Recomputes on `chidi:delivery-changed`.
  const trackedOrderId = anyOrder?.id ?? pendingOrder?.id ?? null
  const [hasActiveDelivery, setHasActiveDelivery] = useState<boolean>(() => {
    if (!trackedOrderId) return false
    const d = getDelivery(trackedOrderId)
    return !!d && d.status === 'out_for_delivery'
  })
  useEffect(() => {
    const recompute = () => {
      if (!trackedOrderId) {
        setHasActiveDelivery(false)
        return
      }
      const d = getDelivery(trackedOrderId)
      setHasActiveDelivery(!!d && d.status === 'out_for_delivery')
    }
    recompute()
    if (typeof window === 'undefined') return
    const onChanged = () => recompute()
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'chidi:deliveries') recompute()
    }
    window.addEventListener(DELIVERY_CHANGED_EVENT, onChanged as EventListener)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(DELIVERY_CHANGED_EVENT, onChanged as EventListener)
      window.removeEventListener('storage', onStorage)
    }
  }, [trackedOrderId])

  // Per-customer boost count — drives the "N boosts active" chip above the
  // input. Hydrated from store + kept in sync via subscribe.
  const [activeBoostCount, setActiveBoostCount] = useState<number>(() =>
    countActiveBoosts(getBoosts(conversation.customer_id)),
  )
  useEffect(() => {
    setActiveBoostCount(
      countActiveBoosts(getBoosts(conversation.customer_id)),
    )
    const off = subscribeBoosts(() => {
      setActiveBoostCount(
        countActiveBoosts(getBoosts(conversation.customer_id)),
      )
    })
    return off
  }, [conversation.customer_id])

  useEffect(() => {
    setPaymentConfirmation(pendingOrderId ? getConfirmation(pendingOrderId) : null)
    if (!pendingOrderId) return
    const onConfirmed = (e: Event) => {
      const detail = (e as CustomEvent<PaymentConfirmation>).detail
      if (detail?.orderId === pendingOrderId) {
        setPaymentConfirmation(detail)
      }
    }
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === 'chidi:payment-confirmations') {
        setPaymentConfirmation(getConfirmation(pendingOrderId))
      }
    }
    window.addEventListener(PAYMENT_CONFIRMED_EVENT, onConfirmed as EventListener)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(PAYMENT_CONFIRMED_EVENT, onConfirmed as EventListener)
      window.removeEventListener('storage', onStorage)
    }
  }, [pendingOrderId])

  // Mark as read when conversation opens
  useEffect(() => {
    if (conversation.unread_count > 0) {
      markAsRead.mutate(conversation.id, {
        onSuccess: (updated) => onConversationUpdate(updated),
      })
    }
  }, [conversation.id])

  // When the active conversation changes, close any open split — the order
  // reference no longer applies.
  useEffect(() => {
    setSplitOpen(false)
  }, [conversation.id])

  // If the linked order disappears (e.g. cancelled), drop split too.
  useEffect(() => {
    if (!pendingOrder && splitOpen) setSplitOpen(false)
  }, [pendingOrder, splitOpen])

  // Cmd+\ (Ctrl+\ on non-mac) toggles split when an order is linked.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        if (!pendingOrder) return
        e.preventDefault()
        setSplitOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pendingOrder])

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
    const raw = replyInputRef.current?.value?.trim()
    if (!raw || sendReply.isPending) return

    // Wrap with the customer's boosts (signature, prepend, append, order ref)
    // before the message hits the wire. Idempotent when no boosts are set.
    const customerFirstName =
      (conversation.customer_name ?? '').trim().split(/\s+/)[0] ?? ''
    const content = applyBoosts(raw, conversation.customer_id, {
      orderRef: pendingOrder?.id ?? null,
      customerFirstName,
    })

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
      <ChatSplitView
        open={splitOpen && !!pendingOrder}
        onOpenChange={setSplitOpen}
        orderId={pendingOrder?.id ?? null}
      >
      <div className="flex flex-col flex-1 min-w-0 h-full">
      {/* Header — customer name + ambient memory line + status tag.
          Sticky so the back button + summary controls stay reachable
          on long mobile threads. */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-[var(--chidi-border-subtle)] bg-white">
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
          {pendingOrder && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSplitOpen((v) => !v)}
              aria-pressed={splitOpen}
              aria-label={splitOpen ? 'Close split with order' : 'Split with order'}
              title={splitOpen ? 'Close split (Esc)' : 'Split with order (⌘\\)'}
              className={cn(
                'h-8 px-2 gap-1.5 text-[12px] font-chidi-voice',
                splitOpen
                  ? 'text-[var(--chidi-text-primary)] bg-[var(--chidi-surface)]'
                  : 'text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)]',
              )}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {splitOpen ? 'Close split' : 'Split with order'}
              </span>
            </Button>
          )}
          {/* Summarize — Arc-style recap. Only enabled when there are
              messages to summarize (otherwise the sheet would be empty). */}
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSummaryOpen(true)}
              aria-label="Summarize conversation"
              title="Summarize conversation"
              className="h-8 px-2 gap-1.5 text-[12px] font-chidi-voice text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)]"
            >
              <ArcFace size={14} className="text-[var(--chidi-text-secondary)]" />
              <span className="hidden sm:inline">Summarize</span>
            </Button>
          )}
          {/* Mobile-only: pull up the customer profile as a bottom sheet.
              Desktop (xl+) has the persistent rail mounted at the side. */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setProfileSheetOpen(true)}
            aria-label="View customer profile"
            title="View profile"
            className="xl:hidden h-8 w-8 p-0 text-[var(--chidi-text-secondary)]"
          >
            <UserIcon className="w-4 h-4" />
          </Button>
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

      {/* Payment-expected sticky banner — sits above the message list any time
          the active conversation has a PENDING_PAYMENT order. Collapses to a
          quiet "✓ Confirmed" stamp once the merchant verifies receipt. */}
      {pendingOrder && (
        <div className="sticky top-0 z-10 px-3 pt-2 pb-2 border-b border-[var(--chidi-border-subtle)] bg-[var(--background)]">
          {paymentConfirmation ? (
            <div
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[var(--chidi-success)]/10 text-[var(--chidi-success)] border border-[var(--chidi-success)]/25"
              role="status"
              aria-live="polite"
            >
              <Check className="w-4 h-4" strokeWidth={2.5} />
              <span className="text-[13px] font-chidi-voice">
                Confirmed —{' '}
                <span className="tabular-nums">
                  {formatOrderAmount(paymentConfirmation.amount, pendingOrder.currency)}
                </span>{' '}
                received {formatConfirmedAgo(paymentConfirmation.confirmedAt)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[var(--chidi-warning)]/8 border border-[var(--chidi-warning)]/20">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--chidi-warning)]/15 text-[var(--chidi-warning)] flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-chidi-voice text-[var(--chidi-text-primary)] truncate">
                  <span className="font-medium">{conversation.customer_name || 'Customer'}</span>{' '}
                  owes you{' '}
                  <span className="tabular-nums font-medium">
                    {formatOrderAmount(pendingOrder.total, pendingOrder.currency)}
                  </span>{' '}
                  for order #{pendingOrder.id.slice(-6).toUpperCase()}
                </p>
              </div>
              {isMobileViewport ? (
                <>
                  <button
                    type="button"
                    onClick={() => setPaymentSheetOpen(true)}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 text-[12px] font-medium font-chidi-voice px-3 py-1.5 rounded-lg bg-[var(--chidi-success)] text-[var(--chidi-success-foreground)] hover:opacity-90 active:scale-[0.97] transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Confirm payment
                  </button>
                  <Sheet open={paymentSheetOpen} onOpenChange={setPaymentSheetOpen}>
                    <SheetContent
                      side="bottom"
                      className="bg-[var(--background)] p-0 max-h-[90vh] overflow-y-auto rounded-t-2xl"
                    >
                      <SheetHeader>
                        <SheetTitle className="text-[var(--chidi-text-primary)]">
                          Confirm payment
                        </SheetTitle>
                      </SheetHeader>
                      <div className="px-4 pb-6">
                        <PaymentConfirmationWidget
                          order={pendingOrder}
                          bare
                          onConfirm={() => {
                            queryClient.invalidateQueries({
                              queryKey: ordersKeys.byConversation(
                                conversation.id,
                                'PENDING_PAYMENT',
                              ),
                            })
                            window.setTimeout(() => setPaymentSheetOpen(false), 1400)
                          }}
                          onReject={() => setPaymentSheetOpen(false)}
                        />
                      </div>
                    </SheetContent>
                  </Sheet>
                </>
              ) : (
                <Popover open={paymentSheetOpen} onOpenChange={setPaymentSheetOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex-shrink-0 inline-flex items-center gap-1.5 text-[12px] font-medium font-chidi-voice px-3 py-1.5 rounded-lg bg-[var(--chidi-success)] text-[var(--chidi-success-foreground)] hover:opacity-90 active:scale-[0.97] transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Confirm payment
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    sideOffset={8}
                    className="w-[360px] p-0 bg-transparent border-0 shadow-none"
                  >
                    <PaymentConfirmationWidget
                      order={pendingOrder}
                      onConfirm={() => {
                        queryClient.invalidateQueries({
                          queryKey: ordersKeys.byConversation(
                            conversation.id,
                            'PENDING_PAYMENT',
                          ),
                        })
                        window.setTimeout(() => setPaymentSheetOpen(false), 1400)
                      }}
                      onReject={() => setPaymentSheetOpen(false)}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delivery tracking — sits just below the payment banner once the
          merchant has dispatched the order. Self-hides until the linked
          order's delivery status is "out_for_delivery". */}
      {hasActiveDelivery && trackedOrderId && (
        <DeliveryTrackingWidget
          orderId={trackedOrderId}
          conversationId={conversation.id}
          customerName={conversation.customer_name}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--chidi-surface)]">
        {loading ? (
          <div className="space-y-3" aria-label="Loading messages">
            {[
              { side: 'left', w: 'w-2/3' },
              { side: 'right', w: 'w-1/2' },
              { side: 'left', w: 'w-3/4' },
              { side: 'right', w: 'w-1/3' },
              { side: 'left', w: 'w-1/2' },
              { side: 'right', w: 'w-2/3' },
            ].map((row, i) => (
              <div key={i} className={cn('flex', row.side === 'right' ? 'justify-end' : 'justify-start')}>
                <div className={cn('chidi-skeleton h-9 rounded-md', row.w)} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[var(--chidi-text-muted)] text-sm font-chidi-voice">
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
                        'max-w-[85vw] sm:max-w-[78%] rounded-md px-2.5 py-1.5 relative',
                        tailCorner,
                        isCustomer
                          ? 'bg-white text-[var(--chidi-text-primary)] border border-[var(--chidi-border-subtle)]/40'
                          : 'bg-[var(--chidi-channel-whatsapp-bubble)] text-[var(--chidi-channel-whatsapp-bubble-text)]',
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

      {/* AI-suggest reply chips — three context-derived suggestions sit
          above the reply input. Tab or click to drop into the input. */}
      <AISuggestStrip
        lastMessage={messages[messages.length - 1]?.content}
        customerName={conversation.customer_name ?? undefined}
        onPick={(text) => {
          if (replyInputRef.current) {
            replyInputRef.current.value = text
            replyInputRef.current.focus()
          }
        }}
      />

      {/* Active-boosts chip — quietly tells the merchant their messages
          to this customer will be auto-wrapped. Click jumps into the panel. */}
      {activeBoostCount > 0 && (
        <div className="px-4 pt-2 -mb-1">
          <BoostsPanel
            customerId={conversation.customer_id}
            customerName={conversation.customer_name}
            orderRef={pendingOrder?.id ?? null}
            onActiveChange={setActiveBoostCount}
            trigger={
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-[11px] font-chidi-voice text-[var(--chidi-win)] hover:opacity-80 transition-opacity"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--chidi-win)]" />
                {activeBoostCount} boost{activeBoostCount === 1 ? '' : 's'} active for{' '}
                {conversation.customer_name?.split(/\s+/)[0] || 'this customer'}
              </button>
            }
          />
        </div>
      )}

      {/* Reply Input — safe-area-bottom keeps the send button clear of the
          iOS home indicator on mobile. */}
      <div className="px-4 pt-3 pb-5 sm:pb-4 border-t border-[var(--chidi-border-subtle)] bg-white safe-area-bottom">
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
          <BoostsPanel
            customerId={conversation.customer_id}
            customerName={conversation.customer_name}
            orderRef={pendingOrder?.id ?? null}
            onActiveChange={setActiveBoostCount}
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
      </div>
      </div>
      </ChatSplitView>

      {/* Chidi-summarized recap — opens from the Summarize button in the
          chat header. Deterministic algo lives in lib/chidi/chat-summary.ts;
          AI swap is a phase-2 backend job. */}
      <ChatSummarySheet
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        conversation={conversation}
        messages={messages}
        linkedOrder={pendingOrder ?? null}
        onAction={(kind) => {
          // Wire the suggested CTA to existing surfaces. The summary sheet
          // closes itself on tap, so we just need to land the merchant on
          // the right widget here.
          if (kind === 'confirm_payment' && pendingOrder) {
            setPaymentSheetOpen(true)
          } else if (kind === 'reply_now' || kind === 'send_delivery_update') {
            // Focus the reply input — the merchant lands ready to type.
            window.setTimeout(() => replyInputRef.current?.focus(), 50)
          }
          // follow_up / wrap_up → no-op (informational summaries)
        }}
      />

      {/* Customer profile rail — desktop only (xl+), shows accumulated context */}
      <CustomerProfileRail
        onOpenOrder={onOpenOrder}
        customerName={conversation.customer_name}
        customerId={conversation.customer_id}
        customerPhone={customerDisplay}
        channelName={channelInfo?.name}
        onViewAllOrders={onViewCustomerOrders}
        onAskChidiAbout={onAskChidiAboutCustomer}
      />

      {/* Mobile/tablet variant — same content, bottom sheet host. Hidden
          entirely on xl+ where the side rail is always visible. */}
      <Sheet open={profileSheetOpen} onOpenChange={setProfileSheetOpen}>
        <SheetContent
          side="bottom"
          className="xl:hidden bg-[var(--chidi-surface)] p-0 max-h-[90vh] h-[90vh] rounded-t-2xl flex flex-col"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Customer profile</SheetTitle>
          </SheetHeader>
          <CustomerProfileRailMobile
            onOpenOrder={(orderId) => {
              setProfileSheetOpen(false)
              onOpenOrder?.(orderId)
            }}
            customerName={conversation.customer_name}
            customerId={conversation.customer_id}
            customerPhone={customerDisplay}
            channelName={channelInfo?.name}
            onClose={() => setProfileSheetOpen(false)}
            onViewAllOrders={(name) => {
              setProfileSheetOpen(false)
              onViewCustomerOrders?.(name)
            }}
            onAskChidiAbout={(name) => {
              setProfileSheetOpen(false)
              onAskChidiAboutCustomer?.(name)
            }}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}
