"use client"

import { useEffect, useState } from "react"
import { ArrowRight, MessageCircle, ShoppingBag, BarChart3, Sparkles, X } from "lucide-react"
import { ChidiAvatar } from "./chidi-mark"
import { cn } from "@/lib/utils"

const SEEN_KEY = "chidi_welcome_seen_v2" // v2: was multi-beat carousel, now single modal

interface ChidiWelcomeProps {
  ownerName?: string | null
  businessName?: string | null
  /** Only fires the welcome on the first ever dashboard load. After that, no-op. */
  enabled?: boolean
}

/**
 * Welcome modal — replaces the previous 3-beat full-screen carousel
 * (which auto-rotated and felt forced). New behaviour:
 *
 *   - Single compact modal anchored center, not a hijack overlay
 *   - Five capabilities at a glance, no slide-by-slide
 *   - One primary "Take me in" CTA + a secondary "Show me around" stub
 *   - Skippable; localStorage gates it forever after dismiss
 *   - Honors prefers-reduced-motion (no entrance animation)
 *
 * To replay during dev: localStorage.removeItem("chidi_welcome_seen_v2")
 */
export function ChidiWelcome({ ownerName, businessName, enabled = true }: ChidiWelcomeProps) {
  const firstName = ownerName?.split(" ")[0] || ""
  const biz = businessName || "your shop"

  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return
    const seen = localStorage.getItem(SEEN_KEY) === "true"
    if (!seen) {
      // Tiny delay so the dashboard mounts behind it before reveal
      const t = window.setTimeout(() => setOpen(true), 350)
      return () => window.clearTimeout(t)
    }
  }, [enabled])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") dismiss()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const dismiss = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(SEEN_KEY, "true")
    }
    setOpen(false)
  }

  if (!open) return null

  const capabilities = [
    { icon: MessageCircle, label: "I reply to your customers — instantly, even at 1am", tone: "#25D366" },
    { icon: ShoppingBag, label: "I capture every order and chase pending payments", tone: "var(--chidi-win)" },
    { icon: BarChart3, label: "I learn your business and tell you what changed today", tone: "#5B8A72" },
    { icon: Sparkles, label: "I run plays for you with your approval — no surprises", tone: "#9264FF" },
  ]

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4 animate-[chidiTabSwapIn_280ms_cubic-bezier(0.22,1,0.36,1)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      {/* Backdrop — soft + dismissible */}
      <button
        type="button"
        aria-label="Close"
        onClick={dismiss}
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
      />

      {/* Card */}
      <div className="relative w-full max-w-md rounded-2xl chidi-paper bg-[var(--card)] border border-[var(--chidi-border-default)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] overflow-hidden">
        {/* Close button — top right */}
        <button
          onClick={dismiss}
          aria-label="Close welcome"
          className="absolute top-3 right-3 z-10 p-1.5 rounded-md text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 lg:p-7">
          {/* Avatar + headline */}
          <div className="flex items-start gap-4 mb-5">
            <ChidiAvatar size="lg" tone="default" className="chidi-mascot-breathe flex-shrink-0" />
            <div className="flex-1 min-w-0 pt-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--chidi-text-muted)] mb-1">
                {firstName ? `For you, ${firstName}` : "Welcome"}
              </p>
              <h1
                id="welcome-modal-title"
                className="ty-page-title text-[var(--chidi-text-primary)] leading-tight"
              >
                Hi{firstName ? `, ${firstName}` : ""}. I&apos;m Chidi.
              </h1>
              <p className="text-[13px] text-[var(--chidi-text-secondary)] leading-snug mt-2">
                I&apos;ll be sitting beside you running {biz}. Here&apos;s what that means.
              </p>
            </div>
          </div>

          {/* Capabilities */}
          <ul className="space-y-2.5 mb-6">
            {capabilities.map((c, i) => (
              <li
                key={c.label}
                className="flex items-start gap-3 chidi-list-in"
                style={{ animationDelay: `${120 + i * 50}ms` }}
              >
                <span
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: `${c.tone}1a` }}
                >
                  <c.icon className="w-3.5 h-3.5" style={{ color: c.tone }} strokeWidth={2} />
                </span>
                <p className="text-[13px] text-[var(--chidi-text-primary)] leading-snug pt-1">
                  {c.label}
                </p>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <button
            onClick={dismiss}
            className={cn(
              "w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl btn-cta font-semibold text-sm",
              "transition-transform hover:scale-[1.01] active:scale-[0.99]",
            )}
          >
            Take me in
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-center text-[11px] text-[var(--chidi-text-muted)] mt-3">
            Press <kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-[var(--chidi-surface)] border border-[var(--chidi-border-default)]">?</kbd> any time to see keyboard shortcuts.
          </p>
        </div>
      </div>
    </div>
  )
}
