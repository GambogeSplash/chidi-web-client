"use client"

import { BarChart3 } from "lucide-react"
import { ComingSoonState } from "./empty-state"

export function InsightsView() {
  return (
    <div className="flex-1 bg-white">
      <ComingSoonState
        icon={BarChart3}
        title="Insights"
        description="Understand your sales, customers, and trends. Get actionable analytics to grow your business."
      />
    </div>
  )
}
