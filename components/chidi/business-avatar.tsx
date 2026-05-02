"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"

interface BusinessAvatarProps {
  name: string
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  className?: string
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
  xs: { box: "w-6 h-6", radius: "rounded-md" },
  sm: { box: "w-8 h-8", radius: "rounded-lg" },
  md: { box: "w-10 h-10", radius: "rounded-lg" },
  lg: { box: "w-14 h-14", radius: "rounded-xl" },
  xl: { box: "w-20 h-20", radius: "rounded-2xl" },
}

export function BusinessAvatar({ name, size = "md", className }: BusinessAvatarProps) {
  const composition = useMemo(() => deriveComposition(name), [name])
  const { box, radius } = SIZE_MAP[size]

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

        {/* Optional center accent */}
        {composition.accent === "circle" && (
          <circle cx="50" cy="50" r="9" fill="#F4DDC2" opacity="0.45" />
        )}
        {composition.accent === "diamond" && (
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
      </svg>

      {/* Inner ring for depth */}
      <span
        className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", borderRadius: "inherit" }}
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
