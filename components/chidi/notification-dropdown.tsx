"use client"

import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Bell, Package, AlertTriangle, Check, X, PackageX } from "lucide-react"
import { cn } from "@/lib/utils"

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

interface NotificationDropdownProps {
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  onDismiss: (id: string) => void
  onNotificationClick?: (notification: Notification) => void
}

export function NotificationDropdown({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onNotificationClick,
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length

  const getNotificationIcon = (type: string, priority: string) => {
    const iconClass = cn(
      "w-4 h-4",
      priority === "high" ? "text-[var(--chidi-danger)]" : "text-[var(--chidi-warning)]"
    )
    
    switch (type) {
      case "stock":
        return priority === "high" 
          ? <PackageX className={iconClass} />
          : <Package className={iconClass} />
      case "system":
        return <AlertTriangle className={iconClass} />
      default:
        return <Bell className={iconClass} />
    }
  }

  const getPriorityStyles = (priority: string, read: boolean) => {
    if (read) {
      return "bg-[var(--chidi-surface)] border-transparent"
    }
    
    switch (priority) {
      case "high":
        return "bg-[var(--chidi-danger)]/5 border-[var(--chidi-danger)]/20"
      case "medium":
        return "bg-[var(--chidi-warning)]/5 border-[var(--chidi-warning)]/20"
      default:
        return "bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)]"
    }
  }

  // Sort: unread first, then by priority
  const sortedNotifications = [...notifications].sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex items-center justify-center h-9 w-9 rounded-lg transition-colors hover:bg-[var(--chidi-surface)] text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)]"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] font-semibold bg-[var(--chidi-danger)] text-white rounded-full animate-pulse-badge">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent 
        className="w-80 p-0 z-50 bg-white border-[var(--chidi-border-default)] shadow-lg rounded-xl overflow-hidden" 
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface-elevated)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[var(--chidi-text-primary)]">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <p className="text-xs text-[var(--chidi-text-muted)] mt-0.5">
                  {unreadCount} unread
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-xs font-medium text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Notification List */}
        <div className="max-h-64 overflow-y-auto">
          {sortedNotifications.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <Bell className="w-5 h-5 text-[var(--chidi-text-muted)] mx-auto mb-2" />
              <p className="text-xs text-[var(--chidi-text-muted)]">
                No notifications
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {sortedNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => {
                    if (onNotificationClick) {
                      onNotificationClick(notification)
                      setIsOpen(false)
                      if (!notification.read) {
                        onMarkAsRead(notification.id)
                      }
                    }
                  }}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer",
                    "hover:bg-[var(--chidi-surface)]",
                    !notification.read && "bg-[var(--chidi-surface)]/60"
                  )}
                >
                  {/* Unread dot */}
                  {!notification.read && (
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full flex-shrink-0",
                      notification.priority === "high" 
                        ? "bg-[var(--chidi-danger)]" 
                        : "bg-[var(--chidi-warning)]"
                    )} />
                  )}

                  {/* Icon */}
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type, notification.priority)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-xs font-medium truncate",
                      notification.read 
                        ? "text-[var(--chidi-text-muted)]" 
                        : "text-[var(--chidi-text-primary)]"
                    )}>
                      {notification.title}
                    </p>
                    <p className="text-[10px] text-[var(--chidi-text-muted)]">
                      {notification.timestamp}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center flex-shrink-0">
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onMarkAsRead(notification.id)
                        }}
                        className="w-6 h-6 rounded flex items-center justify-center text-[var(--chidi-text-muted)] hover:text-[var(--chidi-success)] hover:bg-[var(--chidi-success)]/10 transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDismiss(notification.id)
                      }}
                      className="w-6 h-6 rounded flex items-center justify-center text-[var(--chidi-text-muted)] hover:text-[var(--chidi-danger)] hover:bg-[var(--chidi-danger)]/10 transition-colors"
                      title="Dismiss"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {sortedNotifications.length > 0 && (
          <div className="px-4 py-2.5 border-t border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface)]">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full text-xs font-medium text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
