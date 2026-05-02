"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Tween a number from 0 → target over `durationMs` using ease-out cubic.
 * Drives the count-up effect on KPI numbers when Insights cards mount.
 * Respects prefers-reduced-motion (returns target immediately).
 */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0)
  const lastTarget = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") {
      setValue(target)
      return
    }
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (reduced || target === lastTarget.current) {
      setValue(target)
      return
    }
    lastTarget.current = target

    const start = performance.now()
    const from = 0
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(from + (target - from) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])

  return value
}
