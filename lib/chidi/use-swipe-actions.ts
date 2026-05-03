"use client"

import { useRef, useState, useEffect } from "react"

export interface SwipeActionsConfig {
  /** px to swipe before the action commits on release */
  threshold?: number
  /** px the row can drag past before resistance kicks in */
  maxOffset?: number
  /** Fired when user swipes left far enough and releases (right-side action) */
  onSwipeLeft?: () => void
  /** Fired when user swipes right far enough and releases (left-side action) */
  onSwipeRight?: () => void
  /** Disable on desktop / when in select mode etc. */
  disabled?: boolean
}

export interface SwipeActionsState {
  /** Live swipe offset in px (negative = left). Use to translateX the row. */
  offset: number
  /** Whether the row is currently being dragged */
  dragging: boolean
  /** Bind these handlers to the row element */
  bind: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: (e: React.TouchEvent) => void
    onTouchCancel: (e: React.TouchEvent) => void
  }
}

/**
 * Lightweight horizontal swipe-to-action hook for mobile list rows.
 * No external dep — listens to native touch events. Safe on desktop
 * (won't fire because no touch). Honors prefers-reduced-motion by
 * disabling itself entirely.
 *
 * Usage:
 *   const { offset, bind } = useSwipeActions({
 *     onSwipeLeft: () => archive(),
 *     onSwipeRight: () => markResolved(),
 *   })
 *   <li {...bind} style={{ transform: `translateX(${offset}px)` }}>...</li>
 */
export function useSwipeActions(config: SwipeActionsConfig = {}): SwipeActionsState {
  const {
    threshold = 80,
    maxOffset = 140,
    onSwipeLeft,
    onSwipeRight,
    disabled = false,
  } = config

  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  const startX = useRef(0)
  const startY = useRef(0)
  const lockedAxis = useRef<"x" | "y" | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  }, [])

  const reset = () => {
    setOffset(0)
    setDragging(false)
    lockedAxis.current = null
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled || reducedMotion) return
    const t = e.touches[0]
    startX.current = t.clientX
    startY.current = t.clientY
    lockedAxis.current = null
    setDragging(true)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (disabled || reducedMotion || !dragging) return
    const t = e.touches[0]
    const dx = t.clientX - startX.current
    const dy = t.clientY - startY.current

    // Lock to the dominant axis after first ~12px of movement so vertical
    // scrolling still works perfectly (we only steal touch when clearly H).
    if (lockedAxis.current === null) {
      const ax = Math.abs(dx)
      const ay = Math.abs(dy)
      if (ax + ay < 12) return // not enough movement yet
      lockedAxis.current = ax > ay * 1.4 ? "x" : "y"
    }

    if (lockedAxis.current !== "x") return

    // Apply rubber-band resistance past maxOffset
    let next = dx
    if (Math.abs(next) > maxOffset) {
      const overshoot = Math.abs(next) - maxOffset
      const damped = maxOffset + overshoot * 0.25
      next = next < 0 ? -damped : damped
    }
    setOffset(next)
  }

  const onTouchEnd = () => {
    if (disabled || reducedMotion) {
      reset()
      return
    }
    if (Math.abs(offset) >= threshold) {
      if (offset < 0) onSwipeLeft?.()
      else onSwipeRight?.()
    }
    reset()
  }

  const onTouchCancel = () => reset()

  return {
    offset,
    dragging,
    bind: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel },
  }
}
