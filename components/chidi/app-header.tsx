"use client"

import { useState } from "react"
import { Calendar as CalendarIcon, ChevronRight, StickyNote } from "lucide-react"
import { useParams } from "next/navigation"
import { NotificationDropdown } from "./notification-dropdown"
import { BusinessAvatar, useBusinessAvatarSeed } from "./business-avatar"
import { useDashboardAuth } from "@/lib/providers/dashboard-auth-context"
import { NotesPanel } from "./notes-panel"
import { CalendarPeek, useTodaysCount } from "./calendar-peek"
import { SpacesSwitcherList } from "./spaces-switcher"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface AppHeaderProps {
  /** Kept for callsite compatibility — the identity block now opens the Spaces
   *  switcher; settings is reached via the switcher footer. */
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
 * Left:  Business avatar + name + chevron — opens the Spaces switcher in a
 *        bottom Sheet so the merchant can pick another shop, add a new one,
 *        or jump to workspace settings (the deep link the block used to do
 *        directly). One tap, more options.
 *
 * Right: Calendar Peek (Popover) → Notes (right Sheet) → Notifications.
 *        Same surfaces the desktop nav rail mounts, so the merchant never
 *        loses access to them on a phone.
 */
export function AppHeader({
  showSettings: _showSettings = true,
  notifications = [],
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onNotificationClick,
}: AppHeaderProps) {
  const params = useParams()
  void (params.slug as string | undefined)
  const { user } = useDashboardAuth()
  const businessName = (user as any)?.businessName || "Your business"
  const { seed: avatarSeed } = useBusinessAvatarSeed(businessName)

  const [spacesOpen, setSpacesOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const todaysCount = useTodaysCount()

  // Truncate to ~14 chars on mobile so we can fit the new utility icons too.
  const displayName =
    businessName.length > 14 ? `${businessName.slice(0, 13)}…` : businessName

  return (
    <header className="sticky top-0 z-40 bg-[var(--background)] border-b border-[var(--chidi-border-default)] safe-area-top">
      <div className="flex items-center justify-between h-14 px-3 max-w-lg mx-auto gap-2">
        {/* Identity block — opens the Spaces switcher in a bottom Sheet. */}
        <Sheet open={spacesOpen} onOpenChange={setSpacesOpen}>
          <SheetTrigger asChild>
            <button
              aria-label={`Switch shop. Currently ${businessName}.`}
              className="inline-flex items-center gap-2 min-h-[44px] max-w-[55%] min-w-0 px-2 -mx-1 rounded-lg hover:bg-[var(--chidi-surface)] active:scale-[0.98] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-win)]/40"
            >
              <BusinessAvatar name={avatarSeed} size="sm" />
              <span className="text-[14px] font-medium text-[var(--chidi-text-primary)] truncate font-chidi-voice">
                {displayName}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--chidi-text-muted)] flex-shrink-0" strokeWidth={1.8} />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="p-3 pb-6 bg-[var(--card)] rounded-t-2xl">
            <SpacesSwitcherList
              onSwitched={() => setSpacesOpen(false)}
              onDismiss={() => setSpacesOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          {/* Calendar Peek — Popover anchored to the icon */}
          <CalendarPeek side="bottom" align="end">
            <button
              aria-label={`Today, ${todaysCount} item${todaysCount === 1 ? "" : "s"}`}
              className="relative w-11 h-11 inline-flex items-center justify-center rounded-full hover:bg-[var(--chidi-surface)] active:scale-[0.92] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-win)]/40 text-[var(--chidi-text-secondary)]"
            >
              <CalendarIcon className="w-5 h-5" strokeWidth={1.8} />
              {todaysCount > 0 && (
                <span className="chidi-badge-pop absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--chidi-warning)] text-white text-[9px] font-medium tabular-nums flex items-center justify-center">
                  {todaysCount > 9 ? "9+" : todaysCount}
                </span>
              )}
            </button>
          </CalendarPeek>

          {/* Notes — same right-side Sheet as desktop */}
          <NotesPanel open={notesOpen} onOpenChange={setNotesOpen}>
            <button
              aria-label="Quick notes"
              className="w-11 h-11 inline-flex items-center justify-center rounded-full hover:bg-[var(--chidi-surface)] active:scale-[0.92] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-win)]/40 text-[var(--chidi-text-secondary)]"
            >
              <StickyNote className="w-5 h-5" strokeWidth={1.8} />
            </button>
          </NotesPanel>

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
