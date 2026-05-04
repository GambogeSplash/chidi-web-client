"use client"

/**
 * ChatSummarySheet — the side panel that shows a Chidi-summarized recap of
 * the active conversation.
 *
 * Triggered by the "Summarize" button in the channel-chat header. Renders
 * the deterministic output from `summarizeConversation()` (lib/chidi/
 * chat-summary.ts) with an Arc-style "looks AI-generated" header, bulleted
 * recap, status pill, and a CTA that fires the suggested action.
 *
 * Mobile: the underlying Radix Sheet primitive auto-converts to a
 * bottom-sheet on small viewports — we use side="right" desktop, side
 * "bottom" on mobile (handled here via a viewport check).
 *
 * No real AI calls — see `chat-summary.ts` for the deterministic algo and
 * the phase-2 swap plan.
 */

import { useMemo, useState, useEffect } from "react"
import { Sparkles, RotateCw, Check, ChevronRight } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useIsMobile } from "@/components/ui/use-mobile"
import { ArcFace } from "./arc-face"
import { cn } from "@/lib/utils"
import {
  summarizeConversation,
  type ChatSummary,
  type ChatSuggestedAction,
} from "@/lib/chidi/chat-summary"
import type { ChannelConversation, ChannelMessage } from "@/lib/api/messaging"
import type { Order } from "@/lib/api/orders"

interface ChatSummarySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversation: ChannelConversation
  messages: ChannelMessage[]
  linkedOrder?: Order | null
  /** Called when the merchant taps the suggested-action CTA. The sheet
      passes back what kind of action it was so the parent can wire it
      to the right modal/widget (e.g. open the payment-confirm popover). */
  onAction?: (kind: ChatSuggestedAction) => void
}

export function ChatSummarySheet({
  open,
  onOpenChange,
  conversation,
  messages,
  linkedOrder = null,
  onAction,
}: ChatSummarySheetProps) {
  const isMobile = useIsMobile()
  const side = isMobile ? "bottom" : "right"

  // Force a fresh recompute on every "Regenerate" click — even though the
  // underlying summary is deterministic, the merchant should still feel
  // something happen (and a real AI swap will produce different copy each
  // time, so we set the affordance up now).
  const [bumper, setBumper] = useState(0)
  const [generatedAt, setGeneratedAt] = useState<number>(() => Date.now())

  // Reset the "generated just now" stamp whenever the sheet (re-)opens or
  // the merchant taps Regenerate.
  useEffect(() => {
    if (open) setGeneratedAt(Date.now())
  }, [open, bumper])

  const summary: ChatSummary = useMemo(
    () => summarizeConversation({ messages, conversation, linkedOrder }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages, conversation, linkedOrder, bumper],
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          "bg-[var(--background)] p-0 flex flex-col gap-0",
          side === "bottom"
            ? "max-h-[88vh] rounded-t-2xl"
            : "w-full sm:max-w-[420px] max-w-full",
        )}
      >
        {/* Header — ArcFace + title. Looks AI-authored without lying. */}
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-[var(--chidi-border-subtle)]">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-[var(--chidi-surface)] flex items-center justify-center text-[var(--chidi-text-primary)]">
              <ArcFace size={18} />
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold mb-0.5">
                Chidi · summary
              </p>
              <SheetTitle className="text-[15px] font-semibold text-[var(--chidi-text-primary)] leading-snug">
                Conversation summary
              </SheetTitle>
              <p className="text-[12px] text-[var(--chidi-text-secondary)] font-chidi-voice mt-1 leading-snug truncate">
                With {conversation.customer_name || "this customer"}
              </p>
            </div>
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          {/* Bullets */}
          <ul className="space-y-2.5">
            {summary.bullets.map((b, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-[13px] text-[var(--chidi-text-primary)] leading-snug font-chidi-voice motion-safe:animate-[summaryBulletIn_360ms_cubic-bezier(0.22,1,0.36,1)] motion-reduce:opacity-100"
                style={{
                  animationDelay: `${i * 60}ms`,
                  animationFillMode: "both",
                }}
              >
                <span className="flex-shrink-0 mt-[3px] w-3.5 h-3.5 rounded-full bg-[var(--chidi-surface)] flex items-center justify-center">
                  <Check
                    className="w-2.5 h-2.5 text-[var(--chidi-text-secondary)]"
                    strokeWidth={2.6}
                  />
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>

          {/* Pending status pill */}
          <div className="flex items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium font-chidi-voice px-2.5 py-1 rounded-full bg-[var(--chidi-surface)] text-[var(--chidi-text-secondary)] border border-[var(--chidi-border-subtle)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--chidi-text-muted)]" />
              {summary.pendingLine}
            </span>
          </div>

          {/* Suggested action row */}
          <div className="rounded-xl border border-[var(--chidi-border-subtle)] bg-[var(--card)] p-3.5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--chidi-text-muted)] font-semibold mb-1.5">
              What's next
            </p>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] text-[var(--chidi-text-primary)] font-chidi-voice leading-snug">
                {summary.suggestedAction}
              </p>
              <button
                type="button"
                onClick={() => {
                  onAction?.(summary.actionKind)
                  // Auto-close the sheet on action so the merchant lands on
                  // whatever surface the action opens.
                  onOpenChange(false)
                }}
                className="flex-shrink-0 inline-flex items-center gap-1 text-[12px] font-medium font-chidi-voice px-3 py-1.5 rounded-lg bg-[var(--chidi-text-primary)] text-[var(--chidi-bg-primary)] hover:opacity-90 active:scale-[0.97] transition-colors"
              >
                Do it
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer — generated stamp + regenerate */}
        <div className="px-5 py-3 border-t border-[var(--chidi-border-subtle)] flex items-center justify-between gap-3 flex-shrink-0">
          <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" strokeWidth={2} />
            <GeneratedJustNow at={generatedAt} />
          </p>
          <button
            type="button"
            onClick={() => setBumper((n) => n + 1)}
            className="inline-flex items-center gap-1 text-[11px] font-chidi-voice text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] transition-colors"
          >
            <RotateCw className="w-3 h-3" />
            Regenerate
          </button>
        </div>

        <style>{`
          @keyframes summaryBulletIn {
            from { transform: translateY(4px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @media (prefers-reduced-motion: reduce) {
            [class*="animate-[summaryBulletIn"] { animation: none !important; }
          }
        `}</style>
      </SheetContent>
    </Sheet>
  )
}

// "Generated just now" → "Generated 12s ago" → "Generated 1m ago" …
// Updates every 15s for the freshness signal.
function GeneratedJustNow({ at }: { at: number }) {
  const [, force] = useState(0)
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 15_000)
    return () => clearInterval(id)
  }, [])
  const diff = Math.max(0, Date.now() - at)
  if (diff < 12_000) return <>Generated just now</>
  if (diff < 60_000) {
    const s = Math.floor(diff / 1000)
    return <>Generated {s}s ago</>
  }
  if (diff < 3_600_000) {
    const m = Math.floor(diff / 60_000)
    return <>Generated {m}m ago</>
  }
  return <>Generated a while ago</>
}
