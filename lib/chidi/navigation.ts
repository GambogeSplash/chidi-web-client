/**
 * Single source for app navigation. NavRail, BottomNavigation, and
 * CommandPalette all consume this. Adding a new tab or library entry means
 * editing this one file.
 */

import {
  MessageSquare,
  ShoppingBag,
  Package,
  Users,
  BarChart3,
  BookOpen,
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
  // Customers lives between Inventory and Insights — the people layer beneath
  // the orders/inventory layers, and the broadcast composer here unlocks the
  // "broadcast eligibility" promise the verify-business modal already makes.
  // Routes to its own page (not in-tab) like Playbook.
  { id: "customers", label: "Customers", icon: Users, shortcut: "U" },
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
]
