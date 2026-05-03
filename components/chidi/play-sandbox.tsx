"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  PlayCircle,
  Save,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  CircleDashed,
  XCircle,
  Pause,
  Play as PlayIcon,
} from "lucide-react"
import { ChidiMark } from "./chidi-mark"
import { CustomerCharacter } from "./customer-character"
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
 * PlaySandboxPanel — inline rehearsal surface for a play.
 *
 * Renders as the right pane of the Playbook page (no modal, no overlay).
 * The merchant:
 *   - Picks a sample trigger (real customer/order) on the LEFT
 *   - Sees + edits the WhatsApp message in the CENTER, with a live bubble
 *   - Sees projected outcome + recent runs on the RIGHT
 *
 * Bottom action bar: Discard tweaks / Save tweaks / Commit & run. Commit
 * fires the existing Approval Guardrail with the diff — no irreversible
 * action without the merchant's explicit OK.
 */

interface PlaySandboxPanelProps {
  play: PlaybookPlay
  paused?: boolean
  onTogglePause?: () => void
  /** Optional list of "sample triggers" to populate the LEFT column. */
  sampleTriggers?: { id: string; label: string; sub: string }[]
}

export function PlaySandboxPanel({
  play,
  paused = false,
  onTogglePause,
  sampleTriggers,
}: PlaySandboxPanelProps) {
  const [activeTriggerId, setActiveTriggerId] = useState<string | null>(null)
  const [messageDraft, setMessageDraft] = useState<string>("")
  const [editingMessage, setEditingMessage] = useState(false)
  const messageRef = useRef<HTMLTextAreaElement>(null)

  // Build sample triggers — derived from the play's affected_customers if no
  // explicit list provided. Each entry becomes a clickable trigger preview.
  const triggers = useMemo(() => {
    if (sampleTriggers?.length) return sampleTriggers
    if (!play.affected_customers?.length) {
      return [{ id: "synthetic", label: "Sample customer", sub: play.trigger }]
    }
    return play.affected_customers.slice(0, 5).map((name, i) => ({
      id: `t-${i}`,
      label: name,
      sub: play.trigger,
    }))
  }, [play, sampleTriggers])

  // Reset state whenever the active play changes
  useEffect(() => {
    setActiveTriggerId(triggers[0]?.id ?? null)
    setMessageDraft(play.sample_message ?? "")
    setEditingMessage(false)
  }, [play, triggers])

  const activeTrigger = triggers.find((t) => t.id === activeTriggerId) ?? triggers[0]
  const messageEdited = (play.sample_message ?? "") !== messageDraft
  const hasEdits = messageEdited

  const effectivelyRunning = play.state === "active" && !paused

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
      },
      onDeny: () => {
        toast("Cancelled", { description: "I'll wait." })
      },
    })
  }

  const handleSaveTweaks = () => {
    toast.success("Tweaks saved", {
      description: "Your version is now the default for this play.",
    })
  }

  const handleResetMessage = () => {
    setMessageDraft(play.sample_message ?? "")
    setEditingMessage(false)
  }

  return (
    <section
      key={play.id}
      className="rounded-2xl chidi-paper bg-[var(--card)] border border-[var(--chidi-border-default)] overflow-hidden animate-[chidiTabSwapIn_280ms_cubic-bezier(0.22,1,0.36,1)]"
    >
      {/* Header */}
      <div className="flex items-start gap-3 px-5 lg:px-6 pt-5 pb-4 border-b border-[var(--chidi-border-subtle)]">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--chidi-surface)] flex items-center justify-center">
          <ChidiMark size={18} variant="default" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold">
              Sandbox · {PLAY_CATEGORY_LABEL[play.category]}
            </p>
            {effectivelyRunning ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-[var(--chidi-win)]">
                <span className="w-1 h-1 rounded-full bg-[var(--chidi-win)] animate-pulse" />
                Running
              </span>
            ) : (
              <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--chidi-text-muted)]">
                Paused
              </span>
            )}
            {hasEdits && (
              <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--chidi-warning)]/15 text-[var(--chidi-warning)]">
                Edited
              </span>
            )}
          </div>
          <h2 className="ty-page-title text-[var(--chidi-text-primary)]">{play.title}</h2>
          <p className="text-[13px] text-[var(--chidi-text-secondary)] mt-1 leading-snug">
            <span className="text-[var(--chidi-text-muted)]">When </span>
            {play.trigger}
          </p>
        </div>
        {onTogglePause && (
          <button
            onClick={onTogglePause}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] px-2.5 py-1.5 -mr-1 rounded-md hover:bg-[var(--chidi-surface)] transition-colors"
          >
            {effectivelyRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" strokeWidth={2} />
                Pause
              </>
            ) : (
              <>
                <PlayIcon className="w-3.5 h-3.5" strokeWidth={2} />
                Resume
              </>
            )}
          </button>
        )}
      </div>

      {/* 3-pane body — stacks to single column on smaller widths */}
      <div className="grid grid-cols-1 xl:grid-cols-[200px_1fr_220px]">
        {/* === LEFT — Trigger picker === */}
        <aside className="border-b xl:border-b-0 xl:border-r border-[var(--chidi-border-subtle)] p-4 lg:p-5 bg-[var(--chidi-surface)]/30">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold mb-2">
            Rehearse against
          </p>
          <ul className="space-y-1.5">
            {triggers.map((t) => {
              const isActive = activeTriggerId === t.id
              const looksLikeName =
                /^[A-Z][a-z]+( [A-Z][a-z'-]+)+$/.test(t.label) ||
                /^[A-Z][a-z]+ [A-Z]\.$/.test(t.label)
              return (
                <li key={t.id}>
                  <button
                    onClick={() => setActiveTriggerId(t.id)}
                    className={cn(
                      "w-full p-2 rounded-lg text-left transition-colors flex items-center gap-2",
                      isActive
                        ? "bg-[var(--card)] shadow-[inset_0_0_0_1px_var(--chidi-text-primary)]"
                        : "hover:bg-[var(--card)]/60",
                    )}
                  >
                    {looksLikeName ? (
                      <CustomerCharacter name={t.label} size="xs" />
                    ) : (
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0",
                          isActive ? "bg-[var(--chidi-win)]" : "bg-[var(--chidi-border-default)]",
                        )}
                      />
                    )}
                    <span className="text-[12px] font-medium text-[var(--chidi-text-primary)] truncate">
                      {t.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="mt-4 pt-3 border-t border-[var(--chidi-border-subtle)]">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="mt-0.5 w-3.5 h-3.5 rounded accent-[var(--chidi-win)]"
              />
              <div>
                <p className="text-[12px] font-semibold text-[var(--chidi-text-primary)]">
                  Dry run
                </p>
                <p className="text-[11px] text-[var(--chidi-text-muted)] leading-snug mt-0.5">
                  Preview only — no message sent until you commit.
                </p>
              </div>
            </label>
          </div>
        </aside>

        {/* === CENTER — Steps + WhatsApp preview === */}
        <section className="p-4 lg:p-6 min-w-0">
          {/* Trigger → action flow chain — concrete visual scaffolding */}
          <FlowChain
            trigger={play.trigger}
            stepCount={play.steps.length}
            running={effectivelyRunning}
          />

          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold mb-2 mt-5">
            Then do this
          </p>
          <ol className="space-y-2.5 mb-5">
            {play.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[var(--chidi-text-primary)] text-[var(--background)] text-[11px] font-semibold flex items-center justify-center flex-shrink-0 mt-0.5 tabular-nums">
                  {i + 1}
                </span>
                <p className="text-[13px] text-[var(--chidi-text-primary)] leading-snug pt-0.5">
                  {step}
                </p>
              </li>
            ))}
          </ol>

          {/* WhatsApp message preview — editable */}
          {(play.sample_message || messageDraft) && (
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
                    className="max-w-[90%] rounded-lg rounded-tr-none px-3 py-2 shadow-sm border-l-2 w-full"
                    style={{
                      backgroundColor: "var(--chidi-channel-whatsapp-bubble)",
                      borderLeftColor: "var(--chidi-win)",
                    }}
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
                        className="w-full bg-transparent text-[13px] text-[var(--chidi-channel-whatsapp-bubble-text)] leading-snug resize-none focus:outline-none focus:ring-0 border-0"
                      />
                    ) : (
                      <p className="text-[13px] text-[var(--chidi-channel-whatsapp-bubble-text)] leading-snug whitespace-pre-line">
                        {messageDraft || "(No message authored yet — add one to preview.)"}
                      </p>
                    )}
                    <p className="text-[9px] text-[#999] mt-1 text-right">just now ✓✓</p>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-[var(--chidi-text-muted)] mt-2 leading-snug">
                Tip: edit inline. Save tweaks to make your version the new default.
              </p>
            </div>
          )}
        </section>

        {/* === RIGHT — Projected outcome === */}
        <aside className="border-t xl:border-t-0 xl:border-l border-[var(--chidi-border-subtle)] p-4 lg:p-5 bg-[var(--chidi-surface)]/30 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold mb-3">
              Projected outcome
            </p>

            <div className="flex items-center gap-3 mb-3">
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

          {play.recent.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold mb-2.5">
                Recent runs
              </p>
              <ul className="space-y-2">
                {play.recent.slice(0, 3).map((run, i) => {
                  const Icon =
                    run.outcome === "won"
                      ? CheckCircle2
                      : run.outcome === "lost"
                        ? XCircle
                        : CircleDashed
                  const tone =
                    run.outcome === "won"
                      ? "text-[var(--chidi-win)]"
                      : run.outcome === "lost"
                        ? "text-[var(--chidi-text-muted)]"
                        : "text-[var(--chidi-warning)]"
                  return (
                    <li key={i} className="flex items-start gap-2 text-[12px] leading-snug">
                      <Icon className={cn("w-3.5 h-3.5 mt-0.5 flex-shrink-0", tone)} strokeWidth={2} />
                      <span className="text-[var(--chidi-text-secondary)]">
                        {run.context}
                        {run.detail && (
                          <span className={cn("block mt-0.5 text-[11px] tabular-nums", tone)}>
                            {run.detail}
                          </span>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {/* Bottom action bar */}
      <div className="px-5 lg:px-6 py-3 border-t border-[var(--chidi-border-subtle)] flex items-center justify-between gap-3 bg-[var(--card)]">
        <p className="text-[11px] text-[var(--chidi-text-muted)] hidden sm:block">
          Rehearse here. Nothing sends until you commit.
        </p>
        <div className="flex items-center gap-2 ml-auto">
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
    </section>
  )
}

// ---- Helpers ---------------------------------------------------------------

/**
 * FlowChain — small visual scaffolding showing trigger → N steps → outcome.
 * Animates a "pulse" along the chain when the play is running. Three nodes:
 *   [When]  →  [N steps]  →  [Done]
 * Subtle, single line. Replaces the prior text-only "The move" header so the
 * page reads as a play, not a wall of bullet points.
 */
function FlowChain({
  trigger,
  stepCount,
  running,
}: {
  trigger: string
  stepCount: number
  running: boolean
}) {
  return (
    <div className="rounded-xl bg-[var(--chidi-surface)]/40 border border-[var(--chidi-border-subtle)] p-3 lg:p-4">
      <div className="flex items-center gap-2 lg:gap-3 text-[11px]">
        <FlowNode label="When" sub={truncate(trigger, 40)} tone="muted" />
        <FlowEdge running={running} />
        <FlowNode
          label="Then"
          sub={`${stepCount} step${stepCount === 1 ? "" : "s"}`}
          tone="primary"
        />
        <FlowEdge running={running} delayMs={400} />
        <FlowNode label="Done" sub="logged" tone="win" />
      </div>
    </div>
  )
}

function FlowNode({
  label,
  sub,
  tone,
}: {
  label: string
  sub: string
  tone: "muted" | "primary" | "win"
}) {
  const dot =
    tone === "win"
      ? "bg-[var(--chidi-win)]"
      : tone === "primary"
        ? "bg-[var(--chidi-text-primary)]"
        : "bg-[var(--chidi-text-muted)]"
  return (
    <div className="flex flex-col items-start gap-0.5 min-w-0 flex-shrink-0">
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-semibold">
        <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
        {label}
      </span>
      <span className="text-[11px] text-[var(--chidi-text-primary)] truncate max-w-[160px]">
        {sub}
      </span>
    </div>
  )
}

function FlowEdge({ running, delayMs = 0 }: { running: boolean; delayMs?: number }) {
  return (
    <div className="relative flex-1 h-px min-w-[12px] bg-[var(--chidi-border-default)] overflow-hidden">
      {running && (
        <span
          className="absolute inset-y-0 left-0 w-6 bg-[var(--chidi-win)]/70"
          style={{
            animation: `chidiFlowPulse 1800ms ${delayMs}ms cubic-bezier(0.4,0,0.2,1) infinite`,
          }}
        />
      )}
      <style jsx>{`
        @keyframes chidiFlowPulse {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          25% {
            opacity: 1;
          }
          75% {
            opacity: 1;
          }
          100% {
            transform: translateX(400%);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

function truncate(s: string, max: number) {
  if (s.length <= max) return s
  return s.slice(0, max - 1).trimEnd() + "…"
}

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
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--chidi-border-subtle)"
          strokeWidth={stroke}
          fill="none"
        />
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
