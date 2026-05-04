"use client"

/**
 * OfflineBanner — top-of-viewport sticky strip that surfaces connectivity state.
 *
 * Three visual states, only ever one at a time:
 *   1. hidden       — navigator.onLine === true and we haven't just reconnected
 *   2. offline      — navigator.onLine === false; warm warning strip with a
 *                     wifi-off icon, microcopy, and a "Show queue" jump
 *   3. reconnected  — momentary success flash (3s) right after offline → online
 *
 * Wired to:
 *   - window 'online'  / 'offline' events
 *   - service worker postMessage CHIDI_NETWORK_STATUS (belt-and-suspenders;
 *     some browsers lie about navigator.onLine on captive portals)
 *   - the "Show queue" button dispatches `chidi:open-queue-toast` which the
 *     queue toast listens for and pops itself open
 *
 * Honors prefers-reduced-motion: instant show/hide, no slide.
 *
 * Mounted ONCE at the root of DashboardContent. Adding it twice will show
 * two banners (the component intentionally has no singleton guard so unit
 * tests can mount it freely).
 */

import { useEffect, useState } from "react"
import { WifiOff, Wifi } from "lucide-react"

type BannerState = "hidden" | "offline" | "reconnected"

export function OfflineBanner() {
  const [state, setState] = useState<BannerState>("hidden")
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    // Prime from current navigator state. Some browsers fire 'online' before
    // we mount; the SSR pass renders 'hidden' so this is the corrective sync.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setState("offline")
    }

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReducedMotion(mq.matches)
    const onMQ = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    if (mq.addEventListener) mq.addEventListener("change", onMQ)
    else mq.addListener(onMQ) // safari fallback

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const goOffline = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      setState("offline")
    }

    const goOnline = () => {
      // Only flash "reconnected" if we were previously offline. Online → online
      // (e.g. SW heartbeat) shouldn't trigger the success strip.
      setState((prev) => {
        if (prev === "offline") {
          if (reconnectTimer) clearTimeout(reconnectTimer)
          reconnectTimer = setTimeout(() => setState("hidden"), 3000)
          return "reconnected"
        }
        return "hidden"
      })
    }

    const onSWMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === "CHIDI_NETWORK_STATUS") {
        if (e.data.online === false) goOffline()
        else goOnline()
      }
    }

    window.addEventListener("offline", goOffline)
    window.addEventListener("online", goOnline)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", onSWMessage)
    }

    return () => {
      window.removeEventListener("offline", goOffline)
      window.removeEventListener("online", goOnline)
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", onSWMessage)
      }
      if (mq.removeEventListener) mq.removeEventListener("change", onMQ)
      else mq.removeListener(onMQ)
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [])

  if (state === "hidden") return null

  const isOffline = state === "offline"
  const baseClasses =
    "sticky top-0 left-0 right-0 z-[60] w-full h-8 flex items-center justify-center gap-2 px-3 text-[12px] font-medium border-b"
  const motionClasses = reducedMotion ? "" : "chidi-offline-banner-in"

  if (isOffline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`${baseClasses} ${motionClasses} bg-[var(--chidi-warning)]/10 border-[var(--chidi-warning)] text-[var(--chidi-text-primary)]`}
      >
        <WifiOff className="w-3.5 h-3.5 text-[var(--chidi-warning)]" aria-hidden="true" />
        <span>You&apos;re offline. Messages will send when you reconnect.</span>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("chidi:open-queue-toast"))
            }
          }}
          className="ml-1 underline underline-offset-2 hover:text-[var(--chidi-warning)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chidi-warning)] rounded-sm"
        >
          Show queue
        </button>
      </div>
    )
  }

  // reconnected
  return (
    <div
      role="status"
      aria-live="polite"
      className={`${baseClasses} ${motionClasses} bg-[var(--chidi-success)]/10 border-[var(--chidi-success)] text-[var(--chidi-text-primary)]`}
    >
      <Wifi className="w-3.5 h-3.5 text-[var(--chidi-success)]" aria-hidden="true" />
      <span>Reconnected — sending now.</span>
    </div>
  )
}
