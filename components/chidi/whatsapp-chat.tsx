'use client'

import { useState, useEffect, useRef } from 'react'
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
  whatsappAPI, 
  type WhatsAppConversation, 
  type WhatsAppMessage,
  type WhatsAppConversationStatus
} from '@/lib/api/whatsapp'

interface WhatsAppChatProps {
  conversation: WhatsAppConversation
  onBack: () => void
  onConversationUpdate: (conversation: WhatsAppConversation) => void
}

export function WhatsAppChat({ conversation, onBack, onConversationUpdate }: WhatsAppChatProps) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [replyText, setReplyText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
    markAsRead()
  }, [conversation.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async () => {
    try {
      setLoading(true)
      const data = await whatsappAPI.getMessages(conversation.id)
      setMessages(data.messages)
    } catch (err) {
      console.error('Failed to load messages:', err)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async () => {
    try {
      if (conversation.unread_count > 0) {
        const updated = await whatsappAPI.markRead(conversation.id)
        onConversationUpdate(updated)
      }
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }

  const handleSendReply = async () => {
    if (!replyText.trim() || sending) return

    try {
      setSending(true)
      const message = await whatsappAPI.sendReply(conversation.id, replyText.trim())
      setMessages(prev => [...prev, message])
      setReplyText('')
    } catch (err) {
      console.error('Failed to send reply:', err)
    } finally {
      setSending(false)
    }
  }

  const handleResolve = async (returnToAi: boolean) => {
    try {
      setResolving(true)
      const updated = await whatsappAPI.resolveConversation(conversation.id, returnToAi)
      onConversationUpdate(updated)
    } catch (err) {
      console.error('Failed to resolve conversation:', err)
    } finally {
      setResolving(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendReply()
    }
  }

  const formatPhoneNumber = (phone: string) => {
    return phone.replace('whatsapp:', '')
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

  const getMessageSenderIcon = (message: WhatsAppMessage) => {
    if (message.sender_type === 'CUSTOMER') {
      return <User className="w-4 h-4" />
    } else if (message.sender_type === 'AI') {
      return <Bot className="w-4 h-4" />
    } else {
      return <UserCircle className="w-4 h-4" />
    }
  }

  const getMessageSenderLabel = (message: WhatsAppMessage) => {
    if (message.sender_type === 'CUSTOMER') {
      return conversation.customer_name || 'Customer'
    } else if (message.sender_type === 'AI') {
      return 'Chidi AI'
    } else {
      return 'You'
    }
  }

  // Group messages by date
  const groupedMessages: { date: string; messages: WhatsAppMessage[] }[] = []
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
            <User className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p className="text-white font-medium">
              {conversation.customer_name || formatPhoneNumber(conversation.customer_id)}
            </p>
            <p className="text-sm text-gray-500">
              {formatPhoneNumber(conversation.customer_id)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {conversation.status === 'NEEDS_HUMAN' && (
            <Badge variant="destructive" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Needs Human
            </Badge>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadMessages}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No messages yet
          </div>
        ) : (
          groupedMessages.map((group, groupIndex) => (
            <div key={groupIndex}>
              {/* Date Separator */}
              <div className="flex items-center justify-center my-4">
                <span className="px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-400">
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
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                      {getMessageSenderIcon(message)}
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.sender_type === 'CUSTOMER'
                        ? 'bg-gray-800 text-white'
                        : message.sender_type === 'AI'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-green-600 text-white'
                    }`}
                  >
                    {/* Sender label for non-customer messages */}
                    {message.sender_type !== 'CUSTOMER' && (
                      <div className="flex items-center gap-1 text-xs opacity-75 mb-1">
                        {getMessageSenderIcon(message)}
                        <span>{getMessageSenderLabel(message)}</span>
                      </div>
                    )}
                    
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <span className="text-xs opacity-60">
                        {formatTime(message.created_at)}
                      </span>
                      {message.direction === 'OUTBOUND' && (
                        <span className="text-xs opacity-60">
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
                        <span className="text-xs opacity-60">
                          Confidence: {Math.round(message.confidence * 100)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {message.sender_type !== 'CUSTOMER' && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.sender_type === 'AI' ? 'bg-indigo-600' : 'bg-green-600'
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

      {/* Action Bar for NEEDS_HUMAN status */}
      {conversation.status === 'NEEDS_HUMAN' && (
        <div className="p-3 bg-orange-500/10 border-t border-orange-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">This conversation needs human attention</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResolve(true)}
                disabled={resolving}
                className="text-green-400 border-green-400/50 hover:bg-green-400/10"
              >
                {resolving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                Return to AI
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reply Input */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your reply..."
            className="flex-1 bg-gray-800 border-gray-700 text-white"
            disabled={sending}
          />
          <Button 
            onClick={handleSendReply}
            disabled={!replyText.trim() || sending}
            className="bg-green-600 hover:bg-green-700"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Your reply will be sent via WhatsApp
        </p>
      </div>
    </div>
  )
}
