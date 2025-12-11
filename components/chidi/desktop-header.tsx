"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Search, Plus, Menu } from "lucide-react"
import type { User } from "@/lib/api/auth"

interface DesktopHeaderProps {
  user: User | null
  activeTab: string
  onProfileClick: () => void
  notificationDropdown?: React.ReactNode
  onActionClick?: () => void
  onToggleSidebar?: () => void
  onSignOut?: () => void
  extraActions?: { label: string; onClick: () => void; icon?: React.ReactNode }[]
}

export function DesktopHeader({
  user,
  activeTab,
  onProfileClick,
  notificationDropdown,
  onActionClick,
  onToggleSidebar,
  extraActions,
}: DesktopHeaderProps) {
  const getTabTitle = () => {
    switch (activeTab) {
      case "home":
        return "AI Assistant"
      case "catalog":
        return "Product Catalog"
      case "conversations":
        return "Conversations"
      case "team":
        return "Team Management"
      case "settings":
        return "Settings"
      default:
        return "CHIDI"
    }
  }

  const getActionLabel = () => {
    switch (activeTab) {
      case "catalog":
        return "Add Product"
      default:
        return null
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-6 lg:px-8 py-4">
        <div className="flex items-center gap-4 flex-1">
          {/* Mobile menu toggle */}
          {onToggleSidebar && (
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={onToggleSidebar} title="Toggle menu">
              <Menu className="w-5 h-5" />
            </Button>
          )}

          <div>
            <h2 className="text-xl lg:text-2xl font-bold tracking-tight">{getTabTitle()}</h2>
            <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
              Welcome back, {user?.name?.split(" ")[0] || user?.businessName || "User"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search - can be expanded later */}
          <div className="relative hidden xl:block">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Search products, customers, orders..." className="w-80 pl-10 bg-card" />
          </div>

          {/* Action Button */}
          {getActionLabel() && onActionClick && (
            <Button onClick={onActionClick} size="sm" className="gap-2 hidden sm:flex">
              <Plus className="w-4 h-4" />
              {getActionLabel()}
            </Button>
          )}

          {/* Extra actions (small icon/text buttons) */}
          {extraActions && extraActions.length > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              {extraActions.map((act, idx) => (
                <Button key={idx} variant="ghost" size="icon" title={act.label} onClick={act.onClick}>
                  {act.icon ?? <Plus className="w-4 h-4" />}
                </Button>
              ))}
            </div>
          )}

          {/* Notifications Dropdown */}
          {notificationDropdown}

          {/* User Avatar */}
          <Avatar
            className="w-9 h-9 cursor-pointer border-2 border-border hover:border-primary transition-colors"
            onClick={onProfileClick}
          >
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {user?.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase() ||
                user?.businessName?.charAt(0).toUpperCase() ||
                "U"}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
