"use client"

import { useState, useEffect, useCallback } from "react"

const HINT_PREFIX = "chidi_hint_dismissed_"

/**
 * Hook for managing one-time dismissible hints.
 * Stores dismissal state in localStorage.
 */
export function useFirstTimeHint(key: string): {
  shouldShow: boolean
  dismiss: () => void
} {
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const storageKey = `${HINT_PREFIX}${key}`
    const isDismissed = localStorage.getItem(storageKey) === "true"
    setShouldShow(!isDismissed)
  }, [key])

  const dismiss = useCallback(() => {
    if (typeof window === "undefined") return

    const storageKey = `${HINT_PREFIX}${key}`
    localStorage.setItem(storageKey, "true")
    setShouldShow(false)
  }, [key])

  return { shouldShow, dismiss }
}
