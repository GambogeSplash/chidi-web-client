"use client"

/**
 * Customers route — `/dashboard/[slug]/customers`.
 *
 * Mirrors the Playbook route's chrome (NavRail + AppHeader + ChidiPage shell)
 * so navigation between sibling library/people surfaces feels uniform. The
 * heavy lifting lives in CustomersView.
 */

import { useRouter, useParams } from "next/navigation"
import { AppHeader } from "@/components/chidi/app-header"
import { NavRail } from "@/components/chidi/nav-rail"
import { CustomersView } from "@/components/chidi/customers-view"
import { useRailCollapsed } from "@/lib/chidi/use-rail-collapsed"
import { BottomNavigation } from "@/components/chidi/bottom-navigation"
import { cn } from "@/lib/utils"

export default function CustomersPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const railCollapsed = useRailCollapsed()

  return (
    <div
      className={cn(
        "flex flex-col min-h-screen bg-[var(--background)] transition-[padding] duration-200",
        railCollapsed ? "lg:pl-[64px]" : "lg:pl-[224px]",
      )}
    >
      {/* Desktop rail — onTabChange routes back to the dashboard with the
          chosen tab so jumping out of Customers is one click. */}
      <NavRail
        activeTab="customers"
        onTabChange={(tab) =>
          tab === "customers"
            ? router.push(`/dashboard/${slug}/customers`)
            : router.push(`/dashboard/${slug}?tab=${tab}`)
        }
      />

      {/* Mobile header */}
      <div className="lg:hidden">
        <AppHeader showSettings={false} />
      </div>

      <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden pb-16 lg:pb-0">
        <CustomersView />
      </main>

      {/* Bottom Navigation — mobile only */}
      <div className="lg:hidden">
        <BottomNavigation
          activeTab="customers"
          onTabChange={(tab) =>
            tab === "customers"
              ? router.push(`/dashboard/${slug}/customers`)
              : router.push(`/dashboard/${slug}?tab=${tab}`)
          }
        />
      </div>
    </div>
  )
}
