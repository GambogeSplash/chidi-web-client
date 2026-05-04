"use client"

/**
 * Playbook — "Chidi's stage." Rebuilt 2026-05-03 (wave 5).
 *
 * RATIONALE
 * ---------
 * The previous Playbook was a flat list of toggleable automations. The
 * Insights surface had its own "Decisions thread" that spoke to the merchant
 * conversationally and asked for one-tap replies. Two surfaces, two metaphors,
 * one of them duplicating the other. Worse: the playbook felt like a settings
 * panel, not a place where the merchant *felt* Chidi working for them.
 *
 * This rewrite folds Decisions INTO the Playbook and reframes the page as a
 * single stage with two acts:
 *
 *   1. TODAY — the urgent things that need a human "yes" right now. Each
 *      decision renders as a chat-bubble from Chidi with reply pills. Tapping
 *      the primary reply *enacts* the play visually inside the same card:
 *      message types out in a WhatsApp/Telegram bubble (~22ms/char), the
 *      recipient list cycles through, a green check lands, the card collapses
 *      with a spring, and a "✓ Ran 2s ago" row appears in Recent runs.
 *      That's the wow — the merchant sees the work happen, not a toast.
 *
 *   2. ALWAYS RUNNING — quieter list of background plays (24-hour chase,
 *      Empty shelf alarm, Friday rush, etc). Toggle on/off, tap to peek the
 *      message, see what they earned this month. This is the boring (good)
 *      part of automation.
 *
 * The decision-as-conversation metaphor leaves Insights and lives here. The
 * mascot is gone; ArcFace stands in. Plays are renamed from generic
 * categories to character names so the page feels like a cast, not a CRUD
 * table — but IDs stay stable so any backend wiring keeps working.
 *
 * Layout: ChidiPage shell, single column (the wow is in the cards). Title is
 * "Playbook" (not "Chidi's playbook" — quieter). Subtitle: "What Chidi's
 * running for you, and what needs your call."
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { useParams, useRouter } from "next/navigation"
import { Plus, RefreshCw, X as XIcon } from "lucide-react"
import { toast } from "sonner"
import { AppHeader } from "@/components/chidi/app-header"
import { NavRail } from "@/components/chidi/nav-rail"
import { ChidiPage } from "@/components/chidi/page-shell"
import { EmptyState } from "@/components/chidi/empty-state"
import { ArcFace } from "@/components/chidi/arc-face"
import { PlaybookDecisionCard } from "@/components/chidi/playbook-decision-card"
import { PlaybookAlwaysRunning } from "@/components/chidi/playbook-always-running"
import { cn } from "@/lib/utils"
import { useRailCollapsed } from "@/lib/chidi/use-rail-collapsed"
import { usePersistedState } from "@/lib/hooks/use-persisted-state"
import {
  PLAYS,
  type PlaybookPlay,
} from "@/lib/chidi/playbook-plays"
import { DECISIONS, type Decision } from "@/lib/chidi/insights-decisions"

const PlaySheetBody = dynamic(
  () => import("@/components/chidi/play-sandbox").then((m) => m.PlaySheetBody),
  { ssr: false, loading: () => <SheetBodySkeleton /> },
)

// ---------------------------------------------------------------------------
// Persisted decision lifecycle (snoozed / dismissed / enacted)
// ---------------------------------------------------------------------------

type DecisionStateMap = Record<
  string,
  { state: "active" | "snoozed" | "dismissed" | "enacted"; until?: number }
>

interface RecentRun {
  decisionId: string
  title: string
  resultLine: string
  recipientCount: number
  ranAt: number // epoch ms
}

interface DraftPlay {
  title: string
  trigger: string
  message: string
}
const EMPTY_DRAFT: DraftPlay = { title: "", trigger: "", message: "" }

// ===========================================================================
// Page
// ===========================================================================

export default function PlaybookPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const railCollapsed = useRailCollapsed()

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // ----- Always-running plays state -------------------------------------
  const [pausedIds, setPausedIds] = usePersistedState<string[]>(
    "playbook:paused",
    PLAYS.filter((p) => p.state === "paused").map((p) => p.id),
  )
  const pausedSet = useMemo(() => new Set(pausedIds), [pausedIds])

  const [customMessages, setCustomMessages] = usePersistedState<Record<string, string>>(
    "playbook:custom-messages",
    {},
  )

  const [authoredPlays, setAuthoredPlays] = usePersistedState<PlaybookPlay[]>(
    "playbook:authored",
    [],
  )
  const allPlays = useMemo(() => [...authoredPlays, ...PLAYS], [authoredPlays])

  // ----- Today's decisions state ----------------------------------------
  const [decisionState, setDecisionState] = usePersistedState<DecisionStateMap>(
    "playbook:decisions",
    {},
  )

  const [recentRuns, setRecentRuns] = usePersistedState<RecentRun[]>(
    "playbook:recent-runs",
    [],
  )

  // ----- Sheet (sandbox / compose) state --------------------------------
  const [sheetTarget, setSheetTarget] = useState<
    | { kind: "play"; id: string }
    | { kind: "compose" }
    | null
  >(null)

  const [draft, setDraft, clearDraft] = usePersistedState<DraftPlay>(
    "playbook:draft",
    EMPTY_DRAFT,
  )

  // -------------------------------------------------------------------------
  // Visible decisions (filter snoozed/dismissed/enacted)
  // -------------------------------------------------------------------------
  const visibleDecisions: Decision[] = useMemo(() => {
    const now = Date.now()
    return DECISIONS.filter((d) => {
      const s = decisionState[d.id]
      if (!s || s.state === "active") return true
      if (s.state === "dismissed" || s.state === "enacted") return false
      if (s.state === "snoozed") {
        if (!s.until) return false
        return s.until <= now
      }
      return true
    })
  }, [decisionState])

  const dismissedCount = DECISIONS.length - visibleDecisions.length

  // -------------------------------------------------------------------------
  // Decision lifecycle handlers
  // -------------------------------------------------------------------------
  const setDecisionLifecycle = useCallback(
    (id: string, state: DecisionStateMap[string]["state"], snoozeMs?: number) => {
      setDecisionState((prev) => ({
        ...prev,
        [id]: {
          state,
          until: snoozeMs ? Date.now() + snoozeMs : undefined,
        },
      }))
    },
    [setDecisionState],
  )

  const handleEnacted = useCallback(
    (summary: { decisionId: string; resultLine: string; recipientCount: number }) => {
      const decision = DECISIONS.find((d) => d.id === summary.decisionId)
      if (!decision) return
      setRecentRuns((prev) =>
        [
          {
            decisionId: summary.decisionId,
            title: decision.question,
            resultLine: summary.resultLine,
            recipientCount: summary.recipientCount,
            ranAt: Date.now(),
          },
          ...prev,
        ].slice(0, 8),
      )
      setDecisionLifecycle(summary.decisionId, "enacted")
      toast.success("Play ran", { description: summary.resultLine })
    },
    [setRecentRuns, setDecisionLifecycle],
  )

  const handleSnooze = useCallback(
    (id: string, ms: number) => {
      setDecisionLifecycle(id, "snoozed", ms)
      toast("Snoozed", { description: "Chidi will bring it back later." })
    },
    [setDecisionLifecycle],
  )

  const handleDismiss = useCallback(
    (id: string) => {
      setDecisionLifecycle(id, "dismissed")
    },
    [setDecisionLifecycle],
  )

  const handleRestoreAll = useCallback(() => {
    setDecisionState({})
  }, [setDecisionState])

  // -------------------------------------------------------------------------
  // Always-running handlers
  // -------------------------------------------------------------------------
  const togglePause = (id: string) => {
    setPausedIds((prev) => {
      const set = new Set(prev)
      if (set.has(id)) {
        set.delete(id)
        toast.success("Play resumed", { description: "Chidi will run this again." })
      } else {
        set.add(id)
        toast("Play paused", { description: "Chidi won't run this until you turn it back on." })
      }
      return Array.from(set)
    })
  }

  const handleSaveCustom = (id: string, message: string) => {
    setCustomMessages((prev) => ({ ...prev, [id]: message }))
    toast.success("Message saved", { description: "Chidi will use your version from now on." })
  }

  const handleResetCustom = (id: string) => {
    setCustomMessages((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    toast("Reset to default", { description: "Back to Chidi's original message." })
  }

  const handleSaveDraft = () => {
    const title = draft.title.trim()
    const trigger = draft.trigger.trim()
    if (!title || !trigger) return
    const newPlay: PlaybookPlay = {
      id: `authored-${Date.now()}`,
      category: "routine",
      title,
      trigger,
      steps: ["Chidi will run this when the moment matches."],
      outcome: "Track record will fill in once it runs.",
      stats: { runs: 0, won: 0, win_rate_pct: 0 },
      state: "active",
      recent: [],
      sample_message: draft.message.trim() || undefined,
    }
    setAuthoredPlays((prev) => [newPlay, ...prev])
    clearDraft()
    setDraft(EMPTY_DRAFT)
    setSheetTarget(null)
    toast.success("Play added", { description: `"${title}" is now in your playbook.` })
  }

  const activePlay = useMemo(() => {
    if (sheetTarget?.kind !== "play") return null
    return allPlays.find((p) => p.id === sheetTarget.id) ?? null
  }, [sheetTarget, allPlays])

  // Close sheet on Escape
  useEffect(() => {
    if (!sheetTarget) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetTarget(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [sheetTarget])

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
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
        title="Playbook"
        subtitle="What Chidi's running for you, and what needs your call."
        voice
        width="default"
      >
        {!mounted ? (
          <ListSkeleton />
        ) : (
          <div className="space-y-10">
            {/* === TODAY — conversation thread of decisions === */}
            <SectionHeader
              eyebrow="Today"
              count={visibleDecisions.length}
              tone="warning"
              right={
                dismissedCount > 0 ? (
                  <button
                    onClick={handleRestoreAll}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" strokeWidth={2} />
                    Restore {dismissedCount}
                  </button>
                ) : null
              }
            />

            {visibleDecisions.length === 0 ? (
              <TodayEmpty />
            ) : (
              <div className="space-y-3">
                {visibleDecisions.map((d) => (
                  <PlaybookDecisionCard
                    key={d.id}
                    decision={d}
                    onEnacted={handleEnacted}
                    onSnooze={handleSnooze}
                    onDismiss={handleDismiss}
                  />
                ))}
              </div>
            )}

            {/* === RECENT RUNS — appears after first enactment === */}
            {recentRuns.length > 0 && (
              <RecentRunsSection runs={recentRuns} />
            )}

            {/* === ALWAYS RUNNING — quieter list === */}
            <div>
              <SectionHeader
                eyebrow="Always running"
                count={allPlays.length}
                tone="win"
              />
              {allPlays.length === 0 ? (
                <EmptyState
                  art="copilot"
                  title="No background plays yet."
                  description="A play is a move Chidi runs for you on repeat — like nudging cold pending payments. Author your first one."
                  action={
                    <button
                      onClick={() => setSheetTarget({ kind: "compose" })}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md text-[13px] font-semibold bg-[var(--chidi-text-primary)] text-[var(--background)] hover:bg-[var(--chidi-text-primary)]/90 transition-colors"
                    >
                      <Plus className="w-4 h-4" strokeWidth={2.4} />
                      Author your first play
                    </button>
                  }
                />
              ) : (
                <PlaybookAlwaysRunning
                  plays={allPlays}
                  pausedSet={pausedSet}
                  customMessages={customMessages}
                  onOpen={(id) => setSheetTarget({ kind: "play", id })}
                  onTogglePause={togglePause}
                />
              )}

              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setSheetTarget({ kind: "compose" })}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[12px] font-medium border border-dashed border-[var(--chidi-border-default)] text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-surface)] hover:text-[var(--chidi-text-primary)] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2.2} />
                  New play
                </button>
              </div>
            </div>
          </div>
        )}
      </ChidiPage>

      {/* Slide-up sheet — sandbox or compose */}
      {sheetTarget && (
        <Sheet onClose={() => setSheetTarget(null)}>
          {sheetTarget.kind === "compose" ? (
            <ComposeSheet
              draft={draft}
              onChange={setDraft}
              onSave={handleSaveDraft}
              onCancel={() => {
                clearDraft()
                setDraft(EMPTY_DRAFT)
                setSheetTarget(null)
              }}
            />
          ) : activePlay ? (
            <PlaySheetBody
              play={activePlay}
              paused={pausedSet.has(activePlay.id)}
              customMessage={customMessages[activePlay.id]}
              onTogglePause={() => togglePause(activePlay.id)}
              onSaveMessage={(msg) => handleSaveCustom(activePlay.id, msg)}
              onResetMessage={() => handleResetCustom(activePlay.id)}
              onClose={() => setSheetTarget(null)}
            />
          ) : (
            <SheetBodySkeleton />
          )}
        </Sheet>
      )}
    </div>
  )
}

// ===========================================================================
// Section header — shared eyebrow + count + optional right slot
// ===========================================================================

function SectionHeader({
  eyebrow,
  count,
  tone,
  right,
}: {
  eyebrow: string
  count: number
  tone: "warning" | "win"
  right?: React.ReactNode
}) {
  const dot =
    tone === "warning" ? "var(--chidi-warning)" : "var(--chidi-win)"
  return (
    <div className="flex items-center justify-between gap-3 mb-4 px-0.5">
      <div className="flex items-baseline gap-2">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: dot }}
        />
        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold">
          {eyebrow}
        </p>
        <span className="text-[10px] tabular-nums text-[var(--chidi-text-muted)]">
          {count}
        </span>
      </div>
      {right}
    </div>
  )
}

// ===========================================================================
// TodayEmpty — encouraging zero-state for the conversation thread
// ===========================================================================

function TodayEmpty() {
  return (
    <div className="rounded-2xl bg-[var(--card)] border border-[var(--chidi-border-default)] p-6 lg:p-8 flex items-start gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--chidi-surface)] flex items-center justify-center text-[var(--chidi-text-primary)]">
        <ArcFace size={32} />
      </div>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-[var(--chidi-text-primary)] leading-snug">
          Nothing pressing today.
        </h3>
        <p className="text-[12.5px] text-[var(--chidi-text-secondary)] mt-1 leading-snug font-chidi-voice">
          Take a breath. I'll bring something back when it matters.
        </p>
      </div>
    </div>
  )
}

// ===========================================================================
// Recent runs — inserted after the first decision is enacted
// ===========================================================================

function RecentRunsSection({ runs }: { runs: RecentRun[] }) {
  return (
    <div>
      <SectionHeader eyebrow="Recent runs" count={runs.length} tone="win" />
      <ul className="rounded-xl border border-[var(--chidi-border-subtle)] bg-[var(--card)] divide-y divide-[var(--chidi-border-subtle)] overflow-hidden">
        {runs.map((run, i) => (
          <li
            key={`${run.decisionId}-${run.ranAt}`}
            className="flex items-start gap-3 px-4 py-3 motion-safe:animate-[playbookRanRowIn_280ms_cubic-bezier(0.22,1,0.36,1)]"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <span className="mt-0.5 w-4 h-4 rounded-full bg-[var(--chidi-win)] flex items-center justify-center text-[var(--background)] text-[9px] font-bold flex-shrink-0">
              ✓
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] text-[var(--chidi-text-primary)] leading-snug font-medium">
                {run.title}
              </p>
              <p className="text-[11.5px] text-[var(--chidi-win)] mt-0.5 leading-snug">
                {run.resultLine}
              </p>
            </div>
            <span className="text-[10.5px] text-[var(--chidi-text-muted)] flex-shrink-0 tabular-nums">
              <RelativeTime epochMs={run.ranAt} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RelativeTime({ epochMs }: { epochMs: number }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])
  const diff = Math.max(0, Date.now() - epochMs)
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return <>Ran {sec}s ago</>
  const min = Math.floor(sec / 60)
  if (min < 60) return <>Ran {min}m ago</>
  const hr = Math.floor(min / 60)
  if (hr < 24) return <>Ran {hr}h ago</>
  const day = Math.floor(hr / 24)
  return <>Ran {day}d ago</>
}

// ===========================================================================
// Sheet — slide-up overlay (kept from prior surface, simplified)
// ===========================================================================

function Sheet({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 motion-safe:animate-[chidiBackdropIn_180ms_ease-out]"
      />
      <div className="relative w-full sm:max-w-xl bg-[var(--card)] sm:rounded-2xl rounded-t-2xl border border-[var(--chidi-border-default)] shadow-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col motion-safe:animate-[chidiSheetIn_280ms_cubic-bezier(0.22,1,0.36,1)]">
        {children}
        <style jsx>{`
          @keyframes chidiSheetIn {
            from { transform: translateY(24px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
          @keyframes chidiBackdropIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  )
}

// ===========================================================================
// ComposeSheet — quiet authoring path
// ===========================================================================

function ComposeSheet({
  draft,
  onChange,
  onSave,
  onCancel,
}: {
  draft: DraftPlay
  onChange: React.Dispatch<React.SetStateAction<DraftPlay>>
  onSave: () => void
  onCancel: () => void
}) {
  const canSave = draft.title.trim().length > 1 && draft.trigger.trim().length > 1

  return (
    <>
      <header className="flex items-start gap-3 px-5 lg:px-6 pt-5 pb-4 border-b border-[var(--chidi-border-subtle)] flex-shrink-0">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-[var(--chidi-surface)] flex items-center justify-center text-[var(--chidi-text-primary)]">
          <ArcFace size={28} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold mb-0.5">
            New play
          </p>
          <h2 className="text-[16px] font-semibold text-[var(--chidi-text-primary)] leading-snug">
            What move should Chidi keep running?
          </h2>
        </div>
        <button
          onClick={onCancel}
          aria-label="Close"
          className="p-2 -mr-2 rounded-md text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] transition-colors flex-shrink-0"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </header>

      <div className="px-5 lg:px-6 py-5 space-y-5 overflow-y-auto flex-1">
        <div>
          <label className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold mb-1.5 block">
            Name
          </label>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => onChange((d) => ({ ...d, title: e.target.value }))}
            placeholder="e.g. Chase cold pending payments"
            className="w-full bg-[var(--chidi-surface)]/60 border border-[var(--chidi-border-subtle)] rounded-md px-3 py-2.5 text-[13px] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:outline-none focus:border-[var(--chidi-text-primary)] transition-colors"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold mb-1.5 block">
            When this happens
          </label>
          <input
            type="text"
            value={draft.trigger}
            onChange={(e) => onChange((d) => ({ ...d, trigger: e.target.value }))}
            placeholder="e.g. An order has been pending for 24 hours."
            className="w-full bg-[var(--chidi-surface)]/60 border border-[var(--chidi-border-subtle)] rounded-md px-3 py-2.5 text-[13px] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:outline-none focus:border-[var(--chidi-text-primary)] transition-colors"
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold">
              Message Chidi sends
            </label>
            <span className="text-[11px] text-[var(--chidi-text-muted)]">Optional</span>
          </div>
          <textarea
            value={draft.message}
            onChange={(e) => onChange((d) => ({ ...d, message: e.target.value }))}
            rows={4}
            placeholder="Hey! Still want to grab that one? I'm holding it till tomorrow noon."
            className="w-full bg-[var(--chidi-surface)]/60 border border-[var(--chidi-border-subtle)] rounded-md px-3 py-2.5 text-[13px] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:outline-none focus:border-[var(--chidi-text-primary)] transition-colors resize-none leading-snug"
          />
        </div>
      </div>

      <div className="px-5 lg:px-6 py-3 border-t border-[var(--chidi-border-subtle)] flex items-center justify-between gap-3 bg-[var(--card)] flex-shrink-0">
        <button
          onClick={onCancel}
          className="text-[13px] font-medium text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] px-3 py-2 rounded-md hover:bg-[var(--chidi-surface)] transition-colors"
        >
          Cancel
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
    </>
  )
}

// ===========================================================================
// Skeletons
// ===========================================================================

function ListSkeleton() {
  return (
    <div className="space-y-8">
      {[0, 1].map((g) => (
        <div key={g} className="space-y-3">
          <div className="flex items-baseline gap-2 mb-3 px-0.5">
            <div className="h-1.5 w-1.5 rounded-full bg-[var(--chidi-surface)] motion-safe:animate-pulse" />
            <div className="h-2 w-16 rounded bg-[var(--chidi-surface)] motion-safe:animate-pulse" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl bg-[var(--card)] border border-[var(--chidi-border-default)] px-4 py-3.5 lg:px-5 lg:py-4 flex items-center gap-3"
            >
              <div className="h-9 w-9 rounded-full bg-[var(--chidi-surface)] motion-safe:animate-pulse flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div
                  className="h-3 rounded bg-[var(--chidi-surface)] motion-safe:animate-pulse"
                  style={{ width: `${55 + (i % 3) * 12}%` }}
                />
                <div
                  className="h-2.5 rounded bg-[var(--chidi-surface)] motion-safe:animate-pulse"
                  style={{ width: `${70 + (i % 2) * 10}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function SheetBodySkeleton() {
  return (
    <>
      <div className="flex items-start gap-3 px-5 lg:px-6 pt-5 pb-4 border-b border-[var(--chidi-border-subtle)]">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-[var(--chidi-surface)] motion-safe:animate-pulse" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-2.5 w-24 rounded bg-[var(--chidi-surface)] motion-safe:animate-pulse" />
          <div className="h-4 w-3/4 rounded bg-[var(--chidi-surface)] motion-safe:animate-pulse" />
        </div>
      </div>
      <div className="p-5 lg:p-6 space-y-4">
        <div className="h-3 w-1/3 rounded bg-[var(--chidi-surface)] motion-safe:animate-pulse" />
        <div className="space-y-2">
          <div className="h-3 w-5/6 rounded bg-[var(--chidi-surface)] motion-safe:animate-pulse" />
          <div className="h-3 w-4/6 rounded bg-[var(--chidi-surface)] motion-safe:animate-pulse" />
        </div>
        <div className="h-32 rounded-xl bg-[var(--chidi-surface)]/60 motion-safe:animate-pulse" />
      </div>
    </>
  )
}
