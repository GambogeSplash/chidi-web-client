/**
 * Board state — helpers for the kanban Easels surface.
 *
 * Two responsibilities:
 *   1. Define the four merchant-facing stages and their mapping to the
 *      backend `OrderStatus` enum (with one client-only stage:
 *      `OUT_FOR_DELIVERY`).
 *   2. Persist the client-only stage overrides in localStorage so a
 *      Fulfilled order the merchant has handed to a dispatch rider stays
 *      in the "Out for delivery" column across reloads — without needing
 *      a backend migration.
 *
 * The shim is deliberately one-way: a card only ever advances FROM
 * Fulfilled INTO Out-for-delivery via the override map. If the backend
 * later adds a real OUT_FOR_DELIVERY status, the override quietly becomes
 * a no-op (we always check the backend status first, then apply the
 * override only if it still makes sense).
 */

import type { Order, OrderStatus } from "@/lib/api/orders"

// =============================================================================
// Stage model
// =============================================================================

/** Client-only "out for delivery" stage — not in the backend enum. */
export const OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY" as const

export type BoardStage =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "FULFILLED"
  | typeof OUT_FOR_DELIVERY

export interface StageMeta {
  id: BoardStage
  label: string
  /** One-liner for the empty state — Chidi voice, second-person. */
  emptyHint: string
  /** CSS color for the urgency dot + ring tint. Uses --chidi-* tokens. */
  accent: string
  /** Short-code for the keyboard hint (single uppercase letter). */
  shortCode: string
}

export const STAGES: StageMeta[] = [
  {
    id: "PENDING_PAYMENT",
    label: "Pending pay",
    emptyHint: "Quiet here. New orders land first.",
    accent: "var(--chidi-warn, #f5b856)",
    shortCode: "P",
  },
  {
    id: "CONFIRMED",
    label: "Confirmed",
    emptyHint: "Confirm one to push it through.",
    accent: "var(--chidi-info, #5b8def)",
    shortCode: "C",
  },
  {
    id: "FULFILLED",
    label: "Fulfilled",
    emptyHint: "Mark one ready and it lands here.",
    accent: "var(--chidi-win, #2bb673)",
    shortCode: "F",
  },
  {
    id: OUT_FOR_DELIVERY,
    label: "Out for delivery",
    emptyHint: "Hand one to a rider — drag it here.",
    accent: "var(--chidi-text-primary)",
    shortCode: "D",
  },
]

/**
 * Linear ordering of stages. Used by keyboard advance/retreat (Space + arrow)
 * and to validate drops (you can drag forward OR backward, no gating, but
 * cancelled orders don't appear at all).
 */
export const STAGE_ORDER: BoardStage[] = STAGES.map((s) => s.id)

export function nextStage(stage: BoardStage): BoardStage | null {
  const i = STAGE_ORDER.indexOf(stage)
  if (i < 0 || i >= STAGE_ORDER.length - 1) return null
  return STAGE_ORDER[i + 1]
}

export function prevStage(stage: BoardStage): BoardStage | null {
  const i = STAGE_ORDER.indexOf(stage)
  if (i <= 0) return null
  return STAGE_ORDER[i - 1]
}

// =============================================================================
// localStorage shim for OUT_FOR_DELIVERY
// =============================================================================

const STORAGE_KEY = "chidi:order-stages"

/** Map of orderId -> client stage override (currently only OUT_FOR_DELIVERY). */
export type StageOverrideMap = Record<string, BoardStage>

export function readStageOverrides(): StageOverrideMap {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === "object" && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

export function writeStageOverrides(overrides: StageOverrideMap): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  } catch {
    // Quota / private mode — silently swallow; the override just won't persist.
  }
}

/**
 * Resolve the visible stage for an order, applying the client override if the
 * backend hasn't caught up. Cancelled orders return null (filtered from the
 * board).
 */
export function resolveStage(
  order: Order,
  overrides: StageOverrideMap,
): BoardStage | null {
  if (order.status === "CANCELLED") return null

  // The override only makes sense if the backend still says FULFILLED — once
  // the backend ships a real out-for-delivery status, this shim becomes a
  // no-op without us having to clean it up.
  const override = overrides[order.id]
  if (override === OUT_FOR_DELIVERY && order.status === "FULFILLED") {
    return OUT_FOR_DELIVERY
  }

  return order.status as BoardStage
}

/**
 * Set or clear a single override. Returns the new map so callers can update
 * state without re-reading.
 */
export function setStageOverride(
  current: StageOverrideMap,
  orderId: string,
  stage: BoardStage | null,
): StageOverrideMap {
  const next = { ...current }
  if (stage === null) {
    delete next[orderId]
  } else {
    next[orderId] = stage
  }
  return next
}

// =============================================================================
// Time-in-stage — drives the "overdue" dot + colored relative time
// =============================================================================

/**
 * Pick the right timestamp for "how long has this card been in its current
 * stage?". Falls back to created_at when the per-stage timestamps are missing.
 */
export function getStageEnteredAt(order: Order, stage: BoardStage): string {
  switch (stage) {
    case "PENDING_PAYMENT":
      return order.created_at
    case "CONFIRMED":
      return order.confirmed_at || order.updated_at || order.created_at
    case "FULFILLED":
    case OUT_FOR_DELIVERY:
      return order.fulfilled_at || order.updated_at || order.created_at
    default:
      return order.created_at
  }
}

/** Hours since `iso`. Returns 0 on bad input. */
export function hoursSince(iso: string): number {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 0
  return Math.max(0, (Date.now() - t) / 3_600_000)
}

/** A card is "overdue" once it's been in its stage for >48h. */
export const OVERDUE_HOURS = 48

export function isOverdue(order: Order, stage: BoardStage): boolean {
  return hoursSince(getStageEnteredAt(order, stage)) > OVERDUE_HOURS
}

/** Compact relative-time label, e.g. "2h", "1d", "5d". */
export function formatRelativeShort(iso: string): string {
  const h = hoursSince(iso)
  if (h < 1) {
    const m = Math.max(1, Math.round(h * 60))
    return `${m}m`
  }
  if (h < 24) return `${Math.round(h)}h`
  const d = Math.round(h / 24)
  return `${d}d`
}

// =============================================================================
// Channel normalization — Telegram + WhatsApp are first-class
// =============================================================================

export type ChannelKind = "whatsapp" | "telegram" | "other"

export function normalizeChannel(raw?: string | null): ChannelKind {
  if (!raw) return "other"
  const v = raw.toLowerCase()
  if (v.includes("whatsapp") || v === "wa") return "whatsapp"
  if (v.includes("telegram") || v === "tg") return "telegram"
  return "other"
}

// =============================================================================
// Mutation routing — what does dropping a card on stage X mean?
// =============================================================================

export type StageTransition =
  | { kind: "confirm"; orderId: string }
  | { kind: "fulfill"; orderId: string }
  | { kind: "out-for-delivery"; orderId: string }
  | { kind: "clear-out-for-delivery"; orderId: string }
  | { kind: "noop" }
  | { kind: "unsupported" }

/**
 * Map a drag from `from -> to` into the right side-effect.
 *
 * Forward moves fire the relevant mutation. Backward moves are unsupported in
 * this first cut (the backend doesn't expose "un-confirm" or "un-fulfill") —
 * the board reverts the optimistic move and toasts so the merchant knows why.
 *
 * The OUT_FOR_DELIVERY shim is bidirectional within client state: dragging
 * from Fulfilled → Out-for-delivery sets the override; dragging back clears it.
 */
export function planTransition(
  orderId: string,
  from: BoardStage,
  to: BoardStage,
): StageTransition {
  if (from === to) return { kind: "noop" }

  // Forward: pending -> confirmed
  if (from === "PENDING_PAYMENT" && to === "CONFIRMED") {
    return { kind: "confirm", orderId }
  }
  // Forward: confirmed -> fulfilled
  if (from === "CONFIRMED" && to === "FULFILLED") {
    return { kind: "fulfill", orderId }
  }
  // Skip-forward: pending -> fulfilled (confirm then fulfill — handled
  // by the board as a 2-step; for now we only fire fulfill, the backend
  // permits it on a paid order; if it rejects, we revert + toast).
  if (from === "PENDING_PAYMENT" && to === "FULFILLED") {
    return { kind: "fulfill", orderId }
  }
  // Forward into the client-only stage
  if (
    (from === "FULFILLED" || from === "CONFIRMED" || from === "PENDING_PAYMENT") &&
    to === OUT_FOR_DELIVERY
  ) {
    return { kind: "out-for-delivery", orderId }
  }
  // Backward from out-for-delivery → fulfilled = clear the override
  if (from === OUT_FOR_DELIVERY && to === "FULFILLED") {
    return { kind: "clear-out-for-delivery", orderId }
  }

  return { kind: "unsupported" }
}
