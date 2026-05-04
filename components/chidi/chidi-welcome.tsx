"use client"

import { useEffect, useState } from "react"
import { ArrowRight, ArrowLeft, X, Sparkles } from "lucide-react"
import { ChidiMark } from "./chidi-mark"
import { ArcFace } from "./arc-face"
import { CustomerCharacter } from "./customer-character"
import { cn } from "@/lib/utils"

const SEEN_KEY = "chidi_welcome_seen_v3" // v3: interactive coachmark walkthrough

interface ChidiWelcomeProps {
  ownerName?: string | null
  businessName?: string | null
  enabled?: boolean
}

interface CoachmarkBeat {
  /** Anchor element selector (data-coachmark="...") that the bubble points at.
      If null, render centered with no pointer (intro/outro beats). */
  anchor: string | null
  /** Bubble position relative to anchor: bottom (default), top, left, right */
  position?: "top" | "bottom" | "left" | "right"
  eyebrow: string
  title: string
  body: string
  /** Visual rendered above the body — mini illustration / preview */
  visual?: React.ReactNode
}

/**
 * Welcome v3 — interactive coachmark walkthrough.
 *
 * Replaces the static welcome modal with a tour that physically points at
 * real UI elements. Each beat:
 *   - Renders a floating bubble next to a [data-coachmark="..."] element
 *   - Includes a small visual (avatar / mock UI / mascot) so the beat
 *     feels like a real product moment, not a slab of text
 *   - Spotlight cutout in the backdrop frames the highlighted element
 *   - Next / Back / Skip controls in the bubble
 *
 * Beats:
 *   1. Intro — centered, ArcFace + greeting
 *   2. Inbox — points at the inbox tab in the nav rail
 *   3. Insights — points at insights tab
 *   4. Playbook — points at playbook in library
 *   5. Cmd+K — points at the keyboard hint or just centers
 *   6. Done — centered, "you can press ? any time"
 *
 * Persists with localStorage v3 so existing users see this once.
 */
export function ChidiWelcome({ ownerName, businessName, enabled = true }: ChidiWelcomeProps) {
  const firstName = ownerName?.split(" ")[0] || ""
  const biz = businessName || "your shop"

  const [open, setOpen] = useState(false)
  const [beat, setBeat] = useState(0)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return
    const seen = localStorage.getItem(SEEN_KEY) === "true"
    if (!seen) {
      const t = window.setTimeout(() => setOpen(true), 400)
      return () => window.clearTimeout(t)
    }
  }, [enabled])

  const beats: CoachmarkBeat[] = [
    {
      anchor: null,
      eyebrow: firstName ? `For you, ${firstName}` : "Welcome",
      title: `Hi${firstName ? `, ${firstName}` : ""}. I'm Chidi.`,
      body: `I'll be sitting beside you running ${biz}. A short tour, then we get to work.`,
      visual: (
        <div className="flex items-center justify-center mb-1">
          <ArcFace size={40} className="chidi-mascot-breathe text-[var(--chidi-text-primary)]" />
        </div>
      ),
    },
    {
      anchor: '[data-coachmark="tab-inbox"]',
      position: "right",
      eyebrow: "Step 1 of 5",
      title: "Your inbox",
      body: "Customer chats land here. I reply most of them. The orange dot means a thread needs you.",
      visual: <InboxPreviewVisual />,
    },
    {
      anchor: '[data-coachmark="tab-insights"]',
      position: "right",
      eyebrow: "Step 2 of 5",
      title: "Decisions, not dashboards",
      body: "I turn the noise into one move you should make today. Restock, raise prices, chase a customer — I tell you why.",
      visual: <InsightsPreviewVisual />,
    },
    {
      anchor: '[data-coachmark="library-playbook"]',
      position: "right",
      eyebrow: "Step 3 of 5",
      title: "Plays I run for you",
      body: "Repeatable tactics with track records. Open one in the sandbox to rehearse before committing.",
      visual: <PlaysPreviewVisual />,
    },
    {
      anchor: '[data-coachmark="tab-chidi"]',
      position: "right",
      eyebrow: "Step 4 of 5",
      title: "Talk to me anytime",
      body: "Ask Chidi anything about your business. Try \"how was Saturday?\" or \"who hasn't paid?\".",
      visual: <AskChidiPreviewVisual />,
    },
    {
      anchor: null,
      eyebrow: "You're set",
      title: "I'm in the corner if you call.",
      body: "Press ? for keyboard shortcuts. Cmd+K for the command palette. Otherwise, the dashboard's yours.",
      visual: (
        <div className="flex items-center justify-center gap-2 mb-1">
          <ArcFace size={28} className="text-[var(--chidi-text-primary)]" />
          <Sparkles className="w-4 h-4 text-[var(--chidi-win)]" />
        </div>
      ),
    },
  ]

  const currentBeat = beats[beat]
  const total = beats.length

  // Resolve the anchor rect each beat
  useEffect(() => {
    if (!open || !currentBeat?.anchor) {
      setAnchorRect(null)
      return
    }
    const anchor = document.querySelector(currentBeat.anchor) as HTMLElement | null
    if (anchor) {
      setAnchorRect(anchor.getBoundingClientRect())
      // Scroll the element into view if needed
      anchor.scrollIntoView({ block: "nearest", behavior: "smooth" })
    } else {
      setAnchorRect(null)
    }
    // Re-measure on resize
    const onResize = () => {
      const a = document.querySelector(currentBeat.anchor!) as HTMLElement | null
      if (a) setAnchorRect(a.getBoundingClientRect())
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [open, beat, currentBeat])

  // Esc / arrow keys
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss()
      if (e.key === "ArrowRight" || e.key === "Enter") next()
      if (e.key === "ArrowLeft") prev()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, beat])

  const next = () => {
    if (beat >= total - 1) return dismiss()
    setBeat((b) => Math.min(total - 1, b + 1))
  }
  const prev = () => setBeat((b) => Math.max(0, b - 1))
  const dismiss = () => {
    if (typeof window !== "undefined") localStorage.setItem(SEEN_KEY, "true")
    setOpen(false)
  }

  if (!open) return null

  // Compute bubble position relative to anchor
  const bubblePosition = computeBubblePosition(anchorRect, currentBeat?.position ?? "bottom")

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[200]">
      {/* Backdrop with spotlight cutout — uses an SVG mask to dim everything
          except a soft-edged hole over the anchored element. When centered
          (no anchor), it's a uniform darken. */}
      <SpotlightBackdrop rect={anchorRect} onClick={dismiss} />

      {/* Skip — top right */}
      <button
        onClick={dismiss}
        className="fixed top-4 right-4 z-[210] flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--card)]/95 backdrop-blur-sm border border-[var(--chidi-border-default)] text-[12px] text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--card)] transition-colors shadow-md"
      >
        <X className="w-3.5 h-3.5" />
        Skip tour
      </button>

      {/* The coachmark bubble — anchored or centered */}
      <div
        className={cn(
          "fixed z-[210] w-[340px] max-w-[calc(100vw-32px)] chidi-paper bg-[var(--card)] border border-[var(--chidi-border-default)] rounded-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] overflow-hidden",
          "animate-[chidiTabSwapIn_320ms_cubic-bezier(0.22,1,0.36,1)]",
        )}
        style={bubblePosition}
        // Re-key so the entrance animation fires on each beat advance
        key={beat}
      >
        {/* Pointer arrow — only when anchored */}
        {anchorRect && currentBeat?.position && (
          <PointerArrow position={currentBeat.position} />
        )}

        <div className="p-5">
          {currentBeat?.visual && <div>{currentBeat.visual}</div>}
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] mb-1.5">
            {currentBeat?.eyebrow}
          </p>
          <h3 className="ty-page-title text-[var(--chidi-text-primary)] mb-2 leading-tight">
            {currentBeat?.title}
          </h3>
          <p className="text-[13px] text-[var(--chidi-text-secondary)] leading-snug mb-4">
            {currentBeat?.body}
          </p>

          {/* Progress dots + nav */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {beats.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === beat
                      ? "w-6 bg-[var(--chidi-win)]"
                      : i < beat
                        ? "w-1.5 bg-[var(--chidi-text-muted)]"
                        : "w-1.5 bg-[var(--chidi-border-default)]",
                  )}
                />
              ))}
            </div>
            <div className="flex items-center gap-1">
              {beat > 0 && (
                <button
                  onClick={prev}
                  aria-label="Previous"
                  className="p-1.5 rounded-md text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={next}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--chidi-text-primary)] text-[var(--background)] text-[12px] font-semibold hover:bg-[var(--chidi-text-primary)]/90 transition-colors"
              >
                {beat >= total - 1 ? "Take me in" : "Next"}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// SpotlightBackdrop — dims the page, cuts a soft hole over the anchor rect
// ============================================================================

function SpotlightBackdrop({ rect, onClick }: { rect: DOMRect | null; onClick: () => void }) {
  if (!rect) {
    return (
      <button
        type="button"
        aria-label="Close"
        onClick={onClick}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />
    )
  }

  const padding = 8
  const x = rect.left - padding
  const y = rect.top - padding
  const w = rect.width + padding * 2
  const h = rect.height + padding * 2
  const r = 12

  return (
    <button
      type="button"
      aria-label="Close"
      onClick={onClick}
      className="absolute inset-0 cursor-default"
    >
      <svg width="100%" height="100%" className="absolute inset-0">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect x={x} y={y} width={w} height={h} rx={r} fill="black" />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.55)"
          mask="url(#spotlight-mask)"
        />
        {/* Glow ring around the spotlight */}
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={r}
          fill="none"
          stroke="rgba(245, 184, 86, 0.55)"
          strokeWidth="2"
          className="animate-pulse"
        />
      </svg>
    </button>
  )
}

// ============================================================================
// PointerArrow — small triangle pointing from the bubble to the anchor
// ============================================================================

function PointerArrow({ position }: { position: "top" | "bottom" | "left" | "right" }) {
  const base =
    "absolute w-3 h-3 bg-[var(--card)] border-[var(--chidi-border-default)] rotate-45"
  if (position === "right") {
    return (
      <span
        aria-hidden
        className={cn(base, "left-[-7px] top-8 border-l border-b")}
      />
    )
  }
  if (position === "left") {
    return (
      <span
        aria-hidden
        className={cn(base, "right-[-7px] top-8 border-r border-t")}
      />
    )
  }
  if (position === "top") {
    return (
      <span
        aria-hidden
        className={cn(base, "left-1/2 -translate-x-1/2 bottom-[-7px] border-r border-b")}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(base, "left-1/2 -translate-x-1/2 top-[-7px] border-l border-t")}
    />
  )
}

// ============================================================================
// Position math — places the bubble next to the anchor without spilling offscreen
// ============================================================================

function computeBubblePosition(
  rect: DOMRect | null,
  position: "top" | "bottom" | "left" | "right",
): React.CSSProperties {
  if (!rect) {
    return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" }
  }
  const gap = 16
  const bubbleW = 340
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280
  const vh = typeof window !== "undefined" ? window.innerHeight : 720

  let left = rect.right + gap
  let top = rect.top - 8
  if (position === "left") left = rect.left - bubbleW - gap
  if (position === "top") {
    left = rect.left + rect.width / 2 - bubbleW / 2
    top = rect.top - 200
  }
  if (position === "bottom") {
    left = rect.left + rect.width / 2 - bubbleW / 2
    top = rect.bottom + gap
  }

  // Clamp inside viewport with margin
  const margin = 16
  left = Math.max(margin, Math.min(vw - bubbleW - margin, left))
  top = Math.max(margin, Math.min(vh - 320, top))

  return { left, top }
}

// ============================================================================
// Per-beat mini visuals — small previews so each beat has imagery, not text
// ============================================================================

function InboxPreviewVisual() {
  const customers = ["Adaeze Okafor", "Tunde Bakare", "Folake Olamide"]
  return (
    <div className="rounded-lg border border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface)]/50 p-3 mb-3 space-y-2">
      {customers.map((c, i) => (
        <div key={c} className="flex items-center gap-2">
          <CustomerCharacter name={c} size="xs" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-[var(--chidi-text-primary)] truncate">
              {c}
            </p>
            <p className="text-[10px] text-[var(--chidi-text-muted)] truncate">
              {i === 0 ? "Yes, I'll send transfer..." : i === 1 ? "Do you still have..." : "Wholesale prices?"}
            </p>
          </div>
          {i === 1 && <span className="w-1.5 h-1.5 rounded-full bg-[var(--chidi-warning)]" />}
        </div>
      ))}
    </div>
  )
}

function InsightsPreviewVisual() {
  return (
    <div className="rounded-lg border border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface)]/50 p-3 mb-3">
      <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] mb-1.5">
        Decide today
      </p>
      <p className="text-[12px] font-semibold text-[var(--chidi-text-primary)] leading-snug">
        Reorder wax print this week?
      </p>
      <div className="flex items-end gap-1 mt-2 h-8">
        {[2, 3, 4, 3, 6, 8, 12].map((h, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-t-sm",
              i === 6 ? "bg-[var(--chidi-win)]" : "bg-[var(--chidi-text-muted)]/30",
            )}
            style={{ height: `${(h / 12) * 100}%` }}
          />
        ))}
      </div>
    </div>
  )
}

function PlaysPreviewVisual() {
  return (
    <div className="rounded-lg border border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface)]/50 p-3 mb-3 space-y-2">
      {["Chase cold pending payment", "Bring back VIP at week 6", "Saturday-prep on Friday"].map((p, i) => (
        <div key={p} className="flex items-center gap-2">
          <span className={cn(
            "w-1.5 h-1.5 rounded-full flex-shrink-0",
            i === 0 ? "bg-[var(--chidi-win)] animate-pulse" : "bg-[var(--chidi-text-muted)]/40",
          )} />
          <p className="text-[11px] text-[var(--chidi-text-primary)] truncate flex-1">
            {p}
          </p>
          <span className="text-[10px] tabular-nums text-[var(--chidi-text-muted)]">
            {[47, 19, 100][i]}%
          </span>
        </div>
      ))}
    </div>
  )
}

function AskChidiPreviewVisual() {
  return (
    <div className="rounded-lg border border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface)]/50 p-3 mb-3">
      <div className="flex items-start gap-2 mb-2">
        <ChidiMark size={12} variant="default" />
        <p className="text-[11px] text-[var(--chidi-text-primary)] leading-snug">
          You sold ₦47k yesterday — your best Saturday in 6 weeks.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {["What drove it?", "Restock now?"].map((q) => (
          <span
            key={q}
            className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--card)] border border-[var(--chidi-border-default)] text-[var(--chidi-text-secondary)]"
          >
            {q}
          </span>
        ))}
      </div>
    </div>
  )
}
