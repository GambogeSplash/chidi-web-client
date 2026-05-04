/**
 * Order auto-rename — Arc-style "smart titles."
 *
 * Generates a human, scannable title for any order so the orders list reads
 * like a story instead of a database dump:
 *
 *   "Tola, Wax print dress, ₦12,500"
 *   "Adaeze, 6 items, ₦47K"
 *   "Walk-in · 3 items · ₦18K"
 *
 * It's deterministic — pure derivation from `Order` fields, no LLM. The AI
 * swap is a phase-2 backend job (when we wire a real summarizer endpoint,
 * the call site stays the same; only the implementation changes).
 *
 * Why deterministic now:
 *   - Demo reliability — every load shows the same titles.
 *   - Latency — zero. Lists with 50 rows render instantly.
 *   - Cost — zero per render.
 *   - The phrasing is opinionated enough that the LLM result wouldn't be
 *     a meaningful upgrade for the bulk of orders. Reserve LLM for the
 *     edge cases (very long product names, unusual baskets) in v2.
 *
 * Used by: orders-view (row title), orders-smart cards (header line).
 */

import type { Order } from "@/lib/api/orders"
import { formatCurrency } from "@/lib/utils/currency"

/**
 * First name extracted from `customer_name`. Returns null if the customer
 * name is missing / empty so callers can fall back to "Walk-in".
 */
function firstName(name: string | null | undefined): string | null {
  if (!name) return null
  const cleaned = name.trim()
  if (!cleaned) return null
  // Strip honorifics / suffixes — keep the actual first token.
  const parts = cleaned.split(/\s+/)
  const first = parts[0]
  if (!first) return null
  // Remove trailing punctuation (e.g. "Mr." -> "Mr") and apostrophe junk.
  return first.replace(/[.,;:]+$/g, "")
}

/**
 * Compact NGN-style total (₦47K, ₦12,500, ₦1.2M). Always uses the order's
 * own currency code so KES / GHS shops stay correct.
 */
function compactTotal(order: Order): string {
  return formatCurrency(order.total, order.currency, { compact: true })
}

/**
 * The smart display title.
 *
 *   - Single-item, has name        : "Tola, Wax print dress, ₦12,500"
 *   - Multi-item,  has name        : "Tola, 6 items, ₦47K"
 *   - Multi-item,  no name (walk-in): "Walk-in · 6 items · ₦47K"
 *   - Single-item, no name          : "Walk-in · Wax print dress · ₦12,500"
 *
 * Keep total amount NON-compact for single-item (so the customer sees the
 * exact figure) and compact for multi-item (so the row stays short).
 */
export function smartOrderTitle(order: Order): string {
  const name = firstName(order.customer_name)
  const itemCount = order.items?.length ?? 0
  const hasItems = itemCount > 0

  // Sum quantities — "6 items" should reflect the cart size, not the SKU
  // count. A merchant who sold 12 yards of fabric reads "12 items" not "1".
  const qtyTotal = (order.items ?? []).reduce(
    (sum, it) => sum + (Number.isFinite(it.quantity) ? it.quantity : 0),
    0,
  )
  const effectiveCount = qtyTotal || itemCount

  const sep = name ? ", " : " · "
  const lead = name ?? "Walk-in"

  if (!hasItems) {
    return `${lead}${sep}${compactTotal(order)}`
  }

  // Single SKU + single unit → name it. Single SKU with multiple units (e.g.
  // 12 yards of fabric) → still call it by name but flag the qty so "Ifeoma,
  // 12× Wax print, ₦38K" reads honestly. Multi-SKU → "N items".
  if (itemCount === 1) {
    const item = order.items[0]
    const itemName = item?.product_name?.trim() || "1 item"
    if ((item?.quantity ?? 1) > 1) {
      return `${lead}${sep}${item.quantity}× ${itemName}${sep}${compactTotal(order)}`
    }
    // Exact amount for a single-unit single-SKU — feels more honest than
    // compact at small scale where rounding hides a few hundred naira.
    const exact = formatCurrency(order.total, order.currency)
    return `${lead}${sep}${itemName}${sep}${exact}`
  }

  return `${lead}${sep}${effectiveCount} items${sep}${compactTotal(order)}`
}

/**
 * Subtitle for the order row — keeps the order ID visible (small / mono) so
 * traceability isn't sacrificed for the prettier title above.
 */
export function smartOrderSubtitle(order: Order): string {
  return `#${order.id.slice(-6).toUpperCase()}`
}
