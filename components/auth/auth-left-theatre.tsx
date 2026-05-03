"use client"

import { useEffect, useState } from "react"
import { Check, MessageCircle } from "lucide-react"
import { ChidiMark } from "@/components/chidi/chidi-mark"
import { CustomerCharacter } from "@/components/chidi/customer-character"
import { cn } from "@/lib/utils"

/**
 * Live theatre of what Chidi does, looped on the auth page left pane. Three
 * beats per loop:
 *   1. Customer message lands (Adaeze: "Do you still have the red Adidas?")
 *   2. Chidi's typing dots, then a reply bubble assembles in
 *   3. A "Chidi just replied" toast slides in from above
 * Then a soft fade and a fresh loop starts with a different customer.
 *
 * Pure CSS + setInterval. No heavy library. Runs the same way on every
 * load so anyone landing on the auth page sees the product working.
 */

interface Beat {
  customerName: string
  customerMessage: string
  chidiReply: string
  intent: string
}

const BEATS: Beat[] = [
  {
    customerName: "Adaeze Okafor",
    customerMessage: "Do you still have the red Adidas size 42?",
    chidiReply: "Yes, ₦18,000. Want me to set one aside?",
    intent: "Purchase",
  },
  {
    customerName: "Tunde Bakare",
    customerMessage: "How much for delivery to Lekki?",
    chidiReply: "Lekki is ₦2,500, usually next-day. I can lock it in.",
    intent: "Question",
  },
  {
    customerName: "Ifeoma Eze",
    customerMessage: "Wholesale price for 20 yards of the Ankara?",
    chidiReply: "For 20+ yards, ₦2,800 each. Saves you ₦8,000 on the lot.",
    intent: "Purchase",
  },
]

type Phase = "idle" | "incoming" | "typing" | "reply" | "toast" | "settle"

const STEP_MS = 1500
const TOTAL_BEAT_MS = STEP_MS * 5 // incoming, typing, reply, toast, settle

export function AuthLeftTheatre() {
  const [beatIdx, setBeatIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>("idle")

  useEffect(() => {
    let cancelled = false

    const runBeat = (idx: number) => {
      if (cancelled) return
      // Phase choreography
      setPhase("incoming")
      window.setTimeout(() => { if (!cancelled) setPhase("typing") }, STEP_MS)
      window.setTimeout(() => { if (!cancelled) setPhase("reply") }, STEP_MS * 2)
      window.setTimeout(() => { if (!cancelled) setPhase("toast") }, STEP_MS * 3)
      window.setTimeout(() => { if (!cancelled) setPhase("settle") }, STEP_MS * 4)
      window.setTimeout(() => {
        if (!cancelled) {
          setBeatIdx((i) => (i + 1) % BEATS.length)
          runBeat((idx + 1) % BEATS.length)
        }
      }, TOTAL_BEAT_MS)
    }

    runBeat(0)
    return () => { cancelled = true }
  }, [])

  const beat = BEATS[beatIdx]
  const showCustomer = phase !== "idle"
  const showTyping = phase === "typing"
  const showReply = phase === "reply" || phase === "toast" || phase === "settle"
  const showToast = phase === "toast" || phase === "settle"

  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Phone-frame inspired chrome — paper-textured, not literal phone */}
      <div className="relative bg-white rounded-[28px] p-3 shadow-2xl border border-[var(--chidi-border-subtle)] chidi-paper">
        <div className="relative z-[2]">
          {/* WhatsApp-feel header bar */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 mb-2 bg-[#075E54] text-white rounded-t-2xl -mx-3 -mt-3">
            <CustomerCharacter
              name={beat.customerName}
              size="sm"
              status="online"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{beat.customerName}</p>
              <p className="text-[10px] opacity-80 font-chidi-voice">
                {phase === "typing" ? "typing…" : "online"}
              </p>
            </div>
            <span className="text-[9px] uppercase tracking-wider bg-white/15 rounded px-1.5 py-0.5 font-chidi-voice">
              {beat.intent}
            </span>
          </div>

          {/* Conversation area */}
          <div
            className="rounded-b-2xl bg-[#ECE5DD]/60 px-3 py-3 -mx-3 -mb-3 min-h-[200px] flex flex-col gap-2"
            style={{
              backgroundImage:
                "radial-gradient(circle at 10% 20%, rgba(7,94,84,0.05) 1px, transparent 1px), radial-gradient(circle at 80% 70%, rgba(7,94,84,0.05) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          >
            {/* Customer bubble */}
            {showCustomer && (
              <div className="flex justify-start chidi-bubble-settle">
                <div className="max-w-[80%] bg-white rounded-lg rounded-tl-none px-3 py-2 shadow-sm">
                  <p className="text-[12px] text-[#1C1917] leading-snug">{beat.customerMessage}</p>
                  <p className="text-[9px] text-[#999] mt-0.5 text-right">just now</p>
                </div>
              </div>
            )}

            {/* Typing dots */}
            {showTyping && (
              <div className="flex justify-end">
                <div
                  className="bg-[#DCF8C6] rounded-lg rounded-tr-none px-3 py-2.5 shadow-sm border-l-2 inline-flex items-center gap-1"
                  style={{ borderLeftColor: "var(--chidi-win)" }}
                >
                  <span className="chidi-typing-dot w-1.5 h-1.5 rounded-full bg-[#075E54]/60" />
                  <span className="chidi-typing-dot w-1.5 h-1.5 rounded-full bg-[#075E54]/60" />
                  <span className="chidi-typing-dot w-1.5 h-1.5 rounded-full bg-[#075E54]/60" />
                </div>
              </div>
            )}

            {/* Reply bubble */}
            {showReply && (
              <div className="flex justify-end chidi-bubble-settle">
                <div
                  className="max-w-[82%] bg-[#DCF8C6] rounded-lg rounded-tr-none px-3 py-2 shadow-sm border-l-2"
                  style={{ borderLeftColor: "var(--chidi-win)" }}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <ChidiMark size={10} variant="win" />
                    <span
                      className="text-[9px] uppercase tracking-wider font-chidi-voice"
                      style={{ color: "var(--chidi-win)" }}
                    >
                      Chidi
                    </span>
                  </div>
                  <p className="text-[12px] text-[#1C1917] leading-snug">{beat.chidiReply}</p>
                  <p className="text-[9px] text-[#999] mt-0.5 text-right">now ✓✓</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast that slides in from above the phone, declaring the action */}
      {showToast && (
        <div
          className={cn(
            "absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--chidi-win)]/40 shadow-lg flex items-center gap-2 chidi-bubble-settle",
            "min-w-[220px]",
          )}
          style={{ animationDuration: "320ms" }}
        >
          <span className="w-6 h-6 rounded-full bg-[var(--chidi-win-soft)] flex items-center justify-center flex-shrink-0">
            <Check className="w-3.5 h-3.5 text-[var(--chidi-win)]" strokeWidth={3} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-chidi-voice text-[var(--chidi-text-primary)] truncate">
              Chidi replied to {beat.customerName.split(" ")[0]}
            </p>
            <p className="text-[10px] text-[var(--chidi-text-muted)]">just now</p>
          </div>
        </div>
      )}

      {/* Beat indicator dots underneath the phone */}
      <div className="flex items-center justify-center gap-1.5 mt-5">
        {BEATS.map((_, idx) => (
          <span
            key={idx}
            className={cn(
              "h-1 rounded-full transition-all duration-500",
              idx === beatIdx ? "w-6 bg-[var(--chidi-text-secondary)]" : "w-1 bg-[var(--chidi-border-default)]",
            )}
          />
        ))}
      </div>

      {/* Caption underneath */}
      <p className="text-center mt-4 text-xs text-[var(--chidi-text-muted)] font-chidi-voice">
        Live preview.
      </p>
    </div>
  )
}
