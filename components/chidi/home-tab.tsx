"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Zap, Plus, Search, ArrowRight, Send, Sparkles, Copy, MoreVertical, ChevronDown, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useConversation } from '@/hooks/use-conversation'
import type { ChatMessage, ConversationResponse } from '@/lib/types/conversation'

interface ChatInterfaceProps {
  conversationId?: string
  onConversationCreated?: (conversation: ConversationResponse) => void
}

// Loading messages that rotate while waiting for AI response
const LOADING_MESSAGES = [
  "Checking...",
  "I'm coming...",
  "Please, wait small...",
]

// Helper function to format timestamps
const formatTimestamp = (timestamp: Date): string => {
  const now = new Date()
  const diff = now.getTime() - timestamp.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (days < 7) return timestamp.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
  return timestamp.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Helper to group consecutive messages from same sender
const groupMessages = (messages: ChatMessage[]): Array<{ sender: string; messages: ChatMessage[]; timestamp: Date }> => {
  const groups: Array<{ sender: string; messages: ChatMessage[]; timestamp: Date }> = []
  let currentGroup: { sender: string; messages: ChatMessage[]; timestamp: Date } | null = null

  for (const message of messages) {
    const sender = message.role === 'user' ? 'user' : 'chidi'
    if (!currentGroup || currentGroup.sender !== sender) {
      if (currentGroup) groups.push(currentGroup)
      currentGroup = {
        sender,
        messages: [message],
        timestamp: message.timestamp
      }
    } else {
      currentGroup.messages.push(message)
      currentGroup.timestamp = message.timestamp
    }
  }
  
  if (currentGroup) groups.push(currentGroup)
  return groups
}

export default function ChatInterface({ conversationId, onConversationCreated }: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('')
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0])
  const messageIndexRef = useRef(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Use the conversation hook for state management
  const {
    conversation,
    messages,
    isLoading,
    isSending,
    error,
    sendMessage,
    createAndSendMessage,
    clearError,
  } = useConversation(conversationId)

  // Rotate loading messages while sending - sequential order, cycles back
  useEffect(() => {
    if (!isSending) return

    // Start with first message
    messageIndexRef.current = 0
    setLoadingMessage(LOADING_MESSAGES[0])

    const interval = setInterval(() => {
      messageIndexRef.current = (messageIndexRef.current + 1) % LOADING_MESSAGES.length
      setLoadingMessage(LOADING_MESSAGES[messageIndexRef.current])
    }, 3500) // Change every 3.5 seconds

    return () => clearInterval(interval)
  }, [isSending])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  // Handle scroll to show/hide scroll to bottom button
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      setShowScrollButton(!isNearBottom && messages.length > 0)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return

    const messageContent = inputValue
    setInputValue('')

    if (!conversation) {
      // New conversation - use combined create + send for immediate UI feedback
      const newConversation = await createAndSendMessage(messageContent)
      if (newConversation) {
        onConversationCreated?.(newConversation)
      }
    } else {
      // Existing conversation - just send
      await sendMessage(messageContent)
    }
  }, [inputValue, conversation, createAndSendMessage, sendMessage, onConversationCreated])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSendMessage()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  useEffect(() => {
    // Focus input on mount
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Show centered interface when no messages
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white p-4">
        <div className="w-full max-w-2xl text-center space-y-8">
          {/* Logo */}
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center">
              <Zap className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-2xl font-medium">Ask Chidi anything</h1>
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSubmit} className="w-full">
            <div className="relative">
              <div className="flex items-center bg-gray-800 rounded-xl p-3 space-x-3">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-400 hover:text-white hover:bg-gray-700"
                >
                  <Plus className="w-4 h-4" />
                </Button>
                
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Message CHIDI..."
                  className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none"
                />
                
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-400 hover:text-white hover:bg-gray-700"
                >
                  <Search className="w-4 h-4" />
                </Button>
                
                <Button 
                  type="submit" 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-400 hover:text-white hover:bg-gray-700"
                  disabled={!inputValue.trim()}
                >
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </form>
          
          <div className="flex items-center justify-center mt-4 text-xs text-gray-500">
            <span>Research</span>
            <span className="mx-2">•</span>
            <span>Think</span>
            <span className="mx-2">•</span>
            <span>Tools</span>
          </div>
        </div>
      </div>
    )
  }

  // Show chat interface when messages exist  
  return (
    <div className="flex flex-col h-full bg-gray-950 relative">
      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-1"
        onScroll={handleScroll}
      >
        {groupMessages(messages).map((group, groupIndex) => (
          <div key={groupIndex} className={`flex flex-col space-y-1 mb-4 ${
            group.sender === 'user' ? 'items-end' : 'items-start'
          }`}>
            {/* Avatar and name for AI messages */}
            {group.sender === 'chidi' && (
              <div className="flex items-center gap-2 mb-1 ml-2">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="bg-emerald-600 text-white text-xs">
                    <Sparkles className="w-3 h-3" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-gray-400">CHIDI</span>
              </div>
            )}
            
            {/* Messages in group */}
            {group.messages.map((message, messageIndex) => (
              <div
                key={message.id}
                className={`group relative max-w-[70%] ${
                  group.sender === 'user' ? 'ml-auto' : 'mr-auto'
                }`}
              >
                <div
                  className={`relative px-4 py-3 rounded-2xl ${
                    group.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-md'
                      : 'bg-gray-800 text-white rounded-bl-md'
                  } ${messageIndex === 0 && group.sender === 'user' ? 'rounded-tr-2xl' : ''}
                  ${messageIndex === 0 && group.sender === 'chidi' ? 'rounded-tl-2xl' : ''}
                  ${messageIndex === group.messages.length - 1 && group.sender === 'user' ? 'rounded-br-2xl' : ''}
                  ${messageIndex === group.messages.length - 1 && group.sender === 'chidi' ? 'rounded-bl-2xl' : ''}
                  hover:shadow-lg transition-all duration-200 animate-in slide-in-from-bottom-2
                  `}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  
                  {/* Message actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`absolute -top-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 p-0 ${
                          group.sender === 'user' ? '-left-8' : '-right-8'
                        }`}
                      >
                        <MoreVertical className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => copyMessage(message.content)}>
                        <Copy className="w-3 h-3 mr-2" />
                        Copy
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {/* Timestamp and status for last message in group */}
                {messageIndex === group.messages.length - 1 && (
                  <div className={`flex items-center gap-2 mt-1 text-xs text-gray-500 ${
                    group.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}>
                    <span>{formatTimestamp(message.timestamp)}</span>
                    {message.isLoading && (
                      <div className="w-1 h-1 bg-gray-500 rounded-full animate-pulse" />
                    )}
                    {message.error && (
                      <div className="flex items-center gap-1 text-red-400">
                        <AlertCircle className="w-3 h-3" />
                        <span>Failed</span>
                      </div>
                    )}
                    {!message.isLoading && !message.error && (
                      <div className="flex gap-0.5">
                        <div className="w-1 h-1 bg-emerald-400 rounded-full" />
                        <div className="w-1 h-1 bg-emerald-400 rounded-full" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
        
        {/* Typing indicator with rotating messages */}
        {isSending && (
          <div className="flex items-start gap-2 mb-4">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="bg-emerald-600 text-white text-xs">
                <Sparkles className="w-3 h-3" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-gray-800 text-white rounded-2xl rounded-bl-md px-4 py-3 animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-300 animate-pulse">{loadingMessage}</span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                  <div
                    className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  />
                  <div
                    className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <Button
          onClick={scrollToBottom}
          size="sm"
          className="absolute bottom-20 right-6 rounded-full shadow-lg bg-gray-800 hover:bg-gray-700 border border-gray-600"
        >
          <ChevronDown className="w-4 h-4" />
        </Button>
      )}

      {/* Input Area */}
      <div className="shrink-0 p-4 border-t border-gray-800 bg-gray-950">
        <form onSubmit={handleSubmit} className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 pr-12 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!inputValue.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-700 rounded-lg h-8 w-8 p-0"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </form>
        
        {/* Input footer */}
        <div className="flex items-center justify-center mt-2 text-xs text-gray-500">
          <span>Press Enter to send, Shift + Enter for new line</span>
        </div>
      </div>
    </div>
  )
}
