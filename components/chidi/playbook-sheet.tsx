"use client"

/**
 * PlaybookSheet — drill-in sheet for a single play (Option A, 2026-05-03).
 *
 * Opened when the merchant taps a row in the unified Playbook list. Contents:
 *
 *   1. Header — play name + Pause/Resume toggle + close
 *   2. "What this does" — one short paragraph (the play subtitle / outcome)
 *   3. "The message" — a real WhatsApp/Telegram bubble. Tap the bubble to edit
 *      (textarea on focus, save on blur). "Reset to default" link if customized.
 *   4. "Recent runs" — last 5 runs (customer + outcome + relative time)
 *   5. Sticky footer — "Run now" button.
 *
 * Run-now is THE wow. It runs the visceral enactment animation INSIDE this
 * sheet (not on the page row): message types char-by-char, "Sending to N
 * customers" with cycling avatars, green check + result line + playWin() +
 * hapticWin(). On completion the run prepends to the local "Recent runs"
 * list above.
 *
 * This is the home of the typing animation that previously lived inside
 * playbook-decision-card.tsx (now deleted).
 */

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Pause,
  PlayCircle,
  Play as PlayIcon,
  RotateCcw,
  X as XIcon,
  CheckCircle2,
  XCircle,
  CircleDashed,
} from "lucide-react"
import { ArcFace } from "./arc-face"
import { CustomerCharacter } from "./customer-character"
import { cn } from "@/lib/utils"
import {
  PLAY_CATEGORY_LABEL,
  formatNGN,
  type PlaybookPlay,
  type PlayRunEvidence,
} from "@/lib/chidi/playbook-plays"
import { markFired } from "@/lib/chidi/play-staleness"
import { playWin } from "@/lib/chidi/sound"
import { hapticWin } from "@/lib/chidi/haptics"

// ---------------------------------------------------------------------------
// Animation timing — preserved from the deleted playbook-decision-card.tsx
// so the visceral feel is identical, just relocated to the sheet.
// ---------------------------------------------------------------------------

const TIMING = {
  TYPE_PER_CHAR: 22,
  RECIPIENT_HOLD: 420,
  POST_TYPE_PAUSE: 220,
  POST_SEND_HOLD: 1100,
} as const

type EnactPhase = "idle" | "typing" | "sending" | "sent"

// ---------------------------------------------------------------------------
// Channel inference — picks a matching footer label based on the play's
// affected_customers (people = WhatsApp) or category (inventory = system).
// ---------------------------------------------------------------------------

function inferChannel(play: PlaybookPlay): "whatsapp" | "telegram" | "internal" {
  if (play.category === "inventory" || play.category === "routine") return "internal"
  return "whatsapp"
}

interface RecentRunRow {
  customer: string
  outcome: PlayRunEvidence["outcome"]
  detail?: string
  ranAt: number
}

interface PlaybookSheetProps {
  play: PlaybookPlay
  paused: boolean
  customMessage?: string
  onTogglePause: () => void
  onSaveMessage: (message: string) => void
  onResetMessage: () => void
  onClose: () => void
}

export function PlaybookSheet({
  play,
  paused,
  customMessage,
  onTogglePause,
  onSaveMessage,
  onResetMessage,
  onClose,
}: PlaybookSheetProps) {
  const baseMessage = customMessage ?? play.sample_message ?? ""
  const [message, setMessage] = useState(baseMessage)
  const [editing, setEditing] = useState(false)
  const editRef = useRef<HTMLTextAreaElement>(null)

  // Reset message field when sheet target changes.
  useEffect(() => {
    setMessage(baseMessage)
    setEditing(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play.id])

  // ----- Recent runs (sheet-local) ----------------------------------------
  // Seeded from play.recent (the static authored history), then prepended to
  // when the merchant taps Run now. Limited to 5 visible.
  const seededRuns: RecentRunRow[] = useMemo(
    () =>
      play.recent.slice(0, 5).map((r, i) => ({
        customer: r.context,
        outcome: r.outcome,
        detail: r.detail,
        // Stagger so the relative time looks reasonable: 1d, 2d, 3d back, etc.
        ranAt: Date.now() - (i + 1) * 22 * 60 * 60 * 1000,
      })),
    [play.id], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const [liveRuns, setLiveRuns] = useState<RecentRunRow[]>([])
  const visibleRuns = useMemo(
    () => [...liveRuns, ...seededRuns].slice(0, 5),
    [liveRuns, seededRuns],
  )

  // ----- Run-now choreography state ---------------------------------------
  const [phase, setPhase] = useState<EnactPhase>("idle")
  const [typedChars, setTypedChars] = useState(0)
  const [recipientIdx, setRecipientIdx] = useState(0)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [reduceMotion, setReduceMotion] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduceMotion(mq.matches)
    const onChange = () => setReduceMotion(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  // Cleanup any running timers when the sheet closes / play changes.
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [play.id])

  const queueTimer = (fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay)
    timersRef.current.push(id)
  }

  const channel = inferChannel(play)
  const isPersonChannel = channel === "whatsapp" || channel === "telegram"
  const recipients = play.affected_customers && play.affected_customers.length > 0
    ? play.affected_customers
    : channel === "internal"
      ? ["Live catalog"]
      : ["a customer"]
  const enacting = phase !== "idle"
  const customized = !!customMessage && customMessage !== play.sample_message
  const dirty = message !== baseMessage

  // ----- Save/reset message -----------------------------------------------
  const handleSaveMessage = () => {
    onSaveMessage(message)
    setEditing(false)
  }
  const handleResetMessage = () => {
    onResetMessage()
    setMessage(play.sample_message ?? "")
    setEditing(false)
  }

  const handleStartEdit = () => {
    setEditing(true)
    setTimeout(() => editRef.current?.focus(), 60)
  }
  const handleBlurEdit = () => {
    if (dirty) handleSaveMessage()
    else setEditing(false)
  }

  // ----- Run now: visceral animation --------------------------------------
  const completeRun = () => {
    try {
      playWin()
      hapticWin()
    } catch {
      /* sound/haptic optional */
    }
    markFired(play.id)
    // Prepend a live run row.
    const newRow: RecentRunRow = {
      customer: recipients[0] ?? "a customer",
      outcome: "won",
      detail:
        play.stats.last_30d_value_recovered_ngn && play.stats.last_30d_value_recovered_ngn > 0
          ? `${formatNGN(Math.round((play.stats.last_30d_value_recovered_ngn / Math.max(1, play.stats.runs)) || 0))} recovered`
          : `Sent to ${recipients.length} ${recipients.length === 1 ? (isPersonChannel ? "person" : "destination") : isPersonChannel ? "people" : "destinations"}`,
      ranAt: Date.now(),
    }
    setLiveRuns((prev) => [newRow, ...prev].slice(0, 5))
    // Cool down — return to idle so merchant can run again if they want.
    queueTimer(() => {
      setPhase("idle")
      setTypedChars(0)
      setRecipientIdx(0)
    }, 1400)
  }

  const handleRunNow = () => {
    if (enacting) return
    if (paused) return

    if (reduceMotion) {
      setTypedChars(message.length)
      setRecipientIdx(recipients.length - 1)
      setPhase("sent")
      queueTimer(completeRun, 600)
      return
    }

    // ----- 1. typing phase -----
    setPhase("typing")
    setTypedChars(0)
    let i = 0
    intervalRef.current = setInterval(() => {
      i += 1
      setTypedChars(i)
      if (i >= message.length) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        intervalRef.current = null

        // ----- 2. sending phase: cycle recipients -----
        queueTimer(() => {
          setPhase("sending")
          let r = 0
          setRecipientIdx(0)
          intervalRef.current = setInterval(() => {
            r += 1
            if (r >= recipients.length) {
              if (intervalRef.current) clearInterval(intervalRef.current)
              intervalRef.current = null
              // ----- 3. sent phase + complete -----
              setPhase("sent")
              queueTimer(completeRun, TIMING.POST_SEND_HOLD)
            } else {
              setRecipientIdx(r)
            }
          }, TIMING.RECIPIENT_HOLD)
        }, TIMING.POST_TYPE_PAUSE)
      }
    }, TIMING.TYPE_PER_CHAR)
  }

  const channelLabel = channel === "whatsapp" ? "WhatsApp" : channel === "telegram" ? "Telegram" : "System"
  const visibleText = message.slice(0, typedChars)
  const recipient = recipients[Math.min(recipientIdx, recipients.length - 1)]

  return (
    <>
      {/* === Header ============================================ */}
      <header className="flex items-start gap-3 px-5 lg:px-6 pt-5 pb-4 border-b border-[var(--chidi-border-subtle)] flex-shrink-0">
        <div
          className={cn(
            "flex-shrink-0 w-9 h-9 rounded-xl bg-[var(--chidi-surface)] flex items-center justify-center",
            paused
              ? "text-[var(--chidi-text-muted)]"
              : "text-[var(--chidi-text-primary)]",
          )}
        >
          <ArcFace size={28} state={enacting ? "speaking" : paused ? "idle" : "speaking"} />
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
          <h2 className="text-[17px] font-semibold text-[var(--chidi-text-primary)] leading-snug font-chidi-voice">
            {play.title}
          </h2>
        </div>
        <button
          onClick={onTogglePause}
          aria-label={paused ? "Resume play" : "Pause play"}
          className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] px-2.5 py-1.5 rounded-md hover:bg-[var(--chidi-surface)] transition-colors flex-shrink-0"
        >
          {paused ? (
            <>
              <PlayIcon className="w-3 h-3" strokeWidth={2.2} />
              Resume
            </>
          ) : (
            <>
              <Pause className="w-3 h-3" strokeWidth={2.2} />
              Pause
            </>
          )}
        </button>
        <button
          onClick={onClose}
          aria-label="Close"
          className="p-1.5 -mr-1.5 rounded-md text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] transition-colors flex-shrink-0"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </header>

      {/* === Scrollable body =================================== */}
      <div className="px-5 lg:px-6 py-5 space-y-6 overflow-y-auto flex-1">
        {/* What this does */}
        <section>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold mb-2">
            What this does
          </p>
          <p className="text-[13px] text-[var(--chidi-text-secondary)] leading-relaxed">
            <span className="text-[var(--chidi-text-muted)]">When </span>
            {play.trigger}{" "}
            <span className="text-[var(--chidi-text-primary)]">{play.outcome}</span>
          </p>
        </section>

        {/* The message — editable WhatsApp bubble */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold">
              The message
            </p>
            {customized && !editing && (
              <button
                onClick={handleResetMessage}
                className="inline-flex items-center gap-1 text-[11px] text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)]"
              >
                <RotateCcw className="w-3 h-3" />
                Reset to default
              </button>
            )}
          </div>

          <div
            className="rounded-xl p-4 border border-[var(--chidi-border-subtle)] cursor-text"
            style={{
              backgroundColor: channel === "telegram" ? "#E7F3FA" : "#ECE5DD",
              backgroundImage:
                "radial-gradient(circle at 10% 20%, rgba(7,94,84,0.04) 0px, transparent 1px), radial-gradient(circle at 80% 70%, rgba(7,94,84,0.04) 0px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
            onClick={() => {
              if (!editing && !enacting) handleStartEdit()
            }}
          >
            <div className="flex justify-end">
              <div
                className="max-w-[92%] rounded-lg rounded-tr-none px-3 py-2 shadow-sm w-full"
                style={{
                  backgroundColor: "var(--chidi-channel-whatsapp-bubble)",
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className="text-[9px] uppercase tracking-[0.12em] font-semibold"
                    style={{ color: "var(--chidi-win)" }}
                  >
                    Chidi · {channelLabel}
                  </span>
                  {enacting && (
                    <span className="text-[9px] text-[#777]">
                      {phase === "sent" ? "✓✓ delivered" : "typing…"}
                    </span>
                  )}
                </div>
                {editing ? (
                  <textarea
                    ref={editRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onBlur={handleBlurEdit}
                    rows={4}
                    className="w-full bg-transparent text-[13px] text-[var(--chidi-channel-whatsapp-bubble-text)] leading-snug resize-none focus:outline-none focus:ring-0 border-0"
                  />
                ) : enacting ? (
                  <p className="text-[13px] text-[var(--chidi-channel-whatsapp-bubble-text)] leading-snug whitespace-pre-line">
                    {visibleText}
                    {phase === "typing" && (
                      <span
                        className="inline-block w-[2px] h-[12px] ml-0.5 align-middle bg-[var(--chidi-channel-whatsapp-bubble-text)] motion-safe:animate-pulse"
                        aria-hidden
                      />
                    )}
                  </p>
                ) : (
                  <p className="text-[13px] text-[var(--chidi-channel-whatsapp-bubble-text)] leading-snug whitespace-pre-line">
                    {message || "(No message authored — tap to add one.)"}
                  </p>
                )}
                <p className="text-[9px] text-[#999] mt-1 text-right">
                  {phase === "sent" ? "just now ✓✓" : "tap to edit"}
                </p>
              </div>
            </div>
          </div>

          {/* Sending footer — appears during enactment */}
          {enacting && (
            <div className="mt-2 flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-[var(--chidi-surface)]/60 border border-[var(--chidi-border-subtle)] motion-safe:animate-[playbookEnactIn_220ms_cubic-bezier(0.22,1,0.36,1)]">
              {phase === "sent" ? (
                <>
                  <span className="w-5 h-5 rounded-full bg-[var(--chidi-win)] flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--background)]" strokeWidth={2.5} />
                  </span>
                  <p className="text-[11.5px] text-[var(--chidi-text-primary)] leading-snug font-medium">
                    Sent to {recipients.length}{" "}
                    {recipients.length === 1
                      ? isPersonChannel ? "person" : "destination"
                      : isPersonChannel ? "people" : "destinations"}
                    <span className="text-[var(--chidi-win)] ml-1.5">· Done.</span>
                  </p>
                </>
              ) : (
                <>
                  {isPersonChannel ? (
                    <CustomerCharacter name={recipient} size="xs" />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-[var(--chidi-surface)] border border-[var(--chidi-border-subtle)] flex items-center justify-center text-[10px]">
                      ⚙
                    </span>
                  )}
                  <p className="text-[11.5px] text-[var(--chidi-text-secondary)] leading-snug">
                    {phase === "typing" ? "Drafting" : "Sending to"}{" "}
                    <span className="font-medium text-[var(--chidi-text-primary)]">{recipient}</span>
                    {recipients.length > 1 && phase === "sending" && (
                      <span className="text-[var(--chidi-text-muted)]">
                        {" "}· {recipientIdx + 1}/{recipients.length}
                      </span>
                    )}
                    <SendingDots />
                  </p>
                </>
              )}
            </div>
          )}

          {!enacting && !editing && (
            <p className="text-[11px] text-[var(--chidi-text-muted)] mt-2 leading-snug">
              Tap the bubble to edit. Saves automatically when you tap away.
            </p>
          )}
        </section>

        {/* Recent runs */}
        {visibleRuns.length > 0 && (
          <section>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold mb-2">
              Recent runs
            </p>
            <ul className="rounded-lg border border-[var(--chidi-border-subtle)] divide-y divide-[var(--chidi-border-subtle)] overflow-hidden">
              {visibleRuns.map((run, i) => {
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
                const isLive = i < liveRuns.length
                return (
                  <li
                    key={`${run.ranAt}-${i}`}
                    className={cn(
                      "flex items-start gap-2.5 px-3.5 py-2.5",
                      isLive && "motion-safe:animate-[playbookRanRowIn_280ms_cubic-bezier(0.22,1,0.36,1)] bg-[var(--chidi-win)]/5",
                    )}
                  >
                    <Icon className={cn("w-3.5 h-3.5 mt-0.5 flex-shrink-0", tone)} strokeWidth={2} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] text-[var(--chidi-text-primary)] leading-snug truncate">
                        {run.customer}
                      </p>
                      {run.detail && (
                        <p className={cn("text-[11px] leading-snug mt-0.5 tabular-nums", tone)}>
                          {run.detail}
                        </p>
                      )}
                    </div>
                    <span className="text-[10.5px] text-[var(--chidi-text-muted)] tabular-nums flex-shrink-0">
                      <RelativeTime epochMs={run.ranAt} />
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </div>

      {/* === Sticky Run-now footer ============================== */}
      <div className="px-5 lg:px-6 py-3 border-t border-[var(--chidi-border-subtle)] flex items-center justify-end bg-[var(--card)] flex-shrink-0">
        <button
          onClick={handleRunNow}
          disabled={enacting || paused}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold bg-[var(--chidi-text-primary)] text-[var(--background)] hover:bg-[var(--chidi-text-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-md transition-colors"
        >
          {enacting ? (
            <>
              <RunningDots />
              {phase === "sent" ? "Sent" : phase === "sending" ? "Sending" : "Drafting"}
            </>
          ) : (
            <>
              <PlayCircle className="w-3.5 h-3.5" />
              Run now
            </>
          )}
        </button>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function RelativeTime({ epochMs }: { epochMs: number }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])
  const diff = Math.max(0, Date.now() - epochMs)
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return <>{sec}s ago</>
  const min = Math.floor(sec / 60)
  if (min < 60) return <>{min}m ago</>
  const hr = Math.floor(min / 60)
  if (hr < 24) return <>{hr}h ago</>
  const day = Math.floor(hr / 24)
  return <>{day}d ago</>
}

function SendingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1.5 align-middle">
      <span className="w-1 h-1 rounded-full bg-[var(--chidi-text-muted)] motion-safe:animate-pulse" style={{ animationDelay: "0ms" }} />
      <span className="w-1 h-1 rounded-full bg-[var(--chidi-text-muted)] motion-safe:animate-pulse" style={{ animationDelay: "180ms" }} />
      <span className="w-1 h-1 rounded-full bg-[var(--chidi-text-muted)] motion-safe:animate-pulse" style={{ animationDelay: "360ms" }} />
    </span>
  )
}

function RunningDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="w-1 h-1 rounded-full bg-[var(--background)] motion-safe:animate-pulse" style={{ animationDelay: "0ms" }} />
      <span className="w-1 h-1 rounded-full bg-[var(--background)] motion-safe:animate-pulse" style={{ animationDelay: "150ms" }} />
      <span className="w-1 h-1 rounded-full bg-[var(--background)] motion-safe:animate-pulse" style={{ animationDelay: "300ms" }} />
    </span>
  )
}
