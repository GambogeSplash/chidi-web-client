"use client"

import { cn } from "@/lib/utils"

interface CustomerAvatarProps {
  name?: string | null
  fallbackId?: string
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  className?: string
  /** When true, draws a status pip (used for "currently online", etc.) */
  status?: "online" | "away" | null
}

const SIZE = {
  xs: { box: "w-6 h-6", text: "text-[10px]", pip: "w-1.5 h-1.5" },
  sm: { box: "w-8 h-8", text: "text-xs", pip: "w-2 h-2" },
  md: { box: "w-10 h-10", text: "text-sm", pip: "w-2.5 h-2.5" },
  lg: { box: "w-12 h-12", text: "text-base", pip: "w-3 h-3" },
  xl: { box: "w-16 h-16", text: "text-lg", pip: "w-3.5 h-3.5" },
} as const

// Eight warm tones — cream, terracotta, ochre, mossy green, paper-blue,
// dust-rose, sand, deep-warm. All within the chidi-paper world.
const PALETTE = [
  { bg: "#E8DCC4", fg: "#5C4A30" }, // sand
  { bg: "#D6B997", fg: "#4A3520" }, // tan
  { bg: "#C99B7A", fg: "#3A2415" }, // terracotta
  { bg: "#A6BBA1", fg: "#2A3A28" }, // moss
  { bg: "#B8C9D4", fg: "#28384A" }, // paper-blue
  { bg: "#D8B4B4", fg: "#4A2828" }, // dust-rose
  { bg: "#C4A574", fg: "#3A2C18" }, // ochre
  { bg: "#3D3835", fg: "#F0EEEB" }, // deep-warm (inverse)
]

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Customer avatar — deterministic warm color from name (or fallback id) so
 * the same customer always shows the same colour. Used in inbox rows, order
 * lists, conversation headers, customer profile rail.
 *
 * No real photos until the merchant uploads them. Until then this is the
 * single visual stand-in across the product.
 */
export function CustomerAvatar({
  name,
  fallbackId = "customer",
  size = "md",
  className,
  status = null,
}: CustomerAvatarProps) {
  const seed = name?.trim() || fallbackId
  const palette = PALETTE[hash(seed) % PALETTE.length]
  const label = initials(name || "?")
  const dim = SIZE[size]

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center rounded-full font-chidi-voice select-none flex-shrink-0",
        dim.box,
        dim.text,
        className,
      )}
      style={{ backgroundColor: palette.bg, color: palette.fg }}
      aria-hidden={!name}
    >
      <span className="font-medium tracking-tight">{label}</span>
      {status === "online" && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full ring-2 ring-[var(--card)]",
            dim.pip,
          )}
          style={{ backgroundColor: "var(--chidi-success)" }}
        />
      )}
      {status === "away" && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full ring-2 ring-[var(--card)]",
            dim.pip,
          )}
          style={{ backgroundColor: "var(--chidi-text-muted)" }}
        />
      )}
    </span>
  )
}
