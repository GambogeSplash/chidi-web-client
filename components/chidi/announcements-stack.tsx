"use client"

import { useEffect, useRef, useState } from "react"
import { Lightbulb, Megaphone, Gift, Newspaper, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Announcement {
  id: string
  eyebrow: string
  title: string
  body: string
  /** Visual key for the icon + accent color */
  kind: "feature" | "tip" | "perk" | "news"
  ctaLabel?: string
  ctaHref?: string
  /** Hero image url (Pexels free CDN). Renders behind the text overlay. */
  image: string
}

// Hand-curated cards with real merchant imagery (Pexels CDN, free for use).
// Image-first, text overlay on a darkened scrim.
const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "telegram-live",
    eyebrow: "New",
    title: "Telegram is live.",
    body: "Connect your bot to reach customers there too.",
    kind: "feature",
    ctaLabel: "Connect",
    ctaHref: "/settings?section=integrations",
    image: "https://images.pexels.com/photos/4549413/pexels-photo-4549413.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
  },
  {
    id: "tip-stockouts",
    eyebrow: "Tip",
    title: "Set reorder levels.",
    body: "I'll flag low stock before you run out.",
    kind: "tip",
    image: "https://images.pexels.com/photos/4350101/pexels-photo-4350101.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
  },
  {
    id: "drafts-by-chidi",
    eyebrow: "Did you know",
    title: "I draft your replies.",
    body: "Look for the draft above your input when a customer messages.",
    kind: "tip",
    image: "https://images.pexels.com/photos/5650025/pexels-photo-5650025.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
  },
  {
    id: "weekend-rush",
    eyebrow: "Pattern",
    title: "Saturdays carry your week.",
    body: "Stock up Friday night, staff up Saturday morning.",
    kind: "news",
    image: "https://images.pexels.com/photos/4452524/pexels-photo-4452524.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
  },
]

const KIND_ACCENT: Record<Announcement["kind"], { color: string; icon: React.ElementType }> = {
  feature: { color: "#FFB347", icon: Lightbulb },
  tip:     { color: "#A4B58E", icon: Megaphone },
  perk:    { color: "#E89B8A", icon: Gift },
  news:    { color: "#C5B0E0", icon: Newspaper },
}

const AUTO_SHUFFLE_MS = 90_000 // every 90 seconds

interface AnnouncementsStackProps {
  collapsed: boolean
}

/**
 * Card stack of merchant-facing announcements. Lives at the bottom of the
 * nav rail.
 *
 * Composition: only ONE card visible at a time (no deck peek). Real imagery
 * fills the card; a darkened scrim carries the text. Pagination dots show
 * stack position; drag to advance.
 *
 * Interaction:
 *   - Drag the top card horizontally → next/previous (60px threshold).
 *   - Auto-shuffles every 90s if user hasn't interacted in 30s.
 *   - Each card can be dismissed (×) → moves to back of deck.
 *
 * Hidden when the rail is collapsed (no room).
 */
export function AnnouncementsStack({ collapsed }: AnnouncementsStackProps) {
  // ALL hooks declared up front — must run in same order every render
  const [order, setOrder] = useState<string[]>(() => ANNOUNCEMENTS.map((a) => a.id))
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [paused, setPaused] = useState(false)
  const dragStartX = useRef<number | null>(null)
  const lastShuffleAt = useRef(Date.now())

  // Auto-shuffle every AUTO_SHUFFLE_MS unless user is dragging or recently
  // interacted. Hook MUST run before any early returns.
  useEffect(() => {
    if (collapsed || order.length <= 1) return
    if (paused || isDragging) return
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (reduced) return

    const interval = setInterval(() => {
      const idle = Date.now() - lastShuffleAt.current
      if (idle >= 30_000) {
        setOrder((curr) => (curr.length <= 1 ? curr : [...curr.slice(1), curr[0]]))
        lastShuffleAt.current = Date.now()
      }
    }, AUTO_SHUFFLE_MS)
    return () => clearInterval(interval)
  }, [paused, isDragging, collapsed, order.length])

  // Now safe to early-return
  if (collapsed) return null
  if (order.length === 0) return null

  const top = ANNOUNCEMENTS.find((a) => a.id === order[0])!

  const advance = (direction: 1 | -1 = 1) => {
    setOrder((curr) => {
      if (curr.length <= 1) return curr
      if (direction === 1) return [...curr.slice(1), curr[0]]
      return [curr[curr.length - 1], ...curr.slice(0, -1)]
    })
    lastShuffleAt.current = Date.now()
  }

  const dismissTop = () => {
    setOrder((curr) => (curr.length <= 1 ? curr : [...curr.slice(1), curr[0]]))
    lastShuffleAt.current = Date.now()
  }

  // Pointer drag handlers — shuffle on threshold release
  const onPointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX
    setIsDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStartX.current == null) return
    setDragX(e.clientX - dragStartX.current)
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragStartX.current == null) return
    const delta = e.clientX - dragStartX.current
    dragStartX.current = null
    setIsDragging(false)
    if (Math.abs(delta) > 60) {
      advance(delta < 0 ? 1 : -1)
    }
    setDragX(0)
  }

  const accent = KIND_ACCENT[top.kind]
  const KindIcon = accent.icon
  const xRotate = Math.max(-10, Math.min(10, dragX / 10))
  const isFalling = Math.abs(dragX) > 60

  return (
    <div
      className="px-2 pb-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-[160px] select-none">
        <article
          key={top.id}
          className={cn(
            "absolute inset-0 rounded-xl overflow-hidden",
            !isDragging && "transition-all duration-300 ease-out",
          )}
          style={{
            transform: `translate(${dragX}px, 0) rotate(${xRotate}deg)${isFalling ? " scale(0.94)" : ""}`,
            opacity: isFalling ? 0.5 : 1,
            boxShadow: "0 8px 20px -8px rgba(0,0,0,0.22), 0 1px 3px rgba(0,0,0,0.08)",
            touchAction: "pan-y",
            cursor: "grab",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Hero image fills the card */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={top.image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            draggable={false}
          />

          {/* Bottom-up dark scrim for text legibility */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.78) 100%)",
            }}
          />

          {order.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                dismissTop()
              }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors z-10 text-white"
              aria-label="Skip this card"
            >
              <X className="w-3 h-3" strokeWidth={2.2} />
            </button>
          )}

          <div className="relative z-[2] h-full p-3.5 flex flex-col justify-end text-white">
            <div className="flex items-center gap-1.5 mb-1.5">
              <KindIcon className="w-3 h-3" style={{ color: accent.color }} strokeWidth={2.2} />
              <p
                className="text-[9px] uppercase tracking-[0.18em] font-chidi-voice"
                style={{ color: accent.color }}
              >
                {top.eyebrow}
              </p>
            </div>

            <h3 className="font-serif text-[15px] tracking-tight leading-tight mb-1 text-white">
              {top.title}
            </h3>

            <p className="text-[11px] leading-snug font-chidi-voice text-white/85 mb-1.5">
              {top.body}
            </p>

            {top.ctaLabel && top.ctaHref ? (
              <a
                href={top.ctaHref}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[11px] font-medium font-chidi-voice self-start"
                style={{ color: accent.color }}
              >
                {top.ctaLabel} →
              </a>
            ) : null}
          </div>
        </article>
      </div>

      {/* Pagination dots */}
      <div className="flex items-center justify-center gap-1 mt-2">
        {order.map((id, i) => (
          <button
            key={id}
            onClick={() => {
              setOrder((curr) => [...curr.slice(i), ...curr.slice(0, i)])
              lastShuffleAt.current = Date.now()
            }}
            className={cn(
              "h-1 rounded-full transition-all",
              i === 0
                ? "w-4 bg-[var(--chidi-text-secondary)]"
                : "w-1 bg-[var(--chidi-text-muted)]/40 hover:bg-[var(--chidi-text-muted)]/70",
            )}
            aria-label={`Show card ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
