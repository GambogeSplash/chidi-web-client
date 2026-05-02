"use client"

import { useEffect, useState } from "react"
import { ArrowRight, MessageCircle, ShoppingBag, BarChart3 } from "lucide-react"
import { ChidiAvatar, ChidiMark } from "./chidi-mark"
import { CustomerCharacter } from "./customer-character"
import { cn } from "@/lib/utils"

const SEEN_KEY = "chidi_welcome_seen_v1"

interface ChidiWelcomeProps {
  ownerName?: string | null
  businessName?: string | null
  /** Only fires the welcome on the first ever dashboard load. After that, no-op. */
  enabled?: boolean
}

type Beat = {
  /** Eyebrow above the headline */
  eyebrow: string
  /** Headline (serif) */
  headline: string
  /** Body line in Chidi's voice */
  body: string
  /** Optional visual ornament rendered above the text */
  visual: React.ReactNode
}

/**
 * The first-launch Chidi introduction. Cinematic, full-screen overlay shown
 * once ever for a brand new merchant. Three beats, ~3 seconds each, then it
 * dissolves into the dashboard. Skippable any time (Esc, click background,
 * or "Skip" button).
 *
 * After the first dismissal, localStorage gates it forever. To replay during
 * dev: `localStorage.removeItem("chidi_welcome_seen_v1")`.
 */
export function ChidiWelcome({ ownerName, businessName, enabled = true }: ChidiWelcomeProps) {
  const firstName = ownerName?.split(" ")[0] || ""
  const biz = businessName || "your shop"

  const [open, setOpen] = useState(false)
  const [beat, setBeat] = useState(0)
  const totalBeats = 3
  const beatDurationMs = 3200

  // On mount, check if we've shown this before. Only open if not seen.
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return
    const seen = localStorage.getItem(SEEN_KEY) === "true"
    if (!seen) {
      // Tiny delay so the dashboard mounts behind it for a smoother dissolve later
      const t = window.setTimeout(() => setOpen(true), 250)
      return () => window.clearTimeout(t)
    }
  }, [enabled])

  // Auto-advance beats
  useEffect(() => {
    if (!open) return
    const interval = window.setInterval(() => {
      setBeat((b) => {
        if (b >= totalBeats - 1) {
          window.clearInterval(interval)
          // Hold the last beat a moment, then dismiss
          window.setTimeout(() => dismiss(), 1800)
          return b
        }
        return b + 1
      })
    }, beatDurationMs)
    return () => window.clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Esc to skip
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

  const beats: Beat[] = [
    {
      eyebrow: firstName ? `For you, ${firstName}` : "For you",
      headline: firstName ? `Hi ${firstName}, I'm Chidi.` : "Hi. I'm Chidi.",
      body: `I'll be sitting beside you running ${biz}. Your assistant for selling on WhatsApp.`,
      visual: (
        <div className="flex flex-col items-center">
          <ChidiAvatar size="lg" tone="default" className="chidi-loader-breathe mb-4" />
        </div>
      ),
    },
    {
      eyebrow: "What I do",
      headline: "Three things, every day, without you lifting a finger.",
      body: "I reply to your customers. I capture every order. I learn your business, then tell you what I see.",
      visual: <ThreeWaysIDoIt />,
    },
    {
      eyebrow: "From here",
      headline: "Here's where you'll live.",
      body: "Your inbox, your orders, your insights. Everything you need is one click away. I'll be in the corner if you call me.",
      visual: <DashboardOverview />,
    },
  ]

  const current = beats[beat]

  return (
    <div
      className="fixed inset-0 z-[200] bg-[var(--background)] flex items-center justify-center px-6 chidi-tab-in"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Chidi"
    >
      {/* Warm gradient + floating orbs background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0 animate-gradient-shift"
          style={{
            background: "linear-gradient(-45deg, #F7F5F3, #F0EEEB, #F5F0E8, #F7F5F3, #EDE8E1)",
            backgroundSize: "400% 400%",
          }}
        />
        <div className="absolute top-[15%] left-[10%] w-[420px] h-[420px] rounded-full bg-gradient-to-br from-[#E8A33D]/18 to-transparent blur-3xl animate-floating-orb" />
        <div
          className="absolute bottom-[20%] right-[10%] w-[380px] h-[380px] rounded-full bg-gradient-to-br from-[#5B8A72]/15 to-transparent blur-3xl animate-floating-orb"
          style={{ animationDelay: "-6s" }}
        />
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(55, 50, 47, 0.3) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* Skip button */}
      <button
        onClick={dismiss}
        className="absolute top-5 right-6 z-20 text-xs text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] font-chidi-voice px-3 py-1.5 rounded-md hover:bg-white/40 active:scale-[0.97] transition-colors"
      >
        Skip intro
      </button>

      {/* Beat content */}
      <div className="relative z-10 w-full max-w-2xl text-center">
        <div key={beat} className="chidi-tab-in">
          {current.visual}
          <p className="ty-meta mb-3 mt-4">{current.eyebrow}</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-[var(--chidi-text-primary)] tracking-tight leading-[1.05] mb-5 max-w-3xl mx-auto">
            {current.headline}
          </h1>
          <p className="ty-body-voice text-[var(--chidi-text-secondary)] text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            {current.body}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mt-12">
          {beats.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setBeat(idx)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500 cursor-pointer",
                idx === beat ? "w-8 bg-[var(--chidi-win)]" : idx < beat ? "w-1.5 bg-[var(--chidi-text-muted)]" : "w-1.5 bg-[var(--chidi-border-default)] hover:bg-[var(--chidi-text-muted)]",
              )}
              aria-label={`Go to beat ${idx + 1}`}
            />
          ))}
        </div>

        {/* Final beat CTA */}
        {beat === totalBeats - 1 && (
          <button
            onClick={dismiss}
            className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl btn-cta font-medium text-sm chidi-tab-in"
          >
            Take me in
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Beat-2 visual: three vignettes for "what I do"
// =============================================================================
function ThreeWaysIDoIt() {
  const items = [
    { icon: MessageCircle, label: "Replies", color: "#25D366" },
    { icon: ShoppingBag, label: "Orders", color: "var(--chidi-win)" },
    { icon: BarChart3, label: "Learns", color: "#5B8A72" },
  ]
  return (
    <div className="flex items-center justify-center gap-6 mb-2">
      {items.map((it, idx) => {
        const Icon = it.icon
        return (
          <div
            key={it.label}
            className="flex flex-col items-center gap-2 chidi-brief-card"
            style={{ animationDelay: `${idx * 140}ms` }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `${it.color}18` }}
            >
              <Icon className="w-6 h-6" style={{ color: it.color }} />
            </div>
            <span className="text-[11px] uppercase tracking-wider font-chidi-voice text-[var(--chidi-text-muted)]">
              {it.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// =============================================================================
// Beat-3 visual: small dashboard preview using real characters
// =============================================================================
function DashboardOverview() {
  const customers = ["Adaeze Okafor", "Tunde Bakare", "Ifeoma Eze", "Kemi Adebayo"]
  return (
    <div className="flex items-center justify-center gap-3 mb-4">
      {customers.map((name, idx) => (
        <CustomerCharacter
          key={name}
          name={name}
          size="lg"
          className={cn("chidi-brief-card", idx === 1 ? "ring-2 ring-[var(--chidi-win)]/40 ring-offset-2 ring-offset-[var(--background)]" : "")}
        />
      ))}
      <div className="w-12 h-12 rounded-full bg-[var(--chidi-text-primary)] text-[var(--chidi-bg-primary)] flex items-center justify-center chidi-brief-card" style={{ animationDelay: "320ms" }}>
        <ChidiMark size={20} />
      </div>
    </div>
  )
}
