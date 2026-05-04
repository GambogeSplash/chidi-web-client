"use client"

/**
 * OfflineQueueToast — bottom-right floating chip surfacing the queue.
 *
 * Collapsed: a single pill — "{N} queued · waiting to send" — that the
 * merchant can ignore. Hidden when N === 0.
 *
 * Expanded (click chip OR receive `chidi:open-queue-toast` from the banner):
 * a small panel listing each queued action with its kind label and how long
 * it's been waiting. Each row gets a "Cancel" affordance so the merchant can
 * abandon a queued action that no longer matters (e.g. the customer gave up).
 *
 * Auto-collapses 6s after the last interaction. Auto-hides entirely when the
 * queue drains to zero (e.g. after coming back online).
 *
 * Honors prefers-reduced-motion: instant show/hide, no slide.
 */

import { useEffect, useState } from "react"
import { X, Clock } from "lucide-react"
import {
  getQueue,
  subscribe,
  clearAction,
  type QueuedAction,
  KIND_LABEL,
} from "@/lib/chidi/offline-queue"

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return "now"
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  return `${hr}h`
}

export function OfflineQueueToast() {
  const [queue, setQueue] = useState<QueuedAction[]>([])
  const [expanded, setExpanded] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  // Tick every 30s so the relative timestamps don't go stale while open.
  const [, forceTick] = useState(0)

  useEffect(() => {
    setQueue(getQueue())
    const unsub = subscribe(setQueue)
    const tick = setInterval(() => forceTick((n) => n + 1), 30_000)

    if (typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
      setReducedMotion(mq.matches)
      const onMQ = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
      if (mq.addEventListener) mq.addEventListener("change", onMQ)
      else mq.addListener(onMQ)

      const onOpenRequest = () => setExpanded(true)
      window.addEventListener("chidi:open-queue-toast", onOpenRequest)

      return () => {
        unsub()
        clearInterval(tick)
        window.removeEventListener("chidi:open-queue-toast", onOpenRequest)
        if (mq.removeEventListener) mq.removeEventListener("change", onMQ)
        else mq.removeListener(onMQ)
      }
    }
    return () => {
      unsub()
      clearInterval(tick)
    }
  }, [])

  // Auto-collapse after idle so the panel doesn't camp the corner forever.
  useEffect(() => {
    if (!expanded) return
    const id = setTimeout(() => setExpanded(false), 6000)
    return () => clearTimeout(id)
  }, [expanded, queue.length])

  if (queue.length === 0) return null

  const motionClass = reducedMotion ? "" : "chidi-offline-toast-in"

  return (
    <div className={`fixed bottom-20 right-4 lg:bottom-6 z-[55] ${motionClass}`}>
      {expanded ? (
        <div
          role="dialog"
          aria-label="Offline send queue"
          className="w-[280px] rounded-xl border border-[var(--chidi-border-default)] bg-[var(--card)] shadow-lg overflow-hidden"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--chidi-border-default)]">
            <div className="text-[12px] font-semibold text-[var(--chidi-text-primary)]">
              {queue.length} queued
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Collapse queue"
              className="text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chidi-warning)] rounded-sm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <ul className="max-h-[240px] overflow-y-auto divide-y divide-[var(--chidi-border-default)]">
            {queue.map((action) => (
              <li
                key={action.id}
                className="flex items-center justify-between gap-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-[12px] text-[var(--chidi-text-primary)] truncate">
                    {KIND_LABEL[action.kind] || action.kind}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[var(--chidi-text-secondary)]">
                    <Clock className="w-2.5 h-2.5" aria-hidden="true" />
                    <span>waiting {timeAgo(action.queuedAt)}</span>
                    {action.retryCount > 0 && (
                      <span className="ml-1">· retry {action.retryCount}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => clearAction(action.id)}
                  className="text-[10px] text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-warning)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chidi-warning)] rounded-sm px-1"
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
          <div className="px-3 py-2 text-[10px] text-[var(--chidi-text-secondary)] border-t border-[var(--chidi-border-default)]">
            Will send the moment you&apos;re back online.
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label={`${queue.length} actions queued — tap to view`}
          className="flex items-center gap-2 px-3 py-2 rounded-full border border-[var(--chidi-warning)] bg-[var(--card)] shadow-sm text-[12px] font-medium text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-warning)]/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chidi-warning)]"
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-[var(--chidi-warning)] animate-pulse"
            aria-hidden="true"
          />
          <span>{queue.length} queued · waiting to send</span>
        </button>
      )}
    </div>
  )
}
