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
  Users,
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
  // Customers is no longer a top-level tab. It was tried as a tab on Orders
  // and as a lens in Insights — both forced. It now lives in the Library
  // section as a standalone /customers route (next to Playbook + Board).
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
  // Customers — "everyone you've sold to". Sits between Playbook and Board in
  // the Library section. Used to be a top-level tab; both the Orders-tab and
  // Insights-lens placements felt forced, so it lives here as its own surface.
  {
    id: "customers",
    label: "Customers",
    icon: Users,
    href: (slug) => `/dashboard/${slug}/customers`,
    shortcut: "U",
  },
  // Easels — kanban view of orders by stage. Sits below Customers in the
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
