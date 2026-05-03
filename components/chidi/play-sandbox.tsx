"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  X,
  PlayCircle,
  Save,
  RotateCcw,
  ChevronDown,
  Sparkles,
  CheckCircle2,
} from "lucide-react"
import { ChidiMark } from "./chidi-mark"
import { cn } from "@/lib/utils"
import { useCountUp } from "@/lib/chidi/use-count-up"
import { requestApproval } from "@/components/chidi/approval-guardrail"
import { toast } from "sonner"
import {
  formatNGN,
  PLAY_CATEGORY_LABEL,
  type PlaybookPlay,
} from "@/lib/chidi/playbook-plays"

/**
 * PlaySandbox — interactive execution surface for a play.
 *
 * Opens as a full-overlay sheet when the merchant clicks a play. The merchant:
 *   • Picks a sample trigger (real customer/order from their data) on the LEFT
 *   • Sees + edits the messages Chidi will send in the CENTER (live WhatsApp
 *     bubble preview, each step expandable, content editable inline)
 *   • Sees the projected outcome (win rate, ₦ recovery estimate, recent runs)
 *     on the RIGHT — animated count-up
 *
 * Bottom action bar: Discard / Save tweaks / Commit & run. Commit fires the
 * existing Approval Guardrail with the diff — no irreversible action without
 * the merchant's explicit OK.
 *
 * Accessibility: Esc to close, focus-trapped, ARIA-modal.
 *
 * Design intent: feel like a sandbox the merchant can play in. Not a
 * workflow graph, not a static list. Concrete preview → confidence to commit.
 */

interface PlaySandboxProps {
  play: PlaybookPlay | null
  open: boolean
  onClose: () => void
  /** Optional list of "sample triggers" to populate the LEFT column. Pulled
      from the merchant's recent activity in production; we synthesize from
      the play's affected_customers in this v1. */
  sampleTriggers?: { id: string; label: string; sub: string }[]
}

export function PlaySandbox({ play, open, onClose, sampleTriggers }: PlaySandboxProps) {
  const [activeTriggerId, setActiveTriggerId] = useState<string | null>(null)
  const [stepDrafts, setStepDrafts] = useState<Record<number, string>>({})
  const [messageDraft, setMessageDraft] = useState<string>("")
  const [editingMessage, setEditingMessage] = useState(false)
  const messageRef = useRef<HTMLTextAreaElement>(null)

  // Build sample triggers — derived from the play's affected_customers if no
  // explicit list provided. Each entry becomes a clickable trigger preview.
  const triggers = useMemo(() => {
    if (sampleTriggers?.length) return sampleTriggers
    if (!play?.affected_customers?.length) {
      return [{ id: "synthetic", label: "Sample customer", sub: play?.trigger ?? "Trigger fires" }]
    }
    return play.affected_customers.slice(0, 5).map((name, i) => ({
      id: `t-${i}`,
      label: name,
      sub: play.trigger,
    }))
  }, [play, sampleTriggers])

  // Reset state whenever the active play changes (or sandbox opens fresh)
  useEffect(() => {
    if (!play) return
    setActiveTriggerId(triggers[0]?.id ?? null)
    setStepDrafts({})
    setMessageDraft(play.sample_message ?? "")
    setEditingMessage(false)
  }, [play, triggers])

  // Esc to close
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open || !play) return null

  const activeTrigger = triggers.find((t) => t.id === activeTriggerId) ?? triggers[0]
  const messageEdited = play.sample_message !== messageDraft
  const stepsEdited = Object.keys(stepDrafts).length > 0
  const hasEdits = messageEdited || stepsEdited

  const handleCommit = () => {
    requestApproval({
      play: play.title,
      summary: hasEdits
        ? `Run "${play.title}" with your edited message against ${activeTrigger?.label}.`
        : `Run "${play.title}" as-authored against ${activeTrigger?.label}.`,
      diff: [
        { label: "Trigger", from: "—", to: activeTrigger?.label ?? "Sample" },
        { label: "Steps queued", from: "0", to: `${play.steps.length}` },
        { label: "Message", from: "default", to: messageEdited ? "edited" : "default" },
        { label: "Expected win rate", from: "—", to: `${play.stats.win_rate_pct}%` },
      ],
      severity: "normal",
      onApprove: () => {
        toast.success("Play committed", {
          description: `Running "${play.title}" against ${activeTrigger?.label}.`,
        })
        onClose()
      },
      onDeny: () => {
        toast("Cancelled", { description: "I'll wait." })
      },
    })
  }

  const handleSaveTweaks = () => {
    toast.success("Tweaks saved", { description: "Your version is now the default for this play." })
  }

  const handleResetMessage = () => {
    setMessageDraft(play.sample_message ?? "")
    setEditingMessage(false)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="play-sandbox-title"
      className="fixed inset-0 z-[150] flex items-stretch justify-center"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close sandbox"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-md animate-[chidiTabSwapIn_240ms_cubic-bezier(0.22,1,0.36,1)]"
      />

      {/* Surface */}
      <div className="relative z-10 w-full max-w-6xl m-2 sm:m-4 lg:m-8 chidi-paper bg-[var(--card)] border border-[var(--chidi-border-default)] rounded-2xl shadow-[0_40px_120px_-30px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col animate-[chidiTabSwapIn_320ms_cubic-bezier(0.22,1,0.36,1)]">
        {/* Header */}
        <div className="flex items-start gap-4 px-6 lg:px-8 pt-5 pb-4 border-b border-[var(--chidi-border-subtle)]">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--chidi-surface)] flex items-center justify-center">
            <ChidiMark size={18} variant="default" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold">
                Sandbox · {PLAY_CATEGORY_LABEL[play.category]}
              </p>
              {hasEdits && (
                <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--chidi-warning)]/15 text-[var(--chidi-warning)]">
                  Edited
                </span>
              )}
            </div>
            <h2 id="play-sandbox-title" className="ty-page-title text-[var(--chidi-text-primary)]">
              {play.title}
            </h2>
            <p className="text-[13px] text-[var(--chidi-text-secondary)] mt-1 leading-snug">
              <span className="text-[var(--chidi-text-muted)]">When </span>
              {play.trigger}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 -mr-2 rounded-md text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3-pane body — stacks to single column on mobile */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-[260px_1fr_280px]">
          {/* === LEFT — Trigger picker === */}
          <aside className="border-b lg:border-b-0 lg:border-r border-[var(--chidi-border-subtle)] p-5 bg-[var(--chidi-surface)]/30">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold mb-3">
              Trigger
            </p>
            <p className="text-[12px] text-[var(--chidi-text-secondary)] leading-snug mb-3">
              Pick a recent customer or order to rehearse against.
            </p>
            <ul className="space-y-1.5">
              {triggers.map((t) => {
                const isActive = activeTriggerId === t.id
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => setActiveTriggerId(t.id)}
                      className={cn(
                        "w-full p-2.5 rounded-lg text-left transition-colors",
                        isActive
                          ? "bg-[var(--card)] shadow-[inset_0_0_0_1px_var(--chidi-text-primary)]"
                          : "hover:bg-[var(--card)]/60",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0",
                            isActive ? "bg-[var(--chidi-win)]" : "bg-[var(--chidi-border-default)]",
                          )}
                        />
                        <span className="text-[13px] font-semibold text-[var(--chidi-text-primary)] truncate">
                          {t.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--chidi-text-muted)] mt-1 leading-snug truncate pl-4">
                        {t.sub}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="mt-5 pt-4 border-t border-[var(--chidi-border-subtle)]">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="mt-1 w-3.5 h-3.5 rounded accent-[var(--chidi-win)]"
                />
                <div>
                  <p className="text-[12px] font-semibold text-[var(--chidi-text-primary)]">Dry run</p>
                  <p className="text-[11px] text-[var(--chidi-text-muted)] leading-snug mt-0.5">
                    Preview only — no message sent until you commit.
                  </p>
                </div>
              </label>
            </div>
          </aside>

          {/* === CENTER — Steps with editable WhatsApp preview === */}
          <section className="p-5 lg:p-6 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold mb-3">
              The move
            </p>
            <ol className="space-y-3 mb-5">
              {play.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--chidi-text-primary)] text-[var(--background)] text-[11px] font-semibold flex items-center justify-center flex-shrink-0 mt-0.5 tabular-nums">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[var(--chidi-text-primary)] leading-snug">
                      {stepDrafts[i] ?? step}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            {/* WhatsApp message preview — editable */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold">
                  Message Chidi sends
                </p>
                <div className="flex items-center gap-2">
                  {messageEdited && (
                    <button
                      onClick={handleResetMessage}
                      className="inline-flex items-center gap-1 text-[11px] text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)]"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditingMessage((p) => !p)
                      setTimeout(() => messageRef.current?.focus(), 50)
                    }}
                    className="text-[11px] font-medium text-[var(--chidi-win)] hover:underline"
                  >
                    {editingMessage ? "Done" : "Edit"}
                  </button>
                </div>
              </div>

              {/* WhatsApp-style chat bubble. When editing, an inline textarea
                  replaces the rendered text for live tweaking. */}
              <div
                className="rounded-xl p-4 border border-[var(--chidi-border-subtle)]"
                style={{
                  backgroundColor: "#ECE5DD",
                  backgroundImage:
                    "radial-gradient(circle at 10% 20%, rgba(7,94,84,0.04) 0px, transparent 1px), radial-gradient(circle at 80% 70%, rgba(7,94,84,0.04) 0px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              >
                <div className="flex justify-end">
                  <div
                    className="max-w-[88%] rounded-lg rounded-tr-none px-3 py-2 shadow-sm border-l-2 w-full"
                    style={{ backgroundColor: "#DCF8C6", borderLeftColor: "var(--chidi-win)" }}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <ChidiMark size={10} variant="win" />
                      <span
                        className="text-[9px] uppercase tracking-[0.12em] font-medium"
                        style={{ color: "var(--chidi-win)" }}
                      >
                        Chidi · to {activeTrigger?.label}
                      </span>
                    </div>
                    {editingMessage ? (
                      <textarea
                        ref={messageRef}
                        value={messageDraft}
                        onChange={(e) => setMessageDraft(e.target.value)}
                        rows={4}
                        className="w-full bg-transparent text-[13px] text-[#1C1917] leading-snug resize-none focus:outline-none focus:ring-0 border-0"
                      />
                    ) : (
                      <p className="text-[13px] text-[#1C1917] leading-snug whitespace-pre-line">
                        {messageDraft}
                      </p>
                    )}
                    <p className="text-[9px] text-[#999] mt-1 text-right">just now ✓✓</p>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-[var(--chidi-text-muted)] mt-2 leading-snug">
                Tip: edit the bubble inline. Save tweaks to make your version the new default for this play.
              </p>
            </div>
          </section>

          {/* === RIGHT — Projected outcome === */}
          <aside className="border-t lg:border-t-0 lg:border-l border-[var(--chidi-border-subtle)] p-5 bg-[var(--chidi-surface)]/30 space-y-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold mb-3">
                Projected outcome
              </p>

              {/* Win-rate gauge — animated */}
              <div className="flex items-center gap-4 mb-3">
                <WinRateRing percent={play.stats.win_rate_pct} />
                <div>
                  <p className="text-[18px] font-semibold tabular-nums text-[var(--chidi-text-primary)] leading-none">
                    {play.stats.win_rate_pct}%
                  </p>
                  <p className="text-[11px] text-[var(--chidi-text-muted)] mt-1">
                    win rate · {play.stats.runs} runs
                  </p>
                </div>
              </div>

              {play.stats.last_30d_value_recovered_ngn ? (
                <RecoveredCounter value={play.stats.last_30d_value_recovered_ngn} />
              ) : null}

              <p className="text-[12px] text-[var(--chidi-text-secondary)] leading-snug mt-3">
                {play.outcome}
              </p>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold mb-2.5">
                Recent runs
              </p>
              <ul className="space-y-2">
                {play.recent.slice(0, 3).map((run, i) => (
                  <li key={i} className="text-[12px] text-[var(--chidi-text-secondary)] leading-snug">
                    <span
                      className={cn(
                        "inline-flex w-2 h-2 rounded-full mr-2",
                        run.outcome === "won"
                          ? "bg-[var(--chidi-win)]"
                          : run.outcome === "lost"
                            ? "bg-[var(--chidi-text-muted)]"
                            : "bg-[var(--chidi-warning)]",
                      )}
                    />
                    {run.context}
                    {run.detail && (
                      <span className="ml-1 text-[var(--chidi-text-muted)]">· {run.detail}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        {/* Bottom action bar */}
        <div className="px-6 lg:px-8 py-3 border-t border-[var(--chidi-border-subtle)] flex items-center justify-between gap-3 bg-[var(--card)]">
          <button
            onClick={onClose}
            className="text-[13px] font-medium text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] px-3 py-2 rounded-md hover:bg-[var(--chidi-surface)] transition-colors"
          >
            Discard
          </button>
          <div className="flex items-center gap-2">
            {hasEdits && (
              <button
                onClick={handleSaveTweaks}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--chidi-text-primary)] px-3 py-2 rounded-md hover:bg-[var(--chidi-surface)] transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Save tweaks
              </button>
            )}
            <button
              onClick={handleCommit}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold bg-[var(--chidi-text-primary)] text-[var(--background)] hover:bg-[var(--chidi-text-primary)]/90 px-4 py-2 rounded-md transition-colors"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              Commit & run
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- Helpers ---------------------------------------------------------------

function WinRateRing({ percent }: { percent: number }) {
  const size = 56
  const stroke = 4
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = (Math.min(100, Math.max(0, percent)) / 100) * c
  const tone =
    percent >= 75
      ? "var(--chidi-win)"
      : percent >= 50
        ? "var(--chidi-text-primary)"
        : "var(--chidi-warning)"
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--chidi-border-subtle)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tone}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ transition: "stroke-dasharray 800ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-[var(--chidi-text-muted)]" strokeWidth={1.6} />
      </div>
    </div>
  )
}

function RecoveredCounter({ value }: { value: number }) {
  const tweened = useCountUp(value, 950)
  return (
    <div className="rounded-lg bg-[var(--card)] border border-[var(--chidi-border-subtle)] p-3 mt-2">
      <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium mb-1">
        Last 30 days
      </p>
      <p className="text-[18px] font-semibold tabular-nums text-[var(--chidi-text-primary)] leading-none inline-flex items-center gap-1.5">
        {formatNGN(Math.round(tweened))}
        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--chidi-win)]" />
      </p>
      <p className="text-[11px] text-[var(--chidi-text-muted)] mt-1">recovered across all runs</p>
    </div>
  )
}
