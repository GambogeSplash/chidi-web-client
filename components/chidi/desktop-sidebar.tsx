"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  MessageSquare, 
  Package, 
  TrendingUp, 
  Plus,
  Settings,
  MoreHorizontal,
  Zap
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { User } from "@/lib/api"

interface ChatSidebarProps {
  activeSection: 'chat' | 'inventory'
  onSectionChange: (section: 'chat' | 'inventory') => void
  onNewChat: () => void
  onSettingsClick: () => void
  user: User | null
  chatHistory: Array<{
    id: string
    title: string
    lastMessage: string
    timestamp: string
  }>
  onChatSelect: (chatId: string) => void
  activeChatId?: string
}

export function DesktopSidebar({ 
  activeSection = 'chat', 
  onSectionChange = () => {},
  onNewChat = () => {},
  onSettingsClick = () => {},
  user,
  chatHistory = [],
  onChatSelect = () => {},
  activeChatId
}: ChatSidebarProps) {
  const [hoveredChat, setHoveredChat] = useState<string | null>(null)

  // Use provided chat history (no mock data)
  const displayChats = chatHistory

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold">CHIDI</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white hover:bg-gray-700"
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-1">
          {/* New Chat Button */}
          <Button
            onClick={onNewChat}
            className="w-full justify-start bg-transparent hover:bg-gray-700 text-white border border-gray-600"
          >
            <Plus className="w-4 h-4 mr-3" />
            New Chat
          </Button>

          {/* Main Navigation */}
          <div className="space-y-1 mt-4">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start text-gray-300 hover:bg-gray-700 hover:text-white",
                activeSection === 'inventory' && "bg-gray-700 text-white"
              )}
              onClick={() => onSectionChange('inventory')}
            >
              <Package className="w-4 h-4 mr-3" />
              Inventory
            </Button>
            
          </div>
        </div>

        {/* Separator */}
        <div className="mx-3 my-4 border-t border-gray-700" />

        {/* Chat History */}
        <div className="px-3">
          <div className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
            Chats
          </div>
          
          <div className="space-y-1">
            {displayChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => onChatSelect(chat.id)}
                onMouseEnter={() => setHoveredChat(chat.id)}
                onMouseLeave={() => setHoveredChat(null)}
                className={cn(
                  "w-full text-left p-2 rounded-lg text-sm transition-colors",
                  "hover:bg-gray-700",
                  activeChatId === chat.id ? "bg-gray-700" : "text-gray-300"
                )}
              >
                <div className="flex items-start space-x-2">
                  <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {chat.title}
                    </div>
                    <div className="text-xs text-gray-500 truncate mt-1">
                      {chat.lastMessage}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {chat.timestamp}
                    </div>
                  </div>
                  {hoveredChat === chat.id && (
                    <MoreHorizontal className="w-4 h-4 text-gray-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom User Section */}
      <div className="border-t border-gray-700 p-3">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {user?.name || 'User'}
            </div>
            <div className="text-xs text-gray-400">
              Free Plan
            </div>
          </div>
        </div>
        
        <Button
          variant="ghost"
          onClick={onSettingsClick}
          className="w-full justify-start text-gray-300 hover:bg-gray-700 hover:text-white"
        >
          <Settings className="w-4 h-4 mr-3" />
          Settings
        </Button>
      </div>
    </div>
  )
}
