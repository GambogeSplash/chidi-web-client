"use client"

import { cn } from "@/lib/utils"

interface ChidiMarkProps {
  className?: string
  size?: number
  variant?: "default" | "win" | "muted"
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
export function ChidiMark({ className, size = 16, variant }: ChidiMarkProps) {
  const explicitFill =
    variant === "win"
      ? "var(--chidi-win)"
      : variant === "muted"
        ? "var(--chidi-text-muted)"
        : variant === "default"
          ? "var(--chidi-text-primary)"
          : undefined

  const fill = explicitFill || "currentColor"

  // Mascot v3 — a tilted teardrop "head" with a forward-leaning crest tuft,
  // one expressive eye, soft inner shading for depth, and a small chin tick
  // that gives the silhouette character at any size. Reads as a curious
  // forward-facing being, not a flat icon.
  //
  // Why teardrop + crest: the silhouette is recognizable in 14px (no eyebrows
  // or mouth needed at that scale — the crest + asymmetry alone read as
  // "Chidi"). At 32px+ the inner shading and eye add personality.
  const id = `chidi-mark-${size}`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("flex-shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        {/* Soft inner-shadow gradient — gives the form a hint of dimension
            without breaking the flat-illustration vocabulary of the app. */}
        <radialGradient id={`${id}-shade`} cx="0.62" cy="0.32" r="0.85">
          <stop offset="0%" stopColor="white" stopOpacity="0.18" />
          <stop offset="55%" stopColor="white" stopOpacity="0" />
          <stop offset="100%" stopColor="black" stopOpacity="0.18" />
        </radialGradient>
      </defs>

      {/* Forward-leaning crest tuft — Chidi's defining silhouette gesture */}
      <path
        d="M14.4 2.2 C 16.2 2.6, 17.0 4.4, 16.0 6.0 C 15.4 5.4, 14.4 4.6, 13.2 4.6 C 13.4 3.6, 13.7 2.8, 14.4 2.2 Z"
        fill={fill}
      />

      {/* Main head — asymmetric teardrop, weight on the bottom-left */}
      <path
        d="M12.3 4.2 C 17.7 4.0, 21.6 8.0, 21.4 13.4 C 21.2 18.6, 17.2 22.4, 11.8 22.5 C 6.4 22.6, 2.8 18.8, 3.2 13.5 C 3.6 8.4, 7.2 4.4, 12.3 4.2 Z"
        fill={fill}
      />

      {/* Inner shading overlay for depth */}
      <path
        d="M12.3 4.2 C 17.7 4.0, 21.6 8.0, 21.4 13.4 C 21.2 18.6, 17.2 22.4, 11.8 22.5 C 6.4 22.6, 2.8 18.8, 3.2 13.5 C 3.6 8.4, 7.2 4.4, 12.3 4.2 Z"
        fill={`url(#${id}-shade)`}
      />

      {/* Single forward eye — sits where attention lives, gives direction */}
      <ellipse
        cx="14.6"
        cy="12.4"
        rx="1.55"
        ry="1.85"
        fill="var(--background, #F7F5F3)"
      />
      <circle cx="15.0" cy="12.0" r="0.55" fill={fill} opacity="0.65" />

      {/* Soft cheek mark — a tiny crescent that warms the silhouette */}
      <path
        d="M8.6 14.8 Q 10.4 16.4, 12.6 15.6"
        stroke="var(--background, #F7F5F3)"
        strokeWidth="0.85"
        strokeLinecap="round"
        fill="none"
        opacity="0.78"
      />

      {/* Chin tick — breaks the bottom curve, adds character at every scale */}
      <path
        d="M11.4 21.6 Q 12.2 22.6, 13.0 21.6"
        stroke="var(--background, #F7F5F3)"
        strokeWidth="0.6"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
    </svg>
  )
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
