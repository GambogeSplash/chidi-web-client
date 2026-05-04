"use client"

/**
 * PageBackButton — mobile-first back affordance for routes that converted from
 * slide-in Sheets to real pages. The desktop has the NavRail as the back path,
 * so this hides on `md+`. On mobile, it's a 44px tap target (Apple HIG min).
 *
 * Behavior:
 *   - Tap → router.back() if there's history we can return to.
 *   - Else → router.push(fallback).
 *
 * Usage (typically in ChidiPage's `actions` slot):
 *
 *   <PageBackButton fallback={`/dashboard/${slug}`} />
 *
 * We keep the surface deliberately small — just an arrow + "Back" — so it
 * doesn't compete with the page title for visual weight.
 */

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface PageBackButtonProps {
  /** Where to send the user when there's no browser history to pop. */
  fallback: string
  className?: string
  /** Override the default "Back" label. */
  label?: string
}

export function PageBackButton({ fallback, className, label = "Back" }: PageBackButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallback)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className={cn(
        // Mobile-only — desktop has the NavRail.
        "md:hidden inline-flex items-center gap-1.5",
        // 44px tap target.
        "min-h-[44px] min-w-[44px] px-3 -ml-3",
        "rounded-md text-[13px] font-medium font-chidi-voice",
        "text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)]",
        "hover:bg-[var(--chidi-surface)] transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-text-primary)]/30",
        className,
      )}
    >
      <ArrowLeft className="w-4 h-4" strokeWidth={2.2} />
      <span>{label}</span>
    </button>
  )
}
