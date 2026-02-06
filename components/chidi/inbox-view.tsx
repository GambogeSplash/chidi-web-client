"use client"

import { useState, useEffect } from "react"
import { 
  MessageSquare, 
  User, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  Search,
  RefreshCw,
  MessageCircle,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { AlertCircle } from "lucide-react"
import { 
  whatsappAPI, 
  type WhatsAppConversation, 
  type WhatsAppConversationStatus,
  type WhatsAppStatus
} from "@/lib/api/whatsapp"
import { WhatsAppChat } from "./whatsapp-chat"
import { cn } from "@/lib/utils"

export function InboxView() {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [needsHumanCount, setNeedsHumanCount] = useState(0)
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  
  // WhatsApp connection state
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus | null>(null)
  const [checkingConnection, setCheckingConnection] = useState(true)
  const [showConnectDialog, setShowConnectDialog] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)

  useEffect(() => {
    checkWhatsAppConnection()
  }, [])

  useEffect(() => {
    if (whatsappStatus?.connected) {
      loadConversations()
    }
  }, [statusFilter, whatsappStatus?.connected])

  const checkWhatsAppConnection = async () => {
    try {
      setCheckingConnection(true)
      const status = await whatsappAPI.getStatus()
      setWhatsappStatus(status)
      if (status.connected) {
        setLoading(true)
      }
    } catch (err) {
      console.error("Failed to check WhatsApp status:", err)
      // Assume not connected if we can't check
      setWhatsappStatus({ connected: false, ai_enabled: false, after_hours_only: false })
    } finally {
      setCheckingConnection(false)
    }
  }

  const handleConnect = async () => {
    if (!phoneNumber) {
      setConnectError('Please enter your WhatsApp number')
      return
    }

    try {
      setConnecting(true)
      setConnectError(null)
      
      await whatsappAPI.connect({
        twilio_phone_number: phoneNumber,
        ai_enabled: true,
        after_hours_only: false,
      })
      
      const status = await whatsappAPI.getStatus()
      setWhatsappStatus(status)
      setShowConnectDialog(false)
      setPhoneNumber('')
    } catch (err: any) {
      console.error('Failed to connect WhatsApp:', err)
      setConnectError(err.response?.data?.detail || 'Failed to connect WhatsApp')
    } finally {
      setConnecting(false)
    }
  }

  const loadConversations = async () => {
    try {
      setLoading(true)
      const filter = statusFilter !== "all" ? statusFilter as WhatsAppConversationStatus : undefined
      const data = await whatsappAPI.getConversations(filter)
      setConversations(data.conversations)
      setNeedsHumanCount(data.needs_human_count)
    } catch (err) {
      console.error("Failed to load conversations:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleConversationClick = (conversation: WhatsAppConversation) => {
    setSelectedConversation(conversation)
  }

  const handleBackToList = () => {
    setSelectedConversation(null)
    loadConversations()
  }

  const getStatusBadge = (status: WhatsAppConversationStatus) => {
    switch (status) {
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

  const formatPhoneNumber = (phone: string) => {
    return phone.replace("whatsapp:", "")
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
    const phone = formatPhoneNumber(conv.customer_phone).toLowerCase()
    const name = (conv.customer_name || "").toLowerCase()
    const query = searchQuery.toLowerCase()
    return phone.includes(query) || name.includes(query)
  })

  // Show loading state while checking connection
  if (checkingConnection) {
    return (
      <div className="flex-1 flex flex-col bg-white items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--chidi-text-muted)]" />
      </div>
    )
  }

  // Show connect WhatsApp state if not connected
  if (!whatsappStatus?.connected) {
    return (
      <div className="flex-1 flex flex-col bg-white">
        {/* Header section */}
        <div className="px-4 pt-4 pb-3 border-b border-[var(--chidi-border-subtle)]">
          <h2 className="text-lg font-semibold text-[var(--chidi-text-primary)]">Inbox</h2>
          <p className="text-xs text-[var(--chidi-text-muted)]">0 conversations</p>
        </div>

        {/* Connect WhatsApp CTA */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-6">
            <MessageCircle className="w-10 h-10 text-green-600" />
          </div>
          
          <h3 className="text-xl font-semibold text-[var(--chidi-text-primary)] mb-2 text-center">
            Connect WhatsApp
          </h3>
          <p className="text-sm text-[var(--chidi-text-muted)] text-center mb-8 max-w-xs">
            Connect your WhatsApp Business number to start receiving and managing customer messages.
          </p>

          <Button
            onClick={() => setShowConnectDialog(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 h-11 rounded-xl font-medium"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Connect WhatsApp
          </Button>

          <p className="text-xs text-[var(--chidi-text-muted)] mt-4 text-center max-w-xs">
            You can also connect WhatsApp later from Settings → Integrations
          </p>
        </div>

        {/* Connect Dialog */}
        <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
          <DialogContent className="bg-white border-[var(--chidi-border-subtle)]">
            <DialogHeader>
              <DialogTitle className="text-[var(--chidi-text-primary)]">Connect WhatsApp</DialogTitle>
              <DialogDescription className="text-[var(--chidi-text-secondary)]">
                Enter your WhatsApp Business phone number to start receiving messages.
              </DialogDescription>
            </DialogHeader>
            
            {connectError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{connectError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-[var(--chidi-text-primary)]">WhatsApp Number</Label>
                <Input
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                  className="bg-white border-[var(--chidi-border-default)] text-[var(--chidi-text-primary)] h-11"
                />
                <p className="text-xs text-[var(--chidi-text-muted)]">
                  Your Twilio WhatsApp-enabled phone number (with country code)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowConnectDialog(false)}
                className="border-[var(--chidi-border-default)] text-[var(--chidi-text-secondary)]"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConnect}
                disabled={connecting || !phoneNumber}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {connecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Connect
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Show chat view if conversation is selected
  if (selectedConversation) {
    return (
      <WhatsAppChat 
        conversation={selectedConversation} 
        onBack={handleBackToList}
        onConversationUpdate={(updated) => {
          setSelectedConversation(updated)
          setConversations(prev => 
            prev.map(c => c.id === updated.id ? updated : c)
          )
        }}
      />
    )
  }

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
            onClick={loadConversations}
            disabled={loading}
            className="h-8 w-8 text-[var(--chidi-text-secondary)]"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>

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
                          {conversation.customer_name || formatPhoneNumber(conversation.customer_phone)}
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
                        {formatPhoneNumber(conversation.customer_phone)}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2">
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
