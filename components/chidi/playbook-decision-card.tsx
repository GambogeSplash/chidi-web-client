"use client"

/**
 * PlaybookDecisionCard — the heart of the rebuilt Playbook.
 *
 * One Decision rendered as a chat-bubble from Chidi, with reply pills underneath.
 * The wow: tapping the primary reply ("Yes, do it") *enacts* the play visually
 * inside the same card — message types out in a WhatsApp bubble, recipients
 * cycle through, a checkmark lands, the card collapses with a satisfying spring.
 *
 * Reuses the conversation-thread metaphor from the (now-stripped) Insights
 * decisions UI, but here it's the destination, not a side panel.
 *
 * Props are intentionally narrow so the parent owns the feed lifecycle (which
 * decisions to show, ordering, what "Recent runs" looks like after enactment).
 */

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ArcFace } from "./arc-face"
import { CustomerCharacter } from "./customer-character"
import { playWin } from "@/lib/chidi/sound"
import { hapticWin } from "@/lib/chidi/haptics"
import {
  type Decision,
  type DecisionMetric,
} from "@/lib/chidi/insights-decisions"

// ---------------------------------------------------------------------------
// Per-decision enactment script: the WhatsApp message that types out, the
// recipients that cycle through, and the closing result line. Anchored to
// the same mock cast already used elsewhere so the demo reads consistent.
// ---------------------------------------------------------------------------

interface EnactmentScript {
  message: string
  recipients: string[]
  resultLine: string
  channel: "whatsapp" | "telegram" | "internal"
}

const ENACTMENT_BY_ID: Record<string, EnactmentScript> = {
  "dec-restock-wax-print": {
    message:
      "Hey Mama Funmi, we're running low on the African wax print — can I send your usual 60 yards? Need it before Friday so we don't miss Saturday.",
    recipients: ["Mama Funmi (supplier)"],
    resultLine: "Supplier message drafted. Restock ETA: 4 days.",
    channel: "internal",
  },
  "dec-pause-iphone-case": {
    message:
      "Pulling the iPhone 14 Clear Case from the live catalog. Customers will stop hitting an empty shelf.",
    recipients: ["Live catalog"],
    resultLine: "Hidden from catalog. 7 customers won't bounce off empty.",
    channel: "internal",
  },
  "dec-price-bluetooth": {
    message:
      "Updating Bluetooth Earbuds to ₦22,000 across both channels. Margin lifts to 61%.",
    recipients: ["WhatsApp catalog", "Telegram catalog"],
    resultLine: "New price live. ~₦28k extra margin/month at current pace.",
    channel: "internal",
  },
  "dec-followup-pending": {
    message:
      "Hey, just checking — still want to grab the one you ordered? I'm holding it for you till tomorrow noon.",
    recipients: ["Tunde Bakare", "Folake Olamide", "Aisha Mohammed"],
    resultLine: "Recovered ₦46,500 in 2 minutes. 2 of 3 replied.",
    channel: "whatsapp",
  },
  "dec-promote-saturday": {
    message:
      "Tomorrow's Saturday 📈 Featuring the wax print on status tonight at 8pm. Stock check passed.",
    recipients: ["Status (WhatsApp)", "Status (Telegram)"],
    resultLine: "Saturday-prep queued. Last 4 runs: 4/4 won.",
    channel: "internal",
  },
  "dec-vip-checkin": {
    message:
      "Hi Adaeze, just thinking about you — how's that headwrap holding up? We just got the new royal blue Aso-Oke Gele in. Thought of you immediately.",
    recipients: ["Adaeze Okafor"],
    resultLine: "Sent. Adaeze replies to 92% of nudges within 48h.",
    channel: "whatsapp",
  },
  "dec-channel-mix": {
    message:
      "Watching channel split. I'll ping you if either falls below 35% for two weeks straight.",
    recipients: ["Channel monitor"],
    resultLine: "Watcher set. You'll hear from me if it shifts.",
    channel: "internal",
  },
  "dec-clearance-stale": {
    message:
      "🏷️ This week only — 20% off the beaded coral necklace and silk bonnet. Limited stock.",
    recipients: ["WhatsApp broadcast", "Telegram broadcast"],
    resultLine: "Markdown live. 63% historical clearance rate.",
    channel: "whatsapp",
  },
}

const FALLBACK_SCRIPT: EnactmentScript = {
  message: "Working on it now — I'll let you know as soon as it lands.",
  recipients: ["Customer"],
  resultLine: "Done.",
  channel: "internal",
}

// ---------------------------------------------------------------------------
// Animation timeline (ms) — referenced by the run-now choreography
// ---------------------------------------------------------------------------

const TIMING = {
  /** Per-character delay while the message types itself out. */
  TYPE_PER_CHAR: 22,
  /** How long each recipient name lingers before cycling. */
  RECIPIENT_HOLD: 420,
  /** Pause between "typing complete" and "sending" phase. */
  POST_TYPE_PAUSE: 220,
  /** Pause between "sent" and the spring-back collapse. */
  POST_SEND_HOLD: 1100,
  /** Spring collapse duration. */
  COLLAPSE: 360,
} as const

type EnactPhase = "idle" | "typing" | "sending" | "sent" | "collapsing" | "done"

// ---------------------------------------------------------------------------

interface PlaybookDecisionCardProps {
  decision: Decision
  /** Called when enactment fully completes — parent can prepend a "ran 2s ago"
      row to the Recent runs ledger and remove this card from the feed. */
  onEnacted: (summary: { decisionId: string; resultLine: string; recipientCount: number }) => void
  /** Called when merchant snoozes the card. */
  onSnooze: (decisionId: string, ms: number) => void
  /** Called when merchant dismisses ("Not now"). */
  onDismiss: (decisionId: string) => void
}

export function PlaybookDecisionCard({
  decision,
  onEnacted,
  onSnooze,
  onDismiss,
}: PlaybookDecisionCardProps) {
  const [phase, setPhase] = useState<EnactPhase>("idle")
  const [whyOpen, setWhyOpen] = useState(false)
  const [typedChars, setTypedChars] = useState(0)
  const [recipientIdx, setRecipientIdx] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(false)

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const script = ENACTMENT_BY_ID[decision.id] ?? FALLBACK_SCRIPT

  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduceMotion(mq.matches)
    const onChange = () => setReduceMotion(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const queueTimer = (fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay)
    timersRef.current.push(id)
  }

  const tone =
    decision.urgency === "now"
      ? "var(--chidi-warning)"
      : decision.urgency === "this_week"
        ? "var(--chidi-win)"
        : "var(--chidi-text-muted)"

  const urgencyLabel =
    decision.urgency === "now"
      ? "Today"
      : decision.urgency === "this_week"
        ? "This week"
        : "Watch"

  // -------------------------------------------------------------------------
  // The enactment choreography — the wow.
  // -------------------------------------------------------------------------
  const handlePrimary = () => {
    if (phase !== "idle") return

    if (reduceMotion) {
      // Honor reduced motion: collapse to instant + final state.
      setTypedChars(script.message.length)
      setRecipientIdx(script.recipients.length - 1)
      setPhase("sent")
      try {
        playWin()
        hapticWin()
      } catch {
        /* sound/haptic optional */
      }
      queueTimer(() => {
        setPhase("done")
        onEnacted({
          decisionId: decision.id,
          resultLine: script.resultLine,
          recipientCount: script.recipients.length,
        })
      }, 600)
      return
    }

    // ----- 1. typing phase -----
    setPhase("typing")
    setTypedChars(0)
    let i = 0
    intervalRef.current = setInterval(() => {
      i += 1
      setTypedChars(i)
      if (i >= script.message.length) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        intervalRef.current = null

        // ----- 2. sending phase: cycle recipients -----
        queueTimer(() => {
          setPhase("sending")
          let r = 0
          setRecipientIdx(0)
          intervalRef.current = setInterval(() => {
            r += 1
            if (r >= script.recipients.length) {
              if (intervalRef.current) clearInterval(intervalRef.current)
              intervalRef.current = null
              // ----- 3. sent phase -----
              setPhase("sent")
              try {
                playWin()
                hapticWin()
              } catch {
                /* sound/haptic optional */
              }
              // ----- 4. spring back + notify parent -----
              queueTimer(() => {
                setPhase("collapsing")
                queueTimer(() => {
                  setPhase("done")
                  onEnacted({
                    decisionId: decision.id,
                    resultLine: script.resultLine,
                    recipientCount: script.recipients.length,
                  })
                }, TIMING.COLLAPSE)
              }, TIMING.POST_SEND_HOLD)
            } else {
              setRecipientIdx(r)
            }
          }, TIMING.RECIPIENT_HOLD)
        }, TIMING.POST_TYPE_PAUSE)
      }
    }, TIMING.TYPE_PER_CHAR)
  }

  // Don't render once collapsed — parent will replace with a Recent runs row.
  if (phase === "done") return null

  const enacting = phase !== "idle"
  const collapsing = phase === "collapsing"

  return (
    <article
      className={cn(
        "relative rounded-2xl bg-[var(--card)] border border-[var(--chidi-border-default)] overflow-hidden",
        "motion-safe:transition-[max-height,opacity,transform] motion-safe:duration-[360ms] motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]",
        collapsing && "motion-safe:opacity-0 motion-safe:scale-[0.98] motion-safe:translate-y-1",
      )}
    >
      <div className="flex items-start gap-3 px-4 py-4 lg:px-5 lg:py-5">
        {/* Chidi avatar gutter */}
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[var(--chidi-surface)] flex items-center justify-center text-[var(--chidi-text-primary)]">
          <ArcFace size={28} state={enacting ? "speaking" : "idle"} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header row: urgency chip + "just now" */}
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
              style={{ backgroundColor: `${tone}1a`, color: tone }}
            >
              {decision.urgency === "now" && (
                <span
                  className="w-1.5 h-1.5 rounded-full motion-safe:animate-pulse"
                  style={{ backgroundColor: tone }}
                />
              )}
              {urgencyLabel}
            </span>
            <span className="text-[10px] text-[var(--chidi-text-muted)]">
              · just now
            </span>
          </div>

          {/* Chidi's question (the bubble) */}
          <div className="rounded-2xl rounded-tl-sm bg-[var(--chidi-surface)]/55 border border-[var(--chidi-border-subtle)] px-4 py-3">
            <p className="text-[14px] lg:text-[14.5px] font-chidi-voice leading-snug text-[var(--chidi-text-primary)]">
              {decision.question}
            </p>
            <p className="text-[12.5px] text-[var(--chidi-text-secondary)] mt-1.5 leading-snug">
              {decision.why}
            </p>

            {!enacting && (
              <button
                onClick={() => setWhyOpen((v) => !v)}
                className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] transition-colors"
                aria-expanded={whyOpen}
              >
                {whyOpen ? (
                  <ChevronDown className="w-3 h-3" strokeWidth={2.2} />
                ) : (
                  <ChevronRight className="w-3 h-3" strokeWidth={2.2} />
                )}
                {whyOpen ? "Hide the numbers" : "Show me the numbers"}
              </button>
            )}

            {whyOpen && !enacting && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2.5 rounded-lg bg-[var(--card)]/70 border border-[var(--chidi-border-subtle)] p-3">
                  {decision.metrics.map((m, i) => (
                    <MetricCell key={i} metric={m} />
                  ))}
                </div>
                <p className="text-[12px] text-[var(--chidi-text-secondary)] leading-snug border-l-2 border-[var(--chidi-win)] pl-3 italic">
                  <Sparkles className="w-3 h-3 inline mr-1 opacity-70" />
                  {decision.recommendation}
                </p>
              </div>
            )}
          </div>

          {/* Reply pills — quiet until enacted */}
          {!enacting && (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <ReplyPill primary onClick={handlePrimary}>
                {primaryLabelFor(decision)}
                <ArrowRight className="w-3 h-3" strokeWidth={2.4} />
              </ReplyPill>
              <ReplyPill onClick={() => onSnooze(decision.id, 24 * 60 * 60 * 1000)}>
                Snooze 24h
              </ReplyPill>
              <ReplyPill onClick={() => onDismiss(decision.id)}>Not now</ReplyPill>
            </div>
          )}

          {/* Enactment surface — appears below the bubble while running */}
          {enacting && (
            <EnactmentSurface
              script={script}
              phase={phase}
              typedChars={typedChars}
              recipientIdx={recipientIdx}
            />
          )}
        </div>
      </div>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function primaryLabelFor(decision: Decision): string {
  // Decision objects already carry an action label, but in conversation
  // tone we want a more "chat reply" feel. Override known kinds; fall back
  // to the original.
  switch (decision.kind) {
    case "follow_up":
      return "Yes, send it"
    case "restock":
      return "Yes, draft it"
    case "promote":
      return "Yes, run it"
    case "schedule":
      return "Yes, queue it"
    case "pause":
      return "Yes, hide it"
    case "price":
      return "Yes, update it"
    case "channel_shift":
      return "Yes, watch it"
    default:
      return decision.action.label
  }
}

function MetricCell({ metric }: { metric: DecisionMetric }) {
  const dirColor =
    metric.direction === "up"
      ? "var(--chidi-win)"
      : metric.direction === "down"
        ? "var(--chidi-warning)"
        : "var(--chidi-text-muted)"
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium">
        {metric.label}
      </p>
      <p
        className="text-[13px] font-semibold tabular-nums leading-tight mt-0.5"
        style={{ color: dirColor }}
      >
        {metric.value}
      </p>
      {metric.baseline && (
        <p className="text-[10.5px] text-[var(--chidi-text-muted)] mt-0.5 leading-tight">
          {metric.baseline}
        </p>
      )}
    </div>
  )
}

function ReplyPill({
  onClick,
  children,
  primary = false,
}: {
  onClick: () => void
  children: React.ReactNode
  primary?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors active:scale-[0.97]",
        primary
          ? "bg-[var(--chidi-text-primary)] text-[var(--background)] hover:bg-[var(--chidi-text-primary)]/90"
          : "bg-[var(--card)] border border-[var(--chidi-border-default)] text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:border-[var(--chidi-text-muted)]",
      )}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// EnactmentSurface — the visceral "Run now" theater
// ---------------------------------------------------------------------------

function EnactmentSurface({
  script,
  phase,
  typedChars,
  recipientIdx,
}: {
  script: EnactmentScript
  phase: EnactPhase
  typedChars: number
  recipientIdx: number
}) {
  const visibleText = useMemo(
    () => script.message.slice(0, typedChars),
    [script.message, typedChars],
  )
  const channelLabel =
    script.channel === "whatsapp"
      ? "WhatsApp"
      : script.channel === "telegram"
        ? "Telegram"
        : "System"

  const recipient =
    script.recipients[Math.min(recipientIdx, script.recipients.length - 1)]
  const isPerson =
    script.channel === "whatsapp" || script.channel === "telegram"

  return (
    <div
      className="mt-3 rounded-xl border border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface)]/40 overflow-hidden motion-safe:animate-[playbookEnactIn_280ms_cubic-bezier(0.22,1,0.36,1)]"
    >
      {/* Inner WhatsApp-style bubble that types out */}
      <div
        className="px-3 py-3"
        style={{
          backgroundColor: script.channel === "telegram" ? "#E7F3FA" : "#ECE5DD",
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
            <div className="flex items-center justify-between gap-2 mb-1">
              <span
                className="text-[9px] uppercase tracking-[0.12em] font-semibold"
                style={{ color: "var(--chidi-win)" }}
              >
                Chidi · {channelLabel}
              </span>
              <span className="text-[9px] text-[#777]">
                {phase === "sent" ? "✓✓ delivered" : "typing…"}
              </span>
            </div>
            <p className="text-[13px] text-[var(--chidi-channel-whatsapp-bubble-text)] leading-snug whitespace-pre-line">
              {visibleText}
              {phase === "typing" && (
                <span
                  className="inline-block w-[2px] h-[12px] ml-0.5 align-middle bg-[var(--chidi-channel-whatsapp-bubble-text)] motion-safe:animate-pulse"
                  aria-hidden
                />
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Sending / sent footer */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[var(--card)] border-t border-[var(--chidi-border-subtle)]">
        {phase === "sent" ? (
          <>
            <span className="w-5 h-5 rounded-full bg-[var(--chidi-win)] flex items-center justify-center flex-shrink-0">
              <CheckCircle2
                className="w-3.5 h-3.5 text-[var(--background)]"
                strokeWidth={2.5}
              />
            </span>
            <p className="text-[11.5px] text-[var(--chidi-text-primary)] leading-snug font-medium">
              Sent to {script.recipients.length}{" "}
              {script.recipients.length === 1
                ? isPerson
                  ? "person"
                  : "destination"
                : isPerson
                  ? "people"
                  : "destinations"}
              <span className="text-[var(--chidi-win)] ml-1.5">
                · {script.resultLine}
              </span>
            </p>
          </>
        ) : (
          <>
            {/* Recipient avatar / icon */}
            {isPerson ? (
              <CustomerCharacter name={recipient} size="xs" />
            ) : (
              <span className="w-5 h-5 rounded-full bg-[var(--chidi-surface)] border border-[var(--chidi-border-subtle)] flex items-center justify-center text-[10px]">
                ⚙
              </span>
            )}
            <p className="text-[11.5px] text-[var(--chidi-text-secondary)] leading-snug">
              {phase === "typing" ? "Drafting" : "Sending to"}{" "}
              <span className="font-medium text-[var(--chidi-text-primary)]">
                {recipient}
              </span>
              {script.recipients.length > 1 && phase === "sending" && (
                <span className="text-[var(--chidi-text-muted)]">
                  {" "}
                  · {recipientIdx + 1}/{script.recipients.length}
                </span>
              )}
              <SendingDots />
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function SendingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1.5 align-middle">
      <span
        className="w-1 h-1 rounded-full bg-[var(--chidi-text-muted)] motion-safe:animate-pulse"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="w-1 h-1 rounded-full bg-[var(--chidi-text-muted)] motion-safe:animate-pulse"
        style={{ animationDelay: "180ms" }}
      />
      <span
        className="w-1 h-1 rounded-full bg-[var(--chidi-text-muted)] motion-safe:animate-pulse"
        style={{ animationDelay: "360ms" }}
      />
    </span>
  )
}
