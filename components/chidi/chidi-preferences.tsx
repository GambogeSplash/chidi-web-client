"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Volume2, VolumeX, Mic, MicOff, Moon, Sun } from "lucide-react"
import { ChidiCard, ChidiSection } from "./page-shell"
import { ChidiMark } from "./chidi-mark"
import { isSoundEnabled, setSoundEnabled, playWin } from "@/lib/chidi/sound"
import { cn } from "@/lib/utils"

type ToneLevel = "warm" | "punchy" | "formal"
const TONE_ORDER: ToneLevel[] = ["warm", "punchy", "formal"]

// Each tone has a label + the same customer-facing scenario rendered in that
// register. The preview card shows whichever is currently selected.
const TONE_LABELS: Record<ToneLevel, { label: string; example: string }> = {
  warm: {
    label: "Warm",
    example: "Hi Adaeze, I just confirmed Tunde's payment — want me to thank him?",
  },
  punchy: {
    label: "Punchy",
    example: "Tunde paid. Confirmed. Want me to send a thanks?",
  },
  formal: {
    label: "Formal",
    example: "Payment confirmation received from Tunde. Awaiting next instruction.",
  },
}

const TONE_KEY = "chidi_tone"
const VOICE_KEY = "chidi_voice_enabled"
const QUIET_KEY = "chidi_quiet_hours" // stored as "{startHour}-{endHour}", e.g. "22-7"

/**
 * Chidi preferences — the personality settings. Sound on/off, voice on/off,
 * AI tone (warm / punchy / formal). Drives a "this is YOUR Chidi" feel.
 */
export function ChidiPreferences() {
  const [mounted, setMounted] = useState(false)
  const [soundOn, setSoundOn] = useState(false)
  const [voiceOn, setVoiceOn] = useState(false)
  const [tone, setTone] = useState<ToneLevel>("warm")
  const [quietHours, setQuietHours] = useState<[number, number]>([22, 7])

  useEffect(() => {
    setMounted(true)
    setSoundOn(isSoundEnabled())
    setVoiceOn(localStorage.getItem(VOICE_KEY) !== "false")
    const saved = localStorage.getItem(TONE_KEY) as ToneLevel | null
    if (saved && saved in TONE_LABELS) setTone(saved)
    const quietSaved = localStorage.getItem(QUIET_KEY)
    if (quietSaved) {
      const [s, e] = quietSaved.split("-").map(Number)
      if (Number.isFinite(s) && Number.isFinite(e)) setQuietHours([s, e])
    }
  }, [])

  if (!mounted) return null

  const toggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    setSoundEnabled(next)
    if (next) playWin({ force: true })
  }

  const toggleVoice = () => {
    const next = !voiceOn
    setVoiceOn(next)
    localStorage.setItem(VOICE_KEY, String(next))
  }

  const setToneAndPersist = (next: ToneLevel) => {
    setTone(next)
    localStorage.setItem(TONE_KEY, next)
  }

  const setQuietHoursAndPersist = (range: [number, number]) => {
    setQuietHours(range)
    localStorage.setItem(QUIET_KEY, `${range[0]}-${range[1]}`)
  }

  return (
    <>
    {/* "Snapshot of the relationship" section removed (2026-05-04) — three
        rows of pure copy ("I'm Chidi — your assistant", "Always on", a
        Notebook link) with no actionable controls. The Notebook link
        survives via the sidebar Library entry. Settings should be
        controls + actions, not narration. */}

    {/* Behavior controls — ALL actionable, no narration */}
    <ChidiSection eyebrow="Behavior" title="How Chidi behaves">
      <ChidiCard className="divide-y divide-[var(--chidi-border-subtle)]">
        {/* Tone — slider with live preview */}
        <ToneSlider tone={tone} onChange={setToneAndPersist} />

        {/* Quiet hours — drag the timeline to set when I queue messages
            instead of replying directly. */}
        <QuietHoursTimeline range={quietHours} onChange={setQuietHoursAndPersist} />

        {/* Sound */}
        <button
          onClick={toggleSound}
          className="w-full flex items-center gap-3 p-5 text-left hover:bg-[var(--chidi-surface)] transition-colors active:scale-[0.998]"
        >
          <span className="flex-shrink-0 w-9 h-9 rounded-full bg-[var(--chidi-surface)] flex items-center justify-center text-[var(--chidi-text-secondary)]">
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </span>
          <span className="flex-1">
            <span className="block ty-card-title text-[var(--chidi-text-primary)]">Sound</span>
            <span className="block text-xs text-[var(--chidi-text-muted)] mt-0.5">
              Soft chimes for wins
            </span>
          </span>
          <Toggle on={soundOn} />
        </button>

        {/* Voice input */}
        <button
          onClick={toggleVoice}
          className="w-full flex items-center gap-3 p-5 text-left hover:bg-[var(--chidi-surface)] transition-colors active:scale-[0.998]"
        >
          <span className="flex-shrink-0 w-9 h-9 rounded-full bg-[var(--chidi-surface)] flex items-center justify-center text-[var(--chidi-text-secondary)]">
            {voiceOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </span>
          <span className="flex-1">
            <span className="block ty-card-title text-[var(--chidi-text-primary)]">Voice input</span>
            <span className="block text-xs text-[var(--chidi-text-muted)] mt-0.5">
              Press &amp; hold the mic to talk
            </span>
          </span>
          <Toggle on={voiceOn} />
        </button>
      </ChidiCard>
    </ChidiSection>
    </>
  )
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-6 w-10 rounded-full transition-colors flex-shrink-0",
        on ? "bg-[var(--chidi-win)]" : "bg-[var(--chidi-border-default)]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ease-chidi-spring",
          on ? "translate-x-[18px]" : "translate-x-0.5",
        )}
      />
    </span>
  )
}

// =============================================================================
// ToneSlider — three-stop slider with live reply preview
// =============================================================================

interface ToneSliderProps {
  tone: ToneLevel
  onChange: (next: ToneLevel) => void
}

function ToneSlider({ tone, onChange }: ToneSliderProps) {
  const idx = TONE_ORDER.indexOf(tone)
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handlePointerEvent = (clientX: number) => {
    const el = trackRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ratio = (clientX - rect.left) / rect.width
    // Snap to nearest of 3 positions (0, 0.5, 1)
    const stop = ratio < 0.33 ? 0 : ratio < 0.66 ? 1 : 2
    const next = TONE_ORDER[stop]
    if (next !== tone) onChange(next)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    handlePointerEvent(e.clientX)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    handlePointerEvent(e.clientX)
  }
  const onPointerUp = () => setIsDragging(false)

  return (
    <div className="p-5">
      <div className="flex items-baseline justify-between mb-3">
        <span className="ty-card-title text-[var(--chidi-text-primary)]">My tone with your customers</span>
        <span className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice">
          Drag to feel the change
        </span>
      </div>

      {/* Slider track + thumb + stops */}
      <div className="px-1.5">
        <div
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="relative h-9 cursor-pointer touch-none select-none"
          role="slider"
          aria-label="Tone"
          aria-valuemin={0}
          aria-valuemax={2}
          aria-valuenow={idx}
          aria-valuetext={TONE_LABELS[tone].label}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" && idx > 0) onChange(TONE_ORDER[idx - 1])
            if (e.key === "ArrowRight" && idx < 2) onChange(TONE_ORDER[idx + 1])
          }}
        >
          {/* Track */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-[var(--chidi-surface)] border border-[var(--chidi-border-subtle)]" />
          {/* Filled portion */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-[var(--chidi-win)] transition-all"
            style={{ width: `calc(${(idx / 2) * 100}% + 0.75rem)`, transitionDuration: isDragging ? "0ms" : "200ms" }}
          />
          {/* Stop dots */}
          {TONE_ORDER.map((_, i) => (
            <span
              key={i}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full transition-colors",
                i <= idx ? "bg-[var(--chidi-win)]" : "bg-[var(--chidi-border-default)]",
              )}
              style={{ left: `${(i / 2) * 100}%` }}
            />
          ))}
          {/* Thumb */}
          <div
            className="absolute top-1/2 w-6 h-6 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white border-2 border-[var(--chidi-win)] shadow-md transition-all"
            style={{
              left: `${(idx / 2) * 100}%`,
              transitionDuration: isDragging ? "0ms" : "200ms",
              boxShadow: isDragging
                ? "0 0 0 6px rgba(108,249,216,0.18), 0 4px 8px rgba(0,0,0,0.12)"
                : "0 2px 4px rgba(0,0,0,0.10)",
            }}
          />
        </div>
        {/* Labels under stops */}
        <div className="flex justify-between text-[11px] font-chidi-voice mt-2 px-0">
          {TONE_ORDER.map((t) => (
            <button
              key={t}
              onClick={() => onChange(t)}
              className={cn(
                "transition-colors",
                t === tone
                  ? "text-[var(--chidi-text-primary)] font-medium"
                  : "text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-secondary)]",
              )}
            >
              {TONE_LABELS[t].label}
            </button>
          ))}
        </div>
      </div>

      {/* Live preview — updates as the slider moves */}
      <div className="mt-5 bg-[var(--chidi-surface)] rounded-lg p-3.5 border-l-2 border-[var(--chidi-win)]">
        <div className="flex items-center gap-1.5 mb-1.5">
          <ChidiMark size={12} variant="win" />
          <p className="text-[10px] text-[var(--chidi-text-muted)] font-chidi-voice uppercase tracking-wider">
            How I'd reply, on this setting
          </p>
        </div>
        <p
          key={tone}
          className="text-[14px] text-[var(--chidi-text-primary)] font-chidi-voice leading-relaxed chidi-brief-card"
        >
          "{TONE_LABELS[tone].example}"
        </p>
      </div>
    </div>
  )
}

// =============================================================================
// QuietHoursTimeline — drag the start/end of the "I queue, don't auto-reply"
// window. Visual is a 24h horizontal bar; the "queue" range is filled. The
// rest is "I auto-reply".
// =============================================================================

interface QuietHoursTimelineProps {
  range: [number, number]
  onChange: (next: [number, number]) => void
}

function QuietHoursTimeline({ range, onChange }: QuietHoursTimelineProps) {
  const [start, end] = range
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<"start" | "end" | null>(null)

  // Spans midnight if start > end. Two visual bands in that case.
  const wraps = start > end

  const hourFromX = (clientX: number): number => {
    const el = trackRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round(ratio * 24) % 24
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const h = hourFromX(e.clientX)
    if (dragging.current === "start") onChange([h, end])
    else onChange([start, h])
  }

  const onPointerDown = (handle: "start" | "end") => (e: React.PointerEvent) => {
    e.stopPropagation()
    dragging.current = handle
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerUp = () => {
    dragging.current = null
  }

  const formatHour = (h: number) => {
    const hh = h % 24
    const ampm = hh < 12 ? "am" : "pm"
    const display = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh
    return `${display}${ampm}`
  }

  // Slot percentages
  const startPct = (start / 24) * 100
  const endPct = (end / 24) * 100

  return (
    <div className="p-5">
      <div className="flex items-baseline justify-between mb-3">
        <span className="ty-card-title text-[var(--chidi-text-primary)]">Quiet hours</span>
        <span className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice tabular-nums">
          {formatHour(start)} → {formatHour(end)}
        </span>
      </div>
      <p className="text-[12px] text-[var(--chidi-text-secondary)] font-chidi-voice mb-4">
        Outside this window I auto-reply. Inside it, I queue messages for you instead.
      </p>

      <div
        ref={trackRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative h-12 select-none touch-none"
      >
        {/* 24h base track */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-3 rounded-full bg-[var(--chidi-surface)] border border-[var(--chidi-border-subtle)]" />

        {/* Quiet-hours band(s) — wraps midnight if start > end */}
        {wraps ? (
          <>
            <div
              className="absolute top-1/2 -translate-y-1/2 h-3 rounded-l-full bg-[#2A2438]/80"
              style={{ left: `${startPct}%`, right: 0 }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-3 rounded-r-full bg-[#2A2438]/80"
              style={{ left: 0, width: `${endPct}%` }}
            />
          </>
        ) : (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-3 rounded-full bg-[#2A2438]/80"
            style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
          />
        )}

        {/* Start handle */}
        <button
          onPointerDown={onPointerDown("start")}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-[#2A2438] shadow-md cursor-grab active:cursor-grabbing flex items-center justify-center"
          style={{ left: `${startPct}%` }}
          aria-label={`Quiet starts at ${formatHour(start)}`}
        >
          <Moon className="w-3 h-3 text-[#2A2438]" strokeWidth={2} />
        </button>

        {/* End handle */}
        <button
          onPointerDown={onPointerDown("end")}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-[var(--chidi-win)] shadow-md cursor-grab active:cursor-grabbing flex items-center justify-center"
          style={{ left: `${endPct}%` }}
          aria-label={`Auto-reply resumes at ${formatHour(end)}`}
        >
          <Sun className="w-3 h-3 text-[var(--chidi-win)]" strokeWidth={2} />
        </button>

        {/* Hour markers — every 6h */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[9px] text-[var(--chidi-text-muted)] font-chidi-voice tabular-nums">
          <span>12am</span>
          <span>6am</span>
          <span>12pm</span>
          <span>6pm</span>
          <span>12am</span>
        </div>
      </div>
    </div>
  )
}
