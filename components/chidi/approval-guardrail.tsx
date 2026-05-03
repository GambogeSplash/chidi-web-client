"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, X, Sparkles } from "lucide-react"
import { ChidiMark } from "./chidi-mark"
import { cn } from "@/lib/utils"

/**
 * Approval guardrail — when Chidi is about to take a sensitive action on the
 * merchant's behalf (refund, payout, mass-message, price change, restock),
 * a guardrail toast slides in from the bottom-right with a diff preview and
 * Approve / Deny buttons.
 *
 * Pattern lifted from Stripe Sessions 2026 Agent Toolkit Guardrails — they
 * shipped this exact UX as the canonical "agent wants to do X" approval
 * envelope. We mirror it for trust + transparency: nothing irreversible
 * happens without the merchant's explicit OK.
 *
 * Usage (anywhere in the app):
 *
 *   const guardrail = useApprovalGuardrail()
 *   guardrail.request({
 *     play: "Refund the cancelled order",
 *     summary: "Refund ₦18,000 to Tunde Bakare for cancelled order ORD-1042.",
 *     diff: [
 *       { label: "Action", from: "—", to: "Refund initiated" },
 *       { label: "Amount", from: "—", to: "-₦18,000" },
 *       { label: "Order status", from: "CANCELLED", to: "REFUNDED" },
 *     ],
 *     onApprove: async () => { ... },
 *     onDeny: () => { ... },
 *   })
 *
 * The provider must be mounted once at the dashboard root for the hook to work.
 */

export interface ApprovalDiff {
  label: string
  from: string
  to: string
}

export interface ApprovalRequest {
  /** Play / action name. Short. ("Refund", "Send broadcast", "Drop price") */
  play: string
  /** One-sentence summary of what's about to happen. */
  summary: string
  /** Field-level diff so the merchant can see exactly what will change. */
  diff: ApprovalDiff[]
  /** Severity: changes how the toast is colored. */
  severity?: "normal" | "destructive"
  /** Called when the merchant approves. Awaited so the toast shows pending. */
  onApprove: () => void | Promise<void>
  /** Called when the merchant denies or dismisses. */
  onDeny?: () => void
}

// ---- Module-level event bus so any consumer can fire a request -----------

type Listener = (req: ApprovalRequest) => void
const listeners = new Set<Listener>()

export function requestApproval(req: ApprovalRequest) {
  listeners.forEach((l) => l(req))
}

// ---- Provider mount (renders the toast) ----------------------------------

export function ApprovalGuardrailProvider() {
  const [active, setActive] = useState<ApprovalRequest | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    const handler: Listener = (req) => {
      setActive(req)
      setPending(false)
    }
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }, [])

  if (!active) return null

  const handleApprove = async () => {
    setPending(true)
    try {
      await active.onApprove()
      setActive(null)
    } finally {
      setPending(false)
    }
  }

  const handleDeny = () => {
    active.onDeny?.()
    setActive(null)
  }

  const isDestructive = active.severity === "destructive"

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-labelledby="guardrail-title"
      className="fixed bottom-4 right-4 z-[110] w-[380px] max-w-[calc(100vw-32px)] animate-[overlayChipIn_320ms_cubic-bezier(0.22,1,0.36,1)]"
    >
      <div className="rounded-2xl chidi-paper bg-[var(--card)] border border-[var(--chidi-border-default)] shadow-[0_24px_60px_-16px_rgba(0,0,0,0.35)] overflow-hidden">
        {/* Severity stripe */}
        <div
          aria-hidden
          className={cn("h-1 w-full", isDestructive ? "bg-[var(--chidi-warning)]" : "bg-[var(--chidi-win)]")}
        />

        <div className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                isDestructive ? "bg-[var(--chidi-warning)]/15" : "bg-[var(--chidi-win)]/15",
              )}
            >
              <ChidiMark
                size={16}
                variant={isDestructive ? "muted" : "win"}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold">
                Chidi wants to act
              </p>
              <h3 id="guardrail-title" className="text-[14px] font-semibold text-[var(--chidi-text-primary)] leading-snug mt-0.5">
                {active.play}
              </h3>
              <p className="text-[12px] text-[var(--chidi-text-secondary)] leading-snug mt-1">
                {active.summary}
              </p>
            </div>
            <button
              onClick={handleDeny}
              aria-label="Dismiss"
              className="p-1 -mr-1 -mt-1 rounded text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Diff */}
          <div className="rounded-lg bg-[var(--chidi-surface)]/50 border border-[var(--chidi-border-subtle)] p-2.5 mb-3 space-y-1.5">
            {active.diff.map((d, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3 text-[12px]">
                <span className="text-[var(--chidi-text-muted)] flex-shrink-0">{d.label}</span>
                <span className="text-right tabular-nums">
                  <span className="text-[var(--chidi-text-muted)] line-through">{d.from}</span>
                  <span className="mx-1.5 text-[var(--chidi-text-muted)]">→</span>
                  <span className={cn("font-semibold", isDestructive ? "text-[var(--chidi-warning)]" : "text-[var(--chidi-text-primary)]")}>
                    {d.to}
                  </span>
                </span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleApprove}
              disabled={pending}
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-semibold transition-colors disabled:opacity-60",
                isDestructive
                  ? "bg-[var(--chidi-warning)] text-white hover:bg-[var(--chidi-warning)]/90"
                  : "bg-[var(--chidi-text-primary)] text-[var(--background)] hover:bg-[var(--chidi-text-primary)]/90",
              )}
            >
              {pending ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  Working
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve
                </>
              )}
            </button>
            <button
              onClick={handleDeny}
              disabled={pending}
              className="px-3 py-2 rounded-md text-[12px] font-medium text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-surface)] transition-colors disabled:opacity-60"
            >
              Not now
            </button>
          </div>

          <p className="text-[10px] text-[var(--chidi-text-muted)] mt-2.5 text-center">
            I won&apos;t move money or send a broadcast without your OK.
          </p>
        </div>
      </div>
    </div>
  )
}
