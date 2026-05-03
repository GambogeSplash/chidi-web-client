"use client"

import { useMemo } from "react"
import { ChidiMark } from "./chidi-mark"

interface AISuggestStripProps {
  /** Last message in the thread (used to bias suggestions) */
  lastMessage?: string
  /** Customer's name (for personalized openers) */
  customerName?: string
  /** Called with the chosen suggestion text */
  onPick: (text: string) => void
}

/**
 * AI-suggest reply strip — sits above the reply input. Three short
 * context-aware suggestions the merchant can tab/click into the input
 * instead of typing from scratch.
 *
 * v1 (this implementation) uses lightweight heuristic intent detection
 * over the last customer message — no LLM call. The output is real and
 * helpful for common patterns (greeting, price ask, stock check, payment
 * intent, complaint, "thanks").
 *
 * v2 plug point: replace deriveSuggestions() with a /api/ai/suggest call
 * that returns tonally-correct suggestions from the merchant's actual
 * memory + product catalog. The component contract stays the same.
 */
export function AISuggestStrip({ lastMessage, customerName, onPick }: AISuggestStripProps) {
  const suggestions = useMemo(
    () => deriveSuggestions(lastMessage ?? "", customerName),
    [lastMessage, customerName],
  )

  if (!suggestions.length) return null

  return (
    <div className="px-4 pt-3 pb-1.5 border-t border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface)]/40">
      <div className="flex items-center gap-2 mb-2">
        <ChidiMark size={11} variant="muted" />
        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold">
          Chidi suggests
        </p>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 -mx-1 px-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {suggestions.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onPick(s.text)}
            className="chidi-list-in flex-shrink-0 px-3 py-1.5 rounded-full bg-[var(--card)] border border-[var(--chidi-border-default)] text-[12px] text-[var(--chidi-text-primary)] font-sans hover:bg-[var(--chidi-win)]/10 hover:border-[var(--chidi-win)]/40 transition-colors max-w-[280px] truncate"
            style={{ animationDelay: `${i * 40}ms` }}
            title={s.text}
          >
            {s.text}
          </button>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// Heuristic intent detection — replace with LLM when ready
// =============================================================================

interface Suggestion {
  id: string
  text: string
}

function deriveSuggestions(msg: string, customerName?: string): Suggestion[] {
  const m = msg.toLowerCase()
  const firstName = customerName?.split(" ")[0]
  const opener = firstName ? `Hi ${firstName}, ` : "Hi, "

  // Pattern: greeting
  if (/^(hi|hello|hey|good (morning|afternoon|evening)|how far|abeg)\b/i.test(msg) && msg.length < 30) {
    return [
      { id: "greet1", text: `${opener}good to hear from you. How can I help?` },
      { id: "greet2", text: `${opener}thanks for reaching out. What are you looking for?` },
      { id: "greet3", text: `${opener}we're open. Browse the catalog or tell me what you need.` },
    ]
  }

  // Pattern: price ask
  if (/(how much|price|cost|how (.+) cost)/i.test(m)) {
    return [
      { id: "price1", text: "Quick check — let me confirm the latest price and get back to you in a moment." },
      { id: "price2", text: "Which item exactly? I can send you the price + a photo." },
      { id: "price3", text: "Bulk or single? Bulk gets 10% off at 10+ units." },
    ]
  }

  // Pattern: stock / availability
  if (/(in stock|available|do you have|still have|got any)/i.test(m)) {
    return [
      { id: "stock1", text: "Yes, in stock. Want me to set one aside while you decide?" },
      { id: "stock2", text: "Last few left. Drop a yes and I'll lock it for you." },
      { id: "stock3", text: "Out of stock right now — restocking this week. Want me to ping you?" },
    ]
  }

  // Pattern: payment / transfer
  if (/(pay|paid|transfer|account|bank|sent)/i.test(m)) {
    return [
      { id: "pay1", text: "Bank: GTBank 0123456789, name on the account is yours. I'll confirm when it lands." },
      { id: "pay2", text: "Got it, checking the bank now. One moment." },
      { id: "pay3", text: "Confirmed. Thank you 🙏 Receipt coming." },
    ]
  }

  // Pattern: delivery / shipping
  if (/(deliver|delivery|ship|pickup|pick up|where|location)/i.test(m)) {
    return [
      { id: "del1", text: "Same-day delivery in Lagos for ₦1,500. Pickup is free from the shop." },
      { id: "del2", text: "We deliver Mon–Sat. Where in Lagos are you?" },
      { id: "del3", text: "Pickup available from 10am tomorrow. Drop your address if you'd rather we deliver." },
    ]
  }

  // Pattern: complaint / wrong / refund
  if (/(wrong|broken|damage|refund|return|exchange|complain)/i.test(m)) {
    return [
      { id: "comp1", text: `${firstName ? firstName + ", " : ""}sorry to hear that. Send a photo and I'll sort it out today.` },
      { id: "comp2", text: "I'll personally look into this. What's the order number?" },
      { id: "comp3", text: "We can refund or exchange — your call. Which works better for you?" },
    ]
  }

  // Pattern: thanks
  if (/(thank|thanks|appreciate|grateful|🙏)/i.test(m)) {
    return [
      { id: "thanks1", text: "You're welcome 🙌 Come again any time." },
      { id: "thanks2", text: "Anytime. Tell a friend!" },
      { id: "thanks3", text: "🙏 Thank you for shopping with us." },
    ]
  }

  // Default — generic but useful
  return [
    { id: "default1", text: `${opener}thanks for the message. Let me check and get right back to you.` },
    { id: "default2", text: "Could you share a bit more about what you're looking for?" },
    { id: "default3", text: "On it. One moment." },
  ]
}
