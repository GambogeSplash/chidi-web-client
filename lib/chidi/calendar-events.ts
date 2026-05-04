/**
 * Calendar Peek — today-bucket aggregator.
 *
 * Pulls three streams the merchant cares about today and returns them in
 * one shape so the Calendar Peek widget can render without knowing the
 * underlying sources:
 *
 *   - Deliveries  — orders whose status is CONFIRMED and were created
 *                   today (best proxy for "needs to ship today" until the
 *                   backend exposes an explicit delivery_date column).
 *   - Broadcasts  — chidi:broadcasts entries whose scheduledFor lands
 *                   inside today's day window.
 *   - Follow-ups  — chidi:follow-ups entries — first-class citizens of
 *                   this file, with full CRUD helpers below.
 *
 * Channel-agnostic: broadcasts already track Telegram + WhatsApp targets,
 * follow-ups don't care about channel at all (they're merchant-side
 * reminders), and deliveries have a `channel` field but we don't branch on it.
 */

import { listBroadcasts, type BroadcastRecord } from "./broadcasts"
import type { Order } from "@/lib/api/orders"

const FOLLOWUPS_KEY = "chidi:follow-ups"

export interface FollowUp {
  id: string
  /** Optional — only when the follow-up was created from a customer rail. */
  customerId?: string
  customerName?: string
  title: string
  /** ISO timestamp — when the merchant wants to be reminded. */
  dueAt: string
  completed: boolean
  /** ISO timestamp — used for sort tie-breaking when multiple share dueAt. */
  createdAt: string
}

type Listener = (followUps: FollowUp[]) => void
const listeners = new Set<Listener>()

function safeReadFollowUps(): FollowUp[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(FOLLOWUPS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (f): f is FollowUp =>
        f &&
        typeof f === "object" &&
        typeof f.id === "string" &&
        typeof f.title === "string" &&
        typeof f.dueAt === "string",
    )
  } catch {
    return []
  }
}

function safeWriteFollowUps(followUps: FollowUp[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(FOLLOWUPS_KEY, JSON.stringify(followUps))
    window.dispatchEvent(new CustomEvent("chidi:follow-ups-changed"))
    listeners.forEach((cb) => {
      try {
        cb(followUps)
      } catch {
        // noop
      }
    })
  } catch {
    // noop
  }
}

export function listFollowUps(): FollowUp[] {
  return safeReadFollowUps().sort(
    (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
  )
}

export interface AddFollowUpInput {
  title: string
  dueAt: Date | string
  customerId?: string
  customerName?: string
}

export function addFollowUp(input: AddFollowUpInput): FollowUp {
  const due = typeof input.dueAt === "string" ? input.dueAt : input.dueAt.toISOString()
  const followUp: FollowUp = {
    id: `fu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    customerId: input.customerId,
    customerName: input.customerName,
    title: input.title.trim() || "Follow up",
    dueAt: due,
    completed: false,
    createdAt: new Date().toISOString(),
  }
  const next = [...safeReadFollowUps(), followUp]
  safeWriteFollowUps(next)
  return followUp
}

export function completeFollowUp(id: string) {
  const next = safeReadFollowUps().map((f) =>
    f.id === id ? { ...f, completed: !f.completed } : f,
  )
  safeWriteFollowUps(next)
}

export function deleteFollowUp(id: string) {
  const next = safeReadFollowUps().filter((f) => f.id !== id)
  safeWriteFollowUps(next)
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb)
  if (typeof window !== "undefined") {
    const onEvt = () => cb(listFollowUps())
    window.addEventListener("chidi:follow-ups-changed", onEvt)
    window.addEventListener("storage", onEvt)
    return () => {
      listeners.delete(cb)
      window.removeEventListener("chidi:follow-ups-changed", onEvt)
      window.removeEventListener("storage", onEvt)
    }
  }
  return () => {
    listeners.delete(cb)
  }
}

/** Day window helpers — local timezone, midnight to midnight. */
function startOfDay(d: Date): number {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c.getTime()
}
function endOfDay(d: Date): number {
  const c = new Date(d)
  c.setHours(23, 59, 59, 999)
  return c.getTime()
}
function isSameDay(iso: string, day: Date): boolean {
  const t = new Date(iso).getTime()
  return t >= startOfDay(day) && t <= endOfDay(day)
}

export interface CalendarDelivery {
  id: string
  title: string
  /** ISO timestamp the widget uses for the time pill. */
  at: string
  href?: string
  raw: Order
}

export interface CalendarBroadcast {
  id: string
  title: string
  at: string
  channels: string[]
  raw: BroadcastRecord
}

export interface CalendarFollowUp {
  id: string
  title: string
  at: string
  customerName?: string
  customerId?: string
  completed: boolean
}

export interface TodaysItems {
  date: Date
  deliveries: CalendarDelivery[]
  broadcasts: CalendarBroadcast[]
  followUps: CalendarFollowUp[]
  total: number
}

/**
 * getTodaysItems — pure aggregator. Pass an optional Date for testability;
 * defaults to "right now". `orders` is injected because the orders list is
 * fetched via React Query upstream (we don't want this helper to own data
 * fetching).
 */
export function getTodaysItems(
  orders: Order[] = [],
  now: Date = new Date(),
): TodaysItems {
  const deliveries: CalendarDelivery[] = orders
    .filter(
      (o) =>
        (o.status === "CONFIRMED" || o.status === "FULFILLED") &&
        isSameDay(o.confirmed_at || o.created_at, now),
    )
    .map((o) => ({
      id: o.id,
      title: `${o.customer_name} · ${o.items.length} item${o.items.length === 1 ? "" : "s"}`,
      at: o.confirmed_at || o.created_at,
      raw: o,
    }))

  const broadcasts: CalendarBroadcast[] = listBroadcasts()
    .filter((b) => isSameDay(b.scheduledFor, now))
    .map((b) => ({
      id: b.id,
      title: `${b.segmentLabel} broadcast`,
      at: b.scheduledFor,
      channels: b.channelTargets,
      raw: b,
    }))

  const followUps: CalendarFollowUp[] = listFollowUps()
    .filter((f) => isSameDay(f.dueAt, now))
    .map((f) => ({
      id: f.id,
      title: f.title,
      at: f.dueAt,
      customerName: f.customerName,
      customerId: f.customerId,
      completed: f.completed,
    }))

  return {
    date: now,
    deliveries,
    broadcasts,
    followUps,
    total: deliveries.length + broadcasts.length + followUps.length,
  }
}

/** Compact "h:mma" formatter — used for the time pill on each row. */
export function formatTime(iso: string): string {
  const d = new Date(iso)
  const h = d.getHours()
  const m = d.getMinutes()
  const ampm = h >= 12 ? "pm" : "am"
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  const mm = m === 0 ? "" : `:${m.toString().padStart(2, "0")}`
  return `${h12}${mm}${ampm}`
}

/** Date headline: "Sun · May 3" */
export function formatDateHeadline(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
}

export const FOLLOWUPS_STORAGE_KEY = FOLLOWUPS_KEY
