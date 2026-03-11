"use client"

import React, { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { 
  MessageSquare, 
  User, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Loader2,
  Search,
  RefreshCw,
  MessageCircle,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { AlertCircle } from "lucide-react"
import { 
  type ChannelConversation, 
  type ConversationStatus,
  type ChannelType,
  getChannelInfo,
  formatCustomerId,
} from "@/lib/api/messaging"
import {
  useConnections,
  useConversations,
  useConnectWhatsApp,
  useConnectTelegram,
  messagingKeys,
} from "@/lib/hooks/use-messaging"
import { ChannelChat } from "./channel-chat"
import { WhatsAppIcon, TelegramIcon } from "@/components/ui/channel-icons"
import { cn } from "@/lib/utils"

export function InboxView() {
  const queryClient = useQueryClient()
  const [selectedConversation, setSelectedConversation] = useState<ChannelConversation | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [channelFilter, setChannelFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  
  // Connection dialog state
  const [showChannelPicker, setShowChannelPicker] = useState(false)
  const [showConnectDialog, setShowConnectDialog] = useState(false)
  const [connectChannelType, setConnectChannelType] = useState<ChannelType | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [botToken, setBotToken] = useState('')
  const [connectError, setConnectError] = useState<string | null>(null)
  const [connectionSuccess, setConnectionSuccess] = useState(false)

  // React Query hooks
  const { data: connections, isLoading: checkingConnection } = useConnections()
  const status = statusFilter !== "all" ? statusFilter as ConversationStatus : undefined
  const channel = channelFilter !== "all" ? channelFilter as ChannelType : undefined
  
  const hasAnyConnection = connections && connections.total > 0
  
  const { 
    data: conversationsData, 
    isLoading: loadingConversations, 
    isRefetching 
  } = useConversations(status, channel)
  
  const connectWhatsApp = useConnectWhatsApp()
  const connectTelegram = useConnectTelegram()

  const conversations = conversationsData?.conversations ?? []
  const needsHumanCount = conversationsData?.needs_human_count ?? 0

  // Available channels configuration
  const availableChannels: { type: ChannelType; name: string; icon: React.ReactNode; color: string; description: string }[] = [
    { type: 'WHATSAPP', name: 'WhatsApp', icon: <WhatsAppIcon size={24} className="text-[#25D366]" />, color: '#25D366', description: 'Connect via Twilio' },
    { type: 'TELEGRAM', name: 'Telegram', icon: <TelegramIcon size={24} className="text-[#0088CC]" />, color: '#0088CC', description: 'Connect your bot' },
  ]

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(status, channel) })
  }

  const handleSelectChannel = (channelType: ChannelType) => {
    setConnectChannelType(channelType)
    setShowChannelPicker(false)
    setShowConnectDialog(true)
    setConnectError(null)
  }

  const handleConnect = async () => {
    if (!connectChannelType) return
    
    if (connectChannelType === 'WHATSAPP' && !phoneNumber) {
      setConnectError('Please enter your WhatsApp number')
      return
    }
    if (connectChannelType === 'TELEGRAM' && !botToken) {
      setConnectError('Please enter your Telegram bot token')
      return
    }

    setConnectError(null)

    if (connectChannelType === 'WHATSAPP') {
      connectWhatsApp.mutate(phoneNumber, {
        onSuccess: () => {
          setConnectionSuccess(true)
          setPhoneNumber('')
        },
        onError: (err: any) => {
          setConnectError(err.response?.data?.detail || 'Failed to connect WhatsApp')
        },
      })
    } else if (connectChannelType === 'TELEGRAM') {
      connectTelegram.mutate(botToken, {
        onSuccess: () => {
          setConnectionSuccess(true)
          setBotToken('')
        },
        onError: (err: any) => {
          setConnectError(err.response?.data?.detail || 'Failed to connect Telegram')
        },
      })
    }
  }

  const handleCloseConnectDialog = () => {
    setShowConnectDialog(false)
    setConnectChannelType(null)
    setConnectError(null)
    setConnectionSuccess(false)
    setPhoneNumber('')
    setBotToken('')
  }

  const handleConversationClick = (conversation: ChannelConversation) => {
    setSelectedConversation(conversation)
  }

  const handleBackToList = () => {
    setSelectedConversation(null)
    queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(status, channel) })
  }

  const getStatusBadge = (convStatus: ConversationStatus) => {
    switch (convStatus) {
      case "NEEDS_HUMAN":
        return (
          <Badge className="bg-[var(--chidi-warning)] text-[var(--chidi-warning-foreground)] border-0 text-[10px] px-1.5 py-0.5">
            <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
            Needs attention
          </Badge>
        )
      case "RESOLVED":
        return (
          <Badge variant="secondary" className="bg-[var(--chidi-surface)] text-[var(--chidi-text-muted)] border-0 text-[10px] px-1.5 py-0.5">
            <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
            Resolved
          </Badge>
        )
      default:
        return (
          <Badge className="bg-[var(--chidi-success)] text-[var(--chidi-success-foreground)] border-0 text-[10px] px-1.5 py-0.5">
            <MessageSquare className="w-2.5 h-2.5 mr-0.5" />
            Active
          </Badge>
        )
    }
  }

  const getChannelBadge = (channelType?: ChannelType) => {
    if (!channelType) return null
    const info = getChannelInfo(channelType)
    
    const IconComponent = channelType === 'WHATSAPP' 
      ? <WhatsAppIcon size={10} className="mr-0.5" style={{ color: info.color }} />
      : channelType === 'TELEGRAM'
      ? <TelegramIcon size={10} className="mr-0.5" style={{ color: info.color }} />
      : null
    
    return (
      <span 
        className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full"
        style={{ backgroundColor: `${info.color}20`, color: info.color }}
      >
        {IconComponent}
        {info.name}
      </span>
    )
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString()
  }

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true
    const customerId = formatCustomerId(conv.customer_id, conv.channel_type).toLowerCase()
    const name = (conv.customer_name || "").toLowerCase()
    const query = searchQuery.toLowerCase()
    return customerId.includes(query) || name.includes(query)
  })

  const isConnecting = connectWhatsApp.isPending || connectTelegram.isPending
  const loading = loadingConversations && conversations.length === 0

  // Show loading state while checking connection
  if (checkingConnection) {
    return (
      <div className="flex-1 flex flex-col bg-white items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--chidi-text-muted)]" />
      </div>
    )
  }

  // Show connect channel state if no connections
  if (!hasAnyConnection) {
    return (
      <div className="flex-1 flex flex-col bg-white">
        {/* Header section */}
        <div className="px-4 pt-4 pb-3 border-b border-[var(--chidi-border-subtle)]">
          <h2 className="text-lg font-semibold text-[var(--chidi-text-primary)]">Inbox</h2>
          <p className="text-xs text-[var(--chidi-text-muted)]">0 conversations</p>
        </div>

        {/* Connect Channel CTA */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-20 h-20 rounded-full bg-[var(--chidi-surface)] flex items-center justify-center mb-6">
            <MessageCircle className="w-10 h-10 text-[var(--chidi-accent)]" />
          </div>
          
          <h3 className="text-xl font-semibold text-[var(--chidi-text-primary)] mb-2 text-center">
            Connect a Messaging Channel
          </h3>
          <p className="text-sm text-[var(--chidi-text-muted)] text-center mb-8 max-w-xs">
            Connect a messaging platform to start receiving and managing customer messages.
          </p>

          <Button
            onClick={() => setShowChannelPicker(true)}
            className="bg-[var(--chidi-accent)] hover:bg-[var(--chidi-accent)]/90 text-white px-6 h-11 rounded-xl font-medium"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Connect Channel
          </Button>

          <p className="text-xs text-[var(--chidi-text-muted)] mt-4 text-center max-w-xs">
            You can also connect channels later from Settings
          </p>
        </div>

        {/* Channel Picker Dialog */}
        <Dialog open={showChannelPicker} onOpenChange={setShowChannelPicker}>
          <DialogContent className="bg-white border-[var(--chidi-border-subtle)] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-[var(--chidi-text-primary)]">
                Select a Channel
              </DialogTitle>
              <DialogDescription className="text-[var(--chidi-text-secondary)]">
                Choose a messaging platform to connect
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-2">
              {availableChannels.map((channelOption) => (
                <button
                  key={channelOption.type}
                  onClick={() => handleSelectChannel(channelOption.type)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-[var(--chidi-border-subtle)] hover:border-[var(--chidi-border-default)] hover:bg-[var(--chidi-surface)] transition-colors text-left"
                >
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${channelOption.color}15` }}
                  >
                    {channelOption.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-[var(--chidi-text-primary)]">{channelOption.name}</div>
                    <div className="text-sm text-[var(--chidi-text-muted)]">{channelOption.description}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[var(--chidi-text-muted)]" />
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Connect Form Dialog */}
        <Dialog open={showConnectDialog} onOpenChange={handleCloseConnectDialog}>
          <DialogContent className="bg-white border-[var(--chidi-border-subtle)]">
            {connectionSuccess ? (
              <>
                <div className="flex flex-col items-center text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--chidi-text-primary)] mb-2">
                    {connectChannelType === 'WHATSAPP' ? 'WhatsApp' : 'Telegram'} Connected!
                  </h3>
                  <p className="text-sm text-[var(--chidi-text-secondary)] max-w-xs mb-4">
                    {connectChannelType === 'WHATSAPP' 
                      ? 'Your WhatsApp Business number is ready to receive messages from customers.'
                      : 'Your bot is ready to receive messages. Share your bot link with customers to start conversations.'
                    }
                  </p>
                  <div className="bg-[var(--chidi-surface)] rounded-lg p-3 w-full mb-4">
                    <p className="text-xs text-[var(--chidi-text-muted)] mb-1">Next step</p>
                    <p className="text-sm text-[var(--chidi-text-primary)]">
                      Make sure you have products in your inventory so Chidi can help customers with their questions.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleCloseConnectDialog}
                    className="w-full bg-[var(--chidi-accent)] hover:bg-[var(--chidi-accent)]/90 text-white"
                  >
                    Done
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="text-[var(--chidi-text-primary)]">
                    Connect {connectChannelType === 'WHATSAPP' ? 'WhatsApp' : connectChannelType === 'TELEGRAM' ? 'Telegram' : ''}
                  </DialogTitle>
                  <DialogDescription className="text-[var(--chidi-text-secondary)]">
                    {connectChannelType === 'WHATSAPP' 
                      ? 'Enter your WhatsApp Business phone number to start receiving messages.'
                      : connectChannelType === 'TELEGRAM'
                      ? 'Enter your Telegram bot token to start receiving messages.'
                      : ''
                    }
                  </DialogDescription>
                </DialogHeader>
                
                {connectError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{connectError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4 py-4">
                  {connectChannelType === 'WHATSAPP' && (
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber" className="text-[var(--chidi-text-primary)]">WhatsApp Number</Label>
                      <Input
                        id="phoneNumber"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+1234567890"
                        className="bg-white border-[var(--chidi-border-default)] text-[var(--chidi-text-primary)] h-11"
                      />
                      <Collapsible>
                        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-secondary)] transition-colors group">
                          <HelpCircle className="w-3 h-3" />
                          <span>How to get a WhatsApp number</span>
                          <ChevronDown className="w-3 h-3 transition-transform group-data-[state=open]:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <p className="text-xs text-[var(--chidi-text-secondary)] mt-2 mb-1.5">
                            Chidi uses Twilio to connect to WhatsApp Business. You'll need a Twilio account with a WhatsApp-enabled number.
                          </p>
                          <ol className="text-xs text-[var(--chidi-text-secondary)] space-y-1.5 pl-4 list-decimal">
                            <li>Create a <strong>Twilio account</strong> if you don't have one</li>
                            <li>Get a <strong>WhatsApp-enabled phone number</strong> from Twilio</li>
                            <li>Complete the WhatsApp Business Profile setup in Twilio</li>
                            <li>Copy your WhatsApp number (with country code) and paste it here</li>
                          </ol>
                          <a 
                            href="https://www.twilio.com/docs/whatsapp" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[var(--chidi-accent)] hover:underline mt-2"
                          >
                            Twilio WhatsApp Setup Guide
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  )}
                  {connectChannelType === 'TELEGRAM' && (
                    <div className="space-y-2">
                      <Label htmlFor="botToken" className="text-[var(--chidi-text-primary)]">Bot Token</Label>
                      <Input
                        id="botToken"
                        value={botToken}
                        onChange={(e) => setBotToken(e.target.value)}
                        placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                        className="bg-white border-[var(--chidi-border-default)] text-[var(--chidi-text-primary)] h-11 font-mono text-sm"
                      />
                      <Collapsible>
                        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-secondary)] transition-colors group">
                          <HelpCircle className="w-3 h-3" />
                          <span>How to get your bot token</span>
                          <ChevronDown className="w-3 h-3 transition-transform group-data-[state=open]:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <ol className="text-xs text-[var(--chidi-text-secondary)] space-y-1.5 mt-2 pl-4 list-decimal">
                            <li>Open Telegram and search for <strong>@BotFather</strong></li>
                            <li>Send <code className="bg-[var(--chidi-surface)] px-1 py-0.5 rounded">/newbot</code> and follow the prompts to name your bot</li>
                            <li>BotFather will reply with a token like <code className="bg-[var(--chidi-surface)] px-1 py-0.5 rounded">123456789:ABC...</code></li>
                            <li>Copy that token and paste it here</li>
                          </ol>
                          <a 
                            href="https://t.me/BotFather" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[var(--chidi-accent)] hover:underline mt-2"
                          >
                            Open BotFather
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={handleCloseConnectDialog}
                    className="border-[var(--chidi-border-default)] text-[var(--chidi-text-secondary)]"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleConnect}
                    disabled={isConnecting || (connectChannelType === 'WHATSAPP' ? !phoneNumber : connectChannelType === 'TELEGRAM' ? !botToken : true)}
                    className="bg-[var(--chidi-accent)] hover:bg-[var(--chidi-accent)]/90 text-white"
                  >
                    {isConnecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Connect
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Show chat view if conversation is selected
  if (selectedConversation) {
    return (
      <ChannelChat 
        conversation={selectedConversation}
        onBack={handleBackToList}
        onConversationUpdate={(updated) => {
          setSelectedConversation(updated)
        }}
      />
    )
  }

  // Get connected channel types for tabs
  const connectedChannels = connections?.connections.map(c => c.channel_type) || []

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header section */}
      <div className="px-4 pt-4 pb-3 border-b border-[var(--chidi-border-subtle)]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--chidi-text-primary)]">Inbox</h2>
            <p className="text-xs text-[var(--chidi-text-muted)]">
              {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
              {needsHumanCount > 0 && (
                <span className="text-[var(--chidi-warning)]"> · {needsHumanCount} need attention</span>
              )}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleRefresh}
            disabled={loading || isRefetching}
            className="h-8 w-8 text-[var(--chidi-text-secondary)]"
          >
            <RefreshCw className={cn("w-4 h-4", isRefetching && "animate-spin")} />
          </Button>
        </div>

        {/* Channel filter tabs */}
        {connectedChannels.length > 1 && (
          <Tabs value={channelFilter} onValueChange={setChannelFilter} className="mb-3">
            <TabsList className="h-8 bg-[var(--chidi-surface)] p-0.5">
              <TabsTrigger value="all" className="h-7 text-xs px-3 data-[state=active]:bg-white">
                All
              </TabsTrigger>
              {connectedChannels.map(channelType => {
                const info = getChannelInfo(channelType)
                return (
                  <TabsTrigger 
                    key={channelType} 
                    value={channelType} 
                    className="h-7 text-xs px-3 data-[state=active]:bg-white"
                  >
                    {info.icon} {info.name}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>
        )}

        {/* Search and filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--chidi-text-muted)]" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)]"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px] h-9 bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent className="bg-white border-[var(--chidi-border-default)]">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="NEEDS_HUMAN">Needs attention</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--chidi-text-muted)]" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 rounded-full bg-[var(--chidi-surface)] flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-[var(--chidi-text-muted)]" />
            </div>
            <h3 className="text-base font-semibold text-[var(--chidi-text-primary)] mb-1">
              {searchQuery ? "No results found" : "No conversations yet"}
            </h3>
            <p className="text-sm text-[var(--chidi-text-muted)] text-center max-w-xs">
              {searchQuery 
                ? "Try adjusting your search or filter"
                : "Messages from your WhatsApp customers will appear here."
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--chidi-border-subtle)]">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => handleConversationClick(conversation)}
                className={cn(
                  "w-full px-4 py-3 text-left transition-colors hover:bg-[var(--chidi-surface)]",
                  conversation.status === "NEEDS_HUMAN" && "border-l-2 border-l-[var(--chidi-warning)]"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-[var(--chidi-surface)] flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-[var(--chidi-text-muted)]" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-sm text-[var(--chidi-text-primary)] truncate">
                          {conversation.customer_name || formatCustomerId(conversation.customer_id, conversation.channel_type)}
                        </span>
                        {conversation.unread_count > 0 && (
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)] text-[10px] font-medium flex items-center justify-center">
                            {conversation.unread_count}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[var(--chidi-text-muted)] text-xs flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        {formatTime(conversation.last_activity)}
                      </div>
                    </div>
                    
                    {conversation.customer_name && (
                      <p className="text-xs text-[var(--chidi-text-muted)] truncate mb-1">
                        {formatCustomerId(conversation.customer_id, conversation.channel_type)}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2">
                      {getChannelBadge(conversation.channel_type)}
                      {getStatusBadge(conversation.status)}
                      {conversation.last_intent && conversation.last_intent !== "UNKNOWN" && (
                        <span className="text-[10px] text-[var(--chidi-text-muted)]">
                          {conversation.last_intent.replace("_", " ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
