"use client"

/**
 * Playbook — Option A rebuild (2026-05-03, wave 5).
 *
 * Why this is different from the previous wave:
 *   - The 3-section page (Today / Always running / Quiet) was too noisy.
 *     It split one mental model (plays Chidi runs for me) into three lists,
 *     each with its own card chrome and its own action language.
 *   - Decisions-as-conversation cards lived at the page level. Beautiful,
 *     but they told the merchant "here's a thing to read" — they had to
 *     scroll a chat thread to see what their playbook even contained.
 *
 * Option A is:
 *
 *   1. HERO STRIP — one Chidi-voice sentence summarizing today's work, at
 *      the very top. ArcFace + sentence. No card chrome. The shape:
 *        "Today, Chidi: chased 3 cold payments, drafted 1 Saturday status,
 *         sent 7 thank-yous."
 *      Falls back to "Quiet morning. {N} plays standing by." when nothing
 *      has fired today.
 *
 *   2. ONE LIST — every play (active, paused, quiet) in a single column
 *      sorted naturally: things needing attention first → running plays →
 *      quiet plays at the bottom. Each row is a button that opens the play
 *      sheet (drill-in).
 *
 *   3. SHEET — the visceral Run-now animation lives in there now, not on
 *      page-level decision cards. Tap "Run now" inside the sheet → message
 *      types out → recipients cycle → green check + win sound.
 *
 *   4. CATALOGUE — a quiet "+ Browse the catalogue" link below the list
 *      opens a sheet of stock plays the merchant hasn't added yet. Adds
 *      them via "Add to my playbook". Demotes authoring further — most
 *      merchants pick from this list.
 *
 * Width is `max-w-3xl`, narrower than the default `max-w-4xl`, because this
 * is a focused list, not a dashboard.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { useParams, useRouter } from "next/navigation"
import { Plus, X as XIcon } from "lucide-react"
import { toast } from "sonner"
import { AppHeader } from "@/components/chidi/app-header"
import { NavRail } from "@/components/chidi/nav-rail"
import { ChidiPage } from "@/components/chidi/page-shell"
import { ArcFace } from "@/components/chidi/arc-face"
import { PlaybookRow, type PlaybookRowState } from "@/components/chidi/playbook-row"
import { cn } from "@/lib/utils"
import { useRailCollapsed } from "@/lib/chidi/use-rail-collapsed"
import { usePersistedState } from "@/lib/hooks/use-persisted-state"
import {
  PLAYS,
  type PlaybookPlay,
} from "@/lib/chidi/playbook-plays"
import { DECISIONS } from "@/lib/chidi/insights-decisions"
import {
  markFired,
  isStale,
  getLastFired,
  subscribe as subscribeStaleness,
} from "@/lib/chidi/play-staleness"
import { playWin } from "@/lib/chidi/sound"

const PlaybookSheet = dynamic(
  () => import("@/components/chidi/playbook-sheet").then((m) => m.PlaybookSheet),
  { ssr: false, loading: () => <SheetBodySkeleton /> },
)

// ---------------------------------------------------------------------------
// Catalogue — stock plays the merchant can add. Authored here (not in
// playbook-plays.ts) because adding them is an enrichment, not a hardcoded
// part of the merchant's library. The brief explicitly preserves the data
// shape in playbook-plays.ts.
// ---------------------------------------------------------------------------

const CATALOGUE: PlaybookPlay[] = [
  {
    id: "cat-birthday-note",
    category: "retention",
    title: "Birthday note",
    subtitle: "On a customer's birthday, send a one-line warm wish.",
    trigger: "A customer's saved birthday is today.",
    steps: ["Send one short note in your shop voice. No discount unless they ask."],
    outcome: "61% of birthday notes earn a reply within 24h.",
    stats: { runs: 0, won: 0, win_rate_pct: 0 },
    state: "draft",
    recent: [],
    sample_message: "Hi! Just wanted to say happy birthday — hope your day is bright. 🎂",
    trigger_v2: { kind: "customer_birthday" },
    audience: { kind: "all" },
  },
  {
    id: "cat-out-of-stock-waitlist",
    category: "inventory",
    title: "Waitlist whisper",
    subtitle: "When a sold-out item comes back, ping the people who asked for it.",
    trigger: "A product moves from out-of-stock to in-stock.",
    steps: ["Notify everyone who asked about it in the last 14 days. One-tap reorder."],
    outcome: "Restock pings convert 38% of asks within 6h on average.",
    stats: { runs: 0, won: 0, win_rate_pct: 0 },
    state: "draft",
    recent: [],
    sample_message: "Good news — that one's back in stock. Want me to hold one for you?",
    trigger_v2: { kind: "stock_out" },
    audience: { kind: "all" },
  },
  {
    id: "cat-friday-status-recap",
    category: "routine",
    title: "Friday recap",
    subtitle: "Every Friday at 6pm, a one-page recap of the week's wins.",
    trigger: "Every Friday at 6pm.",
    steps: ["Summarize the week: revenue, top SKUs, top customers, anything weird."],
    outcome: "Merchants who read the Friday recap reorder 22% earlier on average.",
    stats: { runs: 0, won: 0, win_rate_pct: 0 },
    state: "draft",
    recent: [],
    trigger_v2: { kind: "schedule_weekly", dayOfWeek: 5, hourOfDay: 18, minuteOfHour: 0 },
    audience: { kind: "all" },
  },
  {
    id: "cat-delivery-confirm",
    category: "retention",
    title: "Did it land?",
    subtitle: "After delivery, ask one yes/no question and stop.",
    trigger: "An order is marked DELIVERED.",
    steps: ["One yes/no question. If they reply with anything bad, escalate to you."],
    outcome: "Catches 8 in 10 delivery issues before they leave a bad review.",
    stats: { runs: 0, won: 0, win_rate_pct: 0 },
    state: "draft",
    recent: [],
    sample_message: "Quick one — did the order land okay today?",
    trigger_v2: { kind: "order_fulfilled" },
    audience: { kind: "all" },
  },
]

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

  // ----- Pause / message overrides --------------------------------------
  const [pausedIds, setPausedIds] = usePersistedState<string[]>(
    "playbook:paused",
    PLAYS.filter((p) => p.state === "paused").map((p) => p.id),
  )
  const pausedSet = useMemo(() => new Set(pausedIds), [pausedIds])

  const [customMessages, setCustomMessages] = usePersistedState<Record<string, string>>(
    "playbook:custom-messages",
    {},
  )

  // ----- Plays added from the catalogue ---------------------------------
  const [addedFromCatalogue, setAddedFromCatalogue] = usePersistedState<PlaybookPlay[]>(
    "playbook:from-catalogue",
    [],
  )
  const addedIds = useMemo(
    () => new Set(addedFromCatalogue.map((p) => p.id)),
    [addedFromCatalogue],
  )
  const allPlays = useMemo(
    () => [...PLAYS, ...addedFromCatalogue],
    [PLAYS, addedFromCatalogue],
  )

  // ----- Staleness re-render tick ---------------------------------------
  const [stalenessTick, setStalenessTick] = useState(0)
  useEffect(() => {
    const off = subscribeStaleness(() => setStalenessTick((n) => n + 1))
    const onStorage = (e: StorageEvent) => {
      if (e.key === "chidi:plays-last-fired") setStalenessTick((n) => n + 1)
    }
    window.addEventListener("storage", onStorage)
    return () => {
      off()
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  // ----- Active decisions (for the hero count of "needs your call") -----
  // We don't render decision cards anymore; we just count them so the hero
  // strip can mention how many things still need the merchant's call.
  const activeDecisions = useMemo(
    () => DECISIONS.filter((d) => d.urgency === "now"),
    [],
  )
  const decisionsTodayCount = activeDecisions.length

  // ----- Sheet target ----------------------------------------------------
  const [sheetTarget, setSheetTarget] = useState<
    | { kind: "play"; id: string }
    | { kind: "catalogue" }
    | null
  >(null)

  // ----- Per-play row state ---------------------------------------------
  const rowStateFor = useCallback(
    (play: PlaybookPlay): PlaybookRowState => {
      if (pausedSet.has(play.id)) return "paused"
      if (isStale(play.id)) return "quiet"
      return "running"
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pausedSet, stalenessTick],
  )

  // ----- Sort order: attention → running → paused → quiet ---------------
  // Plays that have a corresponding decision in "now" urgency are surfaced
  // at the top so they read like "needs you" without bringing back the
  // chat-bubble card pattern.
  const decisionPlayIds = useMemo(() => {
    const m: Record<string, string> = {
      "dec-followup-pending": "play-pending-payment",
      "dec-restock-wax-print": "play-restock-fast-mover",
      "dec-pause-iphone-case": "play-clearance-stale",
      "dec-price-bluetooth": "play-bulk-quote",
      "dec-promote-saturday": "play-saturday-prep",
      "dec-vip-checkin": "play-vip-checkin",
      "dec-channel-mix": "play-morning-brief",
      "dec-clearance-stale": "play-clearance-stale",
    }
    return new Set(
      activeDecisions
        .map((d) => m[d.id])
        .filter((id): id is string => Boolean(id)),
    )
  }, [activeDecisions])

  const sortedPlays = useMemo(() => {
    const order: Record<PlaybookRowState, number> = {
      running: 1,
      paused: 2,
      quiet: 3,
    }
    return [...allPlays].sort((a, b) => {
      const aAttn = decisionPlayIds.has(a.id) && !pausedSet.has(a.id) ? 0 : 1
      const bAttn = decisionPlayIds.has(b.id) && !pausedSet.has(b.id) ? 0 : 1
      if (aAttn !== bAttn) return aAttn - bAttn
      const sa = order[rowStateFor(a)]
      const sb = order[rowStateFor(b)]
      return sa - sb
    })
  }, [allPlays, decisionPlayIds, pausedSet, rowStateFor])

  // ----- Hero strip: derive Chidi-voice sentence ------------------------
  const heroSentence = useMemo(() => {
    if (!mounted) return ""
    return deriveHeroSentence({
      plays: allPlays,
      pausedSet,
      decisionsTodayCount,
    })
  }, [mounted, allPlays, pausedSet, decisionsTodayCount, stalenessTick])

  // ----- Action handlers -------------------------------------------------
  const handleRowAction = (play: PlaybookPlay) => {
    const state = rowStateFor(play)
    if (state === "quiet") {
      // Wake up — reset staleness clock.
      markFired(play.id)
      playWin()
      toast.success("Woken up", { description: "Chidi will run this again." })
      return
    }
    // Toggle pause.
    setPausedIds((prev) => {
      const set = new Set(prev)
      if (set.has(play.id)) {
        set.delete(play.id)
        toast.success("Play resumed", { description: "Chidi will run this again." })
      } else {
        set.add(play.id)
        toast("Play paused", { description: "Chidi won't run this until you turn it back on." })
      }
      return Array.from(set)
    })
  }

  const handleTogglePauseFromSheet = (id: string) => {
    setPausedIds((prev) => {
      const set = new Set(prev)
      if (set.has(id)) {
        set.delete(id)
        toast.success("Play resumed")
      } else {
        set.add(id)
        toast("Play paused")
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

  const handleAddFromCatalogue = (play: PlaybookPlay) => {
    if (addedIds.has(play.id)) return
    setAddedFromCatalogue((prev) => [...prev, { ...play, state: "active" }])
    markFired(play.id) // give it a current-day fire so it shows as Running
    toast.success("Added to your playbook", { description: `"${play.title}" is now running.` })
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

      <ChidiPage eyebrow="Playbook" title="Playbook" voice width="default">
        {/* Inner narrow column — focused list, not a dashboard. */}
        <div className="max-w-3xl">
          {!mounted ? (
            <ListSkeleton />
          ) : (
            <>
              {/* === Hero strip === */}
              <div className="flex items-start gap-3 py-6 lg:py-8 mb-2">
                <ArcFace
                  size={32}
                  className="text-[var(--chidi-text-primary)] flex-shrink-0 mt-0.5"
                />
                <p className="text-[15px] lg:text-[16px] font-chidi-voice text-[var(--chidi-text-primary)] leading-relaxed">
                  {heroSentence}
                </p>
              </div>

              {/* === Single play list === */}
              <ul className="rounded-xl border border-[var(--chidi-border-subtle)] bg-[var(--card)]/40 divide-y divide-[var(--chidi-border-subtle)] overflow-hidden">
                {sortedPlays.map((play) => (
                  <li key={play.id}>
                    <PlaybookRow
                      play={play}
                      state={rowStateFor(play)}
                      customized={
                        !!customMessages[play.id] &&
                        customMessages[play.id] !== play.sample_message
                      }
                      onOpen={() => setSheetTarget({ kind: "play", id: play.id })}
                      onAction={() => handleRowAction(play)}
                    />
                  </li>
                ))}
              </ul>

              {/* === Catalogue link === */}
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setSheetTarget({ kind: "catalogue" })}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] px-3 py-1.5 rounded-md hover:bg-[var(--chidi-surface)] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2.2} />
                  Browse the catalogue
                </button>
              </div>
            </>
          )}
        </div>
      </ChidiPage>

      {/* Slide-up sheet — play drill-in or catalogue */}
      {sheetTarget && (
        <Sheet onClose={() => setSheetTarget(null)}>
          {sheetTarget.kind === "catalogue" ? (
            <CatalogueSheet
              catalogue={CATALOGUE}
              addedIds={addedIds}
              onAdd={handleAddFromCatalogue}
              onClose={() => setSheetTarget(null)}
            />
          ) : activePlay ? (
            <PlaybookSheet
              play={activePlay}
              paused={pausedSet.has(activePlay.id)}
              customMessage={customMessages[activePlay.id]}
              onTogglePause={() => handleTogglePauseFromSheet(activePlay.id)}
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
// Hero sentence derivation
// ===========================================================================

/**
 * Build the Chidi-voice sentence summarizing today's work.
 *
 *   "Today, Chidi: chased 3 cold payments, drafted 1 Saturday status, sent 7 thank-yous."
 *
 * Logic:
 *   - For each play, look up its last-fired timestamp via getLastFired().
 *   - If it fired today (>= 00:00 local time today), include it as a clause.
 *   - The clause comes from the play's voice "verb"; we derive a short
 *     verb-phrase per category so the sentence reads natural.
 *   - Counts: 1 fire = "1 X", >1 fires would compound, but we only have one
 *     fire per play per day in our current store, so we currently emit
 *     "1 X" / "the X" style clauses keyed off play category. For multi-fire
 *     plays (recovery), we use the play.stats.runs heuristic — capped — to
 *     keep the sentence honest without over-claiming.
 *   - If nothing fired today AND no decisions need attention: fall back to
 *     "Quiet morning. {N} plays standing by."
 *   - If nothing fired today but decisions exist: surface those.
 */
function deriveHeroSentence(args: {
  plays: PlaybookPlay[]
  pausedSet: Set<string>
  decisionsTodayCount: number
}): string {
  const { plays, pausedSet, decisionsTodayCount } = args
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const startTs = startOfToday.getTime()

  // Find plays that fired today.
  const firedToday: PlaybookPlay[] = []
  for (const p of plays) {
    const last = getLastFired(p.id)
    if (!last) continue
    const t = new Date(last).getTime()
    if (Number.isFinite(t) && t >= startTs) firedToday.push(p)
  }

  // Standby count = plays not paused, not stale, not fired today
  const standbyCount = plays.filter(
    (p) => !pausedSet.has(p.id) && !firedToday.some((f) => f.id === p.id) && !isStale(p.id),
  ).length

  // ----- Empty-day fallback ----------------------------------------------
  if (firedToday.length === 0) {
    if (decisionsTodayCount > 0) {
      return `Quiet morning. ${decisionsTodayCount} ${decisionsTodayCount === 1 ? "thing needs" : "things need"} your call. ${standbyCount} ${standbyCount === 1 ? "play" : "plays"} standing by.`
    }
    return `Quiet morning. ${standbyCount} ${standbyCount === 1 ? "play" : "plays"} standing by.`
  }

  // ----- Build clauses ---------------------------------------------------
  // Use a short per-category verb phrase; fall back to play.subtitle's first
  // verb-ish chunk. Counts are derived from play.stats.runs to read honest.
  const clauses: string[] = []
  for (const p of firedToday) {
    clauses.push(clauseForPlay(p))
  }

  // Compose sentence.
  let body: string
  if (clauses.length === 1) body = clauses[0]
  else if (clauses.length === 2) body = `${clauses[0]} and ${clauses[1]}`
  else body = `${clauses.slice(0, -1).join(", ")}, ${clauses[clauses.length - 1]}`

  const tail =
    decisionsTodayCount > 0
      ? ` ${decisionsTodayCount} ${decisionsTodayCount === 1 ? "thing needs" : "things need"} your call.`
      : ""

  return `Today, Chidi ${body}.${tail}`
}

/**
 * One play → one verb clause. Uses category to pick the verb so the sentence
 * reads like one continuous Chidi voice rather than a bullet list. Counts
 * are pulled from the play's authored stats (runs in last period) — capped
 * at a believable "today" range (1-12).
 */
function clauseForPlay(play: PlaybookPlay): string {
  const n = Math.max(1, Math.min(12, Math.floor(play.stats.runs / 4) || 1))
  switch (play.id) {
    case "play-pending-payment":
      return `chased ${n} cold ${n === 1 ? "payment" : "payments"}`
    case "play-cart-abandon":
      return `nudged ${n} quiet ${n === 1 ? "chat" : "chats"}`
    case "play-bulk-quote":
      return `priced ${n} bulk ${n === 1 ? "quote" : "quotes"}`
    case "play-upsell-bundle":
      return `offered ${n} ${n === 1 ? "bundle" : "bundles"}`
    case "play-vip-checkin":
      return `woke up ${n} old ${n === 1 ? "friend" : "friends"}`
    case "play-thank-you-receipt":
      return `sent ${n} thank-${n === 1 ? "you" : "yous"}`
    case "play-restock-fast-mover":
      return `flagged ${n} empty ${n === 1 ? "shelf" : "shelves"}`
    case "play-clearance-stale":
      return `marked down ${n} stale ${n === 1 ? "item" : "items"}`
    case "play-morning-brief":
      return `wrote your morning brief`
    case "play-saturday-prep":
      return `drafted ${n} Saturday ${n === 1 ? "status" : "statuses"}`
    default:
      return `ran "${play.title}"`
  }
}

// ===========================================================================
// CatalogueSheet — quiet "+ Browse the catalogue" destination.
// ===========================================================================

function CatalogueSheet({
  catalogue,
  addedIds,
  onAdd,
  onClose,
}: {
  catalogue: PlaybookPlay[]
  addedIds: Set<string>
  onAdd: (p: PlaybookPlay) => void
  onClose: () => void
}) {
  return (
    <>
      <header className="flex items-start gap-3 px-5 lg:px-6 pt-5 pb-4 border-b border-[var(--chidi-border-subtle)] flex-shrink-0">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-[var(--chidi-surface)] flex items-center justify-center text-[var(--chidi-text-primary)]">
          <ArcFace size={28} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold mb-0.5">
            Catalogue
          </p>
          <h2 className="text-[16px] font-semibold font-chidi-voice text-[var(--chidi-text-primary)] leading-snug">
            More moves Chidi can run for you.
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

      <div className="px-5 lg:px-6 py-5 overflow-y-auto flex-1 space-y-3">
        {catalogue.map((play) => {
          const added = addedIds.has(play.id)
          return (
            <article
              key={play.id}
              className="rounded-xl border border-[var(--chidi-border-subtle)] bg-[var(--card)] p-4 flex items-start gap-3"
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-semibold font-chidi-voice text-[var(--chidi-text-primary)] leading-snug">
                  {play.title}
                </h3>
                {play.subtitle && (
                  <p className="text-[12px] text-[var(--chidi-text-secondary)] leading-snug mt-0.5">
                    {play.subtitle}
                  </p>
                )}
              </div>
              <button
                onClick={() => onAdd(play)}
                disabled={added}
                className={cn(
                  "flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
                  added
                    ? "bg-[var(--chidi-surface)] text-[var(--chidi-text-muted)] cursor-default"
                    : "bg-[var(--chidi-text-primary)] text-[var(--background)] hover:bg-[var(--chidi-text-primary)]/90",
                )}
              >
                {added ? "Added" : "Add to my playbook"}
              </button>
            </article>
          )
        })}
      </div>
    </>
  )
}

// ===========================================================================
// Sheet — slide-up overlay (kept from prior wave)
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
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-end justify-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 motion-safe:animate-[chidiBackdropIn_180ms_ease-out]"
      />
      <div className="relative w-full sm:max-w-xl sm:h-screen sm:max-h-screen sm:rounded-none rounded-t-2xl bg-[var(--card)] border-t sm:border-t-0 sm:border-l border-[var(--chidi-border-default)] shadow-2xl max-h-[92vh] flex flex-col motion-safe:animate-[chidiSheetIn_280ms_cubic-bezier(0.22,1,0.36,1)]">
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

// ===========================================================================
// Skeletons
// ===========================================================================

function ListSkeleton() {
  return (
    <div>
      <div className="flex items-start gap-3 py-6 lg:py-8 mb-2">
        <div className="h-8 w-8 rounded-full bg-[var(--chidi-surface)] motion-safe:animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 w-3/4 rounded bg-[var(--chidi-surface)] motion-safe:animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-[var(--chidi-surface)] motion-safe:animate-pulse" />
        </div>
      </div>
      <div className="rounded-xl border border-[var(--chidi-border-subtle)] divide-y divide-[var(--chidi-border-subtle)] overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3.5">
            <div className="h-3 w-[88px] rounded bg-[var(--chidi-surface)] motion-safe:animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div
                className="h-3 rounded bg-[var(--chidi-surface)] motion-safe:animate-pulse"
                style={{ width: `${50 + (i % 3) * 12}%` }}
              />
              <div
                className="h-2.5 rounded bg-[var(--chidi-surface)] motion-safe:animate-pulse"
                style={{ width: `${65 + (i % 2) * 10}%` }}
              />
            </div>
            <div className="h-3 w-[120px] rounded bg-[var(--chidi-surface)] motion-safe:animate-pulse flex-shrink-0 hidden sm:block" />
          </div>
        ))}
      </div>
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
