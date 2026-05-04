"use client"

/**
 * LibraryBottomNav — the bottom-nav adapter for Library / secondary routes
 * (Notebook, Customers, Board, Calendar, Settings).
 *
 * The merchant complaint that motivated this: on mobile, the bottom nav
 * disappeared the moment they tapped into Settings or Notebook, leaving
 * them with no way to jump tabs without first popping back to the dashboard.
 * The dashboard root mounts <BottomNavigation> directly because it owns
 * `activeTab` state; Library routes don't, so they need a thin wrapper that
 * navigates instead of swapping local state.
 *
 * Behavior:
 *   - Renders <BottomNavigation> with `activeTab` set to a non-rendered
 *     TabId ("customers"). The bottom nav only paints icons for the five
 *     primary tabs (inbox/orders/inventory/insights/chidi), so passing
 *     "customers" leaves nothing highlighted — which is what the brief asks
 *     for: Library routes are off the primary-tab axis, no tab should look
 *     active.
 *   - Tapping a tab pushes /dashboard/[slug]?tab={id}. The dashboard root
 *     reads the `tab` query param on mount and lands on the right surface.
 *   - Wrapped in `lg:hidden` at the call site so the desktop NavRail keeps
 *     ownership above the lg breakpoint.
 */

import { useParams, useRouter } from "next/navigation"
import { BottomNavigation, type TabId } from "./bottom-navigation"

interface LibraryBottomNavProps {
  /** Per-tab badge counts. Optional — Library pages typically don't have
   *  these wired, so we fall back to empty counts and keep the bar quiet. */
  tabCounts?: Partial<Record<TabId, number>>
}

export function LibraryBottomNav({ tabCounts = {} }: LibraryBottomNavProps) {
  const router = useRouter()
  const params = useParams()
  const slug = params?.slug as string | undefined

  const handleTabChange = (tab: TabId) => {
    if (!slug) return
    router.push(`/dashboard/${slug}?tab=${tab}`)
  }

  return (
    <div className="lg:hidden">
      <BottomNavigation
        // "customers" exists in the TabId union for backward compatibility
        // but is no longer rendered as a pill. Passing it here means no
        // primary tab paints as active — exactly the affordance Library
        // routes need.
        activeTab="customers"
        onTabChange={handleTabChange}
        tabCounts={tabCounts}
      />
    </div>
  )
}
