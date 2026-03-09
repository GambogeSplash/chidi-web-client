"use client"

import { cn } from "@/lib/utils"
import type { Period } from "@/lib/types/analytics"

interface PeriodSelectorProps {
  value: Period
  onChange: (period: Period) => void
}

const periods: { value: Period; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
]

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
            value === period.value
              ? "bg-white text-[var(--chidi-text-primary)] shadow-sm"
              : "text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-secondary)]"
          )}
        >
          {period.label}
        </button>
      ))}
    </div>
  )
}
