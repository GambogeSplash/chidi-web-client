/**
 * Stub AI-draft generator. Returns a plausible reply Chidi *would* compose
 * given the customer's most recent message + the merchant's persona. Backend
 * can swap this for a real model call; UI behavior is unchanged.
 */

export interface DraftContext {
  customerName?: string | null
  lastCustomerMessage?: string
  channelName?: string
}

const GREETINGS = ["Hi", "Hello", "Hey"]
const SIGNS_OFF = ["Let me know!", "Talk soon.", "Thanks for reaching out!"]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function draftReply(ctx: DraftContext): string {
  const name = (ctx.customerName || "").split(" ")[0] || ""
  const greeting = `${pick(GREETINGS)}${name ? ` ${name}` : ""},`
  const text = (ctx.lastCustomerMessage || "").toLowerCase()

  let body = "Thanks for reaching out — what can I help you with?"

  if (text.includes("price") || text.includes("how much") || text.includes("cost")) {
    body = "Happy to share — pricing depends on the item and quantity. What were you looking at?"
  } else if (text.includes("size") || text.includes("fit") || text.includes("color") || text.includes("colour")) {
    body = "Let me check what we have in stock for you. Any size or colour in particular?"
  } else if (text.includes("delivery") || text.includes("ship") || text.includes("send")) {
    body = "Delivery is usually 1-2 days within Lagos, 2-4 days outside. Where would I be sending it?"
  } else if (text.includes("pay") || text.includes("transfer") || text.includes("paid")) {
    body = "Once you transfer I'll confirm and send a receipt. Want me to share the bank details?"
  } else if (text.includes("available") || text.includes("in stock") || text.includes("got")) {
    body = "Let me check stock for you and get right back to you."
  } else if (text.includes("thank")) {
    body = "Anytime — let me know if you need anything else."
  }

  return `${greeting}\n\n${body}\n\n${pick(SIGNS_OFF)}`
}
