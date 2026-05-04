"use client"

/**
 * PlaybookRow — a single row in the unified Playbook list.
 *
 * Shape (Option A, 2026-05-03 rebuild):
 *   [ status pill ]   Name                Last result        [ hover action ]
 *                     Trigger one-liner
 *
 * The whole row is a button — tapping anywhere opens the play sheet (the
 * drill-in where the visceral Run-now animation lives). The right-edge
 * Pause / Resume / Wake-up pill stops propagation so it doesn't double-fire
 * the open.
 *
 * Status pill widths are fixed (`w-[88px]`) so names align across rows. The
 * pill carries the entire state language — running, paused, quiet (with a
 * "fired Xd ago" sub-label). No left-accent borders, no urgency strips, no
 * card chrome at the page level.
 */

import { cn } from "@/lib/utils"
import { formatNGN, type PlaybookPlay } from "@/lib/chidi/playbook-plays"
import { lastFiredLabel } from "@/lib/chidi/play-staleness"
import { triggerSummary } from "@/lib/chidi/play-triggers"
import { audienceShort } from "@/lib/chidi/play-audiences"

export type PlaybookRowState = "running" | "paused" | "quiet"

interface PlaybookRowProps {
  play: PlaybookPlay
  state: PlaybookRowState
  customized: boolean
  onOpen: () => void
  /** Pause/Resume for active+paused; Wake for quiet. */
  onAction: () => void
}

export function PlaybookRow({
  play,
  state,
  customized,
  onOpen,
  onAction,
}: PlaybookRowProps) {
  const recovered = play.stats.last_30d_value_recovered_ngn ?? 0

  // Right-side "last result" line — derived from play data, never invented.
  const result = (() => {
    if (state === "quiet") return "Hasn't fired in a while"
    if (recovered > 0) return `Recovered ${formatNGN(recovered)} this month`
    if (play.stats.runs > 0) return `Sent ${play.stats.runs}× · ${play.stats.won} won`
    return "Hasn't fired yet"
  })()

  const actionLabel =
    state === "paused" ? "Resume" : state === "quiet" ? "Wake up" : "Pause"

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group w-full flex items-center gap-3 lg:gap-4 px-3 lg:px-4 py-3 lg:py-3.5 rounded-lg text-left",
        "hover:bg-[var(--chidi-surface)]/50 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-text-primary)]/40",
        state === "paused" && "opacity-70 hover:opacity-100",
      )}
    >
      <StatusPill play={play} state={state} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-[14px] font-semibold font-chidi-voice text-[var(--chidi-text-primary)] leading-snug truncate">
            {play.title}
          </h3>
          {customized && (
            <span className="flex-shrink-0 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--chidi-surface)] text-[var(--chidi-text-muted)]">
              Yours
            </span>
          )}
        </div>
        <TriggerAudienceLine play={play} />
      </div>

      <div className="hidden sm:block flex-shrink-0 text-right max-w-[180px]">
        <p
          className={cn(
            "text-[11.5px] tabular-nums leading-snug truncate",
            state === "quiet"
              ? "text-[var(--chidi-text-muted)] font-chidi-voice"
              : recovered > 0
                ? "text-[var(--chidi-win)] font-medium"
                : "text-[var(--chidi-text-muted)]",
          )}
        >
          {result}
        </p>
      </div>

      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation()
          onAction()
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation()
            e.preventDefault()
            onAction()
          }
        }}
        aria-label={`${actionLabel} ${play.title}`}
        className={cn(
          "flex-shrink-0 inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-md",
          "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100",
          "transition-opacity",
          state === "quiet"
            ? "bg-[var(--chidi-text-primary)] text-[var(--background)] hover:opacity-90"
            : "border border-[var(--chidi-border-default)] text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--card)]",
          // On touch where hover doesn't apply, keep the action visible.
          "max-sm:opacity-100",
        )}
      >
        {actionLabel}
      </span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// TriggerAudienceLine — replaces the legacy free-text trigger blurb under
// the play title with a structured "{trigger summary} · {audience short}"
// line. Falls back to the play subtitle when neither structured field is
// present (older plays before the audit-gap migration).
// ---------------------------------------------------------------------------

function TriggerAudienceLine({ play }: { play: PlaybookPlay }) {
  const tSummary = play.trigger_v2 ? triggerSummary(play.trigger_v2) : null
  const aShort =
    play.audience && play.audience.kind !== "all"
      ? audienceShort(play.audience)
      : null

  // Both structured fields missing → fall back to the legacy subtitle so
  // older / merchant-authored plays still read.
  if (!tSummary && !aShort) {
    if (!play.subtitle) return null
    return (
      <p className="text-[12px] text-[var(--chidi-text-secondary)] leading-snug truncate mt-0.5">
        {play.subtitle}
      </p>
    )
  }

  return (
    <p className="text-[12px] text-[var(--chidi-text-secondary)] leading-snug truncate mt-0.5 tabular-nums">
      {tSummary && (
        <span className="font-medium text-[var(--chidi-text-secondary)]">
          {tSummary}
        </span>
      )}
      {tSummary && aShort && (
        <span className="text-[var(--chidi-text-muted)]"> · </span>
      )}
      {aShort && (
        <span className="text-[var(--chidi-text-muted)]">{aShort}</span>
      )}
    </p>
  )
}

// ---------------------------------------------------------------------------
// StatusPill — fixed width so play names line up across rows.
// ---------------------------------------------------------------------------

function StatusPill({
  play,
  state,
}: {
  play: PlaybookPlay
  state: PlaybookRowState
}) {
  if (state === "running") {
    return (
      <span className="flex-shrink-0 w-[88px] inline-flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-wider text-[var(--chidi-win)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--chidi-win)] motion-safe:animate-pulse" />
        Running
      </span>
    )
  }
  if (state === "paused") {
    return (
      <span className="flex-shrink-0 w-[88px] inline-flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-wider text-[var(--chidi-text-muted)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--chidi-text-muted)]" />
        Paused
      </span>
    )
  }
  // quiet
  return (
    <span className="flex-shrink-0 w-[88px] flex flex-col items-start gap-0.5">
      <span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-wider text-[var(--chidi-text-secondary)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--chidi-text-secondary)] opacity-60" />
        Quiet
      </span>
      <span className="text-[9.5px] text-[var(--chidi-text-muted)] font-chidi-voice tabular-nums leading-none pl-3">
        {lastFiredLabel(play.id)}
      </span>
    </span>
  )
}
