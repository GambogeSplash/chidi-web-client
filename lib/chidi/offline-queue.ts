/**
 * Offline send queue — Lagos 3G survival kit.
 *
 * Premise: when a merchant is on a flaky tower, "Send" must never feel like
 * it dropped. Every outbound action that touches the wire (chat reply, order
 * fulfillment, broadcast send, payment confirm) is funneled through this queue.
 * If the request fires successfully — great, we never enqueue. If we detect
 * we're offline, the call site enqueues the action here and the queue drains
 * itself the moment the browser dispatches `online`.
 *
 * Phase 1 (this file): the queue is a STUB.
 *   - We persist to localStorage so a tab refresh doesn't lose the merchant's
 *     in-flight intents.
 *   - On `online` we "drain": iterate queued actions, log + toast each one as
 *     "Sent: <kind>", clear them from storage. There is no real backend
 *     replay yet — the call sites that enqueue still need to be wired to a
 *     real fetch. That's deliberate: the UX scaffolding (banner, toast strip,
 *     subscription model) is what unblocks the next wave.
 *
 * Phase 2 (future): swap the drain() body to actually re-fire the original
 * fetch with idempotency keys, exponential backoff, dead-letter after N tries.
 *
 * Storage shape (chidi:offline-queue):
 *   QueuedAction[]
 *
 * Events:
 *   chidi:queue-changed — list mutated (enqueue, drain, clear)
 */

import { toast } from "sonner"

const STORAGE_KEY = "chidi:offline-queue"
const MAX_RETRIES = 5

export type QueuedActionKind =
  | "send_message"
  | "fulfill_order"
  | "send_broadcast"
  | "confirm_payment"

export interface QueuedAction {
  id: string
  kind: QueuedActionKind
  /** Free-form serializable payload — call site decides shape. */
  payload: unknown
  /** ISO timestamp set when enqueued. */
  queuedAt: string
  retryCount: number
}

type Listener = (queue: QueuedAction[]) => void
const listeners = new Set<Listener>()

const KIND_LABELS: Record<QueuedActionKind, string> = {
  send_message: "Reply sent",
  fulfill_order: "Order updated",
  send_broadcast: "Broadcast sent",
  confirm_payment: "Payment confirmed",
}

function safeRead(): QueuedAction[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (a): a is QueuedAction =>
        a &&
        typeof a === "object" &&
        typeof a.id === "string" &&
        typeof a.kind === "string" &&
        typeof a.queuedAt === "string" &&
        typeof a.retryCount === "number",
    )
  } catch {
    return []
  }
}

function safeWrite(queue: QueuedAction[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
    window.dispatchEvent(new CustomEvent("chidi:queue-changed"))
    listeners.forEach((cb) => {
      try {
        cb(queue)
      } catch {
        // listener errors must not poison the queue
      }
    })
  } catch {
    // localStorage full / private mode — silently no-op. The merchant's
    // current-session enqueues still live in memory via subscribers.
  }
}

export function getQueue(): QueuedAction[] {
  return safeRead().sort(
    (a, b) => new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime(),
  )
}

export function enqueue(
  action: Omit<QueuedAction, "id" | "queuedAt" | "retryCount">,
): QueuedAction {
  const queued: QueuedAction = {
    id: `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    kind: action.kind,
    payload: action.payload,
    queuedAt: new Date().toISOString(),
    retryCount: 0,
  }
  const next = [...safeRead(), queued]
  safeWrite(next)
  return queued
}

export function clearAction(id: string) {
  const next = safeRead().filter((a) => a.id !== id)
  safeWrite(next)
}

export function clearAll() {
  safeWrite([])
}

/**
 * Drain — iterate queued actions and "send" them. STUB IMPLEMENTATION:
 * we just toast + log + clear. Replace this body in phase 2 with the real
 * fetch replay against the corresponding API per kind.
 *
 * Returns the number of actions drained (so callers can decide whether to
 * surface a single rolled-up toast vs. per-action toasts).
 */
export async function drain(): Promise<number> {
  if (typeof window === "undefined") return 0
  const queue = safeRead()
  if (queue.length === 0) return 0

  let succeeded = 0
  const remaining: QueuedAction[] = []

  for (const action of queue) {
    try {
      // Phase 2: real backend re-fire goes here. For now we fake the I/O so
      // the merchant sees motion and the toast strip clears predictably.
      // eslint-disable-next-line no-console
      console.info("[chidi:offline-queue] drain", action.kind, action)

      // Tiny artificial delay so a multi-item drain doesn't strobe the UI.
      await new Promise((r) => setTimeout(r, 120))

      const label = KIND_LABELS[action.kind] || "Action sent"
      toast.success(label, {
        description: "Was queued while offline.",
        duration: 3500,
      })
      succeeded += 1
    } catch (err) {
      // Re-fire failed — bump retry, drop after MAX_RETRIES so we never
      // accumulate a dead queue.
      const next = { ...action, retryCount: action.retryCount + 1 }
      if (next.retryCount < MAX_RETRIES) remaining.push(next)
      // eslint-disable-next-line no-console
      console.warn("[chidi:offline-queue] failed", action.kind, err)
    }
  }

  safeWrite(remaining)
  return succeeded
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb)
  if (typeof window !== "undefined") {
    const onEvt = () => cb(getQueue())
    window.addEventListener("chidi:queue-changed", onEvt)
    window.addEventListener("storage", onEvt)
    return () => {
      listeners.delete(cb)
      window.removeEventListener("chidi:queue-changed", onEvt)
      window.removeEventListener("storage", onEvt)
    }
  }
  return () => {
    listeners.delete(cb)
  }
}

/**
 * Auto-drain wiring — fired once when this module is first imported in the
 * browser. Listening here (not inside a component) means even a route that
 * doesn't mount the queue toast will still drain on reconnect.
 *
 * Guarded with a window-level flag so HMR doesn't double-bind the listener.
 */
declare global {
  interface Window {
    __chidiOfflineQueueWired?: boolean
  }
}

if (typeof window !== "undefined" && !window.__chidiOfflineQueueWired) {
  window.__chidiOfflineQueueWired = true
  window.addEventListener("online", () => {
    // Defer one frame so the OfflineBanner's "reconnected" flash paints first.
    requestAnimationFrame(() => {
      void drain()
    })
  })
}

export const KIND_LABEL = KIND_LABELS
export const OFFLINE_QUEUE_STORAGE_KEY = STORAGE_KEY
