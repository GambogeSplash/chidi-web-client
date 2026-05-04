"use client"

/**
 * Little Chidi provider — the single, global mount point.
 *
 * Lives once at the dashboard root. Owns:
 *   - the global `⌘.` / `Ctrl+.` hotkey (suppressed while typing)
 *   - the `chidi:open-little-chidi` CustomEvent listener so any surface (a
 *     Boost, a notification action, a /peek slash command) can summon it
 *   - the rendered <LittleChidi /> overlay itself
 *
 * Nothing else in the dashboard mounts the overlay. If a feature wants to
 * peek programmatically, it calls `openLittleChidi()` from
 * `lib/chidi/little-chidi.ts`.
 */

import { useCallback, useEffect, useState } from "react"
import { LittleChidi } from "./little-chidi"
import {
  isLittleChidiHotkey,
  isTypingTarget,
  LITTLE_CHIDI_OPEN_EVENT,
  type LittleChidiTab,
  type OpenLittleChidiOptions,
} from "@/lib/chidi/little-chidi"

export function LittleChidiProvider() {
  const [open, setOpen] = useState(false)
  const [initialQuery, setInitialQuery] = useState<string | undefined>(undefined)
  const [initialTab, setInitialTab] = useState<LittleChidiTab | undefined>(undefined)

  const handleOpen = useCallback((opts?: OpenLittleChidiOptions) => {
    setInitialQuery(opts?.query)
    setInitialTab(opts?.tab)
    setOpen(true)
  }, [])

  const handleClose = useCallback(() => setOpen(false), [])

  // Global hotkey: ⌘. (Mac) / Ctrl+. (Win/Linux). Suppressed while typing.
  useEffect(() => {
    if (typeof window === "undefined") return
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isLittleChidiHotkey(e)) return
      if (isTypingTarget(e.target)) return
      e.preventDefault()
      // Toggle: same hotkey closes if already open.
      setOpen((prev) => !prev)
      setInitialQuery(undefined)
      setInitialTab(undefined)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // Programmatic open via CustomEvent — `openLittleChidi()` fires this.
  useEffect(() => {
    if (typeof window === "undefined") return
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<OpenLittleChidiOptions>).detail
      handleOpen(detail)
    }
    window.addEventListener(LITTLE_CHIDI_OPEN_EVENT, onCustom)
    return () => window.removeEventListener(LITTLE_CHIDI_OPEN_EVENT, onCustom)
  }, [handleOpen])

  return (
    <LittleChidi
      open={open}
      initialQuery={initialQuery}
      initialTab={initialTab}
      onClose={handleClose}
    />
  )
}
