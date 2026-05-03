"use client"

/**
 * Playbook — rebuilt from scratch (2026-05-03).
 *
 * What the merchant wants to do here, ranked by frequency:
 *   1. See what's running for me right now and what it's earning ("did Chidi
 *      actually do anything for me this month?").
 *   2. Turn a play on or off without thinking about it ("pause the receipt
 *      thank-you while I'm closed for Salah").
 *   3. Peek at what a play is and tweak it ("show me the message it sends").
 *
 * Primary action this surface optimizes for: TOGGLING a play on/off and
 * SEEING the proof it earned its keep.
 *
 * Metaphor: a list of tireless workers the merchant can hire or send home for
 * the day. NOT a workflow editor. NOT an automations IDE. NOT a fleet of
 * agents with stats dashboards. Authoring is demoted to a single quiet "+"
 * at the bottom — most Lagos merchants will live entirely off the seeded
 * plays, and that's fine.
 *
 * Layout: ONE column. Each row = name + 1-line summary + ₦ earned + a real
 * toggle. Tap the row → slide-up sheet with full description, sample message,
 * customize, run-now, recent runs. That's it. No master/detail, no KPI
 * strip stealing space, no filter chips, no composer leaking inline.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useParams, useRouter } from "next/navigation"
import { Plus, ChevronRight, X as XIcon } from "lucide-react"
import { toast } from "sonner"
import { AppHeader } from "@/components/chidi/app-header"
import { NavRail } from "@/components/chidi/nav-rail"
import { ChidiPage } from "@/components/chidi/page-shell"
import { EmptyState } from "@/components/chidi/empty-state"
import { ChidiMark } from "@/components/chidi/chidi-mark"
import { cn } from "@/lib/utils"
import { useRailCollapsed } from "@/lib/chidi/use-rail-collapsed"
import { usePersistedState } from "@/lib/hooks/use-persisted-state"
import {
  PLAYS,
  formatNGN,
  type PlaybookPlay,
} from "@/lib/chidi/playbook-plays"

/**
 * Lazy-load the slide-up sheet body. Keeps the route's first paint fast — the
 * list itself is tiny; the sheet only matters once a play is tapped.
 */
const PlaySheetBody = dynamic(
  () => import("@/components/chidi/play-sandbox").then((m) => m.PlaySheetBody),
  {
    ssr: false,
    loading: () => <SheetBodySkeleton />,
  },
)

interface DraftPlay {
  title: string
  trigger: string
  message: string
}

const EMPTY_DRAFT: DraftPlay = { title: "", trigger: "", message: "" }

// ============================================================================
// Page
// ============================================================================

export default function PlaybookPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const railCollapsed = useRailCollapsed()

  // Mounting flag — render skeleton on first paint while the sessionStorage
  // hooks hydrate. Avoids a flash of "all on" then snap to user's saved state.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // The merchant's on/off ledger. Default = whatever the seed says (active).
  // Persists per-merchant via sessionStorage.
  const [pausedIds, setPausedIds] = usePersistedState<string[]>(
    "playbook:paused",
    PLAYS.filter((p) => p.state === "paused").map((p) => p.id),
  )
  const pausedSet = useMemo(() => new Set(pausedIds), [pausedIds])

  // Per-play customizations: the merchant's edited message, persisted.
  const [customMessages, setCustomMessages] = usePersistedState<Record<string, string>>(
    "playbook:custom-messages",
    {},
  )

  // Locally-authored plays (the optional "+ New play" path).
  const [authoredPlays, setAuthoredPlays] = usePersistedState<PlaybookPlay[]>(
    "playbook:authored",
    [],
  )

  // Sheet state — which play (or "compose") is open in the slide-up sheet.
  const [sheetTarget, setSheetTarget] = useState<
    | { kind: "play"; id: string }
    | { kind: "compose" }
    | null
  >(null)

  const [draft, setDraft, clearDraft] = usePersistedState<DraftPlay>(
    "playbook:draft",
    EMPTY_DRAFT,
  )

  const allPlays = useMemo(
    () => [...authoredPlays, ...PLAYS],
    [authoredPlays],
  )

  // Two groups: Running (top) + Paused (below). No filter chips. No tabs.
  const { running, paused } = useMemo(() => {
    const running: PlaybookPlay[] = []
    const paused: PlaybookPlay[] = []
    for (const p of allPlays) {
      if (pausedSet.has(p.id)) paused.push(p)
      else running.push(p)
    }
    return { running, paused }
  }, [allPlays, pausedSet])

  const totalRecovered = useMemo(
    () =>
      allPlays
        .filter((p) => !pausedSet.has(p.id))
        .reduce((s, p) => s + (p.stats.last_30d_value_recovered_ngn ?? 0), 0),
    [allPlays, pausedSet],
  )

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
    toast.success("Message saved", {
      description: "Chidi will use your version from now on.",
    })
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
    toast.success("Play added", {
      description: `"${title}" is now in your playbook.`,
    })
  }

  const activePlay = useMemo(() => {
    if (sheetTarget?.kind !== "play") return null
    return allPlays.find((p) => p.id === sheetTarget.id) ?? null
  }, [sheetTarget, allPlays])

  // Close sheet on Escape.
  useEffect(() => {
    if (!sheetTarget) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetTarget(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [sheetTarget])

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
        subtitle={
          mounted
            ? totalRecovered > 0
              ? `${formatNGN(totalRecovered)} recovered for you in the last 30 days.`
              : "Turn a play on and Chidi will run it for you."
            : undefined
        }
        voice
        width="default"
      >
        {!mounted ? (
          <ListSkeleton />
        ) : allPlays.length === 0 ? (
          <EmptyState
            art="copilot"
            title="Your playbook is empty."
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
          <>
            {/* RUNNING — primary section */}
            {running.length > 0 && (
              <SectionGroup
                title="Running"
                count={running.length}
                tone="win"
              >
                {running.map((play) => (
                  <PlayRow
                    key={play.id}
                    play={play}
                    paused={false}
                    customMessage={customMessages[play.id]}
                    onOpen={() => setSheetTarget({ kind: "play", id: play.id })}
                    onTogglePause={() => togglePause(play.id)}
                  />
                ))}
              </SectionGroup>
            )}

            {/* PAUSED — secondary, quieter */}
            {paused.length > 0 && (
              <SectionGroup
                title="Paused"
                count={paused.length}
                tone="muted"
                className="mt-8"
              >
                {paused.map((play) => (
                  <PlayRow
                    key={play.id}
                    play={play}
                    paused
                    customMessage={customMessages[play.id]}
                    onOpen={() => setSheetTarget({ kind: "play", id: play.id })}
                    onTogglePause={() => togglePause(play.id)}
                  />
                ))}
              </SectionGroup>
            )}

            {/* Author button — quiet, below the list */}
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setSheetTarget({ kind: "compose" })}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[12px] font-medium border border-dashed border-[var(--chidi-border-default)] text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-surface)] hover:text-[var(--chidi-text-primary)] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2.2} />
                New play
              </button>
            </div>
          </>
        )}
      </ChidiPage>

      {/* Slide-up sheet — single overlay surface for play detail OR compose */}
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

// ============================================================================
// SectionGroup — quiet eyebrow + count
// ============================================================================

function SectionGroup({
  title,
  count,
  tone,
  className,
  children,
}: {
  title: string
  count: number
  tone: "win" | "muted"
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <div className="flex items-baseline gap-2 mb-3 px-0.5">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor:
              tone === "win" ? "var(--chidi-win)" : "var(--chidi-text-muted)",
          }}
        />
        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold">
          {title}
        </p>
        <span className="text-[10px] tabular-nums text-[var(--chidi-text-muted)]">
          {count}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

// ============================================================================
// PlayRow — the heart of the surface
// ============================================================================

function PlayRow({
  play,
  paused,
  customMessage,
  onOpen,
  onTogglePause,
}: {
  play: PlaybookPlay
  paused: boolean
  customMessage?: string
  onOpen: () => void
  onTogglePause: () => void
}) {
  const recovered = play.stats.last_30d_value_recovered_ngn ?? 0
  const customized = !!customMessage && customMessage !== play.sample_message

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
        {/* Main tap target — opens the sheet */}
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
            <p className="text-[11.5px] text-[var(--chidi-text-secondary)] leading-snug truncate">
              <span className="text-[var(--chidi-text-muted)]">When </span>
              {play.trigger}
            </p>
            {recovered > 0 && !paused && (
              <p className="text-[11px] text-[var(--chidi-win)] mt-1 tabular-nums font-medium">
                Recovered {formatNGN(recovered)} this month
              </p>
            )}
          </div>
          <ChevronRight
            className="w-3.5 h-3.5 text-[var(--chidi-text-muted)] flex-shrink-0 group-hover:translate-x-0.5 transition-transform"
            strokeWidth={2}
          />
        </button>

        {/* Toggle — always visible, real switch, big tap target */}
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

// ============================================================================
// Toggle — accessible switch, --chidi-* tokens
// ============================================================================

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

// ============================================================================
// Sheet — slide-up overlay
// ============================================================================

function Sheet({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  // Lock body scroll while sheet is open.
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
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 motion-safe:animate-[chidiBackdropIn_180ms_ease-out]"
      />
      {/* Sheet */}
      <div
        className="relative w-full sm:max-w-xl bg-[var(--card)] sm:rounded-2xl rounded-t-2xl border border-[var(--chidi-border-default)] shadow-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col motion-safe:animate-[chidiSheetIn_280ms_cubic-bezier(0.22,1,0.36,1)]"
      >
        {children}
        <style jsx>{`
          @keyframes chidiSheetIn {
            from {
              transform: translateY(24px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          @keyframes chidiBackdropIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </div>
  )
}

// ============================================================================
// ComposeSheet — author a new play, kept very small
// ============================================================================

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
  const titleRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 100)
  }, [])

  const canSave = draft.title.trim().length > 1 && draft.trigger.trim().length > 1

  return (
    <>
      <header className="flex items-start gap-3 px-5 lg:px-6 pt-5 pb-4 border-b border-[var(--chidi-border-subtle)] flex-shrink-0">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-[var(--chidi-surface)] flex items-center justify-center">
          <ChidiMark size={16} variant="default" />
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
            ref={titleRef}
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

// ============================================================================
// Skeletons — proper row-shaped placeholders, not Loader2
// ============================================================================

function ListSkeleton() {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2 mb-3 px-0.5">
        <div className="h-1.5 w-1.5 rounded-full bg-[var(--chidi-surface)] motion-safe:animate-pulse" />
        <div className="h-2 w-16 rounded bg-[var(--chidi-surface)] motion-safe:animate-pulse" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl bg-[var(--card)] border border-[var(--chidi-border-default)] px-4 py-3.5 lg:px-5 lg:py-4 flex items-center gap-3"
        >
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
          <div className="h-6 w-11 rounded-full bg-[var(--chidi-surface)] motion-safe:animate-pulse flex-shrink-0" />
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

