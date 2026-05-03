"use client"

/**
 * PlaySheetBody — the body of the slide-up sheet rendered when the merchant
 * taps a play row in the Playbook list.
 *
 * Rebuilt 2026-05-03 from the prior 3-pane sandbox. Reads top-down:
 *   1. Header (name, status, close)
 *   2. What it does — trigger + steps in plain English
 *   3. The actual message — WhatsApp bubble preview, editable inline
 *   4. Track record — recovered ₦, runs, 3 most recent runs
 *   5. Actions — Run now (mock execution), Pause/Resume
 *
 * NO 3-column grid. NO win-rate ring. NO flow-chain animation. NO trigger
 * picker on the left. Just the play, what it sends, what it has done.
 */

import { useEffect, useRef, useState } from "react"
import {
  PlayCircle,
  RotateCcw,
  CheckCircle2,
  CircleDashed,
  XCircle,
  Pause,
  Play as PlayIcon,
  X as XIcon,
  Pencil,
  Check,
} from "lucide-react"
import { ChidiMark } from "./chidi-mark"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  formatNGN,
  PLAY_CATEGORY_LABEL,
  type PlaybookPlay,
} from "@/lib/chidi/playbook-plays"

interface PlaySheetBodyProps {
  play: PlaybookPlay
  paused: boolean
  /** Merchant-customized message override, if any. */
  customMessage?: string
  onTogglePause: () => void
  onSaveMessage: (message: string) => void
  onResetMessage: () => void
  onClose: () => void
}

export function PlaySheetBody({
  play,
  paused,
  customMessage,
  onTogglePause,
  onSaveMessage,
  onResetMessage,
  onClose,
}: PlaySheetBodyProps) {
  const baseMessage = customMessage ?? play.sample_message ?? ""
  const [message, setMessage] = useState(baseMessage)
  const [editing, setEditing] = useState(false)
  const [running, setRunning] = useState(false)
  const [lastRunResult, setLastRunResult] = useState<string | null>(null)
  const editRef = useRef<HTMLTextAreaElement>(null)

  // Reset edit state whenever the play changes.
  useEffect(() => {
    setMessage(baseMessage)
    setEditing(false)
    setLastRunResult(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play.id])

  const dirty = message !== baseMessage
  const customized = !!customMessage && customMessage !== play.sample_message

  const handleEdit = () => {
    setEditing(true)
    setTimeout(() => editRef.current?.focus(), 60)
  }

  const handleSave = () => {
    onSaveMessage(message)
    setEditing(false)
  }

  const handleReset = () => {
    onResetMessage()
    setMessage(play.sample_message ?? "")
    setEditing(false)
  }

  const handleRunNow = () => {
    if (paused) {
      toast("Play is paused", { description: "Resume it first." })
      return
    }
    setRunning(true)
    setLastRunResult(null)
    const sampleName = play.affected_customers?.[0] ?? "a sample customer"
    // Simulated execution — short, perceptible delay so it feels real.
    setTimeout(() => {
      setRunning(false)
      const won = play.stats.win_rate_pct >= 50
      setLastRunResult(
        won
          ? `Sent to ${sampleName}. Replied within 4 minutes.`
          : `Sent to ${sampleName}. No reply yet — Chidi will follow up.`,
      )
      toast.success("Play ran once", {
        description: `Test run against ${sampleName}.`,
      })
    }, 900)
  }

  return (
    <>
      {/* === Header ============================================ */}
      <header className="flex items-start gap-3 px-5 lg:px-6 pt-5 pb-4 border-b border-[var(--chidi-border-subtle)] flex-shrink-0">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-[var(--chidi-surface)] flex items-center justify-center">
          <ChidiMark size={16} variant={paused ? "muted" : "default"} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold">
              {PLAY_CATEGORY_LABEL[play.category]}
            </p>
            {paused ? (
              <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--chidi-text-muted)]">
                · Paused
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-[var(--chidi-win)]">
                <span className="w-1 h-1 rounded-full bg-[var(--chidi-win)] motion-safe:animate-pulse" />
                Running
              </span>
            )}
            {customized && (
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--chidi-surface)] text-[var(--chidi-text-muted)]">
                Yours
              </span>
            )}
          </div>
          <h2 className="text-[17px] font-semibold text-[var(--chidi-text-primary)] leading-snug">
            {play.title}
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="p-2 -mr-2 rounded-md text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] transition-colors flex-shrink-0"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </header>

      {/* === Scrollable body ==================================== */}
      <div className="px-5 lg:px-6 py-5 space-y-6 overflow-y-auto flex-1">
        {/* What it does — trigger + steps */}
        <section>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold mb-2">
            What it does
          </p>
          <div className="rounded-xl bg-[var(--chidi-surface)]/40 border border-[var(--chidi-border-subtle)] p-3.5 lg:p-4 space-y-3">
            <p className="text-[13px] text-[var(--chidi-text-primary)] leading-snug">
              <span className="text-[var(--chidi-text-muted)] font-medium">When </span>
              {play.trigger}
            </p>
            <ol className="space-y-2 pt-1">
              {play.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-1 w-4 h-4 rounded-full bg-[var(--chidi-text-primary)] text-[var(--background)] text-[9px] font-semibold flex items-center justify-center flex-shrink-0 tabular-nums">
                    {i + 1}
                  </span>
                  <p className="text-[12.5px] text-[var(--chidi-text-secondary)] leading-snug">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* The actual message — editable WhatsApp bubble */}
        {(play.sample_message || message) && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold">
                Message Chidi sends
              </p>
              <div className="flex items-center gap-2">
                {customized && !editing && (
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-1 text-[11px] text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)]"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
                {editing ? (
                  <button
                    onClick={handleSave}
                    disabled={!dirty}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--chidi-win)] hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                  >
                    <Check className="w-3 h-3" />
                    Save
                  </button>
                ) : (
                  <button
                    onClick={handleEdit}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)]"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                )}
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
                  className="max-w-[92%] rounded-lg rounded-tr-none px-3 py-2 shadow-sm border-l-2 w-full"
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
                      Chidi
                    </span>
                  </div>
                  {editing ? (
                    <textarea
                      ref={editRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      className="w-full bg-transparent text-[13px] text-[var(--chidi-channel-whatsapp-bubble-text)] leading-snug resize-none focus:outline-none focus:ring-0 border-0"
                    />
                  ) : (
                    <p className="text-[13px] text-[var(--chidi-channel-whatsapp-bubble-text)] leading-snug whitespace-pre-line">
                      {message || "(No message authored — edit to add one.)"}
                    </p>
                  )}
                  <p className="text-[9px] text-[#999] mt-1 text-right">just now ✓✓</p>
                </div>
              </div>
            </div>
            {editing && (
              <p className="text-[11px] text-[var(--chidi-text-muted)] mt-2 leading-snug">
                Edit inline. Save to make this the message Chidi sends from now on.
              </p>
            )}
          </section>
        )}

        {/* Track record — recovered + recent runs */}
        <section>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold mb-2">
            Track record
          </p>
          <div className="rounded-xl border border-[var(--chidi-border-subtle)] overflow-hidden">
            {/* Top: ₦ recovered + runs */}
            <div className="grid grid-cols-2 divide-x divide-[var(--chidi-border-subtle)] bg-[var(--chidi-surface)]/40">
              <div className="p-3.5">
                <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium mb-1">
                  Recovered (30d)
                </p>
                <p className="text-[16px] font-semibold tabular-nums text-[var(--chidi-text-primary)] leading-none">
                  {play.stats.last_30d_value_recovered_ngn
                    ? formatNGN(play.stats.last_30d_value_recovered_ngn)
                    : "—"}
                </p>
              </div>
              <div className="p-3.5">
                <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium mb-1">
                  Times run
                </p>
                <p className="text-[16px] font-semibold tabular-nums text-[var(--chidi-text-primary)] leading-none">
                  {play.stats.runs}
                  <span className="text-[11px] font-normal text-[var(--chidi-text-muted)] ml-1.5">
                    · {play.stats.won} won
                  </span>
                </p>
              </div>
            </div>
            {/* Recent runs */}
            {play.recent.length > 0 && (
              <ul className="divide-y divide-[var(--chidi-border-subtle)]">
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
                    <li key={i} className="flex items-start gap-2.5 px-3.5 py-2.5">
                      <Icon
                        className={cn("w-3.5 h-3.5 mt-0.5 flex-shrink-0", tone)}
                        strokeWidth={2}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] text-[var(--chidi-text-primary)] leading-snug">
                          {run.context}
                        </p>
                        {run.detail && (
                          <p className={cn("text-[11px] leading-snug mt-0.5 tabular-nums", tone)}>
                            {run.detail}
                          </p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Run-now result — appears after a successful test run */}
        {lastRunResult && (
          <div
            className="rounded-xl border border-[var(--chidi-win)]/30 bg-[var(--chidi-win)]/5 px-4 py-3 flex items-start gap-2.5 motion-safe:animate-[chidiResultIn_280ms_cubic-bezier(0.22,1,0.36,1)]"
          >
            <CheckCircle2 className="w-4 h-4 text-[var(--chidi-win)] flex-shrink-0 mt-0.5" strokeWidth={2} />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-[var(--chidi-win)] font-semibold mb-0.5">
                Test run complete
              </p>
              <p className="text-[12.5px] text-[var(--chidi-text-primary)] leading-snug">
                {lastRunResult}
              </p>
            </div>
            <style jsx>{`
              @keyframes chidiResultIn {
                from {
                  transform: translateY(6px);
                  opacity: 0;
                }
                to {
                  transform: translateY(0);
                  opacity: 1;
                }
              }
            `}</style>
          </div>
        )}
      </div>

      {/* === Action bar ========================================= */}
      <div className="px-5 lg:px-6 py-3 border-t border-[var(--chidi-border-subtle)] flex items-center justify-between gap-3 bg-[var(--card)] flex-shrink-0">
        <button
          onClick={onTogglePause}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] px-3 py-2 rounded-md hover:bg-[var(--chidi-surface)] transition-colors"
        >
          {paused ? (
            <>
              <PlayIcon className="w-3.5 h-3.5" strokeWidth={2} />
              Resume
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5" strokeWidth={2} />
              Pause
            </>
          )}
        </button>
        <button
          onClick={handleRunNow}
          disabled={running || paused}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold bg-[var(--chidi-text-primary)] text-[var(--background)] hover:bg-[var(--chidi-text-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-md transition-colors"
        >
          {running ? (
            <>
              <RunningDots />
              Running…
            </>
          ) : (
            <>
              <PlayCircle className="w-3.5 h-3.5" />
              Run once now
            </>
          )}
        </button>
      </div>
    </>
  )
}

/**
 * RunningDots — three pulsing dots, replaces the prior Loader2 spinner so the
 * "running" state matches the rest of the surface (skeleton-style, not
 * generic).
 */
function RunningDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span
        className="w-1 h-1 rounded-full bg-[var(--background)] motion-safe:animate-pulse"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="w-1 h-1 rounded-full bg-[var(--background)] motion-safe:animate-pulse"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="w-1 h-1 rounded-full bg-[var(--background)] motion-safe:animate-pulse"
        style={{ animationDelay: "300ms" }}
      />
    </span>
  )
}
