"use client"

import { useEffect, useMemo, useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Bell,
  Package,
  AlertTriangle,
  Check,
  X,
  PackageX,
  Clock,
  CreditCard,
  ShoppingBag,
  AtSign,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ChidiMark } from "./chidi-mark"
import { ArcFace } from "./arc-face"
import { WhatsAppIcon, TelegramIcon } from "@/components/ui/channel-icons"
import {
  type StoredChidiNotification,
  type ChannelSource,
  bucketOf,
  formatRelative,
  getNotifications,
  markRead,
  markAllRead,
  dismiss as dismissNotification,
  seedDemoNotificationsIfEmpty,
  subscribe as subscribeNotifications,
  wireNotificationProducers,
} from "@/lib/chidi/notifications"

/**
 * NotificationDropdown is now self-contained: it reads from
 * lib/chidi/notifications, listens to its store, and groups entries by
 * today / yesterday / older. Callers no longer need to pass props.
 *
 * The legacy props (notifications/onMarkAsRead/etc.) are accepted but
 * ignored — kept for API compatibility with surfaces that still pass them.
 */
interface NotificationDropdownProps {
  notifications?: unknown
  onMarkAsRead?: unknown
  onMarkAllAsRead?: unknown
  onDismiss?: unknown
  onNotificationClick?: (notification: StoredChidiNotification) => void
}

function ChannelGlyph({ channel }: { channel?: ChannelSource }) {
  if (channel === "WHATSAPP") return <WhatsAppIcon size={12} className="text-[#25D366]" />
  if (channel === "TELEGRAM") return <TelegramIcon size={12} className="text-[#0088CC]" />
  return null
}

function TypeIcon({ type }: { type: StoredChidiNotification["type"] }) {
  const cls = "w-3.5 h-3.5"
  switch (type) {
    case "new_order":
      return <ShoppingBag className={cn(cls, "text-[var(--chidi-text-secondary)]")} />
    case "payment_pending":
      return <Clock className={cn(cls, "text-[var(--chidi-warning)]")} />
    case "payment_confirmed":
      return <CreditCard className={cn(cls, "text-[var(--chidi-success)]")} />
    case "low_stock":
      return <PackageX className={cn(cls, "text-[var(--chidi-warning)]")} />
    case "snooze_returned":
      return <Clock className={cn(cls, "text-[var(--chidi-text-secondary)]")} />
    case "chidi_action_taken":
      return <ChidiMark size={12} variant="muted" />
    case "mention_assigned":
      return <AtSign className={cn(cls, "text-[var(--chidi-text-secondary)]")} />
    default:
      return <Bell className={cn(cls, "text-[var(--chidi-text-secondary)]")} />
  }
}

const BUCKET_LABEL: Record<"today" | "yesterday" | "older", string> = {
  today: "Today",
  yesterday: "Yesterday",
  older: "Earlier",
}

export function NotificationDropdown(_legacyProps: NotificationDropdownProps = {}) {
  const onClickProp = _legacyProps.onNotificationClick
  const [isOpen, setIsOpen] = useState(false)
  const [items, setItems] = useState<StoredChidiNotification[]>([])

  // Subscribe + seed once. wireNotificationProducers is idempotent — calling it
  // here means any surface that mounts the dropdown gets producers running.
  useEffect(() => {
    seedDemoNotificationsIfEmpty()
    const unwire = wireNotificationProducers()
    const unsub = subscribeNotifications(setItems)
    setItems(getNotifications())
    return () => {
      unsub()
      unwire()
    }
  }, [])

  // External openers (rail "bell" button dispatches chidi:open-notifications)
  useEffect(() => {
    if (typeof window === "undefined") return
    const open = () => setIsOpen(true)
    window.addEventListener("chidi:open-notifications", open)
    return () => window.removeEventListener("chidi:open-notifications", open)
  }, [])

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items])

  const grouped = useMemo(() => {
    const buckets: Record<"today" | "yesterday" | "older", StoredChidiNotification[]> = {
      today: [],
      yesterday: [],
      older: [],
    }
    for (const n of items) buckets[bucketOf(n.createdAt)].push(n)
    return buckets
  }, [items])

  const total = items.length

  const handleClick = (n: StoredChidiNotification) => {
    if (!n.read) markRead(n.id)
    onClickProp?.(n)
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex items-center justify-center h-9 w-9 rounded-lg transition-colors hover:bg-[var(--chidi-surface)] text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)]"
          onClick={() => setIsOpen((v) => !v)}
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] font-semibold bg-[var(--chidi-danger)] text-white rounded-full motion-safe:animate-pulse-badge">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[340px] p-0 z-50 bg-white border-[var(--chidi-border-default)] shadow-lg rounded-xl overflow-hidden"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface-elevated)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[var(--chidi-text-primary)]">Notifications</h3>
              <p className="text-[11px] text-[var(--chidi-text-muted)] mt-0.5 font-chidi-voice">
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : total > 0
                    ? "All caught up"
                    : "Nothing yet"}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="max-h-[420px] overflow-y-auto">
          {total === 0 ? (
            <div className="py-10 px-4 text-center">
              <ArcFace size={20} className="text-[var(--chidi-text-muted)] mx-auto mb-2" />
              <p className="text-xs text-[var(--chidi-text-muted)] font-chidi-voice">
                You'll see new orders, payments, and Chidi's moves here.
              </p>
            </div>
          ) : (
            <div>
              {(["today", "yesterday", "older"] as const).map((bucket) =>
                grouped[bucket].length === 0 ? null : (
                  <section key={bucket}>
                    <header className="sticky top-0 z-[1] px-4 py-1.5 text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium bg-white/95 backdrop-blur-sm border-b border-[var(--chidi-border-subtle)]/60">
                      {BUCKET_LABEL[bucket]}
                    </header>
                    <ul className="p-2 space-y-1">
                      {grouped[bucket].map((n) => (
                        <li key={n.id}>
                          <button
                            type="button"
                            onClick={() => handleClick(n)}
                            className={cn(
                              "group w-full flex items-start gap-2.5 p-2 rounded-lg transition-colors text-left",
                              "hover:bg-[var(--chidi-surface)]",
                              !n.read && "bg-[var(--chidi-surface)]/60",
                            )}
                          >
                            {/* Unread dot */}
                            <span
                              className={cn(
                                "mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0",
                                n.read ? "bg-transparent" : "bg-[var(--chidi-success)]",
                              )}
                              aria-hidden
                            />

                            {/* Type icon + channel glyph stack */}
                            <div className="flex-shrink-0 flex flex-col items-center gap-1 mt-0.5">
                              <TypeIcon type={n.type} />
                              {n.channel ? <ChannelGlyph channel={n.channel} /> : null}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <p
                                className={cn(
                                  "text-[12.5px] leading-snug",
                                  n.read
                                    ? "text-[var(--chidi-text-secondary)]"
                                    : "font-medium text-[var(--chidi-text-primary)]",
                                )}
                              >
                                {n.title}
                              </p>
                              {n.body && (
                                <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice mt-0.5 line-clamp-2">
                                  {n.body}
                                </p>
                              )}
                              <p className="text-[10px] text-[var(--chidi-text-muted)] mt-1 tabular-nums">
                                {formatRelative(n.createdAt)}
                              </p>
                            </div>

                            {/* Hover actions */}
                            <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!n.read && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    markRead(n.id)
                                  }}
                                  className="w-6 h-6 rounded flex items-center justify-center text-[var(--chidi-text-muted)] hover:text-[var(--chidi-success)] hover:bg-[var(--chidi-success)]/10"
                                  title="Mark read"
                                  aria-label="Mark read"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  dismissNotification(n.id)
                                }}
                                className="w-6 h-6 rounded flex items-center justify-center text-[var(--chidi-text-muted)] hover:text-[var(--chidi-danger)] hover:bg-[var(--chidi-danger)]/10"
                                title="Dismiss"
                                aria-label="Dismiss"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ),
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Re-export legacy icons so any existing import like `import { ... } from
// "./notification-dropdown"` keeps tree-shaking happy.
export { Bell, Package, AlertTriangle, Check, X, PackageX }
