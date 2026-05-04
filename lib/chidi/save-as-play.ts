/**
 * save-as-play — turn a useful Ask-Chidi conversation into a recurring play.
 *
 * Pure helpers:
 *   - extractPlayDraft(messages) → suggested name / trigger / message template
 *   - saveChatAsPlay({...}) → returns a brand-new PlaybookPlay object,
 *     marked as authored. The CALLER persists it (we keep this pure so it
 *     is trivially testable and the consumer controls localStorage timing).
 *
 * Persistence convention:
 *   The Copilot view writes the saved play into localStorage under the key
 *   `chidi:authored-plays` as a JSON array of PlaybookPlay objects (with the
 *   `authored: true` flag). The notebook page is expected to load that key
 *   and merge the entries into its play list, picking up an "Authored" badge.
 */

import type { PlaybookPlay } from "./playbook-plays"

export const AUTHORED_PLAYS_STORAGE_KEY = "chidi:authored-plays"

export type SavePlayAudience = "this-customer" | "customers-like-this" | "all-customers"

export const AUDIENCE_LABEL: Record<SavePlayAudience, string> = {
  "this-customer": "Just this customer",
  "customers-like-this": "Customers like this",
  "all-customers": "All customers",
}

export interface SaveChatAsPlayInput {
  name: string
  trigger: string
  message: string
  audience: SavePlayAudience
}

/** Lightweight shape of a chat message — we accept anything with role + content
 *  so this stays decoupled from the upstream ChatMessage type. */
export interface SimpleChatMessage {
  role: "user" | "assistant" | "system" | string
  content: string
}

export interface PlayDraft {
  name: string
  trigger: string
  message: string
  audience: SavePlayAudience
}

/**
 * Suggest a draft from the conversation:
 *   - name = the first user line, trimmed to 60 chars (the brief: "first line of convo")
 *   - trigger = a paraphrase derived from the last user message
 *   - message = the last assistant message (the AI draft) — editable
 */
export function extractPlayDraft(messages: SimpleChatMessage[]): PlayDraft {
  const firstUser = messages.find((m) => m.role === "user")
  const lastUser = [...messages].reverse().find((m) => m.role === "user")
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")

  const name = clean(firstUser?.content ?? "Saved chat", 60) || "Saved chat"
  const trigger = inferTrigger(lastUser?.content ?? firstUser?.content ?? "")
  const message = clean(lastAssistant?.content ?? "", 600)

  return {
    name,
    trigger,
    message,
    audience: "this-customer",
  }
}

function clean(s: string, max: number): string {
  const oneLine = s.replace(/\s+/g, " ").trim()
  if (oneLine.length <= max) return oneLine
  return oneLine.slice(0, max - 1).trimEnd() + "…"
}

/**
 * Best-effort trigger phrase. Looks for verb-ish patterns ("draft", "remind",
 * "send", "if"); otherwise echoes the request as a "When the merchant asks…"
 * trigger. Always returns a sentence that reads like a play trigger.
 */
function inferTrigger(prompt: string): string {
  const p = prompt.trim()
  if (!p) return "When this situation comes up again."
  const lower = p.toLowerCase()
  if (lower.startsWith("if ") || lower.startsWith("when ")) {
    return capitalize(p.endsWith(".") ? p : p + ".")
  }
  if (lower.startsWith("remind ")) return "When this reminder is due."
  if (lower.includes("restock") || lower.includes("low stock")) return "When stock runs low."
  if (lower.includes("draft") || lower.includes("reply")) return "When a similar message comes in."
  if (lower.includes("follow up") || lower.includes("chase")) return "When a customer goes silent."
  return `When the merchant asks: "${clean(p, 60)}"`
}

function capitalize(s: string): string {
  if (!s) return s
  return s[0].toUpperCase() + s.slice(1)
}

/**
 * Build a brand-new PlaybookPlay from the sheet inputs. Pure: returns the
 * play object — does not persist. Caller writes it to localStorage and
 * navigates to the notebook.
 */
export function saveChatAsPlay(input: SaveChatAsPlayInput): PlaybookPlay {
  const id = `play-authored-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  const audienceSubtitle: Record<SavePlayAudience, string> = {
    "this-customer": "For one customer.",
    "customers-like-this": "For customers like this.",
    "all-customers": "For every customer.",
  }
  return {
    id,
    category: "routine",
    title: input.name.trim() || "Saved chat",
    subtitle: audienceSubtitle[input.audience],
    trigger: input.trigger.trim() || "When this situation comes up again.",
    steps: [
      "Send the message you saved, in your shop voice.",
      "If the customer replies, hand off to you for a real reply.",
    ],
    outcome: "You'll see results here once Chidi has run it a few times.",
    stats: { runs: 0, won: 0, win_rate_pct: 0 },
    state: "active",
    recent: [],
    sample_message: input.message.trim() || undefined,
    // Marker the playbook list reads to render the "Authored" badge.
    authored: true,
  }
}

/**
 * Convenience: read all authored plays from localStorage. Safe to call on
 * the server (returns []). Used by the notebook page to merge authored
 * plays into the unified list.
 */
export function loadAuthoredPlays(): PlaybookPlay[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(AUTHORED_PLAYS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as PlaybookPlay[]) : []
  } catch {
    return []
  }
}

/** Append-and-persist. Returns the full new array so the caller can update
 *  any in-memory state with the same value. */
export function persistAuthoredPlay(play: PlaybookPlay): PlaybookPlay[] {
  if (typeof window === "undefined") return [play]
  const current = loadAuthoredPlays()
  const next = [...current, play]
  try {
    window.localStorage.setItem(AUTHORED_PLAYS_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Quota exceeded or storage disabled — swallow; the UI still works for
    // the rest of the session via the returned array.
  }
  return next
}
