"use client"

import { useState, useRef, useEffect, ReactNode } from "react"
import { ChidiMark } from "./chidi-mark"
import { hapticSoft } from "@/lib/chidi/haptics"

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void
  children: ReactNode
  /** Distance in px the user must pull before release triggers refresh */
  threshold?: number
  /** Disable on desktop where touch is uncommon */
  disabled?: boolean
}

/**
 * Pull-to-refresh wrapper. Touch-only (mobile / tablet). When the user pulls
 * down at scroll-top, shows a Chidi-mark indicator that fades in + rotates
 * with pull distance. Triggers onRefresh on release past threshold.
 *
 * Pure touch events, no library. Safe in iOS Safari and Android Chrome.
 */
export function PullToRefresh({
  onRefresh,
  children,
  threshold = 70,
  disabled = false,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef<number | null>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el || disabled) return

    const handleTouchStart = (e: TouchEvent) => {
      if (refreshing) return
      // Only register pull if scrolled to top
      if (el.scrollTop > 0) {
        startYRef.current = null
        return
      }
      startYRef.current = e.touches[0].clientY
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (refreshing || startYRef.current === null) return
      const dy = e.touches[0].clientY - startYRef.current
      if (dy <= 0) {
        setPullDistance(0)
        return
      }
      // Damped — pull feels natural, doesn't extend infinitely
      const damped = Math.min(dy * 0.5, threshold * 1.4)
      setPullDistance(damped)
    }

    const handleTouchEnd = async () => {
      if (refreshing) return
      if (pullDistance >= threshold) {
        setRefreshing(true)
        hapticSoft()
        try {
          await onRefresh()
        } finally {
          setRefreshing(false)
          setPullDistance(0)
        }
      } else {
        setPullDistance(0)
      }
      startYRef.current = null
    }

    el.addEventListener("touchstart", handleTouchStart, { passive: true })
    el.addEventListener("touchmove", handleTouchMove, { passive: true })
    el.addEventListener("touchend", handleTouchEnd)

    return () => {
      el.removeEventListener("touchstart", handleTouchStart)
      el.removeEventListener("touchmove", handleTouchMove)
      el.removeEventListener("touchend", handleTouchEnd)
    }
  }, [onRefresh, pullDistance, refreshing, threshold, disabled])

  const progress = Math.min(pullDistance / threshold, 1)
  const showIndicator = pullDistance > 4 || refreshing

  return (
    <div ref={containerRef} className="relative overflow-y-auto h-full">
      {/* Indicator that floats from the top edge as you pull */}
      <div
        className="absolute top-0 left-0 right-0 z-[5] flex items-center justify-center pointer-events-none transition-opacity"
        style={{
          height: refreshing ? threshold : pullDistance,
          opacity: showIndicator ? 1 : 0,
        }}
      >
        <div
          className="flex items-center gap-2 text-[var(--chidi-text-secondary)] font-chidi-voice"
          style={{
            transform: refreshing ? "scale(1.1)" : `scale(${0.8 + progress * 0.3})`,
            transition: "transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <ChidiMark
            size={18}
            variant="muted"
            className={refreshing ? "chidi-loader-breathe" : ""}
            style={{
              transform: refreshing ? "rotate(0deg)" : `rotate(${progress * 360}deg)`,
              transition: "transform 200ms ease-out",
            } as any}
          />
          <span className="text-xs">
            {refreshing
              ? "Catching up…"
              : progress >= 1
                ? "Release to refresh"
                : "Pull to refresh"}
          </span>
        </div>
      </div>

      {/* Content — translates down with pull for the rubber-band feel */}
      <div
        style={{
          transform: refreshing ? `translateY(${threshold}px)` : `translateY(${pullDistance}px)`,
          transition: refreshing || pullDistance === 0 ? "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)" : "none",
        }}
      >
        {children}
      </div>
    </div>
  )
}
