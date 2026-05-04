"use client"

import { useEffect, useState } from "react"
import { ArcFace } from "./arc-face"
import { MessageSquare, Sparkles, ShoppingBag } from "lucide-react"

interface SetupCelebrationProps {
  ownerName?: string
  businessName?: string
  /** Fires after the sequence finishes — typically routes to dashboard */
  onDone: () => void
  /** Total visible duration in ms. Default 4200ms (3 cards × ~1400ms). */
  durationMs?: number
}

/**
 * Onboarding crescendo — runs after setup completes, before the dashboard
 * loads. Three Chidi-voice cards in sequence, each with a tiny celebration
 * cue. Makes the moment of "you're in" feel earned, not transactional.
 *
 * Skippable via Esc or click anywhere.
 */
export function SetupCelebration({
  ownerName,
  businessName,
  onDone,
  durationMs = 4200,
}: SetupCelebrationProps) {
  const [step, setStep] = useState(0)
  const totalSteps = 3
  const stepDuration = Math.floor(durationMs / totalSteps)

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => {
        if (s >= totalSteps - 1) {
          clearInterval(interval)
          window.setTimeout(onDone, stepDuration)
          return s
        }
        return s + 1
      })
    }, stepDuration)
    return () => clearInterval(interval)
  }, [onDone, stepDuration])

  // Skip handlers
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") onDone()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onDone])

  const firstName = ownerName?.split(" ")[0] || ""
  const biz = businessName || "your shop"

  const cards: Array<{ headline: string; body: string; icon: React.ReactNode }> = [
    {
      headline: firstName ? `Welcome aboard, ${firstName}.` : "Welcome aboard.",
      body: `I'm Chidi. I just tucked ${biz} in. Let's get you set up to sell.`,
      icon: <ArcFace size={40} className="text-[var(--chidi-text-primary)]" />,
    },
    {
      headline: "I'll watch your channels.",
      body: "Telegram, WhatsApp — wherever your customers reach you. When they message, I'll reply in your voice. When they order, I'll capture it. When something needs you, I'll flag it.",
      icon: (
        <div className="w-12 h-12 rounded-full bg-[var(--chidi-accent)]/10 flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-[var(--chidi-accent)]" />
        </div>
      ),
    },
    {
      headline: "Here's where you'll live.",
      body: "Your inbox, your orders, your insights — all on one screen. I'll be in the corner if you need me.",
      icon: (
        <div className="w-12 h-12 rounded-full bg-[var(--chidi-win-soft)] flex items-center justify-center">
          <ShoppingBag className="w-6 h-6 text-[var(--chidi-win)]" />
        </div>
      ),
    },
  ]

  return (
    <div
      className="min-h-screen relative overflow-hidden bg-[var(--background)] flex items-center justify-center px-6"
      onClick={onDone}
      role="dialog"
      aria-label="Setup complete"
    >
      {/* Warm gradient + floating orbs — celebratory but quiet */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 animate-gradient-shift"
          style={{
            background: "linear-gradient(-45deg, #F7F5F3, #F0EEEB, #F5F0E8, #F7F5F3, #EDE8E1)",
            backgroundSize: "400% 400%",
          }}
        />
        <div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#E8A33D]/15 to-transparent blur-3xl animate-floating-orb"
        />
        <div
          className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-[#5B8A72]/12 to-transparent blur-3xl animate-floating-orb"
          style={{ animationDelay: "-5s" }}
        />
        {/* Subtle paper grain */}
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(55, 50, 47, 0.3) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* Confetti-light — tiny floating dots in win color */}
      <ConfettiLight />

      {/* Card stack */}
      <div className="relative z-10 w-full max-w-md text-center">
        {cards.map((c, idx) => (
          <div
            key={idx}
            className={`absolute inset-x-0 transition-all duration-700 ${
              idx === step
                ? "opacity-100 translate-y-0 ease-chidi-spring"
                : idx < step
                  ? "opacity-0 -translate-y-4 ease-chidi-soft"
                  : "opacity-0 translate-y-4"
            }`}
            style={{ pointerEvents: idx === step ? "auto" : "none" }}
          >
            <div className="flex justify-center mb-6">{c.icon}</div>
            <p className="ty-meta text-[var(--chidi-text-muted)] mb-2">
              Step {idx + 1} of {totalSteps}
            </p>
            <h1 className="ty-display text-[var(--chidi-text-primary)] mb-4">
              {c.headline}
            </h1>
            <p className="ty-body-voice text-[var(--chidi-text-secondary)] leading-relaxed max-w-sm mx-auto">
              {c.body}
            </p>
          </div>
        ))}

        {/* Progress dots */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-1.5">
          {cards.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-500 ease-chidi-soft ${
                idx === step ? "w-6 bg-[var(--chidi-win)]" : idx < step ? "w-1.5 bg-[var(--chidi-text-muted)]" : "w-1.5 bg-[var(--chidi-border-default)]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Skip hint */}
      <p className="absolute bottom-6 right-6 text-[10px] text-[var(--chidi-text-muted)] font-chidi-voice">
        Click anywhere or press ↵ to skip
      </p>
    </div>
  )
}

/**
 * 12 small floating dots in win color, scattered, animating. Quiet celebration —
 * not Mardi Gras. Pure CSS, no library.
 */
function ConfettiLight() {
  const dots = Array.from({ length: 14 }, (_, i) => {
    const left = (i * 7.7 + 5) % 95
    const delay = i * 0.18
    const size = 4 + (i % 3) * 2
    return { left, delay, size }
  })
  return (
    <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden" aria-hidden>
      {dots.map((d, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-[var(--chidi-win)] animate-floating-orb"
          style={{
            left: `${d.left}%`,
            top: `${20 + (i % 5) * 14}%`,
            width: d.size,
            height: d.size,
            opacity: 0.5,
            animationDelay: `${-d.delay}s`,
            animationDuration: `${14 + (i % 4) * 3}s`,
          }}
        />
      ))}
    </div>
  )
}
