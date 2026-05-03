"use client"

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

export type CallBubbleVariant =
  | "user-pill"      // small white pill, lower-left, short user message
  | "ai-plain"       // medium AI response, plain white text on the gradient (no card)
  | "ai-card"        // long AI response, white rounded card with tail
  | "ai-pill"        // closing AI message, small white pill, lower-right

interface CallChidiBubbleProps {
  variant: CallBubbleVariant
  children: ReactNode
  className?: string
  /** Optional inline action(s) for ai-card (e.g., "View orders" link) */
  action?: ReactNode
}

/**
 * Speech bubbles for Call Chidi. Four variants modeled on Arc's call surface.
 * White-on-gradient. The ai-card variant has a small upward tail pointing at
 * the mascot. All variants animate in via .chidi-call-bubble-in.
 */
export function CallChidiBubble({
  variant,
  children,
  className,
  action,
}: CallChidiBubbleProps) {
  if (variant === "user-pill") {
    return (
      <div
        className={cn(
          "chidi-call-bubble-in self-start max-w-[80%]",
          "rounded-full bg-white/95 backdrop-blur-sm",
          "px-4 py-2 text-[15px] text-[var(--chidi-text-primary)] font-chidi-voice",
          "shadow-[0_6px_18px_-8px_rgba(0,0,0,0.45)]",
          className,
        )}
      >
        {children}
      </div>
    )
  }

  if (variant === "ai-pill") {
    return (
      <div
        className={cn(
          "chidi-call-bubble-in self-end max-w-[80%]",
          "rounded-full bg-white/95 backdrop-blur-sm",
          "px-4 py-2 text-[15px] text-[var(--chidi-text-primary)] font-chidi-voice",
          "shadow-[0_6px_18px_-8px_rgba(0,0,0,0.45)]",
          className,
        )}
      >
        {children}
      </div>
    )
  }

  if (variant === "ai-plain") {
    return (
      <div
        className={cn(
          "chidi-call-bubble-in mx-auto max-w-[26ch] text-center",
          "text-white/95 text-[19px] sm:text-[22px] leading-snug font-chidi-voice",
          "drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]",
          className,
        )}
      >
        {children}
      </div>
    )
  }

  // ai-card — long response in a white card with a small upward tail.
  return (
    <div
      className={cn(
        "chidi-call-bubble-in relative mx-auto max-w-[420px] w-full",
        className,
      )}
    >
      {/* Tail — small triangle pointing up toward the mascot */}
      <span
        aria-hidden="true"
        className="absolute -top-2 left-1/2 -translate-x-1/2 block w-4 h-4 rotate-45 bg-white/95 rounded-[3px] shadow-[0_-1px_4px_rgba(0,0,0,0.05)]"
      />
      <div
        className={cn(
          "relative rounded-2xl bg-white/95 backdrop-blur-sm",
          "px-5 py-4 text-[15px] text-[var(--chidi-text-primary)] font-chidi-voice",
          "leading-relaxed",
          "shadow-[0_18px_48px_-16px_rgba(0,0,0,0.4)]",
        )}
      >
        {children}
        {action && (
          <div className="mt-3 pt-3 border-t border-[var(--chidi-border-subtle)]">
            {action}
          </div>
        )}
      </div>
    </div>
  )
}
