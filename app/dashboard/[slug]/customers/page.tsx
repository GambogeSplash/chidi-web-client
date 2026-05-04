"use client"

/**
 * /dashboard/[slug]/customers — Customers, standalone Library route.
 *
 * History: this surface was tried as a tab on Orders ("Orders | Customers" page
 * tab strip) and as a drill-in lens inside Insights. Both felt forced — the
 * Orders tab split one mental model in half, and the Insights lens buried
 * "people I've sold to" behind an analytics frame. The right home is its own
 * route under Library, next to Playbook + Board, where it can stand on its own.
 *
 * Chrome mirrors /notebook + /board: NavRail + (mobile) AppHeader + ChidiPage
 * shell. The body is rendered via <CustomersView />, the wrapper export that
 * already owns its own ChidiPage title + subtitle ("Customers" /
 * "Everyone you've sold to.") — we don't double-wrap.
 */

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AppHeader } from "@/components/chidi/app-header"
import { NavRail } from "@/components/chidi/nav-rail"
import { CustomersView } from "@/components/chidi/customers-view"
import { useRailCollapsed } from "@/lib/chidi/use-rail-collapsed"
import { cn } from "@/lib/utils"

export default function CustomersPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const railCollapsed = useRailCollapsed()

  // Mounted flag mirrors the notebook + board pattern; gives the rail's
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

      {/* CustomersView already wraps its body in <ChidiPage> with the canonical
          title/subtitle, so no second shell here. */}
      <CustomersView />
    </div>
  )
}
