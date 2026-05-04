"use client"

/**
 * /dashboard/[slug]/calendar — Calendar, standalone Library route.
 *
 * History: the full month view used to live behind a slide-in Sheet, opened
 * from the Calendar Peek footer ("View full calendar"). The user flagged this
 * pattern: when a surface has substantial content of its own, it earns a
 * route — overlays are for ephemera. The Peek popover stays (it's a true
 * "today" widget); the FULL view becomes a route.
 *
 * Chrome mirrors /notebook + /board + /customers: NavRail + (mobile) AppHeader
 * + ChidiPage shell. Body is the existing <CalendarMonthView> component,
 * lifted out of the Sheet — same data, no Sheet chrome.
 *
 * Mobile: a back button sits in the ChidiPage `actions` slot. Desktop hides
 * it (NavRail is the back path).
 */

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AppHeader } from "@/components/chidi/app-header"
import { NavRail } from "@/components/chidi/nav-rail"
import { ChidiPage } from "@/components/chidi/page-shell"
import { CalendarMonthView } from "@/components/chidi/calendar-month-view"
import { PageBackButton } from "@/components/chidi/page-back-button"
import { useRailCollapsed } from "@/lib/chidi/use-rail-collapsed"
import { cn } from "@/lib/utils"

export default function CalendarPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const railCollapsed = useRailCollapsed()

  // Mounted flag mirrors notebook/board/customers — gives the rail's
  // collapsed-state hook one tick to read localStorage before painting.
  const [, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div
      className={cn(
        "flex flex-col min-h-screen bg-[var(--background)] transition-[padding] duration-200",
        railCollapsed ? "lg:pl-[64px]" : "lg:pl-[224px]",
      )}
    >
      <NavRail
        activeTab="inbox"
        onTabChange={(tab) => router.push(`/dashboard/${slug}?tab=${tab}`)}
      />
      <div className="lg:hidden">
        <AppHeader showSettings={false} />
      </div>

      <ChidiPage
        eyebrow="Calendar"
        title="Calendar"
        subtitle="Your week at a glance."
        voice
        width="default"
        actions={<PageBackButton fallback={`/dashboard/${slug}`} />}
      >
        {/* Lifted from the Calendar Peek Sheet — same component, no sheet
            chrome. CalendarMonthView's internal router.push() is the right
            default behavior on a real route (no parent sheet to close). */}
        <div className="rounded-xl border border-[var(--chidi-border-subtle)] bg-[var(--card)] overflow-hidden">
          <CalendarMonthView />
        </div>
      </ChidiPage>
    </div>
  )
}
