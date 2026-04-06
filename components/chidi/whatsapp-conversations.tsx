'use client'

import { useState, useEffect } from 'react'
import { 
  MessageCircle, 
  User, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  whatsappAPI, 
  type WhatsAppConversation, 
  type WhatsAppConversationStatus 
} from '@/lib/api/whatsapp'
import { WhatsAppChat } from './whatsapp-chat'

interface WhatsAppConversationsProps {
  onConversationSelect?: (conversation: WhatsAppConversation) => void
}

export function WhatsAppConversations({ onConversationSelect }: WhatsAppConversationsProps) {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [needsHumanCount, setNeedsHumanCount] = useState(0)
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadConversations()
  }, [statusFilter])

  const loadConversations = async () => {
    try {
      setLoading(true)
      const filter = statusFilter !== 'all' ? statusFilter as WhatsAppConversationStatus : undefined
      const data = await whatsappAPI.getConversations(filter)
      setConversations(data.conversations)
      setNeedsHumanCount(data.needs_human_count)
    } catch (err) {
      console.error('Failed to load conversations:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleConversationClick = (conversation: WhatsAppConversation) => {
    setSelectedConversation(conversation)
    onConversationSelect?.(conversation)
  }

  const handleBackToList = () => {
    setSelectedConversation(null)
    loadConversations() // Refresh list when going back
  }

  const getStatusBadge = (status: WhatsAppConversationStatus) => {
    switch (status) {
      case 'NEEDS_HUMAN':
        return (
          <Badge variant="destructive" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Needs Human
          </Badge>
        )
      case 'RESOLVED':
        return (
          <Badge variant="secondary" className="bg-gray-500/20 text-gray-400 border-gray-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Resolved
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
            <MessageCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        )
    }
  }

  const formatPhoneNumber = (phone: string) => {
    // Remove whatsapp: prefix if present
    const cleaned = phone.replace('whatsapp:', '')
    return cleaned
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true
    const phone = formatPhoneNumber(conv.customer_id).toLowerCase()
    const name = (conv.customer_name || '').toLowerCase()
    const query = searchQuery.toLowerCase()
    return phone.includes(query) || name.includes(query)
  })

  // Show chat view if conversation is selected
  if (selectedConversation) {
    return (
      <WhatsAppChat 
        conversation={selectedConversation} 
        onBack={handleBackToList}
        onConversationUpdate={(updated) => {
          setSelectedConversation(updated)
          // Update in list too
          setConversations(prev => 
            prev.map(c => c.id === updated.id ? updated : c)
          )
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Customer Conversations</h2>
          <p className="text-sm text-gray-400">
            {conversations.length} total conversations
            {needsHumanCount > 0 && (
              <span className="text-orange-400 ml-2">
                • {needsHumanCount} need attention
              </span>
            )}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadConversations}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search by phone or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-gray-800 border-gray-700 text-white"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all">All Conversations</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="NEEDS_HUMAN">Needs Human</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Conversation List */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      ) : filteredConversations.length === 0 ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageCircle className="w-12 h-12 text-gray-600 mb-4" />
            <p className="text-gray-400 text-center">
              {searchQuery 
                ? 'No conversations match your search'
                : 'No conversations yet'}
            </p>
            <p className="text-sm text-gray-500 text-center mt-1">
              Conversations will appear here when customers message you on WhatsApp
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredConversations.map((conversation) => (
            <Card 
              key={conversation.id}
              className={`bg-gray-900 border-gray-800 cursor-pointer transition-colors hover:bg-gray-800/50 ${
                conversation.status === 'NEEDS_HUMAN' ? 'border-l-4 border-l-orange-500' : ''
              }`}
              onClick={() => handleConversationClick(conversation)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    
                    {/* Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium truncate">
                          {conversation.customer_name || formatPhoneNumber(conversation.customer_id)}
                        </p>
                        {conversation.unread_count > 0 && (
                          <Badge className="bg-indigo-500 text-white text-xs px-1.5 py-0.5">
                            {conversation.unread_count}
                          </Badge>
                        )}
                      </div>
                      {conversation.customer_name && (
                        <p className="text-sm text-gray-500 truncate">
                          {formatPhoneNumber(conversation.customer_id)}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(conversation.status)}
                        {conversation.last_intent && conversation.last_intent !== 'UNKNOWN' && (
                          <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">
                            {conversation.last_intent.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-1 text-gray-500 text-sm flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatTime(conversation.last_activity)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
