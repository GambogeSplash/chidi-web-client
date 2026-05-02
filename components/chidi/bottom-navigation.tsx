"use client"

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { ChidiMark } from "./chidi-mark"
import { hapticTap } from "@/lib/chidi/haptics"
import { PRIMARY_TABS } from "@/lib/chidi/navigation"

export type TabId = "inbox" | "orders" | "inventory" | "insights" | "chidi"

interface BottomNavigationProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  /** Per-tab count badges — same data as the desktop NavRail. */
  tabCounts?: Partial<Record<TabId, number>>
}

// Tabs come from the single nav source. Use the shortLabel when present so
// "Ask Chidi" wraps to "Chidi" on the cramped mobile bottom bar.
const navItems = PRIMARY_TABS.map((t) => ({
  id: t.id,
  label: t.shortLabel ?? t.label,
  icon: t.icon,
}))

export function BottomNavigation({ activeTab, onTabChange, tabCounts = {} }: BottomNavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-[var(--chidi-border-default)] safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id
          const isChidi = item.icon === "chidi-mark"
          const Icon = isChidi ? null : (item.icon as LucideIcon)

          return (
            <button
              key={item.id}
              onClick={() => {
                hapticTap()
                onTabChange(item.id)
              }}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full px-2 transition-transform active:scale-[0.92]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-win)]/40",
                isActive
                  ? "text-[var(--chidi-win)]"
                  : "text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-secondary)]",
              )}
            >
              <span className="relative">
                {isChidi ? (
                  <ChidiMark
                    size={20}
                    className={cn("mb-0.5 transition-all", isActive && "text-[var(--chidi-win)]")}
                  />
                ) : Icon ? (
                  <Icon
                    className={cn("w-5 h-5 mb-0.5 transition-all", isActive && "text-[var(--chidi-win)]")}
                    strokeWidth={(isActive ? 2.4 : 1.8) as any}
                  />
                ) : null}
                {(tabCounts[item.id] ?? 0) > 0 && (
                  <span
                    key={tabCounts[item.id]}
                    className="chidi-badge-pop absolute -top-1 -right-2 text-[9px] font-medium tabular-nums px-1 min-w-[14px] h-[14px] rounded-full bg-[var(--chidi-warning)] text-white flex items-center justify-center"
                  >
                    {(tabCounts[item.id] ?? 0) > 9 ? "9+" : tabCounts[item.id]}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "text-[10px] leading-tight font-chidi-voice",
                  isActive
                    ? "text-[var(--chidi-text-primary)] font-medium"
                    : "font-medium",
                )}
              >
                {item.label}
              </span>
              {isActive && (
                <span
                  className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[var(--chidi-win)]"
                  aria-hidden
                />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
