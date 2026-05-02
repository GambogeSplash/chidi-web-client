"use client"

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { EmptyArt } from "./empty-art"

interface EmptyStateProps {
  /** @deprecated — prefer `art` for surface-specific illustration */
  icon?: LucideIcon
  /** Surface variant for the inline SVG illustration */
  art?: "inbox" | "orders" | "inventory" | "insights" | "copilot" | "search"
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  art,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center px-6 py-16",
      className
    )}>
      {art ? (
        <EmptyArt variant={art} size={120} className="text-[var(--chidi-text-muted)] mb-5" />
      ) : Icon ? (
        <div className="w-16 h-16 rounded-full bg-[var(--chidi-win-soft)] flex items-center justify-center mb-6">
          <Icon className="w-8 h-8 text-[var(--chidi-win)]" strokeWidth={1.5} />
        </div>
      ) : null}
      <h3 className="ty-page-title text-[var(--chidi-text-primary)] mb-2">
        {title}
      </h3>
      <p className="ty-body-voice text-[var(--chidi-text-secondary)] max-w-sm mb-6">
        {description}
      </p>
      {action}
    </div>
  )
}

interface ComingSoonStateProps {
  icon: LucideIcon
  title: string
  description: string
  className?: string
}

export function ComingSoonState({ 
  icon: Icon, 
  title, 
  description,
  className 
}: ComingSoonStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center px-6 py-16 h-full",
      className
    )}>
      <div className="w-20 h-20 rounded-2xl bg-[var(--chidi-surface)] flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-[var(--chidi-text-muted)]" strokeWidth={1.5} />
      </div>
      <h2 className="text-2xl font-semibold text-[var(--chidi-text-primary)] mb-2">
        {title}
      </h2>
      <p className="text-sm text-[var(--chidi-text-secondary)] max-w-xs mb-4">
        {description}
      </p>
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[var(--chidi-surface)] text-[var(--chidi-text-muted)]">
        Coming soon
      </span>
    </div>
  )
}
