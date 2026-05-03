"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export type CallWaveformState = "idle" | "listening" | "speaking"

interface CallChidiWaveformProps {
  state: CallWaveformState
  className?: string
  /** Bar count — Arc reference uses ~14 dots in a pill */
  bars?: number
}

/**
 * Faux audio-level waveform — ~14 vertically-scaling bars in a dark pill.
 * No real microphone yet; amplitude is synthesized from layered sines + a
 * little noise. Three energy levels:
 *   idle      — collapsed to a single dot row, all bars at min height
 *   listening — mid amplitude, gentler / cooler motion
 *   speaking  — high amplitude, faster / wider envelope
 *
 * Honors prefers-reduced-motion by holding a static row.
 */
export function CallChidiWaveform({
  state,
  className,
  bars = 14,
}: CallChidiWaveformProps) {
  const [levels, setLevels] = useState<number[]>(() => Array(bars).fill(0.1))
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number>(0)
  const reducedMotion = useRef<boolean>(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    reducedMotion.current = mq.matches
    const onChange = () => { reducedMotion.current = mq.matches }
    mq.addEventListener?.("change", onChange)
    return () => mq.removeEventListener?.("change", onChange)
  }, [])

  useEffect(() => {
    if (reducedMotion.current) {
      // Static representation per state
      const flat =
        state === "idle" ? 0.08 :
        state === "listening" ? 0.45 : 0.7
      setLevels(Array(bars).fill(flat))
      return
    }

    if (state === "idle") {
      setLevels(Array(bars).fill(0.06))
      return
    }

    startRef.current = performance.now()
    const baseAmp = state === "speaking" ? 0.85 : 0.5
    const speed = state === "speaking" ? 0.0085 : 0.0055

    const tick = (t: number) => {
      const dt = (t - startRef.current) * speed
      const next = Array.from({ length: bars }, (_, i) => {
        // Stack two sines + a quiet random for organic feel.
        const phase = i * 0.6
        const a = Math.sin(dt + phase) * 0.5 + 0.5
        const b = Math.sin(dt * 1.7 + phase * 1.3) * 0.5 + 0.5
        const noise = (Math.random() - 0.5) * 0.18
        const v = (a * 0.55 + b * 0.45) * baseAmp + noise
        // Center bars feel "louder" — apply a gentle bell curve weighting
        const mid = (bars - 1) / 2
        const distance = Math.abs(i - mid) / mid
        const bell = 1 - distance * 0.35
        return Math.max(0.06, Math.min(1, v * bell))
      })
      setLevels(next)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [state, bars])

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center gap-[5px] rounded-full px-4 py-2.5",
        "bg-black/35 backdrop-blur-md border border-white/10",
        "shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)]",
        className,
      )}
      role="presentation"
      aria-hidden="true"
    >
      {levels.map((v, i) => {
        // Bars are 3px wide. Height scales 4px → 22px based on level.
        const h = 4 + Math.round(v * 18)
        return (
          <span
            key={i}
            className="block w-[3px] rounded-full bg-white/95"
            style={{
              height: `${h}px`,
              transition:
                state === "idle"
                  ? "height 320ms cubic-bezier(0.22, 1, 0.36, 1)"
                  : "height 90ms linear",
            }}
          />
        )
      })}
    </div>
  )
}
