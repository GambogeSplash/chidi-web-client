"use client"

/**
 * PlaybookAlwaysRunning — the quieter list below "Today".
 *
 * Each row = a play that fires on its own (recovery, restock alerts, Friday
 * rush, etc). The merchant can:
 *   - toggle it on/off (real switch)
 *   - tap to open the sandbox sheet (peek the message, edit it, see runs)
 *   - read the one-line result ("Recovered ₦42K this month") on the row
 *
 * Visually quieter than the Today decisions above so the page reads:
 *   "what needs you" → "what's already running for you".
 */

import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatNGN, type PlaybookPlay } from "@/lib/chidi/playbook-plays"

interface PlaybookAlwaysRunningProps {
  plays: PlaybookPlay[]
  pausedSet: Set<string>
  customMessages: Record<string, string>
  onOpen: (id: string) => void
  onTogglePause: (id: string) => void
}

export function PlaybookAlwaysRunning({
  plays,
  pausedSet,
  customMessages,
  onOpen,
  onTogglePause,
}: PlaybookAlwaysRunningProps) {
  return (
    <div className="space-y-2">
      {plays.map((play) => (
        <PlayRow
          key={play.id}
          play={play}
          paused={pausedSet.has(play.id)}
          customized={
            !!customMessages[play.id] &&
            customMessages[play.id] !== play.sample_message
          }
          onOpen={() => onOpen(play.id)}
          onTogglePause={() => onTogglePause(play.id)}
        />
      ))}
    </div>
  )
}

function PlayRow({
  play,
  paused,
  customized,
  onOpen,
  onTogglePause,
}: {
  play: PlaybookPlay
  paused: boolean
  customized: boolean
  onOpen: () => void
  onTogglePause: () => void
}) {
  const recovered = play.stats.last_30d_value_recovered_ngn ?? 0
  return (
    <article
      className={cn(
        "group relative rounded-xl bg-[var(--card)] border transition-all",
        paused
          ? "border-[var(--chidi-border-subtle)] opacity-75"
          : "border-[var(--chidi-border-default)] hover:border-[var(--chidi-text-muted)]",
      )}
    >
      <div className="flex items-stretch">
        <button
          onClick={onOpen}
          className="flex-1 min-w-0 px-4 py-3.5 lg:px-5 lg:py-4 text-left flex items-center gap-3"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-[13.5px] font-semibold text-[var(--chidi-text-primary)] leading-snug truncate">
                {play.title}
              </h3>
              {customized && (
                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--chidi-surface)] text-[var(--chidi-text-muted)] flex-shrink-0">
                  Yours
                </span>
              )}
            </div>
            {play.subtitle && (
              <p className="text-[11.5px] text-[var(--chidi-text-secondary)] leading-snug truncate">
                {play.subtitle}
              </p>
            )}
            {recovered > 0 && !paused && (
              <p className="text-[11px] text-[var(--chidi-win)] mt-1 tabular-nums font-medium">
                Recovered {formatNGN(recovered)} this month
              </p>
            )}
            {recovered === 0 && !paused && play.stats.runs > 0 && (
              <p className="text-[11px] text-[var(--chidi-text-muted)] mt-1 tabular-nums">
                Ran {play.stats.runs}× · {play.stats.won} won
              </p>
            )}
          </div>
          <ChevronRight
            className="w-3.5 h-3.5 text-[var(--chidi-text-muted)] flex-shrink-0 group-hover:translate-x-0.5 transition-transform"
            strokeWidth={2}
          />
        </button>

        <div className="flex items-center pr-4 lg:pr-5 border-l border-[var(--chidi-border-subtle)] pl-3 lg:pl-4">
          <Toggle
            on={!paused}
            onChange={onTogglePause}
            label={paused ? "Resume play" : "Pause play"}
          />
        </div>
      </div>
    </article>
  )
}

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean
  onChange: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative inline-flex items-center h-6 w-11 rounded-full transition-colors flex-shrink-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-text-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]",
        on
          ? "bg-[var(--chidi-win)]"
          : "bg-[var(--chidi-border-default)]",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-white shadow-sm transform motion-safe:transition-transform",
          on ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  )
}
