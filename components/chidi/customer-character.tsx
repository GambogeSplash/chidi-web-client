"use client"

import { cn } from "@/lib/utils"
import {
  deriveTraits,
  BACKGROUND_PALETTE,
  type FaceShape,
  type HairStyle,
  type Accessory,
  type Expression,
} from "@/lib/chidi/character-seed"

interface CustomerCharacterProps {
  name?: string | null
  fallbackId?: string
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  className?: string
  status?: "online" | "away" | null
}

const SIZE_PX = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
} as const

/**
 * Customer character — composed line-drawn SVG illustration. Replaces the
 * letter-initials avatar in inbox rows, orders, profile rail. Same customer
 * always shows the same character.
 *
 * Built from primitives in chidi-character-parts.tsx. Drawn at 80x80 viewBox
 * regardless of render size so strokes stay consistent.
 */
export function CustomerCharacter({
  name,
  fallbackId = "customer",
  size = "md",
  className,
  status = null,
}: CustomerCharacterProps) {
  const seed = name?.trim() || fallbackId
  const traits = deriveTraits(seed)
  const palette = BACKGROUND_PALETTE[traits.bgIndex]
  const px = SIZE_PX[size]
  const pipPx = size === "xs" ? 6 : size === "sm" ? 8 : size === "md" ? 10 : size === "lg" ? 12 : 14

  return (
    <span
      className={cn("relative inline-flex flex-shrink-0", className)}
      style={{ width: px, height: px }}
      role="img"
      aria-label={name ? `${name}'s avatar` : undefined}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="rounded-full"
      >
        {/* Background — textile tone */}
        <circle cx="40" cy="40" r="40" fill={palette.bg} />

        {/* Shoulders / body — small "shirt collar" arc at the bottom */}
        <Shoulders strokeColor={palette.stroke} />

        {/* Face — shape varies */}
        <Face shape={traits.face} strokeColor={palette.stroke} />

        {/* Eyes + mouth — expression */}
        <Eyes expression={traits.expression} strokeColor={palette.stroke} />
        <Mouth expression={traits.expression} strokeColor={palette.stroke} />

        {/* Hair — drawn over the head */}
        <Hair style={traits.hair} face={traits.face} strokeColor={palette.stroke} />

        {/* Accessory layer — last, sits on top */}
        <AccessoryLayer kind={traits.accessory} face={traits.face} strokeColor={palette.stroke} />
      </svg>

      {status === "online" && (
        <span
          className="absolute bottom-0 right-0 rounded-full ring-2 ring-[var(--card)]"
          style={{ width: pipPx, height: pipPx, backgroundColor: "var(--chidi-success)" }}
        />
      )}
      {status === "away" && (
        <span
          className="absolute bottom-0 right-0 rounded-full ring-2 ring-[var(--card)]"
          style={{ width: pipPx, height: pipPx, backgroundColor: "var(--chidi-text-muted)" }}
        />
      )}
    </span>
  )
}

// =============================================================================
// Primitive parts. Each part takes a strokeColor + reads from the palette.
// All paths drawn against an 80x80 viewBox.
// =============================================================================

const STROKE_W = 2

interface PartProps {
  strokeColor: string
}

function Shoulders({ strokeColor }: PartProps) {
  // A gentle arc suggesting shoulders + neckline at the bottom of the circle
  return (
    <path
      d="M14 76 Q14 62 26 58 L54 58 Q66 62 66 76"
      stroke={strokeColor}
      strokeWidth={STROKE_W}
      fill="none"
      strokeLinecap="round"
    />
  )
}

function Face({ shape, strokeColor }: { shape: FaceShape } & PartProps) {
  if (shape === "round") {
    return <circle cx="40" cy="38" r="16" stroke={strokeColor} strokeWidth={STROKE_W} fill="none" />
  }
  if (shape === "soft-square") {
    return (
      <path
        d="M26 30 Q26 22 34 22 L46 22 Q54 22 54 30 L54 44 Q54 54 40 54 Q26 54 26 44 Z"
        stroke={strokeColor}
        strokeWidth={STROKE_W}
        fill="none"
      />
    )
  }
  // oval (default) — slightly taller than round
  return (
    <ellipse cx="40" cy="38" rx="14" ry="17" stroke={strokeColor} strokeWidth={STROKE_W} fill="none" />
  )
}

function Eyes({ expression, strokeColor }: { expression: Expression } & PartProps) {
  if (expression === "smile") {
    // Closed crescent eyes for a smile
    return (
      <g stroke={strokeColor} strokeWidth={STROKE_W} fill="none" strokeLinecap="round">
        <path d="M32 38 Q34 36 36 38" />
        <path d="M44 38 Q46 36 48 38" />
      </g>
    )
  }
  return (
    <g fill={strokeColor}>
      <circle cx="34" cy="38" r="1.6" />
      <circle cx="46" cy="38" r="1.6" />
    </g>
  )
}

function Mouth({ expression, strokeColor }: { expression: Expression } & PartProps) {
  if (expression === "smile") {
    return (
      <path
        d="M35 46 Q40 50 45 46"
        stroke={strokeColor}
        strokeWidth={STROKE_W}
        fill="none"
        strokeLinecap="round"
      />
    )
  }
  return (
    <path
      d="M37 46 L43 46"
      stroke={strokeColor}
      strokeWidth={STROKE_W}
      fill="none"
      strokeLinecap="round"
    />
  )
}

function Hair({ style, face, strokeColor }: { style: HairStyle; face: FaceShape } & PartProps) {
  // Rough headtop y depending on face shape
  const topY = face === "round" ? 22 : face === "soft-square" ? 22 : 21

  if (style === "low-cut") {
    return (
      <path
        d={`M24 ${topY + 6} Q26 ${topY - 2} 40 ${topY - 4} Q54 ${topY - 2} 56 ${topY + 6}`}
        stroke={strokeColor}
        strokeWidth={STROKE_W}
        fill={strokeColor}
        opacity="0.85"
      />
    )
  }

  if (style === "afro") {
    return (
      <g stroke={strokeColor} strokeWidth={STROKE_W} fill={strokeColor} opacity="0.85">
        <path d={`M22 ${topY + 4} Q18 ${topY - 6} 28 ${topY - 10} Q34 ${topY - 14} 40 ${topY - 14} Q46 ${topY - 14} 52 ${topY - 10} Q62 ${topY - 6} 58 ${topY + 4}`} />
        <circle cx="26" cy={topY - 4} r="3" fill={strokeColor} />
        <circle cx="40" cy={topY - 10} r="3.5" fill={strokeColor} />
        <circle cx="54" cy={topY - 4} r="3" fill={strokeColor} />
      </g>
    )
  }

  if (style === "braids") {
    return (
      <g stroke={strokeColor} strokeWidth={STROKE_W}>
        {/* Top crown */}
        <path
          d={`M24 ${topY + 6} Q24 ${topY - 4} 40 ${topY - 6} Q56 ${topY - 4} 56 ${topY + 6}`}
          fill={strokeColor}
          opacity="0.85"
        />
        {/* Hanging braids on each side */}
        <line x1="24" y1={topY + 8} x2="22" y2="60" strokeLinecap="round" />
        <line x1="56" y1={topY + 8} x2="58" y2="60" strokeLinecap="round" />
        <line x1="20" y1="60" x2="22" y2="64" strokeLinecap="round" />
        <line x1="60" y1="60" x2="58" y2="64" strokeLinecap="round" />
      </g>
    )
  }

  if (style === "locs") {
    return (
      <g stroke={strokeColor} strokeWidth={STROKE_W} fill="none" strokeLinecap="round">
        <path d={`M22 ${topY + 6} Q22 ${topY - 6} 40 ${topY - 8} Q58 ${topY - 6} 58 ${topY + 6}`} fill={strokeColor} opacity="0.85" />
        {/* Loc strands going down sides */}
        <path d={`M24 ${topY + 4} Q22 30 24 42 Q22 50 25 56`} />
        <path d={`M30 ${topY + 4} Q28 32 30 46`} />
        <path d={`M50 ${topY + 4} Q52 32 50 46`} />
        <path d={`M56 ${topY + 4} Q58 30 56 42 Q58 50 55 56`} />
      </g>
    )
  }

  if (style === "headwrap") {
    // Wrapped fabric covering the top of the head — colored band
    return (
      <g>
        <path
          d="M22 30 Q22 16 40 14 Q58 16 58 30 L56 30 Q56 22 40 20 Q24 22 24 30 Z"
          fill={strokeColor}
          opacity="0.9"
        />
        {/* Knot/twist hint at top-right */}
        <path d="M52 16 Q58 14 60 18 Q56 20 54 18 Z" fill={strokeColor} opacity="0.9" />
        <path d="M28 26 L52 26" stroke="white" strokeWidth="1" opacity="0.4" />
      </g>
    )
  }

  // gele — tall, sculptural headwrap, very Lagos
  return (
    <g>
      <path
        d="M18 28 Q14 8 40 6 Q66 8 62 28 L58 28 Q58 14 40 12 Q22 14 22 28 Z"
        fill={strokeColor}
        opacity="0.92"
      />
      {/* Sculpted fan detail at the top */}
      <path d="M22 14 Q40 -2 58 14" stroke={strokeColor} strokeWidth="1.5" fill="none" />
      <path d="M28 12 Q40 4 52 12" stroke={strokeColor} strokeWidth="1" fill="none" opacity="0.6" />
      <path d="M30 22 L50 22" stroke="white" strokeWidth="1" opacity="0.35" />
    </g>
  )
}

function AccessoryLayer({ kind, face, strokeColor }: { kind: Accessory; face: FaceShape } & PartProps) {
  if (kind === "none") return null

  if (kind === "glasses") {
    return (
      <g stroke={strokeColor} strokeWidth={STROKE_W} fill="none">
        <circle cx="34" cy="38" r="4" />
        <circle cx="46" cy="38" r="4" />
        <line x1="38" y1="38" x2="42" y2="38" strokeLinecap="round" />
      </g>
    )
  }

  if (kind === "earring") {
    return (
      <g stroke={strokeColor} strokeWidth={STROKE_W} fill="none">
        <circle cx="25" cy="45" r="1.6" fill={strokeColor} />
        <circle cx="55" cy="45" r="1.6" fill={strokeColor} />
      </g>
    )
  }

  if (kind === "hat-cap") {
    // Simple cap brim above the head
    return (
      <g fill={strokeColor} opacity="0.92">
        <path d="M20 24 Q40 8 60 24 L60 26 L20 26 Z" />
        {/* Brim */}
        <path d="M14 26 L66 26 Q66 30 60 30 L20 30 Q14 30 14 26 Z" />
      </g>
    )
  }

  return null
}
