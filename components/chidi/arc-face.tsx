"use client"

import { cn } from "@/lib/utils"
import { useAnimatedViseme } from "./chidi-mark"

/**
 * ArcFace — minimal mascot used ONLY in the Call Chidi overlay.
 *
 * Visual: two vertical white pill eyes + a curved white smile arc.
 * No background, no container — sits on top of the call gradient.
 *
 * State-aware mouth (lip-sync proxy when Chidi speaks):
 *   - idle / listening   → curved smile
 *   - thinking           → small pursed "o"
 *   - speaking           → cycles 4 visemes (M / O / A / E) by visemeIdx
 *
 * The rest of the app keeps using ChidiMark (the warm character mark).
 * This face is intentionally separate so the brand mark elsewhere doesn't
 * have to change to accommodate the Arc-style call screen.
 */

export type ArcFaceState = "idle" | "listening" | "thinking" | "speaking"

interface ArcFaceProps {
  size?: number
  state?: ArcFaceState
  /** Increments on TTS word boundary (e.g. SpeechSynthesis `onboundary`).
      Advances the viseme so the mouth locks to actual speech rhythm. */
  speakingPulse?: number
  className?: string
}

export function ArcFace({
  size = 170,
  state = "idle",
  speakingPulse,
  className,
}: ArcFaceProps) {
  const visemeIdx = useAnimatedViseme(state === "speaking", speakingPulse)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={cn("block", className)}
      aria-hidden="true"
    >
      {/* Left eye — vertical pill */}
      <rect x="33" y="22" width="11" height="32" rx="5.5" fill="currentColor" />
      {/* Right eye — vertical pill */}
      <rect x="56" y="22" width="11" height="32" rx="5.5" fill="currentColor" />
      {/* Mouth */}
      <Mouth state={state} visemeIdx={visemeIdx} />
    </svg>
  )
}

function Mouth({ state, visemeIdx }: { state: ArcFaceState; visemeIdx: number }) {
  if (state === "speaking") {
    // Bias toward open shapes so it reads as "talking" not "twitching"
    const visemes: Array<"M" | "O" | "A" | "E"> = ["A", "O", "E", "A", "O", "M", "A", "E"]
    const v = visemes[visemeIdx % visemes.length]

    if (v === "M") {
      return (
        <path
          d="M 38 76 L 62 76"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
      )
    }
    if (v === "E") {
      return <ellipse cx="50" cy="76" rx="10" ry="3.4" fill="currentColor" />
    }
    if (v === "O") {
      return <ellipse cx="50" cy="76" rx="6.2" ry="6.4" fill="currentColor" />
    }
    // "A" — wide & tall (loudest viseme)
    return <ellipse cx="50" cy="76.5" rx="9.6" ry="8.4" fill="currentColor" />
  }

  if (state === "thinking") {
    return <ellipse cx="50" cy="76" rx="3.2" ry="3.2" fill="currentColor" />
  }

  // idle / listening — Arc's curved smile
  return (
    <path
      d="M 30 68 Q 50 92, 70 68"
      stroke="currentColor"
      strokeWidth="6.5"
      strokeLinecap="round"
      fill="none"
    />
  )
}
