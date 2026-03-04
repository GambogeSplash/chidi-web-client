"use client"

import { Settings } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { NotificationDropdown } from "./notification-dropdown"

interface Notification {
  id: string
  type: "stock" | "message" | "sale" | "system" | "activity"
  title: string
  message: string
  timestamp: string
  read: boolean
  priority: "low" | "medium" | "high"
  referenceType?: string
  referenceId?: string
}

interface AppHeaderProps {
  showSettings?: boolean
  notifications?: Notification[]
  onMarkAsRead?: (id: string) => void
  onMarkAllAsRead?: () => void
  onDismiss?: (id: string) => void
  onNotificationClick?: (notification: Notification) => void
}

export function AppHeader({ 
  showSettings = true,
  notifications = [],
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onNotificationClick,
}: AppHeaderProps) {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const handleSettingsClick = () => {
    if (slug) {
      router.push(`/dashboard/${slug}/settings`)
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[var(--chidi-border-subtle)] safe-area-top">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <Image
          src="/logo.png"
          alt="Chidi"
          width={36}
          height={36}
        />
        
        <div className="flex items-center gap-1">
          {/* Notification Dropdown */}
          {onMarkAsRead && onMarkAllAsRead && onDismiss && (
            <NotificationDropdown
              notifications={notifications}
              onMarkAsRead={onMarkAsRead}
              onMarkAllAsRead={onMarkAllAsRead}
              onDismiss={onDismiss}
              onNotificationClick={onNotificationClick}
            />
          )}

          {/* Settings Button */}
          {showSettings && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSettingsClick}
              className="h-9 w-9 text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)]"
            >
              <Settings className="w-5 h-5" />
              <span className="sr-only">Settings</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
