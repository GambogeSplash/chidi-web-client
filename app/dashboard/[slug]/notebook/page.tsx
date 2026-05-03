"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Minus,
  Zap,
  Repeat,
  ShoppingBag,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  CircleDashed,
  ChevronRight,
  ChevronDown,
} from "lucide-react"
import { AppHeader } from "@/components/chidi/app-header"
import { NavRail } from "@/components/chidi/nav-rail"
import { ChidiPage } from "@/components/chidi/page-shell"
import { CustomerCharacter } from "@/components/chidi/customer-character"
import { cn } from "@/lib/utils"
import { useCountUp } from "@/lib/chidi/use-count-up"
import { useRailCollapsed } from "@/lib/chidi/use-rail-collapsed"
import { PlaySandbox } from "@/components/chidi/play-sandbox"
import {
  PLAYS,
  PLAY_CATEGORY_LABEL,
  formatNGN,
  type PlaybookPlay,
  type PlayCategory,
} from "@/lib/chidi/playbook-plays"

/**
 * Playbook — rebuild (2026-05-04).
 *
 * Previous version was visually disconnected from the rest of the app:
 * full-bleed image hero, custom InitialAvatar palette, win-rate rings,
 * drag handles, multi-row metadata stacks. This rebuild matches the
 * Insights surface as the canonical pattern:
 *
 *   - ChidiPage shell + ty-page-title header
 *   - Compact snapshot card with 3 KPIs (count-up animations)
 *   - Filter chips with urgency dots (Insights tokens)
 *   - Quiet row cards (Insights decision-card pattern)
 *     - Category icon (square chip)
 *     - Title + trigger one-liner
 *     - Right: win-rate % with colored dot, expand chevron
 *   - Expand reveals: steps, sample message, recent runs (with real
 *     CustomerCharacter avatars), "Open in sandbox" CTA
 *
 * Click any play → opens existing PlaySandbox (rehearsal experience).
 */

const CATEGORY_ICON: Record<PlayCategory, React.ElementType> = {
  recovery: Zap,
  conversion: ShoppingBag,
  retention: Repeat,
  inventory: Package,
  routine: Clock,
}

const CATEGORIES: PlayCategory[] = ["recovery", "conversion", "retention", "inventory", "routine"]

// Category color tones for the icon-chip background — pulled from the same
// palette as the Insights filter chip dots so the surfaces share vocabulary.
const CATEGORY_TONE: Record<PlayCategory, string> = {
  recovery: "var(--chidi-warning)",
  conversion: "var(--chidi-win)",
  retention: "#7AB89A", // sage from Lagos textile palette (already used in landing)
  inventory: "var(--chidi-text-primary)",
  routine: "var(--chidi-text-muted)",
}

export default function PlaybookPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [activeCat, setActiveCat] = useState<PlayCategory | "all">("all")
  const [openPlayId, setOpenPlayId] = useState<string | null>(null)
  const [sandboxPlay, setSandboxPlay] = useState<PlaybookPlay | null>(null)
  const railCollapsed = useRailCollapsed()

  const visible = useMemo(
    () => (activeCat === "all" ? PLAYS : PLAYS.filter((p) => p.category === activeCat)),
    [activeCat],
  )

  const totals = useMemo(() => {
    const active = PLAYS.filter((p) => p.state === "active").length
    const recoveredLast30d = PLAYS.reduce(
      (s, p) => s + (p.stats.last_30d_value_recovered_ngn ?? 0),
      0,
    )
    const totalRuns = PLAYS.reduce((s, p) => s + p.stats.runs, 0)
    const totalWon = PLAYS.reduce((s, p) => s + p.stats.won, 0)
    const winRate = totalRuns > 0 ? Math.round((totalWon / totalRuns) * 100) : 0
    return { active, recoveredLast30d, totalRuns, totalWon, winRate }
  }, [])

  const handleRunPlay = (play: PlaybookPlay) => setSandboxPlay(play)

  return (
    <div
      className={cn(
        "flex flex-col min-h-screen bg-[var(--background)] transition-[padding] duration-200",
        railCollapsed ? "lg:pl-[64px]" : "lg:pl-[224px]",
      )}
    >
      <NavRail
        activeTab="inbox"
        onTabChange={(tab) => router.push(`/dashboard/${slug}?tab=${tab}`)}
      />
      <div className="lg:hidden">
        <AppHeader showSettings={false} />
      </div>

      <ChidiPage
        title="Playbook"
        width="default"
        actions={
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] px-2.5 py-1.5 rounded-md hover:bg-[var(--chidi-surface)] transition-colors active:scale-[0.97]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
        }
      >
        {/* Snapshot — same compact pattern as Insights's pulse-of-business strip */}
        <SnapshotStrip totals={totals} />

        {/* Filter chips — Insights pattern: dots + count + active fill */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto -mx-1 px-1 pb-1">
          <FilterChip
            active={activeCat === "all"}
            onClick={() => setActiveCat("all")}
            label="All"
            count={PLAYS.length}
          />
          {CATEGORIES.map((c) => {
            const count = PLAYS.filter((p) => p.category === c).length
            return (
              <FilterChip
                key={c}
                active={activeCat === c}
                onClick={() => setActiveCat(c)}
                label={PLAY_CATEGORY_LABEL[c]}
                count={count}
                tone={CATEGORY_TONE[c]}
              />
            )
          })}
        </div>

        {/* Plays list — quiet row cards */}
        <div className="space-y-3">
          {visible.map((play) => (
            <PlayRow
              key={play.id}
              play={play}
              expanded={openPlayId === play.id}
              onToggle={() => setOpenPlayId((id) => (id === play.id ? null : play.id))}
              onOpenSandbox={() => handleRunPlay(play)}
            />
          ))}
        </div>
      </ChidiPage>

      <PlaySandbox
        play={sandboxPlay}
        open={sandboxPlay !== null}
        onClose={() => setSandboxPlay(null)}
      />
    </div>
  )
}

// ============================================================================
// SnapshotStrip — 3 KPIs that count up (same primitive as Insights snapshot)
// ============================================================================

function SnapshotStrip({
  totals,
}: {
  totals: {
    active: number
    recoveredLast30d: number
    totalRuns: number
    totalWon: number
    winRate: number
  }
}) {
  return (
    <div className="rounded-2xl chidi-paper bg-[var(--card)] border border-[var(--chidi-border-default)] p-4 lg:p-5 mb-5">
      <div className="grid grid-cols-3 gap-4">
        <CountMetric
          label="Running"
          value={totals.active}
          format="int"
          sub={`of ${PLAYS.length} plays`}
        />
        <CountMetric
          label="Recovered (30d)"
          value={totals.recoveredLast30d}
          format="ngn"
          sub="across all plays"
        />
        <CountMetric
          label="Win rate"
          value={totals.winRate}
          format="pct"
          sub={`${totals.totalWon} of ${totals.totalRuns} runs`}
        />
      </div>
    </div>
  )
}

function CountMetric({
  label,
  value,
  format,
  sub,
}: {
  label: string
  value: number
  format: "int" | "ngn" | "pct"
  sub?: string
}) {
  const tweened = useCountUp(value, 950)
  const display =
    format === "ngn"
      ? formatNGN(Math.round(tweened))
      : format === "pct"
        ? `${Math.round(tweened)}%`
        : Math.round(tweened).toLocaleString("en-NG")
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium mb-1">
        {label}
      </p>
      <p className="text-[18px] font-semibold tabular-nums text-[var(--chidi-text-primary)] leading-none truncate">
        {display}
      </p>
      {sub && <p className="text-[11px] text-[var(--chidi-text-muted)] mt-1">{sub}</p>}
    </div>
  )
}

// ============================================================================
// FilterChip — Insights chip pattern with category dot tones
// ============================================================================

function FilterChip({
  active,
  onClick,
  label,
  count,
  tone,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  tone?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors flex-shrink-0 border",
        active
          ? "bg-[var(--chidi-text-primary)] text-[var(--background)] border-[var(--chidi-text-primary)]"
          : "bg-[var(--card)] text-[var(--chidi-text-secondary)] border-[var(--chidi-border-default)] hover:text-[var(--chidi-text-primary)]",
      )}
    >
      {!active && tone && (
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tone }} />
      )}
      <span>{label}</span>
      <span
        className={cn(
          "tabular-nums",
          active ? "text-[var(--background)]/70" : "text-[var(--chidi-text-muted)]",
        )}
      >
        {count}
      </span>
    </button>
  )
}

// ============================================================================
// PlayRow — quiet row card (matches Insights decision-card pattern)
// ============================================================================

function PlayRow({
  play,
  expanded,
  onToggle,
  onOpenSandbox,
}: {
  play: PlaybookPlay
  expanded: boolean
  onToggle: () => void
  onOpenSandbox: () => void
}) {
  const Icon = CATEGORY_ICON[play.category]
  const tone = CATEGORY_TONE[play.category]

  return (
    <article className="rounded-2xl chidi-paper bg-[var(--card)] border border-[var(--chidi-border-default)] overflow-hidden transition-shadow">
      {/* Collapsed row — Insights card pattern */}
      <button onClick={onToggle} className="w-full p-5 lg:p-6 flex items-start gap-4 text-left">
        {/* Category icon chip */}
        <div
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5"
          style={{ backgroundColor: `${tone}1a` }}
        >
          <Icon className="w-4 h-4" style={{ color: tone }} strokeWidth={1.8} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap mb-1">
            <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium">
              {PLAY_CATEGORY_LABEL[play.category]}
            </p>
            {play.state === "active" && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--chidi-win)]">
                <span className="w-1 h-1 rounded-full bg-[var(--chidi-win)] animate-pulse" />
                Running
              </span>
            )}
            {play.state === "paused" && (
              <span className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)]">
                Paused
              </span>
            )}
          </div>
          <h3 className="text-[15px] font-semibold text-[var(--chidi-text-primary)] leading-snug">
            {play.title}
          </h3>
          <p className="text-[13px] text-[var(--chidi-text-secondary)] mt-1.5 leading-snug">
            <span className="text-[var(--chidi-text-muted)]">When </span>
            {play.trigger}
          </p>
        </div>

        {/* Right: win rate + chevron */}
        <div className="flex-shrink-0 flex items-center gap-3 mt-1">
          <WinRateMicro percent={play.stats.win_rate_pct} runs={play.stats.runs} />
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-[var(--chidi-text-muted)]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[var(--chidi-text-muted)]" />
          )}
        </div>
      </button>

      {/* Expanded body — same vocabulary as Insights expanded card */}
      {expanded && (
        <div className="px-5 lg:px-6 pb-5 lg:pb-6 space-y-4">
          {/* Steps */}
          <div className="rounded-xl bg-[var(--chidi-surface)]/40 border border-[var(--chidi-border-subtle)] p-4">
            <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium mb-2.5">
              The move
            </p>
            <ol className="space-y-2">
              {play.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[var(--chidi-text-primary)] text-[var(--background)] text-[10px] font-semibold flex items-center justify-center flex-shrink-0 mt-0.5 tabular-nums">
                    {i + 1}
                  </span>
                  <span className="text-[13px] text-[var(--chidi-text-primary)] leading-snug">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Outcome — Insights "Chidi recommends" pattern */}
          <div className="border-l-2 border-[var(--chidi-win)] pl-3">
            <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium mb-1">
              Outcome
            </p>
            <p className="text-[13px] text-[var(--chidi-text-primary)] leading-snug">
              {play.outcome}
            </p>
          </div>

          {/* Recent runs — uses real CustomerCharacter avatars (matching app) */}
          {play.recent.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium mb-2.5">
                Recent runs
              </p>
              <ul className="space-y-2">
                {play.recent.slice(0, 3).map((run, i) => (
                  <RunRow key={i} run={run} />
                ))}
              </ul>
            </div>
          )}

          {/* CTA — single primary action */}
          <div className="pt-2 flex items-center justify-between gap-2">
            <p className="text-[11px] text-[var(--chidi-text-muted)] leading-snug">
              Rehearse the play before committing.
            </p>
            <button
              onClick={onOpenSandbox}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[12px] font-semibold bg-[var(--chidi-text-primary)] text-[var(--background)] hover:bg-[var(--chidi-text-primary)]/90 transition-colors"
            >
              Open in sandbox
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

// ============================================================================
// WinRateMicro — small text % with a colored dot (no ring)
// ============================================================================

function WinRateMicro({ percent, runs }: { percent: number; runs: number }) {
  // Color-tier the dot (same logic as Insights numeric tiers)
  const Arrow = percent >= 60 ? ArrowUp : percent >= 30 ? Minus : ArrowDown
  const tone =
    percent >= 60
      ? "var(--chidi-win)"
      : percent >= 30
        ? "var(--chidi-text-muted)"
        : "var(--chidi-warning)"
  return (
    <div className="hidden sm:flex flex-col items-end leading-none">
      <span className="inline-flex items-center gap-1 text-[14px] font-semibold tabular-nums text-[var(--chidi-text-primary)]">
        <Arrow className="w-3 h-3" style={{ color: tone }} strokeWidth={2.4} />
        {percent}%
      </span>
      <span className="text-[10px] text-[var(--chidi-text-muted)] tabular-nums mt-1">
        {runs} runs
      </span>
    </div>
  )
}

// ============================================================================
// RunRow — uses CustomerCharacter (the app's real avatar), not InitialAvatar
// ============================================================================

function RunRow({ run }: { run: { ran_at: string; context: string; outcome: "won" | "lost" | "pending"; detail?: string } }) {
  const Icon = run.outcome === "won" ? CheckCircle2 : run.outcome === "lost" ? XCircle : CircleDashed
  const tone =
    run.outcome === "won"
      ? "text-[var(--chidi-win)]"
      : run.outcome === "lost"
        ? "text-[var(--chidi-text-muted)]"
        : "text-[var(--chidi-warning)]"
  // Pull first name from context if it's a customer-style entry
  const namePart = run.context.split(",")[0]?.trim() ?? ""
  const looksLikeName = /^[A-Z][a-z]+( [A-Z][a-z'-]+)+$/.test(namePart) || /^[A-Z][a-z]+ [A-Z]\.$/.test(namePart)

  return (
    <li className="flex items-start gap-3 text-[13px]">
      {looksLikeName ? (
        <CustomerCharacter name={namePart} size="xs" className="mt-0.5" />
      ) : (
        <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", tone)} strokeWidth={2} />
      )}
      <div className="flex-1 min-w-0 flex items-baseline justify-between gap-3">
        <p className="text-[var(--chidi-text-primary)] leading-snug">
          {run.context}
          {run.detail && (
            <span className={cn("ml-2 text-[12px] tabular-nums", tone)}>{run.detail}</span>
          )}
        </p>
        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--chidi-text-muted)] tabular-nums whitespace-nowrap">
          {looksLikeName && <Icon className={cn("w-3 h-3", tone)} strokeWidth={2} />}
          {formatRunDate(run.ran_at)}
        </span>
      </div>
    </li>
  )
}

function formatRunDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000))
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString("en-NG", { month: "short", day: "numeric" })
}
