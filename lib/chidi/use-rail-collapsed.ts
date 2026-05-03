"use client"

import { useEffect, useState } from "react"

const STORAGE_KEY = "chidi_navrail_collapsed"
const EVENT_NAME = "chidi:navrail-toggle"

/**
 * Read + react to the desktop nav-rail collapsed state. Hydrates from
 * localStorage on mount, then listens for the global "chidi:navrail-toggle"
 * custom event so all surfaces (Inbox/Orders/Inventory/Insights/Settings/
 * Playbook) shift their left-padding in lockstep when the rail collapses or
 * expands.
 *
 * Returns: true if the rail is collapsed (so callers should pad lg:pl-[64px]),
 * false otherwise (lg:pl-[224px]).
 */
export function useRailCollapsed(): boolean {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "true")

    const onToggle = (e: Event) => {
      const detail = (e as CustomEvent<{ collapsed: boolean }>).detail
      if (detail) setCollapsed(!!detail.collapsed)
    }
    window.addEventListener(EVENT_NAME, onToggle as EventListener)
    return () => window.removeEventListener(EVENT_NAME, onToggle as EventListener)
  }, [])

  return collapsed
}
