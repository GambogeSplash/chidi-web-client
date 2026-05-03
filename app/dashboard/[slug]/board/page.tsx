"use client"

/**
 * /dashboard/[slug]/board — Easels.
 *
 * The kanban surface. Mirrors the chrome of /notebook (NavRail + AppHeader on
 * mobile + ChidiPage shell at width="default") so navigating between Library
 * routes feels like one product.
 *
 * The actual board lives in <OrdersBoard>. This page is just chrome + intent.
 */

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AppHeader } from "@/components/chidi/app-header"
import { NavRail } from "@/components/chidi/nav-rail"
import { ChidiPage } from "@/components/chidi/page-shell"
import { OrdersBoard } from "@/components/chidi/orders-board"
import { useRailCollapsed } from "@/lib/chidi/use-rail-collapsed"
import { cn } from "@/lib/utils"

export default function BoardPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const railCollapsed = useRailCollapsed()

  const [mounted, setMounted] = useState(false)
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
        activeTab="orders"
        onTabChange={(tab) => router.push(`/dashboard/${slug}?tab=${tab}`)}
      />
      <div className="lg:hidden">
        <AppHeader showSettings={false} />
      </div>

      <ChidiPage
        eyebrow="Board"
        title="Your orders, on one page."
        subtitle={
          mounted
            ? "Drag a card to push it forward. Tap one to open the full order."
            : undefined
        }
        voice
        width="full"
      >
        <OrdersBoard slug={slug} />
      </ChidiPage>
    </div>
  )
}
