"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { InsightsOverview } from "./insights/overview"
import { CustomersView } from "./insights/customers-view"

type SubTab = "overview" | "customers"

export function InsightsView() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("overview")

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] h-full">
      {/* Sub-tab navigation */}
      <div className="flex-shrink-0 border-b border-gray-100 bg-[var(--background)] px-4">
        <div className="flex gap-1">
          <SubTabButton
            active={activeSubTab === "overview"}
            onClick={() => setActiveSubTab("overview")}
          >
            Overview
          </SubTabButton>
          <SubTabButton
            active={activeSubTab === "customers"}
            onClick={() => setActiveSubTab("customers")}
          >
            Customers
          </SubTabButton>
        </div>
      </div>

      {/* Sub-tab content */}
      <div className="flex-1 overflow-hidden">
        {activeSubTab === "overview" && <InsightsOverview />}
        {activeSubTab === "customers" && <CustomersView />}
      </div>
    </div>
  )
}

interface SubTabButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function SubTabButton({ active, onClick, children }: SubTabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-3 text-sm font-medium transition-colors relative",
        active
          ? "text-[var(--chidi-text-primary)]"
          : "text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-secondary)]"
      )}
    >
      {children}
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--chidi-accent)]" />
      )}
    </button>
  )
}
