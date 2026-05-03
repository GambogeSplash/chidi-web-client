"use client"

import { ChevronRight } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { NotificationDropdown } from "./notification-dropdown"
import { BusinessAvatar, useBusinessAvatarSeed } from "./business-avatar"
import { useDashboardAuth } from "@/lib/providers/dashboard-auth-context"

interface AppHeaderProps {
  /** Kept for callsite compatibility — the entire identity block now navigates
      to settings, so a separate cog is redundant. */
  showSettings?: boolean
  // Notification props are accepted for legacy DashboardContent wiring but
  // forwarded to NotificationDropdown as `unknown` — that component now owns
  // its own state via lib/chidi/notifications.ts and ignores legacy callbacks.
  notifications?: unknown
  onMarkAsRead?: unknown
  onMarkAllAsRead?: unknown
  onDismiss?: unknown
  onNotificationClick?: unknown
}

/**
 * Mobile chrome.
 *
 * Left:  Business avatar + name + chevron — one tap → workspace settings.
 *        The whole block is the merchant's identity, not Chidi's brand.
 *        (Chidi's brand lives inside the conversational surfaces; this top
 *        slot is "you, the shop".)
 *
 * Right: Notifications. Settings cog removed — the identity block IS the
 *        settings entry now.
 */
export function AppHeader({
  showSettings: _showSettings = true,
  notifications = [],
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onNotificationClick,
}: AppHeaderProps) {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const { user } = useDashboardAuth()
  const businessName = (user as any)?.businessName || "Your business"
  const { seed: avatarSeed } = useBusinessAvatarSeed(businessName)

  // Truncate to ~16 chars on mobile so chevron + notifications stay visible.
  const displayName =
    businessName.length > 16 ? `${businessName.slice(0, 15)}…` : businessName

  const handleIdentityClick = () => {
    if (slug) {
      router.push(`/dashboard/${slug}/settings`)
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-[var(--background)] border-b border-[var(--chidi-border-default)] safe-area-top">
      <div className="flex items-center justify-between h-14 px-3 max-w-lg mx-auto gap-2">
        {/* Identity block — snaps to its content (avatar + name + arrow) so
            it doesn't claim half the bar. 44px tap target preserved via min-h. */}
        <button
          onClick={handleIdentityClick}
          aria-label={`Open ${businessName} settings`}
          className="inline-flex items-center gap-2 min-h-[44px] max-w-[60%] min-w-0 px-2 -mx-1 rounded-lg hover:bg-[var(--chidi-surface)] active:scale-[0.98] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-win)]/40"
        >
          <BusinessAvatar name={avatarSeed} size="sm" />
          <span className="text-[14px] font-medium text-[var(--chidi-text-primary)] truncate font-chidi-voice">
            {displayName}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--chidi-text-muted)] flex-shrink-0" strokeWidth={1.8} />
        </button>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* NotificationDropdown is now self-contained — it reads from
              lib/chidi/notifications. Legacy props on AppHeader are kept for
              callsite compatibility but no longer threaded through. */}
          <NotificationDropdown />
          {/* Mark legacy props as intentionally consumed so TS / lint stay quiet. */}
          {void notifications}
          {void onMarkAsRead}
          {void onMarkAllAsRead}
          {void onDismiss}
          {void onNotificationClick}
        </div>
      </div>
    </header>
  )
}
