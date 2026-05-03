"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  THEMES,
  type ChidiTheme,
  getActiveTheme,
  setActiveTheme,
  subscribe,
} from "@/lib/chidi/theme"

/**
 * ThemePicker — 8-swatch grid for choosing the brand color. Selected
 * swatch gets a 2px ring in its own color + a check mark. Click → instant
 * swap (no reload). Honors prefers-reduced-motion implicitly (no transitions
 * are animation-driven; only color/transform springs already governed by
 * the global `button` rules in globals.css).
 *
 * Lives in Settings → Profile, just below the BusinessAvatarPicker.
 */
export function ThemePicker() {
  const [active, setActive] = useState<ChidiTheme>("default")

  useEffect(() => {
    setActive(getActiveTheme())
    const off = subscribe((t) => setActive(t))
    return off
  }, [])

  const handlePick = (id: ChidiTheme) => {
    setActive(id) // optimistic — feels instant
    setActiveTheme(id)
  }

  return (
    <div>
      <p className="text-[14px] font-medium text-[var(--chidi-text-primary)]">
        Pick a brand color
      </p>
      <p className="text-[12px] text-[var(--chidi-text-muted)] font-chidi-voice mt-0.5 mb-4">
        Shows on buttons, active states, and your receipt header.
      </p>

      <div
        role="radiogroup"
        aria-label="Brand color theme"
        className="grid grid-cols-4 gap-3 sm:gap-4"
      >
        {THEMES.map((theme) => {
          const selected = active === theme.id
          return (
            <button
              key={theme.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={theme.label}
              onClick={() => handlePick(theme.id)}
              className={cn(
                "group flex flex-col items-center gap-1.5 outline-none",
                "rounded-xl p-1 -m-1",
                // Use the theme's own color for the focus ring so it always
                // reads as "you're picking THIS color".
              )}
              style={{
                ["--swatch-color" as string]: theme.accent,
              }}
            >
              <span
                className={cn(
                  "relative w-14 h-14 rounded-2xl flex items-center justify-center",
                  "transition-transform duration-150 ease-chidi-spring",
                  "ring-offset-2 ring-offset-[var(--card)]",
                  selected
                    ? "ring-2 scale-100"
                    : "ring-0 group-hover:scale-[1.04] group-active:scale-[0.96]",
                )}
                style={{
                  backgroundColor: theme.accent,
                  ["--tw-ring-color" as string]: theme.accent,
                  boxShadow: selected
                    ? `0 6px 18px -8px ${theme.accent}`
                    : "0 1px 2px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.10)",
                }}
              >
                {selected && (
                  <Check
                    className="w-5 h-5 text-white drop-shadow-sm"
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                )}
              </span>
              <span
                className={cn(
                  "text-[11px] tracking-tight",
                  selected
                    ? "text-[var(--chidi-text-primary)] font-medium"
                    : "text-[var(--chidi-text-secondary)]",
                )}
              >
                {theme.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
