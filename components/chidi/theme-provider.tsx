"use client"

import { useEffect, type ReactNode } from "react"
import {
  ACCENT_OVERRIDE_EVENT,
  getActiveTheme,
  getThemeMeta,
  subscribe,
} from "@/lib/chidi/theme"

interface ThemeProviderProps {
  children: ReactNode
}

/**
 * ThemeProvider — owns the runtime side of the Chidi theme system.
 *
 * On mount it re-asserts the persisted theme on <html> (the inline boot
 * script in `app/layout.tsx` already set it before first paint to avoid
 * FOUC; this guard keeps things consistent across navigations and during
 * dev HMR). It then subscribes to:
 *
 *   - `chidi:theme-changed`        — a deliberate switch from the picker.
 *   - `chidi:accent-changed`       — emitted by the Spaces feature when a
 *                                    Space has a custom accent color. We
 *                                    overlay the Space's color on top of
 *                                    the active theme's `--chidi-accent*`
 *                                    tokens until the next theme change.
 *
 * Both reduce to the same DOM operation: writing CSS custom properties on
 * <html>. We never re-render the React tree to repaint colors.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    if (typeof document === "undefined") return
    const root = document.documentElement
    const active = getActiveTheme()

    // Re-assert in case the boot script didn't run (very unlikely) or HMR
    // wiped the attribute. Reads localStorage; safe to call repeatedly.
    if (root.dataset.chidiTheme !== active) {
      root.dataset.chidiTheme = active
    }

    // Theme picker → reset any Space override + re-apply the catalog theme.
    const offTheme = subscribe((theme) => {
      // Clear inline overrides so the catalog values from globals.css win.
      root.style.removeProperty("--chidi-accent")
      root.style.removeProperty("--chidi-accent-soft")
      root.style.removeProperty("--chidi-accent-strong")
      root.style.removeProperty("--chidi-accent-glow")
      root.dataset.chidiTheme = theme
    })

    // Spaces override — payload `{ color }` (single hex) overlays the
    // current theme tokens. When the merchant leaves the Space the Spaces
    // agent should fire `chidi:theme-changed` to clear it.
    const handleSpaceAccent = (e: Event) => {
      const detail = (e as CustomEvent).detail as { color?: string } | undefined
      const color = detail?.color
      if (!color) {
        // Empty payload = clear override and fall back to the active theme.
        root.style.removeProperty("--chidi-accent")
        root.style.removeProperty("--chidi-accent-soft")
        root.style.removeProperty("--chidi-accent-strong")
        root.style.removeProperty("--chidi-accent-glow")
        return
      }
      root.style.setProperty("--chidi-accent", color)
      root.style.setProperty("--chidi-accent-strong", color)
      // Build a soft tint + glow from the override color via color-mix so
      // hover/halo states feel like they belong to this color.
      root.style.setProperty(
        "--chidi-accent-soft",
        `color-mix(in srgb, ${color} 12%, transparent)`,
      )
      root.style.setProperty(
        "--chidi-accent-glow",
        `color-mix(in srgb, ${color} 22%, transparent)`,
      )
    }
    window.addEventListener(ACCENT_OVERRIDE_EVENT, handleSpaceAccent)

    // Help debuggers — expose the catalog hex on a data attr so
    // engineers/QA can confirm "yes that's the indigo theme" in devtools.
    root.dataset.chidiAccent = getThemeMeta(active).accent

    return () => {
      offTheme()
      window.removeEventListener(ACCENT_OVERRIDE_EVENT, handleSpaceAccent)
    }
  }, [])

  return <>{children}</>
}
