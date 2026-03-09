'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { 
  ArrowLeft,
  Send,
  User,
  Bot,
  UserCircle,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { WhatsAppIcon, TelegramIcon } from '@/components/ui/channel-icons'
import { OrderVerificationWidget } from '@/components/chidi/order-verification-widget'

interface ChannelChatProps {
  conversation: ChannelConversation
  onBack: () => void
  onConversationUpdate: (conversation: ChannelConversation) => void
}

export function ChannelChat({ conversation, onBack, onConversationUpdate }: ChannelChatProps) {
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const replyInputRef = useRef<HTMLInputElement>(null)

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

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: messagingKeys.messages(conversation.id) })
  }

  const handleConfirmOrder = () => {
    if (!pendingOrder) return
    confirmOrder.mutate(
      { orderId: pendingOrder.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ordersKeys.byConversation(conversation.id, 'PENDING_PAYMENT') })
          queryClient.invalidateQueries({ queryKey: messagingKeys.messages(conversation.id) })
        },
      }
    )
  }

  const handleRejectOrder = (reason?: string) => {
    if (!pendingOrder) return
    rejectOrder.mutate(
      { orderId: pendingOrder.id, reason },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: messagingKeys.messages(conversation.id) })
        },
      }
    )
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

  const getMessageSenderIcon = (message: ChannelMessage) => {
    if (message.sender_type === 'CUSTOMER') {
      return <User className="w-4 h-4" />
    } else if (message.sender_type === 'AI') {
      return <Bot className="w-4 h-4" />
    } else {
      return <UserCircle className="w-4 h-4" />
    }
  }

  const getMessageSenderLabel = (message: ChannelMessage) => {
    if (message.sender_type === 'CUSTOMER') {
      return conversation.customer_name || 'Customer'
    } else if (message.sender_type === 'AI') {
      return 'Chidi AI'
    } else {
      return 'You'
    }
  }

  const getChannelIcon = (channelType?: ChannelType) => {
    switch (channelType) {
      case 'WHATSAPP':
        return <WhatsAppIcon size={16} className="text-[#25D366]" />
      case 'TELEGRAM':
        return <TelegramIcon size={16} className="text-[#0088CC]" />
      default:
        return null
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
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--chidi-border-subtle)]">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            className="h-8 w-8 text-[var(--chidi-text-secondary)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${getChannelColor(conversation.channel_type)}20` }}
          >
            {getChannelIcon(conversation.channel_type) || <User className="w-5 h-5 text-[var(--chidi-text-muted)]" />}
          </div>
          <div>
            <p className="text-[var(--chidi-text-primary)] font-medium">
              {conversation.customer_name || customerDisplay}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-[var(--chidi-text-muted)]">
                {customerDisplay}
              </p>
              {channelInfo && (
                <span 
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: `${channelInfo.color}20`, color: channelInfo.color }}
                >
                  {channelInfo.name}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {conversation.status === 'NEEDS_HUMAN' && (
            <Badge className="bg-[var(--chidi-warning)]/10 text-[var(--chidi-warning)] border-[var(--chidi-warning)]/30 border">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Needs Human
            </Badge>
          )}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleRefresh}
            disabled={loading || isRefetching}
            className="h-8 w-8 text-[var(--chidi-text-secondary)]"
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

              {/* Messages */}
              {group.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 mb-3 ${
                    message.sender_type === 'CUSTOMER' ? 'justify-start' : 'justify-end'
                  }`}
                >
                  {message.sender_type === 'CUSTOMER' && (
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${getChannelColor(conversation.channel_type)}20` }}
                    >
                      {getMessageSenderIcon(message)}
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm ${
                      message.sender_type === 'CUSTOMER'
                        ? 'bg-white text-[var(--chidi-text-primary)]'
                        : message.sender_type === 'AI'
                        ? 'bg-[var(--chidi-accent)] text-white'
                        : 'bg-[var(--chidi-success)] text-white'
                    }`}
                  >
                    {/* Sender label for non-customer messages */}
                    {message.sender_type !== 'CUSTOMER' && (
                      <div className="flex items-center gap-1 text-xs opacity-75 mb-1">
                        {getMessageSenderIcon(message)}
                        <span>{getMessageSenderLabel(message)}</span>
                      </div>
                    )}
                    
                    <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                    
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <span className="text-[10px] opacity-60">
                        {formatTime(message.created_at)}
                      </span>
                      {message.direction === 'OUTBOUND' && (
                        <span className="text-[10px] opacity-60">
                          {message.delivered ? (
                            message.read ? '✓✓' : '✓'
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                        </span>
                      )}
                    </div>

                    {/* Confidence indicator for AI messages */}
                    {message.sender_type === 'AI' && message.confidence !== undefined && (
                      <div className="mt-1 pt-1 border-t border-white/20">
                        <span className="text-[10px] opacity-60">
                          Confidence: {Math.round(message.confidence * 100)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {message.sender_type !== 'CUSTOMER' && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.sender_type === 'AI' ? 'bg-[var(--chidi-accent)]' : 'bg-[var(--chidi-success)]'
                    }`}>
                      {getMessageSenderIcon(message)}
                    </div>
                  )}
                </div>
              ))}
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

      {/* Action Bar for NEEDS_HUMAN status */}
      {conversation.status === 'NEEDS_HUMAN' && (
        <div className="px-4 py-3 bg-[var(--chidi-warning)]/5 border-t border-[var(--chidi-warning)]/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[var(--chidi-warning)]">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">
                {pendingOrder 
                  ? 'Verify payment above or respond manually'
                  : 'This conversation needs human attention'}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResolve(true)}
                disabled={resolveConversation.isPending}
                className="text-[var(--chidi-success)] border-[var(--chidi-success)]/50 hover:bg-[var(--chidi-success)]/10"
              >
                {resolveConversation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                Return to AI
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reply Input */}
      <div className="px-4 py-3 border-t border-[var(--chidi-border-subtle)] bg-white">
        <div className="flex gap-2">
          <Input
            ref={replyInputRef}
            onKeyPress={handleKeyPress}
            placeholder="Type your reply..."
            className="flex-1 bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)]"
            disabled={sendReply.isPending}
          />
          <Button 
            onClick={handleSendReply}
            disabled={sendReply.isPending}
            style={{ backgroundColor: getChannelColor(conversation.channel_type) }}
            className="hover:opacity-90"
          >
            {sendReply.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-[var(--chidi-text-muted)] mt-2">
          Your reply will be sent via {channelInfo?.name || 'the connected channel'}
        </p>
      </div>
    </div>
  )
}
