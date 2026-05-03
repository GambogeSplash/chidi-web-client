"use client"

/**
 * Local payment-confirmation log.
 *
 * The merchant taps "Confirm payment received" on a PENDING_PAYMENT order
 * and we persist the receipt locally — amount, optional proof image, optional
 * note, timestamp — keyed by orderId. This survives refresh, drives the
 * "Paid 2h ago" badge in the orders list, and lets the chat banner collapse
 * to the confirmed state.
 *
 * Two reasons this lives client-side only:
 *   1. The dev-bypass mock backend has no confirmation endpoint we can write
 *      to; we'd lose the state on every navigation.
 *   2. Image previews are kept as data URLs (FileReader → base64) so we never
 *      upload bytes anywhere — the merchant just needs the visual receipt.
 *
 * Other surfaces listen for `chidi:payment-confirmed` so they can refresh
 * without polling.
 */

export interface PaymentConfirmation {
  orderId: string
  amount: number
  proofDataUrl?: string
  note?: string
  confirmedAt: string // ISO
}

const STORAGE_KEY = "chidi:payment-confirmations"
export const PAYMENT_CONFIRMED_EVENT = "chidi:payment-confirmed"

type Store = Record<string, PaymentConfirmation>

const isBrowser = (): boolean => typeof window !== "undefined"

function readStore(): Store {
  if (!isBrowser()) return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Store
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store: Store): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Quota or privacy mode — silently no-op; the in-memory state still works
    // for the current session.
  }
}

export function getConfirmation(orderId: string): PaymentConfirmation | null {
  if (!orderId) return null
  const store = readStore()
  return store[orderId] ?? null
}

export function getAllConfirmations(): PaymentConfirmation[] {
  return Object.values(readStore())
}

export function isConfirmed(orderId: string): boolean {
  return !!getConfirmation(orderId)
}

export interface ConfirmPaymentInput {
  amount: number
  proofDataUrl?: string
  note?: string
}

export function confirmPayment(
  orderId: string,
  input: ConfirmPaymentInput,
): PaymentConfirmation {
  const record: PaymentConfirmation = {
    orderId,
    amount: input.amount,
    proofDataUrl: input.proofDataUrl,
    note: input.note,
    confirmedAt: new Date().toISOString(),
  }
  const store = readStore()
  store[orderId] = record
  writeStore(store)

  if (isBrowser()) {
    window.dispatchEvent(
      new CustomEvent(PAYMENT_CONFIRMED_EVENT, { detail: record }),
    )
  }
  return record
}

export function clearConfirmation(orderId: string): void {
  const store = readStore()
  if (orderId in store) {
    delete store[orderId]
    writeStore(store)
  }
}

/**
 * Short relative-time label for the "✓ Paid 2h ago" badge.
 */
export function formatConfirmedAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diff) || diff < 0) return "just now"
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" })
}
