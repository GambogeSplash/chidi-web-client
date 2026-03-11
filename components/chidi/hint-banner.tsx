"use client"

import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface HintBannerProps {
  children: React.ReactNode
  onDismiss: () => void
  className?: string
}

export function HintBanner({ 
  children, 
  onDismiss, 
  className 
}: HintBannerProps) {
  return (
    <div 
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--chidi-accent)]/5 text-xs text-[var(--chidi-text-secondary)]",
        className
      )}
    >
      <span className="flex-1">{children}</span>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 p-0.5 rounded hover:bg-[var(--chidi-accent)]/10 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5 text-[var(--chidi-text-muted)]" />
      </button>
    </div>
  )
}
