/**
 * Single source for app navigation. NavRail, BottomNavigation, and
 * CommandPalette all consume this. Adding a new tab or library entry means
 * editing this one file.
 */

import {
  MessageSquare,
  ShoppingBag,
  Package,
  BarChart3,
  BookOpen,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react"
import type { TabId } from "@/components/chidi/bottom-navigation"

export type NavIconKey = LucideIcon | "chidi-mark"

export interface PrimaryTab {
  id: TabId
  label: string
  shortLabel?: string
  icon: NavIconKey
  /** G+_ keyboard shortcut letter (single uppercase) */
  shortcut: string
  /** Counter source for the badge — drives both NavRail + BottomNav + Cmd+K */
  countSource?: "needsHuman" | "pendingPayment" | "lowStock"
}

export interface LibraryEntry {
  id: string
  label: string
  icon: LucideIcon
  /** Build a slug-aware href */
  href: (slug: string) => string
  shortcut?: string
}

// =============================================================================
// Primary tabs — the main horizontal nav across NavRail + BottomNav
// =============================================================================

export const PRIMARY_TABS: PrimaryTab[] = [
  { id: "inbox", label: "Inbox", icon: MessageSquare, shortcut: "I", countSource: "needsHuman" },
  { id: "orders", label: "Orders", icon: ShoppingBag, shortcut: "O", countSource: "pendingPayment" },
  { id: "inventory", label: "Inventory", icon: Package, shortcut: "V", countSource: "lowStock" },
  // Customers is no longer a top-level destination. The full surface now lives
  // inside Insights as the "Customers" drill-in lens; the standalone /customers
  // route only exists as a redirect for legacy deep-links. Shortcut U is freed.
  { id: "insights", label: "Insights", icon: BarChart3, shortcut: "S" },
  { id: "chidi", label: "Ask Chidi", shortLabel: "Chidi", icon: "chidi-mark", shortcut: "C" },
]

// =============================================================================
// Library entries — secondary navigation under "Library" in the rail
// =============================================================================

export const LIBRARY_ENTRIES: LibraryEntry[] = [
  {
    id: "notebook",
    label: "Playbook",
    icon: BookOpen,
    href: (slug) => `/dashboard/${slug}/notebook`,
    shortcut: "N",
  },
  // Easels — kanban view of orders by stage. Sits below Playbook in the
  // Library section. The route is its own page (mirrors Notebook chrome) so
  // the merchant can deep-link / pop it open without losing in-tab state.
  {
    id: "board",
    label: "Board",
    icon: LayoutDashboard,
    href: (slug) => `/dashboard/${slug}/board`,
    shortcut: "B",
  },
]
