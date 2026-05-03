/**
 * Chidi theme — Arc-browser-inspired brand-color personalization.
 *
 * The merchant picks a brand color that propagates to nav highlights, CTAs,
 * and active-state accents across the app via the `--chidi-accent*` token
 * family. Themes are switched by setting `data-chidi-theme="<id>"` on the
 * <html> element; CSS variable overrides in `app/globals.css` do the rest.
 *
 * NOTE: this file is the SINGLE source of truth for the theme catalog. The
 * picker UI reads `THEMES` for swatches/labels; `app/globals.css` declares
 * the variable overrides keyed by the same ids.
 *
 * Spaces (other agent) can dispatch `chidi:accent-changed` with a custom
 * accent color when a Space is opened. The provider listens for that event
 * and overrides the active theme until the next `chidi:theme-changed`.
 */

export type ChidiTheme =
  | "default"
  | "indigo"
  | "rose"
  | "amber"
  | "sunset"
  | "ocean"
  | "forest"
  | "plum"

export interface ChidiThemeMeta {
  id: ChidiTheme
  label: string
  /** Visible accent for swatches in the picker. */
  accent: string
  /** Soft tinted bg used in the picker preview ring well. */
  accentSoft: string
}

/** Catalog used by the picker UI. Hex values mirror the overrides in
 *  `app/globals.css` — keep them in sync if you add or rename a theme. */
export const THEMES: ChidiThemeMeta[] = [
  { id: "default", label: "Chidi",   accent: "#00C853", accentSoft: "rgba(0,200,83,0.12)" },
  { id: "indigo",  label: "Indigo",  accent: "#4F46E5", accentSoft: "#EEF2FF" },
  { id: "rose",    label: "Rose",    accent: "#E11D48", accentSoft: "#FFE4E6" },
  { id: "amber",   label: "Amber",   accent: "#D97706", accentSoft: "#FEF3C7" },
  { id: "sunset",  label: "Sunset",  accent: "#C8401C", accentSoft: "#FFE4D6" },
  { id: "ocean",   label: "Ocean",   accent: "#0891B2", accentSoft: "#CFFAFE" },
  { id: "forest",  label: "Forest",  accent: "#15803D", accentSoft: "#DCFCE7" },
  { id: "plum",    label: "Plum",    accent: "#7C3AED", accentSoft: "#F3E8FF" },
]

const STORAGE_KEY = "chidi:theme"
const THEME_EVENT = "chidi:theme-changed"
/** Spaces emits this when a per-Space accent override should be active. */
export const ACCENT_OVERRIDE_EVENT = "chidi:accent-changed"

const VALID_THEMES = new Set<ChidiTheme>(THEMES.map((t) => t.id))

function isValidTheme(value: string | null | undefined): value is ChidiTheme {
  return !!value && VALID_THEMES.has(value as ChidiTheme)
}

/** Read the persisted theme. Falls back to "default". SSR-safe. */
export function getActiveTheme(): ChidiTheme {
  if (typeof window === "undefined") return "default"
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    return isValidTheme(v) ? v : "default"
  } catch {
    return "default"
  }
}

/** Persist + apply a theme. Triggers `chidi:theme-changed` so listeners
 *  (the provider, future toolbars) can react in the same tick. */
export function setActiveTheme(theme: ChidiTheme): void {
  if (typeof window === "undefined") return
  if (!isValidTheme(theme)) return
  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* private mode — quietly ignore; the attribute swap below still works */
  }
  document.documentElement.dataset.chidiTheme = theme
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { theme } }))
}

/** Subscribe to theme changes. Returns an unsubscribe function. */
export function subscribe(cb: (theme: ChidiTheme) => void): () => void {
  if (typeof window === "undefined") return () => {}
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail as { theme?: ChidiTheme } | undefined
    cb(detail?.theme ?? getActiveTheme())
  }
  window.addEventListener(THEME_EVENT, handler)
  return () => window.removeEventListener(THEME_EVENT, handler)
}

/** Look up display metadata by id. Returns the default theme if not found. */
export function getThemeMeta(id: ChidiTheme): ChidiThemeMeta {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}
