"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useParams, usePathname, useRouter } from "next/navigation"
import {
  ChevronDown,
  ChevronsLeft,
  Building2,
  Settings as SettingsIcon,
  type LucideIcon,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useDashboardAuth } from "@/lib/providers/dashboard-auth-context"
import { cn } from "@/lib/utils"
import type { TabId } from "./bottom-navigation"
import { ChidiMark } from "./chidi-mark"
import { BusinessAvatar } from "./business-avatar"
import { PRIMARY_TABS, LIBRARY_ENTRIES } from "@/lib/chidi/navigation"

interface NavRailProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  /** @deprecated kept for callsite compatibility; rail no longer renders a notifications surface */
  unreadNotificationCount?: number
  /** @deprecated kept for callsite compatibility; rail no longer renders a notifications surface */
  onNotificationsClick?: () => void
  onSearchClick?: () => void
  /** Per-tab count badges. Use to surface inbox-needs-human, orders-pending, etc. */
  tabCounts?: Partial<Record<TabId, number>>
}

const COLLAPSED_KEY = "chidi_navrail_collapsed"

/**
 * Desktop-only left rail. Hidden below lg.
 *
 * Structure:
 *   Top:    workspace switcher + bell (inline notifications)
 *   Below:  bordered search pill (opens Cmd+K)
 *   Middle: primary tabs + library
 *   Footer: chevron-only collapse
 *
 * Settings lives inside the workspace popover, not as a footer item.
 */
export function NavRail({
  activeTab,
  onTabChange,
  onSearchClick,
  tabCounts = {},
}: NavRailProps) {
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const { user } = useDashboardAuth()
  const slug = params.slug as string | undefined

  const businessName = (user as any)?.businessName || "Your business"
  const businessInitial = businessName.charAt(0).toUpperCase()

  const isOnNotebook = pathname?.includes("/notebook")
  const isOnSettings = pathname?.includes("/settings")

  // Collapsed state, persisted across sessions
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined") return
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "true")
  }, [])
  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    if (typeof window !== "undefined") {
      localStorage.setItem(COLLAPSED_KEY, String(next))
    }
    window.dispatchEvent(new CustomEvent("chidi:navrail-toggle", { detail: { collapsed: next } }))
  }

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-[var(--card)] border-r border-[var(--chidi-border-subtle)] z-40 transition-[width] duration-200",
        collapsed ? "w-[64px]" : "w-[224px]",
      )}
      aria-label="Primary"
    >
      {/* Top: Chidi wordmark + collapse toggle. The wordmark anchors brand
          identity; the workspace card lives at the bottom near the user's
          own context (sign-in, settings). */}
      <div className="pt-3 pb-2 px-3 flex items-center justify-between">
        <Link
          href={slug ? `/dashboard/${slug}` : "/"}
          className="flex items-center rounded-md hover:bg-[var(--chidi-surface)]/60 transition-colors p-1"
          aria-label="Chidi home"
        >
          <Image
            src="/logo.png"
            alt="Chidi"
            width={collapsed ? 32 : 88}
            height={collapsed ? 32 : 36}
            className={cn("w-auto", collapsed ? "h-8" : "h-9")}
            priority
          />
        </Link>
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex-shrink-0 rounded-md text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-surface)] transition-colors active:scale-[0.95] p-1.5",
            collapsed && "hidden",
          )}
        >
          <ChevronsLeft className={cn("w-3.5 h-3.5 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>
      {/* When collapsed, the toggle sits centered just below the mark so the
          user can always re-expand. */}
      {collapsed && (
        <div className="px-2 pb-1 flex justify-center">
          <button
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="rounded-md text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-surface)] transition-colors active:scale-[0.95] p-1.5"
          >
            <ChevronsLeft className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>
      )}

      {/* Search lives at ⌘K — no pill in the rail. */}

      {/* Primary nav */}
      <nav className="flex-1 px-2 overflow-y-auto">
        <ul className="space-y-0.5">
          {PRIMARY_TABS.map((tab) => {
            const isActive = activeTab === tab.id && !isOnNotebook && !isOnSettings
            const isChidi = tab.icon === "chidi-mark"
            const Icon = isChidi ? null : (tab.icon as LucideIcon)
            const count = tabCounts[tab.id] ?? 0
            return (
              <li key={tab.id}>
                <button
                  onClick={() => {
                    if ((isOnNotebook || isOnSettings) && slug) {
                      router.push(`/dashboard/${slug}`)
                    }
                    onTabChange(tab.id)
                  }}
                  title={collapsed ? tab.label : undefined}
                  className={cn(
                    "group relative w-full flex items-center rounded-lg text-[13px] font-chidi-voice transition-colors active:scale-[0.98]",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-win)]/40",
                    collapsed ? "justify-center py-2" : "gap-3 px-2.5 py-1.5",
                    isActive
                      ? "bg-[var(--chidi-surface)] text-[var(--chidi-text-primary)] font-medium"
                      : "text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-surface)]/60 hover:text-[var(--chidi-text-primary)]",
                  )}
                >
                  {isChidi ? (
                    <ChidiMark
                      size={16}
                      className={cn("flex-shrink-0", isActive && "text-[var(--chidi-win)]")}
                    />
                  ) : Icon ? (
                    <Icon
                      className={cn("w-[18px] h-[18px] flex-shrink-0", isActive && "text-[var(--chidi-win)]")}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                  ) : null}

                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left truncate">{tab.label}</span>
                      {count > 0 && (
                        <span
                          key={count}
                          className="chidi-badge-pop text-[10px] font-medium tabular-nums px-1.5 py-0.5 rounded-full bg-[var(--chidi-warning)]/15 text-[var(--chidi-warning)] min-w-[18px] text-center"
                        >
                          {count > 99 ? "99+" : count}
                        </span>
                      )}
                    </>
                  )}

                  {collapsed && count > 0 && (
                    <span
                      key={count}
                      className="chidi-badge-pop absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-[3px] rounded-full bg-[var(--chidi-warning)] text-white text-[9px] font-medium tabular-nums flex items-center justify-center"
                    >
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        {slug && LIBRARY_ENTRIES.length > 0 && (
          <>
            {!collapsed ? (
              <div className="px-2.5 mt-5 mb-1.5 text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-chidi-voice">
                Library
              </div>
            ) : (
              <div className="my-3 border-t border-[var(--chidi-border-subtle)]" />
            )}
            <ul className="space-y-0.5">
              {LIBRARY_ENTRIES.map((entry) => {
                const href = entry.href(slug)
                const isActive = pathname === href || pathname?.startsWith(href + "/")
                const Icon = entry.icon
                return (
                  <li key={entry.id}>
                    <Link
                      href={href}
                      title={collapsed ? entry.label : undefined}
                      className={cn(
                        "w-full flex items-center rounded-lg text-[13px] font-chidi-voice transition-colors",
                        collapsed ? "justify-center py-2" : "gap-3 px-2.5 py-1.5",
                        isActive
                          ? "bg-[var(--chidi-surface)] text-[var(--chidi-text-primary)] font-medium"
                          : "text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-surface)]/60 hover:text-[var(--chidi-text-primary)]",
                      )}
                    >
                      <Icon
                        className={cn("w-[18px] h-[18px] flex-shrink-0", isActive && "text-[var(--chidi-win)]")}
                        strokeWidth={isActive ? 2.2 : 1.8}
                      />
                      {!collapsed && <span className="flex-1 truncate">{entry.label}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </nav>

      {/* Bottom: workspace switcher (shop avatar + name + popover). Sits at
          the foot of the rail so the user's own context (settings, switch
          workspace, sign-out) is one reach away from the bottom of the
          screen — same gravity as the macOS Dock or VS Code account icon. */}
      <div className="mt-auto p-2 border-t border-[var(--chidi-border-subtle)]">
        <div
          className={cn(
            "rounded-xl border border-[var(--chidi-border-default)] bg-[var(--chidi-surface)]/50 transition-colors",
            collapsed ? "p-1" : "p-1",
          )}
        >
          <BusinessSwitcher
            businessName={businessName}
            slug={slug}
            collapsed={collapsed}
          />
        </div>
      </div>
    </aside>
  )
}

interface BusinessSwitcherProps {
  businessName: string
  slug?: string
  collapsed: boolean
}

function BusinessSwitcher({ businessName, slug, collapsed }: BusinessSwitcherProps) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          title={collapsed ? businessName : undefined}
          aria-label={`Workspace: ${businessName}`}
          className={cn(
            "flex items-center rounded-lg hover:bg-[var(--chidi-surface)] transition-colors text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-win)]/40",
            collapsed ? "justify-center p-1" : "gap-2 px-1.5 py-1.5 w-full",
          )}
        >
          <BusinessAvatar name={businessName} size="sm" />
          {!collapsed && (
            <>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-[var(--chidi-text-primary)] truncate font-chidi-voice leading-tight">
                  {businessName}
                </span>
                <span className="block text-[10px] text-[var(--chidi-text-muted)] truncate font-mono mt-0.5">
                  {slug ? `chidi.app/${slug}` : "Switch workspace"}
                </span>
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--chidi-text-muted)] flex-shrink-0 group-hover:text-[var(--chidi-text-secondary)]" />
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[224px] p-1 bg-[var(--card)] border-[var(--chidi-border-default)]"
      >
        {/* Current workspace — highlighted, click to confirm context */}
        <div className="px-2.5 py-2 flex items-center gap-2 rounded-md bg-[var(--chidi-surface)]">
          <BusinessAvatar name={businessName} size="xs" />
          <span className="text-[13px] font-medium font-chidi-voice text-[var(--chidi-text-primary)] truncate">
            {businessName}
          </span>
        </div>

        <div className="h-px bg-[var(--chidi-border-subtle)] my-1" />

        {/* Workspace actions */}
        {slug && (
          <Link
            href={`/dashboard/${slug}/settings`}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-[var(--chidi-surface)]/70 transition-colors text-left text-[13px] font-chidi-voice text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)]"
          >
            <SettingsIcon className="w-3.5 h-3.5 text-[var(--chidi-text-muted)]" strokeWidth={1.8} />
            <span className="flex-1">Workspace settings</span>
          </Link>
        )}

        <div className="h-px bg-[var(--chidi-border-subtle)] my-1" />

        <button
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-[var(--chidi-surface)]/70 transition-colors text-left text-[13px] font-chidi-voice text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)]"
        >
          <Building2 className="w-3.5 h-3.5 text-[var(--chidi-text-muted)]" strokeWidth={1.8} />
          <span className="flex-1">Add another business</span>
        </button>
      </PopoverContent>
    </Popover>
  )
}
