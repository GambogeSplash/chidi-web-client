"use client"

import { cn } from "@/lib/utils"
import {
  deriveTraits,
  BACKGROUND_PALETTE,
  SKIN_PALETTE,
  HAIR_PALETTE,
  MARK_PALETTE,
  type FaceShape,
  type HairStyle,
  type HairColor,
  type Accessory,
  type Expression,
  type BackgroundPattern,
  type Mark,
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
 * Customer character (v2 — expanded Gen Z vocabulary).
 *
 * 9 deterministic trait dimensions per seed (face, skin tone, hair style,
 * hair color, background palette, background pattern, accessory, expression,
 * cheek/face mark) → ~13.8M unique combinations. Same customer always
 * renders identically.
 *
 * Layer order (back → front):
 *   1. Background gradient — top→bottom radial-flavored linear
 *   2. Background pattern overlay — dots / stripes / halfmoon / starburst / wave
 *   3. Face fill (skin tone) + face stroke
 *   4. Mark — heart sticker / freckles / beauty spot / star tear
 *   5. Eyes + mouth (expression)
 *   6. Hair — base shape + optional color tip overlay
 *   7. Accessory — glasses / sunglasses / earrings / beanie / headphones / nose stud
 *
 * Drawn at 80×80 viewBox regardless of render size so strokes stay consistent.
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
  const skin = SKIN_PALETTE[traits.skinTone]
  const hairFill = HAIR_PALETTE[traits.hairColor].fill
  const hairTip = HAIR_PALETTE[traits.hairColor].tip
  const px = SIZE_PX[size]
  const pipPx = size === "xs" ? 6 : size === "sm" ? 8 : size === "md" ? 10 : size === "lg" ? 12 : 14
  const id = `cc-${hash(seed)}` // unique gradient/pattern ids per character

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
        className="rounded-full overflow-hidden"
      >
        <defs>
          {/* Background gradient — top→bottom for atmospheric depth */}
          <linearGradient id={`${id}-bg`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={palette.top} />
            <stop offset="100%" stopColor={palette.bottom} />
          </linearGradient>
          {/* Soft circular vignette overlay */}
          <radialGradient id={`${id}-vignette`} cx="50%" cy="40%" r="65%">
            <stop offset="60%" stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="black" stopOpacity="0.18" />
          </radialGradient>
          {/* Pattern primitives */}
          <pattern id={`${id}-dots`} width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="0.85" fill="white" opacity="0.22" />
          </pattern>
          <pattern id={`${id}-stripes`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="white" strokeWidth="1" opacity="0.18" />
          </pattern>
        </defs>

        {/* === 1. Background gradient === */}
        <circle cx="40" cy="40" r="40" fill={`url(#${id}-bg)`} />

        {/* === 2. Pattern overlay === */}
        <BackgroundPatternLayer kind={traits.pattern} id={id} />

        {/* Vignette for dimension */}
        <circle cx="40" cy="40" r="40" fill={`url(#${id}-vignette)`} />

        {/* === 3. Body / shoulders + face === */}
        <Shoulders strokeColor={skin.stroke} skinFill={skin.fill} />
        <Face shape={traits.face} skinFill={skin.fill} strokeColor={skin.stroke} />

        {/* === 4. Mark layer (under eyes for layering, drawn on top of skin) === */}
        <MarkLayer kind={traits.mark} face={traits.face} />

        {/* === 5. Eyes + mouth === */}
        <Eyes expression={traits.expression} strokeColor={skin.stroke} />
        <Mouth expression={traits.expression} strokeColor={skin.stroke} />

        {/* === 6. Hair === */}
        <Hair style={traits.hair} face={traits.face} hairFill={hairFill} hairTip={hairTip} strokeColor={skin.stroke} />

        {/* === 7. Accessory layer === */}
        <AccessoryLayer kind={traits.accessory} face={traits.face} strokeColor={skin.stroke} />
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
// Helpers + primitives
// =============================================================================

function hash(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) + s.charCodeAt(i)
    h = h & h
  }
  return Math.abs(h)
}

const STROKE_W = 2

interface PartProps {
  strokeColor: string
}

// ---- Background patterns ----------------------------------------------------

function BackgroundPatternLayer({ kind, id }: { kind: BackgroundPattern; id: string }) {
  if (kind === "solid") return null
  if (kind === "dots") {
    return <circle cx="40" cy="40" r="40" fill={`url(#${id}-dots)`} />
  }
  if (kind === "stripes") {
    return <circle cx="40" cy="40" r="40" fill={`url(#${id}-stripes)`} />
  }
  if (kind === "halfmoon") {
    return <path d="M0 40 A40 40 0 0 1 80 40 Z" fill="white" opacity="0.10" />
  }
  if (kind === "starburst") {
    return (
      <g opacity="0.12" stroke="white" strokeWidth="1.2" strokeLinecap="round">
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2
          const x = 40 + Math.cos(angle) * 28
          const y = 40 + Math.sin(angle) * 28
          return <line key={i} x1={x} y1={y} x2={40 + Math.cos(angle) * 38} y2={40 + Math.sin(angle) * 38} />
        })}
      </g>
    )
  }
  if (kind === "wave") {
    return (
      <g opacity="0.16" fill="white">
        <path d="M0 60 Q20 56 40 60 T80 60 L80 80 L0 80 Z" />
        <path d="M0 70 Q20 66 40 70 T80 70 L80 80 L0 80 Z" opacity="0.5" />
      </g>
    )
  }
  return null
}

// ---- Body + face ------------------------------------------------------------

function Shoulders({ strokeColor, skinFill }: PartProps & { skinFill: string }) {
  return (
    <g>
      {/* Solid shoulder mass — fills below the neckline so the gradient bg
          doesn't show through awkwardly between head and base */}
      <path
        d="M14 80 Q14 60 28 56 L52 56 Q66 60 66 80 Z"
        fill={skinFill}
        opacity="0.95"
      />
      <path
        d="M14 80 Q14 60 28 56 L52 56 Q66 60 66 80"
        stroke={strokeColor}
        strokeWidth={STROKE_W}
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
    </g>
  )
}

function Face({ shape, skinFill, strokeColor }: { shape: FaceShape; skinFill: string } & PartProps) {
  const stroke = { stroke: strokeColor, strokeWidth: STROKE_W }
  if (shape === "round") {
    return <circle cx="40" cy="38" r="17" fill={skinFill} {...stroke} />
  }
  if (shape === "soft-square") {
    return (
      <path
        d="M25 30 Q25 21 34 21 L46 21 Q55 21 55 30 L55 44 Q55 55 40 55 Q25 55 25 44 Z"
        fill={skinFill}
        {...stroke}
      />
    )
  }
  if (shape === "heart") {
    // Heart-shaped face: wider top, pointed chin
    return (
      <path
        d="M22 30 Q22 20 32 20 Q40 20 40 26 Q40 20 48 20 Q58 20 58 30 L58 38 Q58 50 40 56 Q22 50 22 38 Z"
        fill={skinFill}
        {...stroke}
      />
    )
  }
  // oval (default)
  return (
    <ellipse cx="40" cy="38" rx="14" ry="17" fill={skinFill} {...stroke} />
  )
}

// ---- Eyes + mouth -----------------------------------------------------------

function Eyes({ expression, strokeColor }: { expression: Expression } & PartProps) {
  if (expression === "smile") {
    // Closed crescent eyes (smile lines)
    return (
      <g stroke={strokeColor} strokeWidth={STROKE_W} fill="none" strokeLinecap="round">
        <path d="M31 38 Q34 35 37 38" />
        <path d="M43 38 Q46 35 49 38" />
      </g>
    )
  }
  if (expression === "wink") {
    return (
      <g stroke={strokeColor} strokeWidth={STROKE_W} fill={strokeColor} strokeLinecap="round">
        <circle cx="34" cy="38" r="1.6" />
        <path d="M43 38 Q46 35 49 38" fill="none" />
      </g>
    )
  }
  if (expression === "cool") {
    // Slight downward tilt for "low gaze"
    return (
      <g stroke={strokeColor} strokeWidth={STROKE_W} strokeLinecap="round">
        <path d="M31 39 L37 39" />
        <path d="M43 39 L49 39" />
      </g>
    )
  }
  if (expression === "surprised") {
    return (
      <g fill={strokeColor}>
        <ellipse cx="34" cy="38" rx="1.4" ry="1.9" />
        <ellipse cx="46" cy="38" rx="1.4" ry="1.9" />
      </g>
    )
  }
  if (expression === "smirk") {
    return (
      <g stroke={strokeColor} strokeWidth={STROKE_W} strokeLinecap="round" fill={strokeColor}>
        <circle cx="34" cy="38" r="1.5" />
        <circle cx="46" cy="38" r="1.5" />
      </g>
    )
  }
  // calm (default)
  return (
    <g fill={strokeColor}>
      <circle cx="34" cy="38" r="1.7" />
      <circle cx="46" cy="38" r="1.7" />
    </g>
  )
}

function Mouth({ expression, strokeColor }: { expression: Expression } & PartProps) {
  const stroke = { stroke: strokeColor, strokeWidth: STROKE_W, strokeLinecap: "round" as const, fill: "none" }
  if (expression === "smile") return <path d="M35 47 Q40 51 45 47" {...stroke} />
  if (expression === "wink") return <path d="M36 47 Q40 50 44 47" {...stroke} />
  if (expression === "cool") return <path d="M36 47 L44 47" {...stroke} />
  if (expression === "surprised") return <ellipse cx="40" cy="48" rx="2" ry="2.5" {...stroke} />
  if (expression === "smirk") return <path d="M37 47 Q40 49 44 46" {...stroke} />
  // calm
  return <path d="M37 47 L43 47" {...stroke} />
}

// ---- Mark layer (cheek stickers, freckles, etc) -----------------------------

function MarkLayer({ kind, face }: { kind: Mark; face: FaceShape }) {
  if (kind === "none") return null
  const cheekY = face === "heart" ? 42 : 44

  if (kind === "heart-cheek") {
    return (
      <path
        d={`M28 ${cheekY} q -1.2 -1.5, 0 -2.5 q 1.2 -1, 1.5 0 q 0.3 -1, 1.5 0 q 1.2 1, 0 2.5 q -1.2 1.2 -3 0`}
        fill={MARK_PALETTE["heart-cheek"]}
        opacity="0.92"
      />
    )
  }
  if (kind === "freckles") {
    return (
      <g fill={MARK_PALETTE.freckles} opacity="0.65">
        <circle cx="33" cy="42" r="0.5" />
        <circle cx="35.5" cy="43" r="0.4" />
        <circle cx="44.5" cy="43" r="0.4" />
        <circle cx="47" cy="42" r="0.5" />
        <circle cx="40" cy="43" r="0.45" />
      </g>
    )
  }
  if (kind === "beauty-spot") {
    return <circle cx="46" cy={cheekY + 1} r="0.85" fill={MARK_PALETTE["beauty-spot"]} />
  }
  if (kind === "star-tear") {
    // Tiny gold star under the right eye
    return (
      <path
        d="M48 41 l 0.7 1.2 l 1.3 0.2 l -0.95 0.95 l 0.22 1.3 l -1.27 -0.62 l -1.27 0.62 l 0.22 -1.3 l -0.95 -0.95 l 1.3 -0.2 z"
        fill={MARK_PALETTE["star-tear"]}
        opacity="0.95"
      />
    )
  }
  return null
}

// ---- Hair -------------------------------------------------------------------

function Hair({
  style,
  face,
  hairFill,
  hairTip,
  strokeColor,
}: {
  style: HairStyle
  face: FaceShape
  hairFill: string
  hairTip?: string
  strokeColor: string
}) {
  const topY = face === "round" ? 22 : face === "soft-square" ? 22 : face === "heart" ? 21 : 21

  // Helper: render the base hair shape, optionally with a colored tip overlay
  const withTip = (basePath: string, tipPath?: string) => (
    <g>
      <path d={basePath} fill={hairFill} stroke={strokeColor} strokeWidth="1" opacity="0.96" />
      {hairTip && tipPath && <path d={tipPath} fill={hairTip} opacity="0.92" />}
    </g>
  )

  if (style === "low-cut") {
    return (
      <path
        d={`M22 ${topY + 6} Q24 ${topY - 4} 40 ${topY - 6} Q56 ${topY - 4} 58 ${topY + 6}`}
        fill={hairFill}
      />
    )
  }

  if (style === "buzz") {
    // Just a soft cap of color across the top
    return (
      <path
        d={`M24 ${topY + 4} Q26 ${topY - 1} 40 ${topY - 3} Q54 ${topY - 1} 56 ${topY + 4}`}
        fill={hairFill}
        opacity="0.92"
      />
    )
  }

  if (style === "afro") {
    return (
      <g>
        <path
          d={`M20 ${topY + 6} Q15 ${topY - 8} 28 ${topY - 14} Q34 ${topY - 18} 40 ${topY - 18} Q46 ${topY - 18} 52 ${topY - 14} Q65 ${topY - 8} 60 ${topY + 6}`}
          fill={hairFill}
        />
        {/* Texture clusters */}
        <g fill={hairFill}>
          <circle cx="26" cy={topY - 8} r="3.5" />
          <circle cx="40" cy={topY - 14} r="4" />
          <circle cx="54" cy={topY - 8} r="3.5" />
        </g>
        {hairTip && (
          <g fill={hairTip} opacity="0.9">
            <circle cx="26" cy={topY - 12} r="2" />
            <circle cx="54" cy={topY - 12} r="2" />
          </g>
        )}
      </g>
    )
  }

  if (style === "bob") {
    // Sleek chin-length bob with a strong silhouette
    return withTip(
      `M22 ${topY + 8} Q22 ${topY - 4} 40 ${topY - 6} Q58 ${topY - 4} 58 ${topY + 8} L58 50 Q58 52 56 52 L24 52 Q22 52 22 50 Z`,
      hairTip ? `M22 48 Q22 52 24 52 L56 52 Q58 52 58 48 L58 50 L22 50 Z` : undefined,
    )
  }

  if (style === "fringe") {
    // Forehead fringe + side curtain
    return (
      <g>
        <path
          d={`M22 ${topY + 8} Q22 ${topY - 4} 40 ${topY - 6} Q58 ${topY - 4} 58 ${topY + 8} Z`}
          fill={hairFill}
        />
        {/* Fringe falling over forehead */}
        <path
          d={`M28 ${topY + 6} Q40 ${topY + 16} 52 ${topY + 6} L52 ${topY + 12} Q40 ${topY + 22} 28 ${topY + 12} Z`}
          fill={hairFill}
        />
        {hairTip && (
          <path d={`M28 ${topY + 11} Q40 ${topY + 21} 52 ${topY + 11} L52 ${topY + 12} Q40 ${topY + 22} 28 ${topY + 12} Z`} fill={hairTip} opacity="0.95" />
        )}
      </g>
    )
  }

  if (style === "twists") {
    return (
      <g>
        <path
          d={`M22 ${topY + 6} Q20 ${topY - 6} 40 ${topY - 8} Q60 ${topY - 6} 58 ${topY + 6}`}
          fill={hairFill}
        />
        {/* Twist strands as small ovals */}
        <g fill={hairFill}>
          <ellipse cx="26" cy={topY - 4} rx="2" ry="3.5" />
          <ellipse cx="32" cy={topY - 8} rx="2" ry="3.5" />
          <ellipse cx="40" cy={topY - 10} rx="2" ry="3.5" />
          <ellipse cx="48" cy={topY - 8} rx="2" ry="3.5" />
          <ellipse cx="54" cy={topY - 4} rx="2" ry="3.5" />
        </g>
      </g>
    )
  }

  if (style === "bantu-knots") {
    return (
      <g>
        <path
          d={`M22 ${topY + 6} Q22 ${topY - 4} 40 ${topY - 6} Q58 ${topY - 4} 58 ${topY + 6}`}
          fill={hairFill}
        />
        {/* 4 bantu knots arrayed across the top */}
        <g fill={hairFill}>
          <circle cx="28" cy={topY - 8} r="3.5" />
          <circle cx="36" cy={topY - 11} r="3.5" />
          <circle cx="44" cy={topY - 11} r="3.5" />
          <circle cx="52" cy={topY - 8} r="3.5" />
        </g>
      </g>
    )
  }

  if (style === "halo-braid") {
    return (
      <g>
        <path
          d={`M22 ${topY + 6} Q22 ${topY - 6} 40 ${topY - 7} Q58 ${topY - 6} 58 ${topY + 6}`}
          fill={hairFill}
        />
        {/* Halo braid as a ring above the head */}
        <ellipse cx="40" cy={topY - 6} rx="20" ry="6" fill="none" stroke={hairFill} strokeWidth="4" />
        <ellipse cx="40" cy={topY - 6} rx="20" ry="6" fill="none" stroke="white" strokeWidth="0.8" opacity="0.3" strokeDasharray="2 3" />
      </g>
    )
  }

  if (style === "braids") {
    return (
      <g>
        <path
          d={`M22 ${topY + 6} Q22 ${topY - 4} 40 ${topY - 6} Q58 ${topY - 4} 58 ${topY + 6}`}
          fill={hairFill}
        />
        {/* Hanging braids on each side */}
        <g stroke={hairFill} strokeWidth="2.5" strokeLinecap="round">
          <line x1="22" y1={topY + 8} x2="20" y2="62" />
          <line x1="58" y1={topY + 8} x2="60" y2="62" />
          <line x1="26" y1={topY + 6} x2="25" y2="50" />
          <line x1="54" y1={topY + 6} x2="55" y2="50" />
        </g>
        {hairTip && (
          <g fill={hairTip}>
            <circle cx="20" cy="62" r="2" />
            <circle cx="60" cy="62" r="2" />
          </g>
        )}
      </g>
    )
  }

  if (style === "locs") {
    return (
      <g>
        <path d={`M22 ${topY + 6} Q22 ${topY - 6} 40 ${topY - 8} Q58 ${topY - 6} 58 ${topY + 6}`} fill={hairFill} />
        {/* Loc strands flowing down sides */}
        <g stroke={hairFill} strokeWidth="2.2" fill="none" strokeLinecap="round">
          <path d={`M24 ${topY + 4} Q22 30 24 42 Q22 50 25 56`} />
          <path d={`M30 ${topY + 4} Q28 32 30 46`} />
          <path d={`M50 ${topY + 4} Q52 32 50 46`} />
          <path d={`M56 ${topY + 4} Q58 30 56 42 Q58 50 55 56`} />
        </g>
      </g>
    )
  }

  if (style === "headwrap") {
    // Wrapped fabric — uses the hairFill BUT also a contrast highlight
    return (
      <g>
        <path d="M22 30 Q22 16 40 14 Q58 16 58 30 L56 30 Q56 22 40 20 Q24 22 24 30 Z" fill={hairFill} opacity="0.95" />
        <path d="M52 16 Q58 14 60 18 Q56 20 54 18 Z" fill={hairFill} opacity="0.95" />
        <path d="M28 26 L52 26" stroke="white" strokeWidth="1" opacity="0.4" />
      </g>
    )
  }

  // gele — tall, sculptural headwrap
  return (
    <g>
      <path d="M18 28 Q14 6 40 4 Q66 6 62 28 L58 28 Q58 12 40 10 Q22 12 22 28 Z" fill={hairFill} opacity="0.96" />
      <path d="M22 12 Q40 -2 58 12" stroke={hairFill} strokeWidth="1.5" fill="none" />
      <path d="M28 10 Q40 2 52 10" stroke={hairFill} strokeWidth="1" fill="none" opacity="0.7" />
      <path d="M30 22 L50 22" stroke="white" strokeWidth="1" opacity="0.35" />
    </g>
  )
}

// ---- Accessories ------------------------------------------------------------

function AccessoryLayer({
  kind,
  face,
  strokeColor,
}: { kind: Accessory; face: FaceShape } & PartProps) {
  if (kind === "none") return null

  if (kind === "glasses-round") {
    return (
      <g stroke={strokeColor} strokeWidth={STROKE_W} fill="none">
        <circle cx="34" cy="38" r="4.5" />
        <circle cx="46" cy="38" r="4.5" />
        <line x1="38.5" y1="38" x2="41.5" y2="38" strokeLinecap="round" />
      </g>
    )
  }

  if (kind === "sunglasses") {
    // Bold dark-lens shades (Y2K cool)
    return (
      <g>
        <rect x="29" y="34" width="11" height="6" rx="2" fill="#0F0A0A" />
        <rect x="40" y="34" width="11" height="6" rx="2" fill="#0F0A0A" />
        <line x1="40" y1="36.5" x2="40" y2="38" stroke="#0F0A0A" strokeWidth="1.2" />
        {/* Highlight glints */}
        <line x1="31" y1="35.5" x2="33.5" y2="35.5" stroke="white" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
        <line x1="42" y1="35.5" x2="44.5" y2="35.5" stroke="white" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
      </g>
    )
  }

  if (kind === "earring-stud") {
    return (
      <g>
        <circle cx="25" cy="46" r="1.6" fill={strokeColor} />
        <circle cx="55" cy="46" r="1.6" fill={strokeColor} />
      </g>
    )
  }

  if (kind === "earring-hoop") {
    return (
      <g stroke={strokeColor} strokeWidth="1.4" fill="none">
        <ellipse cx="24" cy="48" rx="2" ry="3" />
        <ellipse cx="56" cy="48" rx="2" ry="3" />
      </g>
    )
  }

  if (kind === "beanie") {
    // Snug colored beanie covering the top
    return (
      <g>
        <path
          d="M22 28 Q22 14 40 12 Q58 14 58 28 L58 32 Q58 26 40 24 Q22 26 22 32 Z"
          fill="#3F2A18"
          opacity="0.95"
        />
        {/* Cuff fold */}
        <path d="M22 26 L58 26 L58 32 L22 32 Z" fill="#5A3A22" opacity="0.9" />
        {/* Knit ridge highlights */}
        <line x1="24" y1="30" x2="56" y2="30" stroke="white" strokeWidth="0.8" opacity="0.18" />
      </g>
    )
  }

  if (kind === "headphones") {
    return (
      <g>
        {/* Headband arc */}
        <path
          d="M16 36 Q16 14 40 12 Q64 14 64 36"
          stroke="#0F0A0A"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        {/* Cans on each side */}
        <rect x="13" y="34" width="6" height="10" rx="2" fill="#1A1A1A" />
        <rect x="61" y="34" width="6" height="10" rx="2" fill="#1A1A1A" />
        {/* Highlight on cans */}
        <line x1="14.5" y1="36" x2="14.5" y2="42" stroke="white" strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
        <line x1="65.5" y1="36" x2="65.5" y2="42" stroke="white" strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
      </g>
    )
  }

  if (kind === "nose-stud") {
    return <circle cx="42" cy="44" r="0.8" fill={strokeColor} />
  }

  return null
}
