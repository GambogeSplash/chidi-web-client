/**
 * Chidi's voice — central source for time-aware greetings, mood states, and
 * loading phrases. Every surface that "speaks" pulls from here so the
 * personality is consistent.
 *
 * Don't add cute ad-hoc copy in components. Add it here, then use it.
 */

export type ChidiMood = "cheerful" | "attentive" | "calm" | "focused"
export type DayContext = "weekday" | "saturday" | "sunday"
export type TimeContext = "early" | "morning" | "midday" | "afternoon" | "evening" | "late"

export interface VoiceContext {
  hour: number
  day: DayContext
  time: TimeContext
  ownerFirstName?: string
}

const dayName = (d: number): DayContext => {
  if (d === 0) return "sunday"
  if (d === 6) return "saturday"
  return "weekday"
}

const timeOfDay = (hour: number): TimeContext => {
  if (hour < 6) return "late"
  if (hour < 9) return "early"
  if (hour < 12) return "morning"
  if (hour < 14) return "midday"
  if (hour < 17) return "afternoon"
  if (hour < 22) return "evening"
  return "late"
}

export const buildVoiceContext = (ownerFirstName?: string): VoiceContext => {
  const now = new Date()
  return {
    hour: now.getHours(),
    day: dayName(now.getDay()),
    time: timeOfDay(now.getHours()),
    ownerFirstName,
  }
}

// =============================================================================
// Greetings — used by Morning Brief, Settings page, Copilot opener
// =============================================================================

export const greeting = (ctx: VoiceContext): string => {
  const handle = ctx.ownerFirstName ? `, ${ctx.ownerFirstName}` : ""
  switch (ctx.time) {
    case "late":
      return ctx.hour < 4 ? `Working late${handle}?` : `Up early${handle}.`
    case "early":
      return `Morning${handle}.`
    case "morning":
      return `Good morning${handle}.`
    case "midday":
      return `Good afternoon${handle}.`
    case "afternoon":
      return `Good afternoon${handle}.`
    case "evening":
      return `Good evening${handle}.`
  }
}

// =============================================================================
// Empty-state moods — the line under "Quiet for now"
// =============================================================================

export const emptyInboxMood = (ctx: VoiceContext): string => {
  if (ctx.day === "sunday")
    return "Sunday quiet. Nothing in the inbox — go enjoy your day."
  if (ctx.day === "saturday")
    return "Quiet so far for a Saturday. Don't be surprised if it picks up later."
  if (ctx.time === "late") return "All quiet. I'm here if anything comes in overnight."
  if (ctx.time === "early") return "Calm start. When messages land, I'll be the first to know."
  if (ctx.time === "morning") return "Quiet morning. I'll let you know when something needs you."
  return "Quiet for now — that's good. I'll flag anything that needs you."
}

export const emptyOrdersMood = (ctx: VoiceContext): string => {
  if (ctx.day === "saturday") return "No orders yet — but Saturday usually shows up. I'm watching."
  if (ctx.time === "late") return "No orders overnight. Tomorrow's another day."
  return "When a customer messages and we agree on an order, I'll capture it here."
}

export const emptyInventoryMood = (): string =>
  "Add the products you sell. The more I know about them, the better I can answer your customers."

export const emptyInsightsMood = (): string =>
  "I'll start drawing patterns once we have a week or two of data flowing through."

// =============================================================================
// Loading phrases — rotate through these in <ChidiLoader>
// =============================================================================

export const LOADING_PHRASES_GENERAL = [
  "One moment…",
  "Wait small…",
  "I'm coming…",
  "Almost there…",
]

export const LOADING_PHRASES_INSIGHTS = [
  "Pulling your numbers…",
  "Adding things up…",
  "Reading the week…",
]

export const LOADING_PHRASES_INBOX = [
  "Checking on your customers…",
  "Catching up on chats…",
  "Reading your inbox…",
]

export const LOADING_PHRASES_ORDERS = [
  "Counting your orders…",
  "Tallying things up…",
]

export const LOADING_PHRASES_INVENTORY = [
  "Looking at your shelves…",
  "Counting stock…",
]

// =============================================================================
// Error voice — what Chidi says when something breaks
// =============================================================================

export const errorOwnership = (): string => {
  const lines = [
    "My fault — let me try that again.",
    "Something tripped me up. Give me a second.",
    "That didn't go through. Trying again.",
    "I missed that — let me catch up.",
  ]
  return lines[Math.floor(Math.random() * lines.length)]
}

export const errorRecovery = (): string => "If it keeps happening, tap Retry or refresh the page. I'll be here."

// =============================================================================
// Win moments — celebrate without crassness
// =============================================================================

export const winFulfilled = (customerName: string, itemCount: number): string => {
  const items = `${itemCount} item${itemCount === 1 ? "" : "s"}`
  return `${customerName} is sorted. ${items} on the way.`
}

export const winFirstSale = (): string => "Your first sale through Chidi. Quietly historic."

export const winMilestone = (n: number, type: "orders" | "customers"): string => {
  if (type === "orders" && n === 10) return "Ten orders. You're moving."
  if (type === "orders" && n === 50) return "Fifty orders. You're in rhythm now."
  if (type === "orders" && n === 100) return "A hundred orders. That's a real business."
  if (type === "customers" && n === 10) return "Ten customers know you by name. Treat them well."
  if (type === "customers" && n === 50) return "Fifty regulars. You've built something."
  return `${n} ${type}. Keep going.`
}

// =============================================================================
// Suggestion phrasing — for proactive Chidi (Morning Brief, Copilot opener)
// =============================================================================

export const proactivePromptPending = (count: number): string => {
  if (count === 1) return "1 order is waiting on payment. Should I draft a polite chase?"
  return `${count} orders pending payment. Should I draft polite chase messages?`
}

export const proactivePromptNeedsHuman = (count: number): string => {
  if (count === 1) return "1 customer is waiting for you. Want me to summarise what they need?"
  return `${count} customers are waiting for you. Want me to summarise what they need?`
}
