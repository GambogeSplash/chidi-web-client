"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowUp,
  ArrowDown,
  Minus,
  Zap,
  Repeat,
  ShoppingBag,
  Package,
  Clock,
  Plus,
  ChevronRight,
  Pause,
  Play as PlayIcon,
  X as XIcon,
} from "lucide-react"
import { AppHeader } from "@/components/chidi/app-header"
import { NavRail } from "@/components/chidi/nav-rail"
import { ChidiPage } from "@/components/chidi/page-shell"
import { EmptyState } from "@/components/chidi/empty-state"
import { ChidiMark } from "@/components/chidi/chidi-mark"
import { cn } from "@/lib/utils"
import { useCountUp } from "@/lib/chidi/use-count-up"
import { useRailCollapsed } from "@/lib/chidi/use-rail-collapsed"
import { usePersistedState } from "@/lib/hooks/use-persisted-state"
import { PlaySandboxPanel } from "@/components/chidi/play-sandbox"
import {
  PLAYS,
  PLAY_CATEGORY_LABEL,
  formatNGN,
  type PlaybookPlay,
  type PlayCategory,
} from "@/lib/chidi/playbook-plays"

/**
 * Playbook — rebuild (2026-05-03).
 *
 * Mental model: the merchant's playbook of repeatable moves they keep running.
 * NOT a fleet of agents. NOT a workflow graph. The vocabulary is borrowed
 * from Front Rules (When → Then), with Shopify Flow's trigger→action
 * thinking, and Linear's quiet inline-create empty states. Every play reads
 * as a concrete tactic the merchant chose to keep — with a sample WhatsApp
 * message right there as proof of what it actually does.
 *
 * Layout: master-detail at lg+. List on the left, the open play's sandbox
 * (or the new-play composer) renders inline on the right. No modal. On
 * mobile, list collapses with the sandbox stacking below the active row.
 */

const CATEGORY_ICON: Record<PlayCategory, React.ElementType> = {
  recovery: Zap,
  conversion: ShoppingBag,
  retention: Repeat,
  inventory: Package,
  routine: Clock,
}

const CATEGORIES: PlayCategory[] = ["recovery", "conversion", "retention", "inventory", "routine"]

// Tones share vocabulary with the Insights filter chip dots.
const CATEGORY_TONE: Record<PlayCategory, string> = {
  recovery: "var(--chidi-warning)",
  conversion: "var(--chidi-win)",
  retention: "#7AB89A",
  inventory: "var(--chidi-text-primary)",
  routine: "var(--chidi-text-muted)",
}

// Trigger presets used by the new-play composer. Mirrors the language the
// existing PLAYS use so authored plays read consistently with seeded ones.
const TRIGGER_PRESETS: { id: string; category: PlayCategory; label: string }[] = [
  { id: "pending-payment-24h", category: "recovery", label: "An order has been in PENDING_PAYMENT for 24 hours." },
  { id: "chat-silent-3h", category: "recovery", label: "A customer asked about a product and went silent for 3+ hours." },
  { id: "bulk-quote", category: "conversion", label: "A customer asks about quantities of 10+ units." },
  { id: "beauty-add", category: "conversion", label: "A customer adds a beauty item to their order." },
  { id: "vip-quiet-6w", category: "retention", label: "A repeat customer (3+ orders) has gone 6 weeks without a message." },
  { id: "order-fulfilled", category: "retention", label: "An order is marked FULFILLED." },
  { id: "stock-30pct", category: "inventory", label: "A product hits 30% of its reorder threshold." },
  { id: "stale-45d", category: "inventory", label: "A product hasn't sold in 45 days." },
  { id: "weekday-morning", category: "routine", label: "Every weekday at 7:30am." },
  { id: "friday-evening", category: "routine", label: "Every Friday at 6pm — Saturday prep." },
]

interface DraftPlay {
  title: string
  category: PlayCategory
  triggerId: string
  triggerCustom: string
  steps: string
  sample_message: string
}

const EMPTY_DRAFT: DraftPlay = {
  title: "",
  category: "recovery",
  triggerId: "pending-payment-24h",
  triggerCustom: "",
  steps: "",
  sample_message: "",
}

export default function PlaybookPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [activeCat, setActiveCat] = useState<PlayCategory | "all">("all")
  // Pause state held client-side; sandbox/composer panel is the right rail.
  const [pausedIds, setPausedIds] = useState<Set<string>>(() => new Set())
  // Locally-authored plays persist across navigations via sessionStorage.
  const [authoredPlays, setAuthoredPlays, clearAuthored] = usePersistedState<PlaybookPlay[]>(
    "playbook:authored",
    [],
  )
  const [activePanel, setActivePanel] = useState<
    | { kind: "play"; id: string }
    | { kind: "compose" }
    | null
  >(null)
  const [draft, setDraft, clearDraft] = usePersistedState<DraftPlay>("playbook:draft", EMPTY_DRAFT)
  const railCollapsed = useRailCollapsed()

  const allPlays = useMemo<PlaybookPlay[]>(() => [...authoredPlays, ...PLAYS], [authoredPlays])

  const visible = useMemo(
    () => (activeCat === "all" ? allPlays : allPlays.filter((p) => p.category === activeCat)),
    [activeCat, allPlays],
  )

  const totals = useMemo(() => {
    const active = allPlays.filter((p) => p.state === "active" && !pausedIds.has(p.id)).length
    const recoveredLast30d = allPlays.reduce(
      (s, p) => s + (p.stats.last_30d_value_recovered_ngn ?? 0),
      0,
    )
    const totalRuns = allPlays.reduce((s, p) => s + p.stats.runs, 0)
    const totalWon = allPlays.reduce((s, p) => s + p.stats.won, 0)
    const winRate = totalRuns > 0 ? Math.round((totalWon / totalRuns) * 100) : 0
    return { active, recoveredLast30d, totalRuns, totalWon, winRate }
  }, [allPlays, pausedIds])

  // Default-open the first play once the page mounts so the right pane
  // is never empty when there's content to show. Composer takes priority.
  useEffect(() => {
    if (activePanel) return
    if (visible.length > 0) setActivePanel({ kind: "play", id: visible[0].id })
  }, [visible, activePanel])

  const activePlay = useMemo(() => {
    if (activePanel?.kind !== "play") return null
    return allPlays.find((p) => p.id === activePanel.id) ?? null
  }, [activePanel, allPlays])

  const togglePause = (id: string) => {
    setPausedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSaveDraft = () => {
    if (!draft.title.trim()) return
    const triggerLabel =
      draft.triggerId === "custom"
        ? draft.triggerCustom.trim() || "Custom trigger"
        : TRIGGER_PRESETS.find((t) => t.id === draft.triggerId)?.label ?? draft.triggerCustom.trim()
    const newPlay: PlaybookPlay = {
      id: `authored-${Date.now()}`,
      category: draft.category,
      title: draft.title.trim(),
      trigger: triggerLabel,
      steps: draft.steps
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean),
      outcome: "Authored by you. Track record will fill in once it runs.",
      stats: { runs: 0, won: 0, win_rate_pct: 0 },
      state: "active",
      recent: [],
      sample_message: draft.sample_message.trim() || undefined,
    }
    setAuthoredPlays((prev) => [newPlay, ...prev])
    clearDraft()
    setDraft(EMPTY_DRAFT)
    setActivePanel({ kind: "play", id: newPlay.id })
  }

  const handleDiscardDraft = () => {
    clearDraft()
    setDraft(EMPTY_DRAFT)
    setActivePanel(visible.length > 0 ? { kind: "play", id: visible[0].id } : null)
  }

  const handleResetAll = () => {
    setAuthoredPlays([])
    clearAuthored()
  }

  const noPlaysAtAll = allPlays.length === 0
  const noMatches = !noPlaysAtAll && visible.length === 0

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
        eyebrow="Playbook"
        title="Plays you keep running."
        width="wide"
        actions={
          <button
            onClick={() => setActivePanel({ kind: "compose" })}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[12px] font-semibold bg-[var(--chidi-text-primary)] text-[var(--background)] hover:bg-[var(--chidi-text-primary)]/90 transition-colors active:scale-[0.97]"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.4} />
            New play
          </button>
        }
      >
        {noPlaysAtAll ? (
          <EmptyState
            art="copilot"
            title="Your playbook is empty."
            description="A play is a move you decide to keep running — like nudging cold pending payments, or pinging a VIP at week six. Author your first one to get started."
            action={
              <button
                onClick={() => setActivePanel({ kind: "compose" })}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md text-[13px] font-semibold bg-[var(--chidi-text-primary)] text-[var(--background)] hover:bg-[var(--chidi-text-primary)]/90 transition-colors"
              >
                <Plus className="w-4 h-4" strokeWidth={2.4} />
                Author your first play
              </button>
            }
          />
        ) : (
          <>
            {/* Snapshot — same compact pattern as Insights */}
            <SnapshotStrip totals={totals} totalCount={allPlays.length} />

            {/* Filter chips */}
            <div className="flex items-center gap-2 mb-5 overflow-x-auto -mx-1 px-1 pb-1">
              <FilterChip
                active={activeCat === "all"}
                onClick={() => setActiveCat("all")}
                label="All"
                count={allPlays.length}
              />
              {CATEGORIES.map((c) => {
                const count = allPlays.filter((p) => p.category === c).length
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
              {authoredPlays.length > 0 && (
                <button
                  onClick={handleResetAll}
                  className="ml-auto text-[11px] text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] transition-colors"
                  title="Remove your authored plays (keeps seeded ones)"
                >
                  Reset authored ({authoredPlays.length})
                </button>
              )}
            </div>

            {noMatches ? (
              <EmptyState
                art="search"
                title="No plays in this category yet."
                description="Try another filter, or author a new play targeted at this kind of moment."
                action={
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveCat("all")}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[12px] font-medium border border-[var(--chidi-border-default)] text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-surface)] transition-colors"
                    >
                      Show all plays
                    </button>
                    <button
                      onClick={() => {
                        const cat = activeCat === "all" ? "recovery" : (activeCat as PlayCategory)
                        setDraft((d) => ({ ...d, category: cat }))
                        setActivePanel({ kind: "compose" })
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[12px] font-semibold bg-[var(--chidi-text-primary)] text-[var(--background)] hover:bg-[var(--chidi-text-primary)]/90 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" strokeWidth={2.4} />
                      New {activeCat === "all" ? "play" : PLAY_CATEGORY_LABEL[activeCat as PlayCategory].toLowerCase()} play
                    </button>
                  </div>
                }
              />
            ) : (
              // Master/detail layout. List left, sandbox panel right.
              // On mobile (< lg), they stack: list on top, panel below.
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-5">
                {/* === LIST === */}
                <div className="space-y-3">
                  {visible.map((play) => {
                    const isActive =
                      activePanel?.kind === "play" && activePanel.id === play.id
                    const isPaused = pausedIds.has(play.id)
                    return (
                      <PlayRow
                        key={play.id}
                        play={play}
                        active={isActive}
                        paused={isPaused}
                        onOpen={() => setActivePanel({ kind: "play", id: play.id })}
                        onTogglePause={() => togglePause(play.id)}
                      />
                    )
                  })}
                  {/* Inline-create row at the end of the list — Linear pattern */}
                  <button
                    onClick={() => setActivePanel({ kind: "compose" })}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-dashed border-[var(--chidi-border-default)] text-[13px] font-medium text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:border-[var(--chidi-text-muted)] hover:bg-[var(--chidi-surface)]/30 transition-colors active:scale-[0.99]"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={2.4} />
                    Author a new play
                  </button>
                </div>

                {/* === DETAIL PANEL === */}
                <div className="lg:sticky lg:top-5 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
                  {activePanel?.kind === "compose" ? (
                    <ComposePanel
                      draft={draft}
                      onChange={setDraft}
                      onSave={handleSaveDraft}
                      onDiscard={handleDiscardDraft}
                    />
                  ) : activePlay ? (
                    <PlaySandboxPanel
                      play={activePlay}
                      paused={pausedIds.has(activePlay.id)}
                      onTogglePause={() => togglePause(activePlay.id)}
                    />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[var(--chidi-border-default)] p-10 text-center">
                      <p className="text-[13px] text-[var(--chidi-text-muted)]">
                        Pick a play on the left to rehearse it.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </ChidiPage>
    </div>
  )
}

// ============================================================================
// SnapshotStrip — 3 KPIs that count up
// ============================================================================

function SnapshotStrip({
  totals,
  totalCount,
}: {
  totals: {
    active: number
    recoveredLast30d: number
    totalRuns: number
    totalWon: number
    winRate: number
  }
  totalCount: number
}) {
  return (
    <div className="rounded-2xl chidi-paper bg-[var(--card)] border border-[var(--chidi-border-default)] p-4 lg:p-5 mb-5">
      <div className="grid grid-cols-3 gap-4">
        <CountMetric
          label="Running"
          value={totals.active}
          format="int"
          sub={`of ${totalCount} plays`}
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
// FilterChip
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
// PlayRow — collapsed row card (no expand; opens detail in right pane)
// ============================================================================

function PlayRow({
  play,
  active,
  paused,
  onOpen,
  onTogglePause,
}: {
  play: PlaybookPlay
  active: boolean
  paused: boolean
  onOpen: () => void
  onTogglePause: () => void
}) {
  const Icon = CATEGORY_ICON[play.category]
  const tone = CATEGORY_TONE[play.category]
  const effectivelyRunning = play.state === "active" && !paused

  return (
    <article
      className={cn(
        "rounded-2xl chidi-paper bg-[var(--card)] border transition-all",
        active
          ? "border-[var(--chidi-text-primary)] shadow-[0_0_0_1px_var(--chidi-text-primary)]"
          : "border-[var(--chidi-border-default)] hover:border-[var(--chidi-text-muted)]",
      )}
    >
      <button onClick={onOpen} className="w-full p-4 lg:p-5 flex items-start gap-3 text-left">
        <div
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5"
          style={{ backgroundColor: `${tone}1a` }}
        >
          <Icon className="w-4 h-4" style={{ color: tone }} strokeWidth={1.8} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium">
              {PLAY_CATEGORY_LABEL[play.category]}
            </p>
            {effectivelyRunning ? (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--chidi-win)]">
                <span className="w-1 h-1 rounded-full bg-[var(--chidi-win)] animate-pulse" />
                Running
              </span>
            ) : (
              <span className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)]">
                Paused
              </span>
            )}
          </div>
          <h3 className="text-[14px] font-semibold text-[var(--chidi-text-primary)] leading-snug">
            {play.title}
          </h3>
          <p className="text-[12px] text-[var(--chidi-text-secondary)] mt-1 leading-snug line-clamp-2">
            <span className="text-[var(--chidi-text-muted)]">When </span>
            {play.trigger}
          </p>

          {/* Inline win-rate strip — sparkline-style proof under the trigger */}
          <div className="mt-2.5 flex items-center gap-3 text-[11px]">
            <WinRateBar percent={play.stats.win_rate_pct} runs={play.stats.runs} />
          </div>
        </div>

        <ChevronRight
          className={cn(
            "w-4 h-4 flex-shrink-0 mt-1 transition-transform",
            active ? "text-[var(--chidi-text-primary)] translate-x-0.5" : "text-[var(--chidi-text-muted)]",
          )}
        />
      </button>

      {/* Pause/Resume — bottom mini-action so it's discoverable without
          adding a heavyweight kebab menu */}
      <div className="border-t border-[var(--chidi-border-subtle)] px-4 lg:px-5 py-2 flex items-center justify-between text-[11px] text-[var(--chidi-text-muted)]">
        <span className="tabular-nums">
          {play.stats.runs > 0
            ? `${play.stats.won}/${play.stats.runs} won`
            : "No runs yet"}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onTogglePause()
          }}
          className="inline-flex items-center gap-1 px-2 py-1 -my-1 -mr-2 rounded-md hover:bg-[var(--chidi-surface)] hover:text-[var(--chidi-text-primary)] transition-colors"
        >
          {effectivelyRunning ? (
            <>
              <Pause className="w-3 h-3" strokeWidth={2} />
              Pause
            </>
          ) : (
            <>
              <PlayIcon className="w-3 h-3" strokeWidth={2} />
              Resume
            </>
          )}
        </button>
      </div>
    </article>
  )
}

function WinRateBar({ percent, runs }: { percent: number; runs: number }) {
  if (runs === 0) {
    return <span className="text-[var(--chidi-text-muted)]">Awaiting first run</span>
  }
  const Arrow = percent >= 60 ? ArrowUp : percent >= 30 ? Minus : ArrowDown
  const tone =
    percent >= 60
      ? "var(--chidi-win)"
      : percent >= 30
        ? "var(--chidi-text-muted)"
        : "var(--chidi-warning)"
  // Tiny inline progress bar under the % so it reads as visual proof, not just a number.
  const pct = Math.max(4, Math.min(100, percent))
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <Arrow className="w-3 h-3 flex-shrink-0" style={{ color: tone }} strokeWidth={2.4} />
      <span className="tabular-nums font-semibold text-[var(--chidi-text-primary)]">
        {percent}%
      </span>
      <span
        className="relative h-1 w-16 rounded-full overflow-hidden"
        style={{ backgroundColor: "var(--chidi-border-subtle)" }}
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
          style={{ width: `${pct}%`, backgroundColor: tone }}
        />
      </span>
    </span>
  )
}

// ============================================================================
// ComposePanel — author a new play (inline, not a modal)
// ============================================================================

function ComposePanel({
  draft,
  onChange,
  onSave,
  onDiscard,
}: {
  draft: DraftPlay
  onChange: React.Dispatch<React.SetStateAction<DraftPlay>>
  onSave: () => void
  onDiscard: () => void
}) {
  const triggersForCategory = TRIGGER_PRESETS.filter((t) => t.category === draft.category)
  // If category changes such that current trigger isn't valid, reset it.
  useEffect(() => {
    if (draft.triggerId === "custom") return
    const stillValid = triggersForCategory.some((t) => t.id === draft.triggerId)
    if (!stillValid && triggersForCategory[0]) {
      onChange((d) => ({ ...d, triggerId: triggersForCategory[0].id }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.category])

  const canSave = draft.title.trim().length > 1 && draft.steps.trim().length > 0

  return (
    <section className="rounded-2xl chidi-paper bg-[var(--card)] border border-[var(--chidi-border-default)] overflow-hidden">
      <header className="flex items-start gap-3 px-5 lg:px-6 pt-5 pb-4 border-b border-[var(--chidi-border-subtle)]">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--chidi-surface)] flex items-center justify-center">
          <ChidiMark size={18} variant="default" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold mb-1">
            New play
          </p>
          <h2 className="ty-page-title text-[var(--chidi-text-primary)]">
            What move do you want to keep running?
          </h2>
          <p className="text-[12px] text-[var(--chidi-text-secondary)] mt-1.5 leading-snug">
            Give it a name, pick when it should fire, and write what happens.
          </p>
        </div>
        <button
          onClick={onDiscard}
          aria-label="Discard draft"
          className="p-2 -mr-2 rounded-md text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] transition-colors"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </header>

      <div className="p-5 lg:p-6 space-y-5">
        {/* Title */}
        <Field label="Name">
          <input
            type="text"
            value={draft.title}
            onChange={(e) => onChange((d) => ({ ...d, title: e.target.value }))}
            placeholder="e.g. Chase the cold pending payment"
            className="w-full bg-[var(--chidi-surface)]/60 border border-[var(--chidi-border-subtle)] rounded-md px-3 py-2 text-[13px] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:outline-none focus:border-[var(--chidi-text-primary)] transition-colors"
          />
        </Field>

        {/* Category */}
        <Field label="Category">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => {
              const active = draft.category === c
              const tone = CATEGORY_TONE[c]
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange((d) => ({ ...d, category: c }))}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors border",
                    active
                      ? "bg-[var(--chidi-text-primary)] text-[var(--background)] border-[var(--chidi-text-primary)]"
                      : "bg-[var(--card)] text-[var(--chidi-text-secondary)] border-[var(--chidi-border-default)] hover:text-[var(--chidi-text-primary)]",
                  )}
                >
                  {!active && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tone }} />
                  )}
                  {PLAY_CATEGORY_LABEL[c]}
                </button>
              )
            })}
          </div>
        </Field>

        {/* Trigger */}
        <Field label="When this happens">
          <div className="space-y-2">
            <select
              value={draft.triggerId}
              onChange={(e) => onChange((d) => ({ ...d, triggerId: e.target.value }))}
              className="w-full bg-[var(--chidi-surface)]/60 border border-[var(--chidi-border-subtle)] rounded-md px-3 py-2 text-[13px] text-[var(--chidi-text-primary)] focus:outline-none focus:border-[var(--chidi-text-primary)] transition-colors"
            >
              {triggersForCategory.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
              <option value="custom">Custom trigger…</option>
            </select>
            {draft.triggerId === "custom" && (
              <input
                type="text"
                value={draft.triggerCustom}
                onChange={(e) => onChange((d) => ({ ...d, triggerCustom: e.target.value }))}
                placeholder="Describe the moment in plain English."
                className="w-full bg-[var(--chidi-surface)]/60 border border-[var(--chidi-border-subtle)] rounded-md px-3 py-2 text-[13px] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:outline-none focus:border-[var(--chidi-text-primary)] transition-colors"
              />
            )}
          </div>
        </Field>

        {/* Steps */}
        <Field label="Then do this" hint="One step per line. Keep it concrete.">
          <textarea
            value={draft.steps}
            onChange={(e) => onChange((d) => ({ ...d, steps: e.target.value }))}
            rows={4}
            placeholder={"Send a soft nudge in your voice.\nIf no reply by 36h, drop bank details + a deadline.\nIf still cold by 48h, free the stock back."}
            className="w-full bg-[var(--chidi-surface)]/60 border border-[var(--chidi-border-subtle)] rounded-md px-3 py-2 text-[13px] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:outline-none focus:border-[var(--chidi-text-primary)] transition-colors resize-none leading-snug"
          />
        </Field>

        {/* Sample message */}
        <Field label="Sample message" hint="The actual WhatsApp text. Optional.">
          <textarea
            value={draft.sample_message}
            onChange={(e) => onChange((d) => ({ ...d, sample_message: e.target.value }))}
            rows={3}
            placeholder="Hey! Still want to grab that one? I'm holding it till tomorrow noon."
            className="w-full bg-[var(--chidi-surface)]/60 border border-[var(--chidi-border-subtle)] rounded-md px-3 py-2 text-[13px] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:outline-none focus:border-[var(--chidi-text-primary)] transition-colors resize-none leading-snug"
          />
        </Field>

        {/* Live message preview — show, don't tell. */}
        {draft.sample_message.trim() && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold mb-2">
              Preview
            </p>
            <WhatsAppBubblePreview text={draft.sample_message} />
          </div>
        )}
      </div>

      <div className="px-5 lg:px-6 py-3 border-t border-[var(--chidi-border-subtle)] flex items-center justify-between gap-3 bg-[var(--card)]">
        <button
          onClick={onDiscard}
          className="text-[13px] font-medium text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] px-3 py-2 rounded-md hover:bg-[var(--chidi-surface)] transition-colors"
        >
          Discard
        </button>
        <button
          onClick={onSave}
          disabled={!canSave}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold bg-[var(--chidi-text-primary)] text-[var(--background)] hover:bg-[var(--chidi-text-primary)]/90 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.4} />
          Add to playbook
        </button>
      </div>
    </section>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold">
          {label}
        </label>
        {hint && <span className="text-[11px] text-[var(--chidi-text-muted)]">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

// Internal preview bubble — same WhatsApp styling as PlaySandboxPanel and
// channel-chat. Used in the composer's live preview.
function WhatsAppBubblePreview({ text }: { text: string }) {
  return (
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
          style={{
            backgroundColor: "var(--chidi-channel-whatsapp-bubble)",
            borderLeftColor: "var(--chidi-win)",
          }}
        >
          <p className="text-[13px] text-[var(--chidi-channel-whatsapp-bubble-text)] leading-snug whitespace-pre-line">
            {text}
          </p>
          <p className="text-[9px] text-[#999] mt-1 text-right">just now ✓✓</p>
        </div>
      </div>
    </div>
  )
}
