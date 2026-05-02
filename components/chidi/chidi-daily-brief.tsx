"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowRight } from "lucide-react"
import { ChidiCharacter } from "./chidi-mark"
import { CustomerCharacter } from "./customer-character"
import { CurrencyAmount } from "./currency-amount"
import { useSalesOverview } from "@/lib/hooks/use-analytics"
import { useOrders } from "@/lib/hooks/use-orders"
import { useConversations } from "@/lib/hooks/use-messaging"
import { useCustomers } from "@/lib/hooks/use-analytics"
import { playTap, playWin } from "@/lib/chidi/sound"
import { cn } from "@/lib/utils"

interface ChidiDailyBriefProps {
  ownerName?: string | null
  /** Optional override for testing — skip the once-per-day gate */
  forceShow?: boolean
}

/**
 * The wow moment. Spotify-Wrapped-style daily briefing that fires once per
 * calendar day on first dashboard load. 4-5 cinematic beats with serif type,
 * Chidi's character shifting expressions, real numbers from real data, and
 * a brief sound cue at each beat. The merchant's morning paper for their
 * own business. Skippable, gated by reduced-motion.
 *
 * Pacing: ~2.4s per beat, total ~10s start to finish if you let it play.
 * Skip any time via Esc, click background, or the Skip button.
 */
export function ChidiDailyBrief({ ownerName, forceShow = false }: ChidiDailyBriefProps) {
  const firstName = ownerName?.split(" ")[0] || "there"

  const [open, setOpen] = useState(false)
  const [beatIdx, setBeatIdx] = useState(0)

  // Pull real data — same hooks the rest of the app uses
  const { data: overview } = useSalesOverview("7d")
  const { data: pendingOrdersData } = useOrders("PENDING_PAYMENT")
  const { data: convoData } = useConversations("NEEDS_HUMAN", undefined)
  const { data: customersData } = useCustomers(undefined, "last_order", 3)

  const pendingCount = pendingOrdersData?.orders.length ?? 0
  const needsHumanCount = convoData?.needs_human_count ?? 0
  const recentCustomer = customersData?.customers?.[0]
  const weekRevenue = overview?.revenue.current ?? 0
  const weekChange = overview?.revenue.percent_change

  const beats = useMemo(() => buildBeats({
    firstName,
    weekRevenue,
    weekChange,
    pendingCount,
    needsHumanCount,
    recentCustomerName: recentCustomer?.name ?? null,
    recentCustomerPhone: recentCustomer?.phone ?? null,
  }), [firstName, weekRevenue, weekChange, pendingCount, needsHumanCount, recentCustomer])

  const totalBeats = beats.length
  const beatDurationMs = 2400

  // Once-per-day gate. Storage key includes the date so it resets each day.
  useEffect(() => {
    if (typeof window === "undefined") return
    const today = new Date().toISOString().slice(0, 10)
    const key = `chidi_daily_brief_${today}`
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (forceShow || (!localStorage.getItem(key) && !reduced)) {
      // Wait for data to land — don't open the brief with empty numbers
      const t = window.setTimeout(() => setOpen(true), 600)
      return () => window.clearTimeout(t)
    }
  }, [forceShow])

  // Auto-advance beats
  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => {
      if (beatIdx < totalBeats - 1) {
        setBeatIdx((i) => i + 1)
        playTap()
      }
    }, beatDurationMs)
    return () => window.clearTimeout(t)
  }, [open, beatIdx, totalBeats])

  // Win sound on the final beat
  useEffect(() => {
    if (open && beatIdx === totalBeats - 1) {
      playWin()
    }
  }, [open, beatIdx, totalBeats])

  // Keyboard: Esc / Enter / right arrow
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss()
      if (e.key === "Enter" || e.key === "ArrowRight") {
        if (beatIdx < totalBeats - 1) setBeatIdx((i) => i + 1)
        else dismiss()
      }
      if (e.key === "ArrowLeft" && beatIdx > 0) setBeatIdx((i) => i - 1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, beatIdx, totalBeats])

  const dismiss = () => {
    if (typeof window !== "undefined") {
      const today = new Date().toISOString().slice(0, 10)
      localStorage.setItem(`chidi_daily_brief_${today}`, "true")
    }
    setOpen(false)
  }

  if (!open || totalBeats === 0) return null

  const beat = beats[beatIdx]

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-6 chidi-tab-in"
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-label="Daily brief from Chidi"
    >
      {/* Background — warm gradient that morphs per beat */}
      <div
        className="absolute inset-0 transition-colors duration-1000"
        style={{ background: beat.bg }}
      />

      {/* Floating warm orbs for atmosphere */}
      <div
        className="absolute -top-1/4 -left-1/4 w-[60%] h-[60%] rounded-full opacity-50 blur-3xl pointer-events-none transition-colors duration-1000"
        style={{ background: beat.orbA }}
      />
      <div
        className="absolute -bottom-1/4 -right-1/4 w-[60%] h-[60%] rounded-full opacity-40 blur-3xl pointer-events-none transition-colors duration-1000"
        style={{ background: beat.orbB }}
      />

      {/* Content */}
      <div
        className="relative z-[2] max-w-xl w-full text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div key={beatIdx} className="chidi-tab-in space-y-6">
          {beat.visual && (
            <div className="flex justify-center">
              {beat.visual}
            </div>
          )}

          <p className="ty-meta text-[var(--chidi-text-muted)]" style={{ color: beat.eyebrowColor }}>
            {beat.eyebrow}
          </p>

          <h1
            className="font-serif tracking-tight leading-[1.05]"
            style={{
              fontSize: "clamp(2rem, 4vw + 1rem, 3.5rem)",
              color: beat.headlineColor,
            }}
          >
            {beat.headline}
          </h1>

          {beat.body && (
            <p
              className="font-chidi-voice leading-relaxed max-w-md mx-auto"
              style={{
                fontSize: "clamp(0.95rem, 0.5vw + 0.85rem, 1.1rem)",
                color: beat.bodyColor,
              }}
            >
              {beat.body}
            </p>
          )}

          {beatIdx === totalBeats - 1 && (
            <button
              onClick={dismiss}
              className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--chidi-text-primary)] text-[var(--chidi-bg-primary)] text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all"
            >
              Take me in
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress dots — top center */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {beats.map((_, i) => (
            <button
              key={i}
              onClick={() => setBeatIdx(i)}
              className={cn(
                "h-1 rounded-full transition-all",
                i === beatIdx
                  ? "w-8 bg-[var(--chidi-text-primary)]/70"
                  : "w-1.5 bg-[var(--chidi-text-primary)]/20 hover:bg-[var(--chidi-text-primary)]/40",
              )}
              aria-label={`Beat ${i + 1}`}
            />
          ))}
        </div>

        {/* Skip — bottom right */}
        <button
          onClick={dismiss}
          className="absolute -bottom-14 right-0 text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice hover:text-[var(--chidi-text-secondary)] transition-colors"
        >
          Skip · Esc
        </button>
      </div>
    </div>
  )
}

interface BeatSpec {
  eyebrow: string
  headline: React.ReactNode
  body?: React.ReactNode
  visual?: React.ReactNode
  bg: string
  orbA: string
  orbB: string
  eyebrowColor: string
  headlineColor: string
  bodyColor: string
}

interface BeatBuilderArgs {
  firstName: string
  weekRevenue: number
  weekChange: number | null | undefined
  pendingCount: number
  needsHumanCount: number
  recentCustomerName: string | null
  recentCustomerPhone: string | null
}

function buildBeats(args: BeatBuilderArgs): BeatSpec[] {
  const beats: BeatSpec[] = []
  const greeting = greetingForTime()

  // Beat 1: greeting (warm clay palette, default Chidi)
  beats.push({
    eyebrow: greeting,
    headline: (
      <>
        {greeting}, <span>{args.firstName}</span>.
      </>
    ),
    body: "Here's what I noticed overnight.",
    visual: <ChidiCharacter size={80} expression="default" />,
    bg: "linear-gradient(135deg, #F4DDC2 0%, #E89B8A 100%)",
    orbA: "radial-gradient(circle, #E08964 0%, transparent 70%)",
    orbB: "radial-gradient(circle, #F5B14C 0%, transparent 70%)",
    eyebrowColor: "rgba(63, 24, 8, 0.6)",
    headlineColor: "#3F1808",
    bodyColor: "rgba(63, 24, 8, 0.75)",
  })

  // Beat 2: while-you-slept summary (sage palette, listening)
  if (args.needsHumanCount > 0 || args.pendingCount > 0) {
    beats.push({
      eyebrow: "While you slept",
      headline: composeOvernightHeadline(args.needsHumanCount, args.pendingCount),
      body: "I held back the things that needed your call. The rest is moving.",
      visual: <ChidiCharacter size={80} expression="listening" />,
      bg: "linear-gradient(135deg, #DDE7D5 0%, #A4B58E 100%)",
      orbA: "radial-gradient(circle, #7FA68B 0%, transparent 70%)",
      orbB: "radial-gradient(circle, #C8D4A8 0%, transparent 70%)",
      eyebrowColor: "rgba(31, 64, 35, 0.6)",
      headlineColor: "#1F4023",
      bodyColor: "rgba(31, 64, 35, 0.75)",
    })
  }

  // Beat 3: revenue moment (honey palette, happy)
  if (args.weekRevenue > 0) {
    beats.push({
      eyebrow: "This week",
      headline: (
        <>
          You're at{" "}
          <CurrencyAmount
            amount={args.weekRevenue}
            currency="NGN"
            compact
            showDualHover={false}
            className="font-serif"
          />
          .
        </>
      ),
      body:
        args.weekChange != null && args.weekChange > 0
          ? `Up ${Math.round(args.weekChange)}% on the previous week. Keep the rhythm.`
          : args.weekChange != null && args.weekChange < 0
            ? `Down ${Math.abs(Math.round(args.weekChange))}% on last week. Let's nudge it.`
            : "Steady so far. The week is still young.",
      visual: <ChidiCharacter size={80} expression="happy" />,
      bg: "linear-gradient(135deg, #FBE2C2 0%, #F5B14C 100%)",
      orbA: "radial-gradient(circle, #FFB347 0%, transparent 70%)",
      orbB: "radial-gradient(circle, #FF8C42 0%, transparent 70%)",
      eyebrowColor: "rgba(63, 35, 8, 0.6)",
      headlineColor: "#3F2308",
      bodyColor: "rgba(63, 35, 8, 0.75)",
    })
  }

  // Beat 4: a customer to mention (warm peach, default — gentle)
  if (args.recentCustomerName) {
    beats.push({
      eyebrow: "Worth a wave",
      headline: (
        <>
          <span>{args.recentCustomerName.split(" ")[0]}</span> stopped by recently.
        </>
      ),
      body: "Worth dropping them a line if they were close to ordering.",
      visual: (
        <CustomerCharacter
          name={args.recentCustomerName}
          fallbackId={args.recentCustomerPhone || args.recentCustomerName}
          size="xl"
        />
      ),
      bg: "linear-gradient(135deg, #FBE8C9 0%, #C97D5E 100%)",
      orbA: "radial-gradient(circle, #E08964 0%, transparent 70%)",
      orbB: "radial-gradient(circle, #C97D5E 0%, transparent 70%)",
      eyebrowColor: "rgba(63, 24, 8, 0.6)",
      headlineColor: "#3F1808",
      bodyColor: "rgba(63, 24, 8, 0.75)",
    })
  }

  // Beat 5: closing (clay palette, default)
  beats.push({
    eyebrow: "Today",
    headline: (
      <>
        Let's make a <span>good</span> one.
      </>
    ),
    body: "I'm in the inbox. Tap me if you need a hand with anything.",
    visual: <ChidiCharacter size={80} expression="default" />,
    bg: "linear-gradient(135deg, #F4DDC2 0%, #C97D5E 100%)",
    orbA: "radial-gradient(circle, #E08964 0%, transparent 70%)",
    orbB: "radial-gradient(circle, #C97D5E 0%, transparent 70%)",
    eyebrowColor: "rgba(63, 24, 8, 0.6)",
    headlineColor: "#3F1808",
    bodyColor: "rgba(63, 24, 8, 0.75)",
  })

  return beats
}

function composeOvernightHeadline(needsHuman: number, pending: number): React.ReactNode {
  if (needsHuman > 0 && pending > 0) {
    return (
      <>
        <span>{needsHuman}</span> waiting for you.{" "}
        <span>{pending}</span> orders pending payment.
      </>
    )
  }
  if (needsHuman > 0) {
    return needsHuman === 1 ? (
      <>One conversation needs you.</>
    ) : (
      <>
        <span>{needsHuman}</span> conversations need you.
      </>
    )
  }
  if (pending > 0) {
    return pending === 1 ? (
      <>One order is waiting on payment.</>
    ) : (
      <>
        <span>{pending}</span> orders waiting on payment.
      </>
    )
  }
  return <>All quiet. You earned it.</>
}

function greetingForTime(): string {
  const h = new Date().getHours()
  if (h < 12) return "Morning"
  if (h < 17) return "Afternoon"
  return "Evening"
}
