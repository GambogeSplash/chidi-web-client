"use client"

// =============================================================================
// Call Chidi v2 — visual + audio overhaul (2026-05-03)
//
// Palette: "Hyper-Lagos Neon" — magenta + cyan + electric green + gold-orange
// against a deep electric-violet base. Replaces the v1 Lagos sunset
// (terracotta/ochre/wine), which read as muddy. The new palette keeps a warm
// callback (gold-orange) but trades dull desaturated browns for vibrant
// signal colors that match the Arc-style reference the user originally shared.
//
// Motion: 5 absolutely-positioned radial blobs orbit on independent slow
// elliptical paths (14-22s each, blur 80px). Reads as a living mesh gradient,
// not a sleeping background.
//
// Audio: real Web Speech Synthesis (browser-native, zero deps). Voice picks
// en-NG → en-ZA → en-GB → en. Word-boundary events drive the animated mouth
// + the waveform pulse so the surface responds to actual speech rhythm.
// =============================================================================

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { PhoneOff, Volume2, VolumeX, BookOpen, ArrowRight, X } from "lucide-react"
import { type ChidiMarkState } from "./chidi-mark"
import { ArcFace } from "./arc-face"
import { CallChidiWaveform, type CallWaveformState } from "./call-chidi-waveform"
import { CallChidiBubble } from "./call-chidi-bubble"
import { useChidiSpeech } from "@/lib/chidi/use-chidi-speech"
import { cn } from "@/lib/utils"

interface CallChidiProps {
  open: boolean
  onClose: () => void
}

type CallState = "idle" | "speaking" | "listening" | "thinking" | "ended"

interface BubbleEntry {
  id: string
  variant: "user-pill" | "ai-plain" | "ai-card" | "ai-pill"
  text: string
  /** For ai-card: optional inline action label + handler key */
  actionLabel?: string
  actionKey?: "open-orders"
}

// =============================================================================
// Mock conversation script — 3 turns, hand-tuned to demo the four bubble
// variants and the four mascot states. No real audio. No backend.
// =============================================================================

interface ScriptStep {
  at: number               // ms from call start
  state: CallState
  bubble?: BubbleEntry
  /** When set, mark this AI bubble as the "currently expandable" one for the Read More sheet */
  expandable?: boolean
}

const SCRIPT: ScriptStep[] = [
  // Intro silence — mascot idles, waveform idle
  { at: 0, state: "idle" },

  // Chidi greets first — medium AI plain text
  {
    at: 800,
    state: "speaking",
    bubble: {
      id: "ai-1",
      variant: "ai-plain",
      text: "Hey, what's going on with the shop today?",
    },
    expandable: true,
  },

  // Mic opens — user is "speaking"
  { at: 4200, state: "listening" },

  // User says something short — small pill bottom-left
  {
    at: 5800,
    state: "listening",
    bubble: {
      id: "user-1",
      variant: "user-pill",
      text: "How many orders came in this morning?",
    },
  },

  // Chidi thinks for a beat
  { at: 7000, state: "thinking" },

  // Chidi answers with a long card + a "View orders" link
  {
    at: 8400,
    state: "speaking",
    bubble: {
      id: "ai-2",
      variant: "ai-card",
      text:
        "You've got 7 orders so far today — 3 from WhatsApp, 4 from Telegram. Total: ₦47,200. Want me to read them out one by one?",
      actionLabel: "View orders",
      actionKey: "open-orders",
    },
    expandable: true,
  },

  // Mic opens again
  { at: 13800, state: "listening" },

  // Closing AI message — small pill bottom-right
  {
    at: 16500,
    state: "speaking",
    bubble: {
      id: "ai-3",
      variant: "ai-pill",
      text: "Anytime. Have a great day at the shop!",
    },
    expandable: true,
  },

  // Settle to idle — call stays open until user ends it
  { at: 19000, state: "idle" },
]

// =============================================================================
// Component
// =============================================================================

export function CallChidi({ open, onClose }: CallChidiProps) {
  const router = useRouter()
  const params = useParams()
  const slug = (params?.slug as string | undefined) ?? ""

  const [callState, setCallState] = useState<CallState>("idle")
  const [bubbles, setBubbles] = useState<BubbleEntry[]>([])
  const [elapsed, setElapsed] = useState(0)         // seconds
  const [speakerOn, setSpeakerOn] = useState(true)
  const [readMoreOpen, setReadMoreOpen] = useState(false)
  const [latestExpandable, setLatestExpandable] = useState<BubbleEntry | null>(null)

  const startedAtRef = useRef<number | null>(null)
  const timeoutsRef = useRef<number[]>([])
  const tickRef = useRef<number | null>(null)

  // ---- Real TTS (Web Speech Synthesis) -------------------------------------
  // Word-boundary events drive both the mouth viseme cycle and the waveform
  // pulse spike. When `speakerOn` is false we skip speak() entirely (the
  // setTimeout script still advances visuals so the demo plays muted).
  const speech = useChidiSpeech()
  const speakerOnRef = useRef(speakerOn)
  useEffect(() => {
    speakerOnRef.current = speakerOn
    if (!speakerOn) speech.cancel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speakerOn])

  // ---- Lifecycle: start / reset script when opened --------------------------
  useEffect(() => {
    if (!open) {
      // Cleanup on close
      timeoutsRef.current.forEach((t) => window.clearTimeout(t))
      timeoutsRef.current = []
      if (tickRef.current != null) window.clearInterval(tickRef.current)
      tickRef.current = null
      startedAtRef.current = null
      speech.cancel()
      // Reset for next open
      setBubbles([])
      setElapsed(0)
      setCallState("idle")
      setReadMoreOpen(false)
      setLatestExpandable(null)
      return
    }

    // On open — schedule the script after a 250ms intro animation
    startedAtRef.current = Date.now()
    setBubbles([])
    setElapsed(0)
    setCallState("idle")

    SCRIPT.forEach((step) => {
      const id = window.setTimeout(() => {
        setCallState(step.state)
        if (step.bubble) {
          setBubbles((prev) => [...prev, step.bubble!])
          if (step.expandable) setLatestExpandable(step.bubble!)

          // If this is a Chidi line and the speaker isn't muted, fire TTS.
          // The script timing is still authoritative for advancing the demo —
          // we don't gate the next step on `onEnd`. The TTS just rides on
          // top, driving the mouth viseme cycle and the waveform pulse.
          const isAi = step.bubble.variant !== "user-pill"
          if (isAi && step.state === "speaking" && speakerOnRef.current) {
            speech.speak(step.bubble.text)
          }
        }
      }, 250 + step.at)
      timeoutsRef.current.push(id)
    })

    // Tick the timer every 1s
    tickRef.current = window.setInterval(() => {
      if (startedAtRef.current != null) {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000))
      }
    }, 1000)

    return () => {
      timeoutsRef.current.forEach((t) => window.clearTimeout(t))
      timeoutsRef.current = []
      if (tickRef.current != null) window.clearInterval(tickRef.current)
      tickRef.current = null
      speech.cancel()
    }
    // `speech` is a stable hook return-value — its identity changes per render
    // but the methods inside it are wrapped in useCallback. Excluding from the
    // deps to keep the script-init effect bound only to `open`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // ---- Escape closes --------------------------------------------------------
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  // ---- Lock body scroll while open -----------------------------------------
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [open])

  // ---- Map call state → mascot animation class -----------------------------
  const mascotClass = useMemo(() => {
    switch (callState) {
      case "speaking":  return "chidi-call-mascot-speak"
      case "listening": return "chidi-call-mascot-listen"
      case "thinking":  return "chidi-call-mascot-think"
      case "idle":
      default:          return "chidi-call-mascot-idle"
    }
  }, [callState])

  // ---- Map call state → waveform state -------------------------------------
  const waveformState: CallWaveformState = useMemo(() => {
    if (callState === "speaking")  return "speaking"
    if (callState === "listening") return "listening"
    return "idle"
  }, [callState])

  // ---- Map call state → ChidiMark mouth state ------------------------------
  // Uses the live TTS state when the speaker's on so the mouth opens exactly
  // when audio is playing rather than just when the script step says so.
  const mouthState: ChidiMarkState = useMemo(() => {
    if (callState === "speaking" && (speech.state === "speaking" || !speech.supported)) return "speaking"
    if (callState === "speaking") return "speaking"
    if (callState === "listening") return "listening"
    if (callState === "thinking") return "thinking"
    return "idle"
  }, [callState, speech.state, speech.supported])

  // ---- Action handlers ------------------------------------------------------
  const handleAction = useCallback((key: BubbleEntry["actionKey"]) => {
    if (key === "open-orders" && slug) {
      onClose()
      router.push(`/dashboard/${slug}?tab=orders`)
    }
  }, [router, slug, onClose])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  if (!open) return null

  const hasReadable = !!latestExpandable

  return (
    <div
      className="fixed inset-0 z-[100] chidi-call-overlay-in"
      role="dialog"
      aria-modal="true"
      aria-label="Call Chidi"
    >
      {/* Background — single electric-purple gradient that flows.
          One color family (violet → deep indigo), animated via background-position
          drift. Replaces the busy 5-blob mesh per user feedback.
          See globals.css → ".chidi-call-bg-v2" section. */}
      <div className="absolute inset-0 chidi-call-bg-v2" aria-hidden="true" />

      {/* Subtle vignette for focal depth — slight bright bloom under the
          mascot, slight darkening at the bottom edge so the controls read. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 35%, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0) 60%)," +
            "radial-gradient(80% 80% at 50% 100%, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 70%)",
        }}
      />

      {/* Top-right close X — quiet escape hatch in addition to the End button */}
      <button
        onClick={onClose}
        aria-label="Close call"
        className={cn(
          "absolute top-4 right-4 z-10 w-10 h-10 rounded-full",
          "flex items-center justify-center",
          "bg-white/10 hover:bg-white/20 active:bg-white/25 backdrop-blur-md",
          "border border-white/15 text-white",
          "transition-colors",
        )}
        style={{ marginTop: "env(safe-area-inset-top)" }}
      >
        <X className="w-4 h-4" strokeWidth={2.2} />
      </button>

      {/* Layout — full-bleed flex column */}
      <div
        className={cn(
          "relative z-[1] h-full flex flex-col items-center",
          "px-5 sm:px-8",
        )}
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 28px)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)",
        }}
      >
        {/* Top — timer + name */}
        <div className="flex flex-col items-center gap-1">
          <span
            className="text-[13px] tabular-nums text-white/85 font-chidi-voice"
            aria-live="off"
          >
            {formatTime(elapsed)}
          </span>
          <h2 className="text-white text-[26px] sm:text-[30px] font-semibold tracking-tight font-chidi-voice">
            Chidi
          </h2>
          <span className="text-[11px] uppercase tracking-[0.18em] text-white/55 font-chidi-voice mt-0.5">
            {callState === "listening" ? "Listening"
              : callState === "speaking" ? "Speaking"
              : callState === "thinking" ? "Thinking"
              : "On call"}
          </span>
        </div>

        {/* Middle — mascot is the focal point */}
        <div className="flex-1 w-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-8 w-full max-w-[480px]">
            {/* Face stands alone on the gradient — no halo, no container.
                Matches Arc's pattern exactly: face sits on the background
                with a subtle drop shadow for depth, nothing else. */}
            <ArcFace
              size={200}
              state={mouthState}
              speakingPulse={speech.boundary}
              className={cn("drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)]", mascotClass)}
            />

            {/* Bubbles stack — newest at the bottom, plain stack flows naturally */}
            <div className="w-full flex flex-col gap-3 items-stretch min-h-[80px]">
              {bubbles.slice(-3).map((b) => (
                <CallChidiBubble
                  key={b.id}
                  variant={b.variant}
                  action={
                    b.variant === "ai-card" && b.actionLabel ? (
                      <button
                        onClick={() => handleAction(b.actionKey)}
                        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--chidi-text-primary)] hover:text-[var(--chidi-win-foreground)] font-chidi-voice"
                      >
                        {b.actionLabel}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : undefined
                  }
                >
                  {b.text}
                </CallChidiBubble>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom — waveform + 3 controls */}
        <div className="flex flex-col items-center gap-5 w-full">
          <CallChidiWaveform state={waveformState} pulse={speech.boundary} />

          <div className="flex items-center justify-center gap-6">
            {/* Speaker toggle */}
            <button
              onClick={() => setSpeakerOn((v) => !v)}
              aria-label={speakerOn ? "Mute speaker" : "Unmute speaker"}
              aria-pressed={speakerOn}
              className={cn(
                "min-w-[56px] min-h-[56px] w-14 h-14 rounded-full",
                "flex items-center justify-center",
                "bg-black/35 hover:bg-black/45 active:bg-black/55 backdrop-blur-md",
                "border border-white/15 text-white",
                "transition-colors",
              )}
            >
              {speakerOn
                ? <Volume2 className="w-5 h-5" strokeWidth={2} />
                : <VolumeX className="w-5 h-5" strokeWidth={2} />}
            </button>

            {/* End call — primary, red */}
            <button
              onClick={onClose}
              aria-label="End call"
              className={cn(
                "min-w-[64px] min-h-[64px] w-16 h-16 rounded-full",
                "flex items-center justify-center",
                "bg-[#E5482F] hover:bg-[#D63E26] active:bg-[#C5371F] text-white",
                "shadow-[0_10px_24px_-8px_rgba(229,72,47,0.6)]",
                "border border-white/10",
                "transition-colors",
              )}
            >
              <PhoneOff className="w-6 h-6" strokeWidth={2.2} />
            </button>

            {/* Read more — opens the latest expandable AI response in a sheet */}
            <button
              onClick={() => hasReadable && setReadMoreOpen(true)}
              aria-label="Read latest response"
              disabled={!hasReadable}
              className={cn(
                "min-w-[56px] min-h-[56px] w-14 h-14 rounded-full",
                "flex items-center justify-center",
                "bg-black/35 hover:bg-black/45 active:bg-black/55 backdrop-blur-md",
                "border border-white/15 text-white",
                "transition-all",
                !hasReadable && "opacity-40 cursor-not-allowed",
              )}
            >
              <BookOpen className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* Read More sheet — bottom sheet with the most recent AI response in full */}
      {readMoreOpen && latestExpandable && (
        <div
          className="absolute inset-0 z-[2] flex items-end sm:items-center sm:justify-center chidi-call-overlay-in"
          onClick={() => setReadMoreOpen(false)}
        >
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "relative w-full sm:max-w-[480px] sm:rounded-3xl rounded-t-3xl",
              "bg-[var(--chidi-bg-primary)] text-[var(--chidi-text-primary)]",
              "p-6 pb-8 shadow-[0_-12px_48px_-8px_rgba(0,0,0,0.4)]",
            )}
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 28px)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--chidi-text-muted)] font-chidi-voice">
                Chidi said
              </span>
              <button
                onClick={() => setReadMoreOpen(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--chidi-text-muted)] hover:bg-[var(--chidi-surface)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[16px] leading-relaxed font-chidi-voice text-[var(--chidi-text-primary)]">
              {latestExpandable.text}
            </p>
            {latestExpandable.actionLabel && latestExpandable.actionKey && (
              <button
                onClick={() => handleAction(latestExpandable.actionKey)}
                className={cn(
                  "mt-5 w-full inline-flex items-center justify-center gap-2",
                  "h-11 rounded-xl bg-[var(--chidi-text-primary)] text-[var(--chidi-bg-primary)]",
                  "text-[14px] font-medium font-chidi-voice",
                  "hover:opacity-90 transition-opacity",
                )}
              >
                {latestExpandable.actionLabel}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
