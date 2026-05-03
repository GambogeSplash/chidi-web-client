"use client"

/**
 * BusinessAvatar = brand mark (square, geometric, optional monogram at lg/xl).
 * CustomerAvatar = person mark (round, initials, warm tone).
 * Never use one in the other's slot — businesses are rectangles, people are circles.
 */

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"

interface BusinessAvatarProps {
  name: string
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  className?: string
  /** Optional override for the monogram — defaults to first letter of `name`.
      Pass a different string (or an empty string to suppress) when you need
      to display a variant seed but keep the merchant's real initial. */
  monogramOverride?: string
}

const AVATAR_SEED_KEY = "chidi_business_avatar_seed"
const AVATAR_SEED_EVENT = "chidi-business-avatar-seed-change"

/**
 * useBusinessAvatarSeed — single source of truth for the merchant's chosen
 * avatar variant. Returns the seed string to render with (the picked variant
 * if any, else falls back to the businessName). Stays in sync across the app
 * via a custom event so nav-rail + settings + workspace switcher all swap
 * together when the user picks a new avatar.
 *
 * Local-storage only for now — swap for backend field when one exists.
 */
export function useBusinessAvatarSeed(businessName: string): {
  seed: string
  variantSeed: string | null
  setVariantSeed: (seed: string | null) => void
} {
  const [variantSeed, setVariant] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const read = () => {
      const stored = localStorage.getItem(AVATAR_SEED_KEY)
      setVariant(stored && stored.length > 0 ? stored : null)
    }
    read()
    const onChange = () => read()
    window.addEventListener(AVATAR_SEED_EVENT, onChange)
    window.addEventListener("storage", onChange)
    return () => {
      window.removeEventListener(AVATAR_SEED_EVENT, onChange)
      window.removeEventListener("storage", onChange)
    }
  }, [])

  const setVariantSeed = (seed: string | null) => {
    setVariant(seed)
    if (typeof window === "undefined") return
    if (seed) localStorage.setItem(AVATAR_SEED_KEY, seed)
    else localStorage.removeItem(AVATAR_SEED_KEY)
    window.dispatchEvent(new Event(AVATAR_SEED_EVENT))
  }

  return { seed: variantSeed ?? businessName, variantSeed, setVariantSeed }
}

/**
 * BusinessAvatar — generative workspace identity built on the Necter
 * miner-avatar pattern (`/Users/fubara/necter/mining-app-store/lib/miner-avatar.ts`).
 *
 * Composition (deterministic from the business name):
 *   1. Linear-gradient background between two palette colors at a seeded angle
 *   2. 4×4 mirrored grid of rounded rectangles in cream at varying opacity
 *      (left half is generated, right half is the horizontal mirror — gives a
 *      "designed not random" feeling vs unmirrored noise)
 *   3. Optional center accent (small circle or diamond), 50% chance
 *   4. Subtle inner ring for depth
 *
 * Six warm Lagos palette pairs. Variable cell border-radius. Variable
 * cell opacity. No two businesses look the same; the same business always
 * looks the same.
 */

interface PalettePair {
  a: string
  b: string
}

const PALETTES: PalettePair[] = [
  { a: "#E55B3C", b: "#3F1808" }, // sunset → dark
  { a: "#F5B14C", b: "#3F2308" }, // honey → dark
  { a: "#3B5FB5", b: "#0F1F4F" }, // royal → navy
  { a: "#F08880", b: "#4F1814" }, // coral → wine
  { a: "#7FB47F", b: "#1F4023" }, // sage → forest
  { a: "#9B6FAF", b: "#2F1840" }, // plum → deep
  { a: "#2DA1A5", b: "#0A3F40" }, // teal → deep teal
  { a: "#FF8C42", b: "#4F2008" }, // sunset orange → rust
]

const SIZE_MAP = {
  // Always rounded-square (never round) — that alone reads as "not a person".
  // Smaller sizes have tighter radius so the brand-mark feeling holds.
  xs: { box: "w-6 h-6", radius: "rounded-[5px]", showMonogram: false, monoSize: 0 },
  sm: { box: "w-8 h-8", radius: "rounded-md", showMonogram: false, monoSize: 0 },
  md: { box: "w-10 h-10", radius: "rounded-md", showMonogram: false, monoSize: 0 },
  lg: { box: "w-14 h-14", radius: "rounded-lg", showMonogram: true, monoSize: 22 },
  xl: { box: "w-20 h-20", radius: "rounded-xl", showMonogram: true, monoSize: 32 },
}

export function BusinessAvatar({
  name,
  size = "md",
  className,
  monogramOverride,
}: BusinessAvatarProps) {
  const composition = useMemo(() => deriveComposition(name), [name])
  const { box, radius, showMonogram, monoSize } = SIZE_MAP[size]
  // Monogram = first letter of business name (or override). Suppressed when
  // override is "" — useful in pickers showing variant seeds. Never shown
  // at xs/sm (would feel cramped).
  const monogramSource =
    monogramOverride !== undefined ? monogramOverride : name
  const monogram = (monogramSource || "").trim().charAt(0).toUpperCase()

  return (
    <span
      className={cn(
        "relative flex-shrink-0 overflow-hidden",
        box,
        radius,
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient
            id={`bg-${composition.id}`}
            gradientTransform={`rotate(${composition.gradientAngle} 0.5 0.5)`}
            x1="0"
            y1="0"
            x2="1"
            y2="0"
          >
            <stop offset="0%" stopColor={composition.palette.a} />
            <stop offset="100%" stopColor={composition.palette.b} />
          </linearGradient>
        </defs>

        {/* Gradient background */}
        <rect width="100" height="100" fill={`url(#bg-${composition.id})`} />

        {/* 4×4 mirrored grid */}
        {composition.cells.map((cell, i) => (
          <rect
            key={i}
            x={cell.x}
            y={cell.y}
            width={cell.size}
            height={cell.size}
            rx={cell.radius}
            fill="#F4DDC2"
            opacity={cell.opacity}
          />
        ))}

        {/* Optional center accent — suppressed when monogram is shown so the
            letter has room to breathe */}
        {!showMonogram && composition.accent === "circle" && (
          <circle cx="50" cy="50" r="9" fill="#F4DDC2" opacity="0.45" />
        )}
        {!showMonogram && composition.accent === "diamond" && (
          <rect
            x="42"
            y="42"
            width="16"
            height="16"
            fill="#F4DDC2"
            opacity="0.45"
            transform="rotate(45 50 50)"
          />
        )}

        {/* Monogram — strong serif overlay at lg/xl. Acts as a brand initial,
            like a logo's wordmark in miniature. */}
        {showMonogram && monogram && (
          <text
            x="50"
            y="50"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#F4DDC2"
            fillOpacity={0.92}
            fontSize={monoSize * 1.45}
            fontFamily='ui-serif, "ivypresto-display", Georgia, "Times New Roman", serif'
            fontWeight={500}
            style={{ letterSpacing: "-0.02em" }}
          >
            {monogram}
          </text>
        )}
      </svg>

      {/* Inner highlight + ring for depth — top-edge highlight reads as
          "designed", not "generated" */}
      <span
        className="absolute inset-x-0 top-0 h-1/2 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(255,255,255,0.10), rgba(255,255,255,0))",
          borderTopLeftRadius: "inherit",
          borderTopRightRadius: "inherit",
        }}
      />
      <span
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.10), inset 0 -1px 0 0 rgba(0,0,0,0.18)",
          borderRadius: "inherit",
        }}
      />
    </span>
  )
}

interface CellSpec {
  x: number
  y: number
  size: number
  radius: number
  opacity: number
}

interface Composition {
  id: string
  palette: PalettePair
  gradientAngle: number
  cells: CellSpec[]
  accent: "circle" | "diamond" | null
}

function deriveComposition(name: string): Composition {
  // FNV-1a 32-bit seed
  let h = 2166136261
  const seed = name || "?"
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }

  const palette = PALETTES[Math.abs(h) % PALETTES.length]
  const gradientAngle = ((h >>> 4) & 0xff) * (360 / 256)

  // 4×4 grid centered in viewBox.
  // Total grid: 80×80 in the middle of 100×100 (10px margin each side).
  // Cell size 18, gap 2, so 4 cells = 18*4 + 2*3 = 78. Adjust margin to 11.
  const gridStart = 11
  const cellSize = 18
  const cellGap = 2

  // Generate left half (cols 0, 1) deterministically; right half (cols 2, 3) mirrors.
  const cells: CellSpec[] = []
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 2; col++) {
      const idx = row * 2 + col
      // ~66% fill (Necter pattern)
      const fillBit = (h >>> (idx * 3)) & 0x7
      if (fillBit < 5) {
        const opacity = 0.55 + (((h >>> (idx * 5)) & 0xf) / 15) * 0.45
        const radius = 2 + (((h >>> (idx * 7)) & 0x3))
        const xLeft = gridStart + col * (cellSize + cellGap)
        const y = gridStart + row * (cellSize + cellGap)
        const xRight = gridStart + (3 - col) * (cellSize + cellGap)
        cells.push({ x: xLeft, y, size: cellSize, radius, opacity })
        cells.push({ x: xRight, y, size: cellSize, radius, opacity })
      }
    }
  }

  // Center accent: 33% chance circle, 33% chance diamond, 33% chance none
  const accentBit = (h >>> 11) & 0x3
  const accent = accentBit === 0 ? "circle" : accentBit === 1 ? "diamond" : null

  return {
    id: String(Math.abs(h)),
    palette,
    gradientAngle,
    cells,
    accent,
  }
}
