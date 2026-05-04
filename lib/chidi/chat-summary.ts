/**
 * Chat summary — Arc-style "summarize this thread."
 *
 * Generates a 3-5 bullet recap of a conversation, plus a "pending" status
 * line and a one-line "What's next" suggested action. The output is shaped
 * to look like a Chidi-AI summary, but the implementation is fully
 * deterministic — extractive, not generative.
 *
 * Why deterministic now:
 *   - Demo reliability: same conversation -> same bullets, every load.
 *   - Latency: 0ms. The summary sheet opens instantly, no loading spinner.
 *   - Cost: 0 per open.
 *   - Quality: the rules below produce a recap that's accurate by
 *     construction (we're literally pulling actual messages), so there's no
 *     hallucination risk. An LLM swap would buy us better paraphrasing,
 *     which is a legit phase-2 polish.
 *
 * Phase-2 (real AI):
 *   Replace `summarizeConversation` body with a call to a backend
 *   summarizer endpoint. The return shape stays identical — every consumer
 *   (chat-summary-sheet.tsx) keeps working unchanged.
 */

import type { ChannelConversation, ChannelMessage } from "@/lib/api/messaging"
import type { Order } from "@/lib/api/orders"
import { formatCurrency } from "@/lib/utils/currency"

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ChatSummary {
  /** 3-5 bullets, ordered: opener, key exchange(s), pending, optional outcome */
  bullets: string[]
  /** Status line: "Last activity 2h ago" or similar */
  pendingLine: string
  /** One-line CTA copy: "Confirm payment received", "Send delivery update" */
  suggestedAction: string
  /** What the suggested action *does* (lets the sheet wire it to a handler) */
  actionKind: ChatSuggestedAction
}

export type ChatSuggestedAction =
  | "confirm_payment"
  | "send_delivery_update"
  | "reply_now"
  | "follow_up"
  | "wrap_up"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000
const MIN_MS = 60_000

const ITEM_KEYWORDS = [
  "price", "cost", "₦", "ksh", "gh₵", "$", "naira",
  "pay", "paid", "transfer", "deposit", "deliver", "delivery",
  "send", "ship", "shipping", "address", "size", "color", "colour",
  "stock", "available", "available?", "yard", "pieces", "set",
  "bank", "account", "receipt", "invoice", "order",
]

function lower(s: string): string {
  return (s ?? "").toLowerCase()
}

function shortDate(iso: string): string {
  const d = new Date(iso)
  // "Sun May 4" — short, friendly, locale-aware
  return d.toLocaleDateString("en-NG", { weekday: "short", month: "short", day: "numeric" })
}

function relativeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  if (diff < MIN_MS) return "moments ago"
  if (diff < HOUR_MS) {
    const m = Math.round(diff / MIN_MS)
    return `${m}m ago`
  }
  if (diff < DAY_MS) {
    const h = Math.round(diff / HOUR_MS)
    return `${h}h ago`
  }
  const d = Math.round(diff / DAY_MS)
  return `${d}d ago`
}

function firstName(name: string | null | undefined): string {
  if (!name) return "Customer"
  const t = name.trim().split(/\s+/)[0]
  return t || "Customer"
}

/**
 * Truncate a message to a clean preview length without breaking mid-word.
 */
function preview(text: string, max = 80): string {
  const cleaned = (text ?? "").replace(/\s+/g, " ").trim()
  if (cleaned.length <= max) return cleaned
  const cut = cleaned.slice(0, max)
  const lastSpace = cut.lastIndexOf(" ")
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut) + "…"
}

/**
 * Extract a one-phrase "topic" from the customer's first message — used in
 * the opener bullet. Falls back to a generic phrase if the first message is
 * too short / vague to derive intent from.
 */
function deriveTopic(firstCustomerMsg: string | undefined): string {
  if (!firstCustomerMsg) return "your shop"
  const lc = lower(firstCustomerMsg)
  if (/(price|cost|how much|wholesale)/.test(lc)) return "pricing"
  if (/(deliver|shipping|ship to|send to|courier)/.test(lc)) return "delivery"
  if (/(stock|available|do you have|still have|any left)/.test(lc)) return "availability"
  if (/(refund|exchange|wrong|return|broken|damaged)/.test(lc)) return "an issue with their order"
  if (/(reserve|hold|keep)/.test(lc)) return "holding a product"
  if (/(open|hours|today|tomorrow)/.test(lc)) return "your hours"
  if (/(red|blue|black|white|colou?r|size)/.test(lc)) return "specifics on a product"
  // Default: trim the first message itself as the "topic"
  return preview(firstCustomerMsg, 48).replace(/[?!.]+$/g, "")
}

/**
 * Score a message for "key exchange" worthiness. Longer messages with content
 * keywords (item names, money, payment, delivery) score higher.
 */
function exchangeScore(msg: ChannelMessage): number {
  const text = msg.content ?? ""
  if (text.length < 20) return 0
  const lc = lower(text)
  let score = Math.min(text.length / 30, 4) // length bonus, capped
  for (const kw of ITEM_KEYWORDS) {
    if (lc.includes(kw)) score += 1.2
  }
  // Lightly favor customer messages — what they say drives the thread.
  if (msg.sender_type === "CUSTOMER") score += 0.5
  return score
}

// ---------------------------------------------------------------------------
// The algorithm
// ---------------------------------------------------------------------------

/**
 * Build a summary. The `messages` array should be in chronological order.
 *
 * Bullet plan (in order of appearance):
 *   1. Opener  — when the thread started + topic
 *   2-3. Key exchanges — top 2 highest-scoring messages (excluding the first)
 *   4. Pending — what the customer is waiting for
 *   5. Outcome — only when there's a linked order (PENDING_PAYMENT etc.)
 */
export function summarizeConversation({
  messages,
  conversation,
  linkedOrder = null,
}: {
  messages: ChannelMessage[]
  conversation: ChannelConversation
  linkedOrder?: Order | null
}): ChatSummary {
  const customer = firstName(conversation.customer_name)
  const sorted = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  const firstCustomer = sorted.find((m) => m.sender_type === "CUSTOMER")
  const lastMessage = sorted[sorted.length - 1]
  const lastInbound = [...sorted].reverse().find((m) => m.sender_type === "CUSTOMER")

  // Bullet 1 — opener
  const startedDate = sorted[0]?.created_at ?? conversation.created_at
  const topic = deriveTopic(firstCustomer?.content)
  const opener = `Started ${shortDate(startedDate)} — ${customer} asked about ${topic}.`

  // Bullets 2-3 — key exchanges. Skip the first customer message (already
  // captured in the opener) so we don't restate the same thing.
  const candidates = sorted.filter((m) => m.id !== firstCustomer?.id)
  const ranked = candidates
    .map((m) => ({ m, score: exchangeScore(m) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    // Re-sort by time so the bullets stay chronological in the output
    .sort(
      (a, b) => new Date(a.m.created_at).getTime() - new Date(b.m.created_at).getTime(),
    )

  const exchangeBullets = ranked.map(({ m }) => {
    const who = m.sender_type === "CUSTOMER" ? customer : "Chidi"
    return `${who}: "${preview(m.content, 90)}"`
  })

  // Bullet 4 — pending. What is the customer waiting for? Drive off:
  //   - linked order status   (best signal)
  //   - last message sender   (if customer-last, they're waiting on us)
  //   - last message content  (light keyword match)
  let pendingBullet: string
  let suggestedAction = "Reply within 4h"
  let actionKind: ChatSuggestedAction = "reply_now"

  if (linkedOrder?.status === "PENDING_PAYMENT") {
    pendingBullet = `${customer} is waiting for: payment confirmation.`
    suggestedAction = "Confirm payment received"
    actionKind = "confirm_payment"
  } else if (linkedOrder?.status === "CONFIRMED") {
    pendingBullet = `${customer} is waiting for: a delivery update.`
    suggestedAction = "Send delivery update"
    actionKind = "send_delivery_update"
  } else if (lastMessage?.sender_type === "CUSTOMER") {
    const lc = lower(lastMessage.content)
    if (/(refund|exchange|wrong|return|broken|damaged|issue|problem)/.test(lc)) {
      pendingBullet = `${customer} is waiting for: your reply on the issue they raised.`
      suggestedAction = "Reply within 1h — issue thread"
      actionKind = "reply_now"
    } else if (/(price|cost|how much|wholesale|discount)/.test(lc)) {
      pendingBullet = `${customer} is waiting for: a price answer.`
      suggestedAction = "Send pricing"
      actionKind = "reply_now"
    } else {
      pendingBullet = `${customer} is waiting for: your reply.`
      suggestedAction = "Reply within 4h"
      actionKind = "reply_now"
    }
  } else if (conversation.status === "RESOLVED") {
    pendingBullet = `Thread is wrapped — no one's waiting.`
    suggestedAction = "Mark this customer for follow-up next month"
    actionKind = "follow_up"
  } else {
    pendingBullet = `${customer} is waiting for: nothing right now — Chidi has it.`
    suggestedAction = "Skim the thread, then keep watching"
    actionKind = "wrap_up"
  }

  // Bullet 5 — optional outcome (linked order)
  const outcomeBullet =
    linkedOrder
      ? `Order #${linkedOrder.id.slice(-6).toUpperCase()} placed for ${formatCurrency(linkedOrder.total, linkedOrder.currency)}.`
      : null

  const bullets: string[] = [opener, ...exchangeBullets, pendingBullet]
  if (outcomeBullet) bullets.push(outcomeBullet)

  // Status line — uses the most recent message timestamp; falls back to the
  // conversation's last_activity if messages are empty.
  const activityIso =
    lastMessage?.created_at ??
    conversation.last_activity ??
    conversation.updated_at ??
    conversation.created_at
  const pendingLine = `Last activity ${relativeAgo(activityIso)}`

  return { bullets, pendingLine, suggestedAction, actionKind }
}
