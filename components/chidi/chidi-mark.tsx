"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/** Optional speaking-state for the mascot. Default: static smile (back-compat). */
export type ChidiMarkState = "idle" | "listening" | "thinking" | "speaking"

interface ChidiMarkProps {
  className?: string
  size?: number
  variant?: "default" | "win" | "muted"
  /**
   * When set to "speaking" the mouth cycles through 4 viseme shapes at ~7Hz
   * to fake lip-sync. Other states show a static mouth (smile / thinking-o).
   * Honors prefers-reduced-motion → collapses to static smile.
   * Optional. Omitting it keeps the original static-smile rendering for every
   * existing call site (Morning Brief avatar, Notebook header, etc.).
   */
  state?: ChidiMarkState
  /**
   * External pulse counter. Each increment advances the speaking viseme by one
   * step. Useful for syncing mouth motion with TTS `onboundary` events instead
   * of a free-running RAF clock. Ignored when `state !== "speaking"`.
   */
  speakingPulse?: number
}

/**
 * The Chidi mark — used everywhere Chidi-as-a-presence appears (Morning
 * Brief avatar, Notebook header, Onboarding ChidiSays, Copilot empty state,
 * receipt footer, command palette).
 *
 * Three intersecting strokes form a soft "c" with a counter-balanced flourish.
 * Replaces the Lucide Sparkles icon, which was reading cheap from overuse.
 *
 * Sparkles is reserved now for genuine "AI sparkle" moments only — the
 * AI-draft suggest button, the AI bubble in chat. Everywhere Chidi *is*,
 * we use this mark.
 */
export function ChidiMark({ className, size = 16, variant, state, speakingPulse }: ChidiMarkProps) {
  const explicitFill =
    variant === "win"
      ? "var(--chidi-win)"
      : variant === "muted"
        ? "var(--chidi-text-muted)"
        : variant === "default"
          ? "var(--chidi-text-primary)"
          : undefined

  const fill = explicitFill || "currentColor"

  // Mascot v4 — squircle character. Direction reset on 2026-05-03 because
  // v3 (teardrop + crest tuft) read as "an onion." We needed something that
  // wasn't biological at all.
  //
  // Construction (6 layered passes — high-craft fidelity at 32px+ but the
  // silhouette still reads at 14px as "rounded square with two eye dots"):
  //   1. Drop shadow — offset-down + blur for floating dimension
  //   2. Body squircle — soft-rounded square with subtle 3° clockwise tilt
  //      ("alive" gesture); fill via vertical body-tone gradient
  //   3. Top-left inner highlight — radial gradient for glassy depth
  //   4. Bottom-right corner notch — the signature mark; a small chip
  //      removed from the squircle so the silhouette has personality
  //   5. Two eyes — ovoid sclera + iris dot + tiny white pupil highlight
  //   6. Smile — short rounded curve below the eyes
  //
  // No tuft, no crest, no stem — nothing on top of the head. The character's
  // identity now lives in the squircle silhouette + the corner notch.
  const id = `chidi-mark-${size}`
  // The squircle path uses superellipse-ish bezier curves to get the
  // soft-square look that's neither circle nor rounded-rect.
  const squirclePath =
    "M 4 11 C 4 6, 6 4, 11 4 L 13 4 C 18 4, 20 6, 20 11 L 20 13 C 20 16.4, 18.6 18.6, 16 19.6 L 16.6 21.6 L 14.4 19.95 C 13.95 20, 13.5 20, 13 20 L 11 20 C 6 20, 4 18, 4 13 Z"

  // Subtle "alive" animations only at large render sizes (≥32px). At small
  // sizes (tab badges, message bubbles) the motion would be distracting.
  const alive = size >= 32

  // ---- Viseme cycle: drives the animated mouth when state === "speaking" ---
  // 4 shapes — closed/M, small-O, wide-A, narrow-E — cycled at ~7Hz to read as
  // animated chatter. We bias the random-ish cycle toward open shapes so the
  // mouth feels active rather than skittish.
  const visemeIdx = useAnimatedViseme(state === "speaking", speakingPulse)

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("flex-shrink-0", alive && "chidi-mascot-breathe", className)}
      aria-hidden="true"
    >
      <defs>
        {/* Radial highlight — glassy top-left bloom + soft bottom-right shadow */}
        <radialGradient id={`${id}-shine`} cx="32%" cy="28%" r="72%">
          <stop offset="0%" stopColor="white" stopOpacity="0.28" />
          <stop offset="45%" stopColor="white" stopOpacity="0.04" />
          <stop offset="100%" stopColor="black" stopOpacity="0.22" />
        </radialGradient>

        {/* Subtle body tone — top a hair lighter, bottom a hair darker */}
        <linearGradient id={`${id}-tone`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={fill} stopOpacity="1" />
          <stop offset="100%" stopColor={fill} stopOpacity="0.94" />
        </linearGradient>

        {/* Drop-shadow filter — offset blur under the body */}
        <filter id={`${id}-drop`} x="-20%" y="-10%" width="140%" height="130%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="0.45" />
          <feOffset dy="0.6" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.28" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* === Body (squircle with bottom-right corner-notch signature) ===
          The 3° tilt is applied to the entire body group so the eyes + smile
          ride with it — gives the character an "alive, tilted" stance. */}
      <g transform="rotate(-3 12 12)" filter={`url(#${id}-drop)`}>
        {/* Layer 1: solid fill */}
        <path d={squirclePath} fill={`url(#${id}-tone)`} />
        {/* Layer 2: glassy radial overlay */}
        <path d={squirclePath} fill={`url(#${id}-shine)`} />
      </g>

      {/* === Face (rendered without tilt so it reads stable + un-canted) === */}

      {/* Left eye: white sclera + warm iris (using fill color) + tiny white pupil.
          Wrapped in <g> with blink class so eyes squeeze every ~5s at large
          sizes. The chidi-mascot-blink class is a no-op when alive=false. */}
      <g className={alive ? "chidi-mascot-blink" : undefined}>
        <ellipse cx="9.2" cy="11.4" rx="1.45" ry="1.95" fill="var(--background, #F7F5F3)" />
        <ellipse cx="9.4" cy="11.6" rx="0.78" ry="1.05" fill={fill} opacity="0.55" />
        <circle cx="9.65" cy="11.05" r="0.32" fill="var(--background, #F7F5F3)" />
      </g>

      {/* Right eye — slightly larger to add asymmetric character */}
      <g className={alive ? "chidi-mascot-blink" : undefined}>
        <ellipse cx="14.4" cy="11.5" rx="1.6" ry="2.1" fill="var(--background, #F7F5F3)" />
        <ellipse cx="14.65" cy="11.7" rx="0.86" ry="1.15" fill={fill} opacity="0.55" />
        <circle cx="14.95" cy="11.15" r="0.36" fill="var(--background, #F7F5F3)" />
      </g>

      {/* Mouth — state-aware:
            - default / idle / listening    → soft smile curve (back-compat)
            - thinking                      → small static "o"
            - speaking                      → cycles 4 visemes, 7Hz
          Honors prefers-reduced-motion via the visemeIdx hook. */}
      <Mouth state={state} visemeIdx={visemeIdx} />

      {/* Tiny bottom-right blush — a single dot that visually anchors the
          notch and signs the character with one last warm detail. */}
      <circle cx="16.4" cy="16.6" r="0.55" fill="var(--background, #F7F5F3)" opacity="0.18" />
    </svg>
  )
}

// =============================================================================
// Mouth — internal helper. Renders one of 6 mouth shapes:
//   smile (default), thinking-o, viseme-M (closed), viseme-O (round),
//   viseme-A (wide-tall), viseme-E (narrow-flat)
// =============================================================================
function Mouth({ state, visemeIdx }: { state?: ChidiMarkState; visemeIdx: number }) {
  const stroke = "var(--background, #F7F5F3)"
  const fill = "var(--background, #F7F5F3)"

  // Speaking: pick one of 4 visemes by index
  if (state === "speaking") {
    // Bias toward open mouths so it reads as "talking" not "twitching"
    const visemes: Array<"M" | "O" | "A" | "E"> = ["A", "O", "E", "A", "O", "M", "A", "E"]
    const v = visemes[visemeIdx % visemes.length]

    if (v === "M") {
      // Closed — short flat line
      return (
        <path
          d="M10.4 15.2 L 13.6 15.2"
          stroke={stroke}
          strokeWidth="0.9"
          strokeLinecap="round"
          fill="none"
          opacity="0.92"
        />
      )
    }
    if (v === "E") {
      // Narrow-flat — slim ellipse
      return (
        <ellipse
          cx="12"
          cy="15.3"
          rx="1.6"
          ry="0.5"
          fill={fill}
          opacity="0.92"
        />
      )
    }
    if (v === "O") {
      // Round-O
      return (
        <ellipse
          cx="12"
          cy="15.3"
          rx="1.0"
          ry="1.05"
          fill={fill}
          opacity="0.92"
        />
      )
    }
    // "A" — wide & tall (loudest viseme)
    return (
      <ellipse
        cx="12"
        cy="15.4"
        rx="1.55"
        ry="1.35"
        fill={fill}
        opacity="0.92"
      />
    )
  }

  if (state === "thinking") {
    // Pursed "o" — deliberation
    return (
      <ellipse
        cx="12"
        cy="15.3"
        rx="0.55"
        ry="0.55"
        fill={fill}
        opacity="0.92"
      />
    )
  }

  // Default / idle / listening — original smile (back-compat for every existing
  // call site that doesn't pass `state`).
  return (
    <path
      d="M9.6 14.8 Q 12 16.6, 14.6 14.4"
      stroke={stroke}
      strokeWidth="0.9"
      strokeLinecap="round"
      fill="none"
      opacity="0.92"
    />
  )
}

/**
 * useAnimatedViseme — returns an integer that advances at ~7Hz while `active`
 * is true. If a `pulse` value is supplied (e.g., from TTS `onboundary` events)
 * the index also advances on every pulse change, so the mouth tracks word
 * boundaries on top of the free-running clock. Honors prefers-reduced-motion
 * by holding the index at 0 (closed mouth maps to the "A" shape — looks calm).
 */
export function useAnimatedViseme(active: boolean, pulse?: number) {
  const [idx, setIdx] = useState(0)
  const reducedRef = useRef(false)
  const intervalRef = useRef<number | null>(null)

  // Pulse-driven advance (decoupled from the RAF clock)
  useEffect(() => {
    if (!active) return
    if (pulse == null) return
    setIdx((n) => (n + 1) % 1000)
  }, [active, pulse])

  // Free-running advance — keeps the mouth alive between boundary events
  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    reducedRef.current = mq.matches

    if (!active || reducedRef.current) {
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // ~7Hz — fast enough to feel like chatter, slow enough not to strobe
    intervalRef.current = window.setInterval(() => {
      // Random small jump (1-3) so the cycle doesn't look like a clean loop
      setIdx((n) => (n + 1 + Math.floor(Math.random() * 3)) % 1000)
    }, 140)

    return () => {
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [active])

  return idx
}

/**
 * ChidiCharacter — Claude/Anthropic direction. Solid colored badge + the
 * ChidiMark in cream inside. No animation, no morphing. Identity through
 * confident restraint, like the Anthropic asterisk on warm orange. State
 * shifts the badge color (and only the color); the mark stays the same.
 *
 *   default   — warm clay (Lagos terracotta), the standing identity
 *   listening — brighter honey (more energy)
 *   thinking  — sage (cooler, considered)
 *   happy     — sunset orange (joyful)
 *   sleeping  — muted clay (dim)
 */
type ChidiExpression = "default" | "listening" | "thinking" | "happy" | "sleeping"

interface ChidiCharacterProps {
  size?: number
  className?: string
  expression?: ChidiExpression
}

const STATE_BG: Record<ChidiExpression, string> = {
  default:   "#C97D5E", // warm clay
  listening: "#E0A847", // honey
  thinking:  "#7FA68B", // sage
  happy:     "#FF8C42", // sunset
  sleeping:  "#A98266", // muted clay
}

const MARK_FG = "#F4DDC2" // warm cream — reads cleanly on every state

export function ChidiCharacter({ size = 32, className, expression = "default" }: ChidiCharacterProps) {
  const bg = STATE_BG[expression]
  // Mark sized as ~62% of the badge — confident presence without crowding edges
  const markSize = Math.round(size * 0.62)

  return (
    <div
      className={cn(
        "relative rounded-full flex items-center justify-center flex-shrink-0",
        "transition-colors duration-500",
        className,
      )}
      style={{ width: size, height: size, backgroundColor: bg, color: MARK_FG }}
      aria-hidden="true"
    >
      <ChidiMark size={markSize} />
      {/* Inner ring + subtle vignette for depth (Anthropic-style edge) */}
      <span
        className="absolute inset-0 pointer-events-none rounded-full"
        style={{
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.10), inset 0 -3px 8px rgba(0,0,0,0.14)",
        }}
      />
    </div>
  )
}

/**
 * ChidiAvatar — convenience wrapper that sizes ChidiCharacter to one of the
 * named slots. The character is now self-contained (its own gradient blob),
 * so the wrapper just maps size names to pixels and forwards expression.
 *
 * `tone` is preserved on the API for callsite compatibility but no longer
 * affects appearance — the expression-driven palette inside ChidiCharacter
 * is the single source of color.
 */
interface ChidiAvatarProps {
  size?: "sm" | "md" | "lg"
  tone?: "default" | "win" | "muted"
  className?: string
  expression?: "default" | "listening" | "thinking" | "happy" | "sleeping"
}

const AVATAR_SIZE_PX = { sm: 28, md: 36, lg: 48 } as const

export function ChidiAvatar({ size = "md", className, expression = "default" }: ChidiAvatarProps) {
  return (
    <ChidiCharacter
      size={AVATAR_SIZE_PX[size]}
      expression={expression}
      className={className}
    />
  )
}
