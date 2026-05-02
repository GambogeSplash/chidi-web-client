"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface EmptyWithPreviewProps {
  /** The hero illustration / title / subtitle / CTA — what the user sees first */
  hero: ReactNode
  /** Ghosted preview rendered behind a fade — shows the shape of the future */
  preview: ReactNode
  className?: string
}

/**
 * Empty state with a mock-rendered preview behind it. The hero floats above;
 * below it, sample rows fade out so the merchant can SEE what the surface
 * will look like once it has data.
 *
 * Pattern borrowed from Linear / Cron / Notion onboarding empty states.
 */
export function EmptyWithPreview({ hero, preview, className }: EmptyWithPreviewProps) {
  return (
    <div className={cn("relative flex-1 overflow-hidden", className)}>
      {/* Ghost preview underneath */}
      <div
        className="absolute inset-0 pointer-events-none select-none opacity-[0.35]"
        aria-hidden
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 0%, transparent 28%, rgba(0,0,0,0.55) 55%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, transparent 28%, rgba(0,0,0,0.55) 55%, transparent 100%)",
        }}
      >
        {preview}
      </div>

      {/* Hero in the middle, sitting above the ghost */}
      <div className="relative z-[2] flex flex-col items-center justify-center py-16 px-6 text-center">
        {hero}
      </div>
    </div>
  )
}
