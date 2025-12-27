"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  MessageSquare, 
  Package, 
  Plus,
  Settings,
  MoreHorizontal,
  Zap,
  Building2,
  PanelLeftClose,
  PanelLeft
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { User } from "@/lib/api"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarProvider,
  SidebarTrigger,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ChatSidebarProps {
  activeSection: 'chat' | 'inventory'
  onSectionChange: (section: 'chat' | 'inventory') => void
  onNewChat: () => void
  onSettingsClick: () => void
  onBusinessProfileClick?: () => void
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

// Inner sidebar content component that uses the sidebar context
function SidebarInnerContent({ 
  activeSection,
  onSectionChange,
  onNewChat,
  onSettingsClick,
  onBusinessProfileClick,
  user,
  chatHistory,
  onChatSelect,
  activeChatId
}: ChatSidebarProps) {
  const { state, isMobile } = useSidebar()
  const isCollapsed = state === 'collapsed'
  const [hoveredChat, setHoveredChat] = useState<string | null>(null)

  return (
    <Sidebar collapsible="icon" className="border-r border-gray-700 bg-gray-900">
      {/* Header */}
      <SidebarHeader className="border-b border-gray-700 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && <span className="font-semibold text-white">CHIDI</span>}
          </div>
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-gray-700 h-8 w-8 p-0"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-gray-900">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarMenu>
            {/* New Chat Button */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={onNewChat}
                tooltip="New Chat"
                className="border border-gray-600 hover:bg-gray-700 text-white"
              >
                <Plus className="w-4 h-4" />
                <span>New Chat</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Inventory */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => onSectionChange('inventory')}
                isActive={activeSection === 'inventory'}
                tooltip="Inventory"
                className="text-gray-300 hover:bg-gray-700 hover:text-white data-[active=true]:bg-gray-700 data-[active=true]:text-white"
              >
                <Package className="w-4 h-4" />
                <span>Inventory</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Business Profile */}
            {onBusinessProfileClick && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onBusinessProfileClick}
                  tooltip="Business Profile"
                  className="text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Business Profile</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>

        {/* Chat History */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-400 uppercase tracking-wide text-xs">
            {!isCollapsed && "Chats"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {chatHistory.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton
                    onClick={() => onChatSelect(chat.id)}
                    isActive={activeChatId === chat.id}
                    tooltip={chat.title}
                    className="text-gray-300 hover:bg-gray-700 hover:text-white data-[active=true]:bg-gray-700 data-[active=true]:text-white"
                    onMouseEnter={() => setHoveredChat(chat.id)}
                    onMouseLeave={() => setHoveredChat(null)}
                  >
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-sm">
                        {chat.title}
                      </div>
                      {!isCollapsed && (
                        <div className="text-xs text-gray-500 truncate">
                          {chat.lastMessage}
                        </div>
                      )}
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer - User Section */}
      <SidebarFooter className="border-t border-gray-700 p-3 bg-gray-900">
        <SidebarMenu>
          {/* User Info */}
          <SidebarMenuItem>
            <div className={cn(
              "flex items-center gap-3 mb-2",
              isCollapsed && "justify-center"
            )}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shrink-0 cursor-default">
                    <span className="text-sm font-medium text-white">
                      {user?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>{user?.name || 'User'}</p>
                    <p className="text-xs text-gray-400">Free Plan</p>
                  </TooltipContent>
                )}
              </Tooltip>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate text-white">
                    {user?.name || 'User'}
                  </div>
                  <div className="text-xs text-gray-400">
                    Free Plan
                  </div>
                </div>
              )}
            </div>
          </SidebarMenuItem>

          {/* Settings Button */}
          <SidebarMenuItem>
            <button
              type="button"
              onClick={() => {
                console.log('🔧 [SIDEBAR] Settings button clicked')
                console.log('🔧 [SIDEBAR] onSettingsClick type:', typeof onSettingsClick)
                console.log('🔧 [SIDEBAR] onSettingsClick:', onSettingsClick)
                if (typeof onSettingsClick === 'function') {
                  onSettingsClick()
                  console.log('🔧 [SIDEBAR] onSettingsClick called')
                } else {
                  console.error('🔧 [SIDEBAR] onSettingsClick is not a function!')
                }
              }}
              className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

// Main sidebar component - must be used within SidebarProvider
export function DesktopSidebar(props: ChatSidebarProps) {
  return <SidebarInnerContent {...props} />
}

// Export provider for wrapping at dashboard level
export { SidebarProvider }

// Export trigger for use in main content area
export function SidebarToggle({ className }: { className?: string }) {
  const { state, toggleSidebar, isMobile } = useSidebar()
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className={cn("h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800", className)}
    >
      {state === 'collapsed' ? (
        <PanelLeft className="h-4 w-4" />
      ) : (
        <PanelLeftClose className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
}

// Mobile-specific toggle that shows hamburger menu
export function MobileSidebarTrigger({ className }: { className?: string }) {
  const { toggleSidebar, openMobile, isMobile } = useSidebar()
  
  // Only show on mobile
  if (!isMobile) return null
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className={cn("h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800 md:hidden", className)}
    >
      <PanelLeft className="h-4 w-4" />
      <span className="sr-only">Open Sidebar</span>
    </Button>
  )
}
