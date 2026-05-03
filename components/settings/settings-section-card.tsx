"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SettingsSectionCardProps {
  eyebrow: string
  title: string
  description?: string
  children: ReactNode
  className?: string
}

/**
 * SettingsSectionCard — the unified visual treatment for every section in
 * the Settings two-pane layout. Mirrors the SetupStatus hero: rounded paper
 * card with a tight eyebrow + serif title + optional sub, then the section's
 * content rendered inside the same card.
 *
 * Use this as the wrapper for Channels, Payments, Notifications, Security,
 * Data, etc. so each one reads as one cohesive unit instead of a free-floating
 * heading + free-floating cards.
 */
export function SettingsSectionCard({
  eyebrow,
  title,
  description,
  children,
  className,
}: SettingsSectionCardProps) {
  return (
    <div
      className={cn(
        // Tighter mobile padding; desktop keeps room. The card is mb-3 on
        // mobile (was mb-4) so consecutive sections feel like one column,
        // not seven floating cards with daylight between them.
        "rounded-2xl chidi-paper bg-[var(--card)] border border-[var(--chidi-border-default)] p-4 lg:p-6 mb-3 lg:mb-4",
        className,
      )}
    >
      <div className="relative z-[2]">
        <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium">
          {eyebrow}
        </p>
        <h2 className="text-[15px] font-semibold text-[var(--chidi-text-primary)] mt-1">
          {title}
        </h2>
        {description && (
          <p className="text-[13px] text-[var(--chidi-text-secondary)] mt-1 mb-4 leading-snug">
            {description}
          </p>
        )}
        {!description && <div className="mt-4" />}
        {children}
      </div>
    </div>
  )
}
