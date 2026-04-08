"use client"

import { useState, useEffect, useCallback, useRef } from "react"

const DRAFT_PREFIX = "chidi_draft_"

/**
 * A drop-in replacement for useState that persists to sessionStorage.
 * Useful for preserving form drafts across page navigation.
 * 
 * @param key - Unique key for the storage (will be prefixed with 'chidi_draft_')
 * @param defaultValue - Default value when no stored value exists
 * @returns [value, setValue, clear] - Same as useState but with a clear function
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const storageKey = `${DRAFT_PREFIX}${key}`
  const isInitialized = useRef(false)

  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue
    try {
      const stored = sessionStorage.getItem(storageKey)
      if (stored) {
        return JSON.parse(stored) as T
      }
    } catch {
      // Invalid JSON or storage unavailable
    }
    return defaultValue
  })

  useEffect(() => {
    if (typeof window === "undefined") return

    // Skip the first effect run to avoid overwriting with the initial value
    // when the value was already loaded from storage in useState initializer
    if (!isInitialized.current) {
      isInitialized.current = true
      return
    }

    try {
      sessionStorage.setItem(storageKey, JSON.stringify(value))
    } catch {
      // Storage full or unavailable
    }
  }, [storageKey, value])

  const clear = useCallback(() => {
    if (typeof window === "undefined") return
    sessionStorage.removeItem(storageKey)
  }, [storageKey])

  return [value, setValue, clear]
}

/**
 * Check if a draft exists for a given key.
 * Useful for deciding whether to use stored draft vs server data.
 */
export function hasDraft(key: string): boolean {
  if (typeof window === "undefined") return false
  const storageKey = `${DRAFT_PREFIX}${key}`
  return sessionStorage.getItem(storageKey) !== null
}
