/**
 * Broadcast outbox — localStorage-backed.
 *
 * Real broadcast plumbing (WhatsApp Cloud API + Telegram Bot API + scheduling
 * worker) lives backend-side and is out of scope for this surface. We persist
 * the merchant's intent locally so the customers page can show "Recent
 * broadcasts" — proof the modal actually fired — without inventing fake
 * delivery receipts.
 *
 * Channel-agnostic by design: `channelTargets` is an array (["WHATSAPP"],
 * ["TELEGRAM"], or both). The composer's "Both" choice stores both — when
 * the worker actually sends, it picks per-customer the channel they're on.
 */

import type { ChannelKey, SegmentId } from "./segments"

export type BroadcastStatus = "queued" | "scheduled" | "sent"

export interface BroadcastRecord {
  id: string
  segmentId: SegmentId
  segmentLabel: string
  channelTargets: ChannelKey[]
  message: string
  /** Optional inline image — small data URL. Skipped if too large. */
  attachmentDataUrl?: string
  attachmentName?: string
  /** ISO. If in the future → "scheduled". */
  scheduledFor: string
  /** ISO. When the merchant hit "Send" — present even on scheduled rows. */
  sentAt: string
  audienceCount: number
  status: BroadcastStatus
}

const STORAGE_KEY = "chidi:broadcasts"
const MAX_RECORDS = 50
const MAX_ATTACHMENT_BYTES = 350_000 // ~250kB binary, conservative for localStorage quotas

function safeRead(): BroadcastRecord[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (r): r is BroadcastRecord =>
        r &&
        typeof r === "object" &&
        typeof r.id === "string" &&
        typeof r.message === "string" &&
        Array.isArray(r.channelTargets),
    )
  } catch {
    return []
  }
}

function safeWrite(records: BroadcastRecord[]) {
  if (typeof window === "undefined") return
  try {
    const trimmed = records.slice(0, MAX_RECORDS)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
    window.dispatchEvent(new CustomEvent("chidi:broadcasts-changed"))
  } catch {
    // localStorage full or blocked — silently no-op
  }
}

export function listBroadcasts(): BroadcastRecord[] {
  return safeRead().sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
}

export interface QueueBroadcastInput {
  segmentId: SegmentId
  segmentLabel: string
  channelTargets: ChannelKey[]
  message: string
  attachmentDataUrl?: string
  attachmentName?: string
  scheduledFor?: Date | null
  audienceCount: number
}

export function queueBroadcast(input: QueueBroadcastInput): BroadcastRecord {
  const sentAt = new Date().toISOString()
  const scheduled = input.scheduledFor && input.scheduledFor.getTime() > Date.now() + 30_000
  const record: BroadcastRecord = {
    id: `bc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    segmentId: input.segmentId,
    segmentLabel: input.segmentLabel,
    channelTargets: input.channelTargets.length ? input.channelTargets : ["WHATSAPP"],
    message: input.message,
    attachmentDataUrl:
      input.attachmentDataUrl && input.attachmentDataUrl.length <= MAX_ATTACHMENT_BYTES
        ? input.attachmentDataUrl
        : undefined,
    attachmentName: input.attachmentName,
    scheduledFor: scheduled ? input.scheduledFor!.toISOString() : sentAt,
    sentAt,
    audienceCount: input.audienceCount,
    status: scheduled ? "scheduled" : "queued",
  }
  const next = [record, ...safeRead()]
  safeWrite(next)
  return record
}

export function clearBroadcasts() {
  safeWrite([])
}

export const BROADCASTS_STORAGE_KEY = STORAGE_KEY
