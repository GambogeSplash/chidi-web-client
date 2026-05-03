"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import {
  ArrowLeft,
  PlayCircle,
  PauseCircle,
  Zap,
  Repeat,
  ShoppingBag,
  Package,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  CircleDashed,
  Sparkles,
  ChevronRight,
  ChevronDown,
} from "lucide-react"
import { AppHeader } from "@/components/chidi/app-header"
import { NavRail } from "@/components/chidi/nav-rail"
import { ChidiPage } from "@/components/chidi/page-shell"
import { ChidiMark } from "@/components/chidi/chidi-mark"
import { cn } from "@/lib/utils"
import { useCountUp } from "@/lib/chidi/use-count-up"
import { useRailCollapsed } from "@/lib/chidi/use-rail-collapsed"
import { PlaySandbox } from "@/components/chidi/play-sandbox"
import {
  PLAYS,
  PLAY_CATEGORY_LABEL,
  PLAY_STATE_LABEL,
  formatNGN,
  type PlaybookPlay,
  type PlayCategory,
  type PlayState,
} from "@/lib/chidi/playbook-plays"

const CATEGORY_ICON: Record<PlayCategory, React.ElementType> = {
  recovery: Zap,
  conversion: ShoppingBag,
  retention: Repeat,
  inventory: Package,
  routine: Clock,
}

const CATEGORIES: PlayCategory[] = ["recovery", "conversion", "retention", "inventory", "routine"]

export default function PlaybookPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [activeCat, setActiveCat] = useState<PlayCategory | "all">("all")
  const [openPlayId, setOpenPlayId] = useState<string | null>(null)
  const [sandboxPlay, setSandboxPlay] = useState<PlaybookPlay | null>(null)
  const railCollapsed = useRailCollapsed()

  // Drag-to-reorder priority. Initial order is the authored PLAYS sequence;
  // the merchant can drag to prioritize. Order persists in localStorage so
  // the playbook stays in their preferred shape across sessions.
  const [playOrder, setPlayOrder] = useState<string[]>(() => PLAYS.map((p) => p.id))
  useEffect(() => {
    if (typeof window === "undefined") return
    const saved = localStorage.getItem("chidi_playbook_order_v1")
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[]
        // Defensively merge: drop ids no longer in PLAYS, append new ones
        const known = new Set(PLAYS.map((p) => p.id))
        const validSaved = parsed.filter((id) => known.has(id))
        const newIds = PLAYS.map((p) => p.id).filter((id) => !validSaved.includes(id))
        setPlayOrder([...validSaved, ...newIds])
      } catch {
        // ignore corrupt JSON, keep authored order
      }
    }
  }, [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setPlayOrder((items) => {
      const oldIdx = items.indexOf(active.id as string)
      const newIdx = items.indexOf(over.id as string)
      if (oldIdx < 0 || newIdx < 0) return items
      const next = arrayMove(items, oldIdx, newIdx)
      if (typeof window !== "undefined") {
        localStorage.setItem("chidi_playbook_order_v1", JSON.stringify(next))
      }
      return next
    })
  }

  const orderedPlays = useMemo(() => {
    const byId = new Map(PLAYS.map((p) => [p.id, p]))
    return playOrder.map((id) => byId.get(id)!).filter(Boolean)
  }, [playOrder])

  const visible = useMemo(
    () => (activeCat === "all" ? orderedPlays : orderedPlays.filter((p) => p.category === activeCat)),
    [activeCat, orderedPlays],
  )

  const featured = useMemo(() => PLAYS.find((p) => p.featured) ?? PLAYS[0], [])

  // Open the play in the interactive sandbox. The sandbox handles the actual
  // commit (it fires the approval guardrail with the merchant's edits +
  // chosen trigger). This makes "Run this play" feel like rehearsing on a
  // stage instead of dispatching a black-box action.
  const handleRunPlay = (play: PlaybookPlay) => {
    setSandboxPlay(play)
  }

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
        {/* Featured play hero — full-bleed image with overlay */}
        <FeaturedPlayHero play={featured} onRun={() => handleRunPlay(featured)} />

        {/* KPI strip */}
        <div className="rounded-2xl chidi-paper bg-[var(--card)] border border-[var(--chidi-border-default)] p-4 lg:p-5 mb-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCell label="Plays running" countTarget={totals.active} format="int" sub={`of ${PLAYS.length} total`} />
            <KpiCell label="Recovered (30d)" countTarget={totals.recoveredLast30d} format="ngn" sub="across all plays" />
            <KpiCell label="Plays run" countTarget={totals.totalRuns} format="int" sub="all-time" />
            <KpiCell label="Win rate" countTarget={totals.winRate} format="pct" sub={`${totals.totalWon} wins`} />
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto -mx-1 px-1 pb-1">
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
                Icon={CATEGORY_ICON[c]}
              />
            )
          })}
        </div>

        {/* Plays list — drag-to-reorder is enabled only when viewing All
            (reordering inside a category filter would surprise the merchant
            because the global order is what changes). */}
        {activeCat === "all" ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={visible.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {visible.map((play) => (
                  <SortablePlayCard
                    key={play.id}
                    play={play}
                    expanded={openPlayId === play.id}
                    onToggle={() => setOpenPlayId((id) => (id === play.id ? null : play.id))}
                    onOpenSandbox={() => handleRunPlay(play)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="space-y-3">
            {visible.map((play) => (
              <PlayCard
                key={play.id}
                play={play}
                expanded={openPlayId === play.id}
                onToggle={() => setOpenPlayId((id) => (id === play.id ? null : play.id))}
                onOpenSandbox={() => handleRunPlay(play)}
              />
            ))}
          </div>
        )}

        <p className="text-[11px] text-[var(--chidi-text-muted)] text-center pt-6">
          Plays are mine to run, yours to direct. Open any in the sandbox to rehearse before committing.
        </p>
      </ChidiPage>

      {/* Sandbox sheet — opens when handleRunPlay is called from the featured
          hero or any play card. Owns its own approval-guardrail commit. */}
      <PlaySandbox
        play={sandboxPlay}
        open={sandboxPlay !== null}
        onClose={() => setSandboxPlay(null)}
      />
    </div>
  )
}

// ============================================================================
// Featured play hero — image card with overlay copy + primary CTA
// ============================================================================

function FeaturedPlayHero({ play, onRun }: { play: PlaybookPlay; onRun: () => void }) {
  const recovered = play.stats.last_30d_value_recovered_ngn
  return (
    <div className="relative rounded-2xl overflow-hidden mb-4 chidi-card-lift group">
      {/* Background image */}
      <div className="absolute inset-0">
        {play.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={play.cover_image}
            alt=""
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--chidi-text-primary)] to-[#1F1B17]" />
        )}
        {/* Dark scrim for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-tr from-black/85 via-black/55 to-black/20" />
      </div>

      {/* Content */}
      <div className="relative z-[2] p-6 lg:p-8 min-h-[260px] flex flex-col justify-end text-white">
        <div className="flex items-center gap-2 mb-3">
          <ChidiMark size={16} className="text-white" />
          <p className="text-[10px] uppercase tracking-[0.18em] font-medium text-white/80">
            Play of the moment · {PLAY_CATEGORY_LABEL[play.category]}
          </p>
        </div>

        <h2 className="text-[24px] lg:text-[28px] font-serif leading-[1.1] tracking-tight mb-3 max-w-md">
          {play.title}
        </h2>

        <p className="text-[13px] lg:text-[14px] text-white/80 leading-snug max-w-lg mb-5">
          {play.outcome}
        </p>

        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={onRun}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white text-[var(--chidi-text-primary)] text-[13px] font-semibold hover:bg-white/95 transition-colors active:scale-[0.98]"
          >
            <PlayCircle className="w-4 h-4" strokeWidth={2} />
            Run this play
          </button>

          <div className="flex items-center gap-4 text-white/85">
            <Stat label="Win rate" value={`${play.stats.win_rate_pct}%`} />
            {recovered ? <Stat label="Recovered (30d)" value={formatNGN(recovered)} /> : null}
            <Stat label="Times run" value={`${play.stats.runs}`} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-white/20 pl-3">
      <p className="text-[18px] font-semibold tabular-nums leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-white/60 mt-1">{label}</p>
    </div>
  )
}

// ============================================================================
// KPI strip cell
// ============================================================================

function KpiCell({
  label,
  countTarget,
  format,
  sub,
}: {
  label: string
  countTarget: number
  format: "int" | "ngn" | "pct"
  sub: string
}) {
  const tweened = useCountUp(countTarget, 950)
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
      <p className="text-[18px] font-semibold tabular-nums text-[var(--chidi-text-primary)] leading-none">
        {display}
      </p>
      <p className="text-[11px] text-[var(--chidi-text-muted)] mt-1">{sub}</p>
    </div>
  )
}

// ============================================================================
// Filter chip
// ============================================================================

function FilterChip({
  active,
  onClick,
  label,
  count,
  Icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  Icon?: React.ElementType
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
      {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />}
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
// Play card — leading visual + body + win-rate ring; conversation preview on expand
// ============================================================================

function PlayCard({
  play,
  expanded,
  onToggle,
  onOpenSandbox,
}: {
  play: PlaybookPlay
  expanded: boolean
  onOpenSandbox?: () => void
  onToggle: () => void
}) {
  return (
    <article
      className={cn(
        "rounded-2xl chidi-paper bg-[var(--card)] border transition-all duration-200",
        play.state === "active"
          ? "border-[var(--chidi-border-default)] hover:border-[var(--chidi-text-muted)]/40"
          : "border-[var(--chidi-border-subtle)] opacity-90",
        expanded && "shadow-[0_8px_24px_-12px_rgba(55,50,47,0.18)]",
      )}
    >
      <button
        onClick={onToggle}
        className="w-full p-4 lg:p-5 flex items-stretch gap-4 text-left"
      >
        {/* Leading visual — depends on category */}
        <PlayLeadingVisual play={play} />

        {/* Body */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium">
              {PLAY_CATEGORY_LABEL[play.category]}
            </p>
            <StateBadge state={play.state} />
          </div>
          <h3 className="text-[15px] font-semibold text-[var(--chidi-text-primary)] mb-1.5">
            {play.title}
          </h3>
          <p className="text-[13px] text-[var(--chidi-text-secondary)] leading-snug">
            <span className="text-[var(--chidi-text-muted)]">When </span>
            {play.trigger}
          </p>

          {/* Inline impact metric */}
          {play.stats.last_30d_value_recovered_ngn ? (
            <p className="text-[11px] text-[var(--chidi-win)] mt-2 inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--chidi-win)]" />
              <span className="font-medium tabular-nums">
                {formatNGN(play.stats.last_30d_value_recovered_ngn)}
              </span>
              <span className="text-[var(--chidi-text-muted)]">recovered last 30 days</span>
            </p>
          ) : null}
        </div>

        {/* Win-rate ring */}
        <div className="flex-shrink-0 hidden sm:flex flex-col items-center justify-center gap-1">
          <WinRateRing percent={play.stats.win_rate_pct} />
          <p className="text-[10px] text-[var(--chidi-text-muted)] tabular-nums">
            {play.stats.runs} runs
          </p>
        </div>

        {/* Expand indicator */}
        <div className="flex-shrink-0 self-center">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-[var(--chidi-text-muted)]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[var(--chidi-text-muted)]" />
          )}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 lg:px-5 pb-5 pt-0 space-y-5">
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

          {/* Conversation preview — what Chidi actually sends */}
          {play.sample_message && <ConversationPreview message={play.sample_message} />}

          {/* Outcome */}
          <div className="flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-[var(--chidi-win)] mt-0.5 flex-shrink-0" strokeWidth={1.8} />
            <p className="text-[13px] text-[var(--chidi-text-secondary)] leading-snug">
              <span className="text-[var(--chidi-text-primary)] font-semibold">Outcome: </span>
              {play.outcome}
            </p>
          </div>

          {/* Recent runs */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium mb-2.5">
              Recent runs
            </p>
            <div className="space-y-2.5">
              {play.recent.map((run, i) => (
                <RunRow key={i} run={run} />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-3 border-t border-[var(--chidi-border-subtle)]">
            {onOpenSandbox && (
              <button
                onClick={onOpenSandbox}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold bg-[var(--chidi-text-primary)] text-[var(--background)] hover:bg-[var(--chidi-text-primary)]/90 transition-colors"
              >
                <PlayCircle className="w-3.5 h-3.5" strokeWidth={2} />
                Open in sandbox
              </button>
            )}
            <button
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
                play.state === "active"
                  ? "text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-surface)]"
                  : "text-[var(--chidi-win)] hover:bg-[var(--chidi-win)]/10",
              )}
            >
              {play.state === "active" ? (
                <>
                  <PauseCircle className="w-3.5 h-3.5" strokeWidth={1.8} />
                  Pause
                </>
              ) : (
                <>
                  <PlayCircle className="w-3.5 h-3.5" strokeWidth={1.8} />
                  Resume
                </>
              )}
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-surface)] transition-colors">
              <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.8} />
              View past runs
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

// ============================================================================
// Leading visuals — render different things depending on play category
// ============================================================================

function PlayLeadingVisual({ play }: { play: PlaybookPlay }) {
  // Inventory plays — product thumbnails stacked
  if (play.affected_product_images?.length) {
    return <ProductStack images={play.affected_product_images} />
  }
  // Routine plays — sparkline
  if (play.spark) {
    return <Sparkline data={play.spark} />
  }
  // Customer-facing plays — initial avatars stacked
  if (play.affected_customers?.length) {
    return <CustomerAvatarStack names={play.affected_customers} />
  }
  // Fallback — category icon in a box
  const Icon = CATEGORY_ICON[play.category]
  return (
    <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-[var(--chidi-surface)] flex items-center justify-center self-center">
      <Icon className="w-5 h-5 text-[var(--chidi-text-secondary)]" strokeWidth={1.6} />
    </div>
  )
}

function CustomerAvatarStack({ names }: { names: string[] }) {
  const visible = names.slice(0, 3)
  const extra = Math.max(0, names.length - visible.length)
  return (
    <div className="flex-shrink-0 self-center w-14 flex items-center">
      <div className="flex -space-x-2.5">
        {visible.map((name, i) => (
          <InitialAvatar key={name} name={name} index={i} />
        ))}
        {extra > 0 && (
          <div className="w-8 h-8 rounded-full bg-[var(--chidi-surface)] border-2 border-[var(--card)] flex items-center justify-center text-[10px] font-medium text-[var(--chidi-text-muted)] tabular-nums">
            +{extra}
          </div>
        )}
      </div>
    </div>
  )
}

const AVATAR_PALETTE = [
  { bg: "#E8C5A8", fg: "#5A3A1F" }, // warm clay
  { bg: "#C9DBC1", fg: "#2F4A2A" }, // sage
  { bg: "#F4C7C7", fg: "#6B2D2D" }, // soft rose
  { bg: "#C7D5E8", fg: "#1F3A5F" }, // dusty blue
  { bg: "#F0E0A8", fg: "#5C4A1F" }, // honey
]

function InitialAvatar({ name, index }: { name: string; index: number }) {
  const initial = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
  // Hash by name for stable palette pick across re-renders
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  const palette = AVATAR_PALETTE[(hash + index) % AVATAR_PALETTE.length]
  return (
    <div
      className="w-8 h-8 rounded-full border-2 border-[var(--card)] flex items-center justify-center text-[10px] font-semibold tabular-nums"
      style={{ backgroundColor: palette.bg, color: palette.fg }}
      title={name}
    >
      {initial}
    </div>
  )
}

function ProductStack({ images }: { images: string[] }) {
  const visible = images.slice(0, 3)
  return (
    <div className="flex-shrink-0 self-center w-14 flex items-center">
      <div className="flex -space-x-3">
        {visible.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={src}
            alt=""
            className="w-10 h-10 rounded-lg border-2 border-[var(--card)] object-cover shadow-sm"
            loading="lazy"
          />
        ))}
      </div>
    </div>
  )
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) {
    return (
      <div className="flex-shrink-0 self-center w-14 h-10 flex items-center justify-center">
        <Clock className="w-4 h-4 text-[var(--chidi-text-muted)]" strokeWidth={1.6} />
      </div>
    )
  }
  const max = Math.max(...data, 1)
  const w = 56
  const h = 32
  const step = w / (data.length - 1)
  const pts = data
    .map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 4) - 2).toFixed(1)}`)
    .join(" ")
  const lastIdx = data.length - 1
  const lastX = lastIdx * step
  const lastY = h - (data[lastIdx] / max) * (h - 4) - 2
  return (
    <div className="flex-shrink-0 self-center w-14 flex items-center">
      <svg width={w} height={h} className="overflow-visible" aria-hidden="true">
        <polyline
          points={pts}
          fill="none"
          stroke="var(--chidi-win)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={lastX} cy={lastY} r="2.5" fill="var(--chidi-win)" />
      </svg>
    </div>
  )
}

// ============================================================================
// Win-rate ring (animated SVG circle)
// ============================================================================

function WinRateRing({ percent }: { percent: number }) {
  const size = 44
  const stroke = 3.5
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = (Math.min(100, Math.max(0, percent)) / 100) * c
  const tone =
    percent >= 75
      ? "var(--chidi-win)"
      : percent >= 50
        ? "var(--chidi-text-primary)"
        : "var(--chidi-warning)"
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--chidi-border-subtle)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tone}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ transition: "stroke-dasharray 700ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[12px] font-semibold tabular-nums text-[var(--chidi-text-primary)]">
          {percent}%
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// Conversation preview — WhatsApp-style bubble of the actual sample message
// ============================================================================

function ConversationPreview({ message }: { message: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium mb-2.5">
        What I send
      </p>
      <div
        className="rounded-xl p-3 lg:p-4 border border-[var(--chidi-border-subtle)]"
        style={{
          backgroundColor: "#ECE5DD",
          backgroundImage:
            "radial-gradient(circle at 10% 20%, rgba(7,94,84,0.04) 0px, transparent 1px), radial-gradient(circle at 80% 70%, rgba(7,94,84,0.04) 0px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      >
        <div className="flex justify-end">
          <div
            className="max-w-[88%] rounded-lg rounded-tr-none px-3 py-2 shadow-sm border-l-2"
            style={{ backgroundColor: "#DCF8C6", borderLeftColor: "var(--chidi-win)" }}
          >
            <div className="flex items-center gap-1 mb-1">
              <ChidiMark size={10} variant="win" />
              <span
                className="text-[9px] uppercase tracking-wider font-medium"
                style={{ color: "var(--chidi-win)" }}
              >
                Chidi
              </span>
            </div>
            <p className="text-[13px] text-[#1C1917] leading-snug whitespace-pre-line">
              {message}
            </p>
            <p className="text-[9px] text-[#999] mt-1 text-right">just now ✓✓</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// State badge + run row
// ============================================================================

function StateBadge({ state }: { state: PlayState }) {
  const styles: Record<PlayState, string> = {
    active: "bg-[var(--chidi-win)]/10 text-[var(--chidi-win)]",
    paused: "bg-[var(--chidi-surface)] text-[var(--chidi-text-muted)]",
    draft: "bg-[var(--chidi-warning)]/10 text-[var(--chidi-warning)]",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded",
        styles[state],
      )}
    >
      {state === "active" && <span className="w-1.5 h-1.5 rounded-full bg-[var(--chidi-win)] animate-pulse" />}
      {PLAY_STATE_LABEL[state]}
    </span>
  )
}

function RunRow({ run }: { run: { ran_at: string; context: string; outcome: "won" | "lost" | "pending"; detail?: string } }) {
  const Icon = run.outcome === "won" ? CheckCircle2 : run.outcome === "lost" ? XCircle : CircleDashed
  const tone =
    run.outcome === "won"
      ? "text-[var(--chidi-win)]"
      : run.outcome === "lost"
        ? "text-[var(--chidi-text-muted)]"
        : "text-[var(--chidi-warning)]"
  // Pull a customer name out of "Name, context" if present, for the avatar
  const namePart = run.context.split(",")[0]?.trim()
  const looksLikeName = /^[A-Z][a-z]+( [A-Z][a-z'-]+)+$/.test(namePart) || /^[A-Z][a-z]+ [A-Z]\.$/.test(namePart)
  return (
    <div className="flex items-start gap-2.5 text-[13px]">
      {looksLikeName ? (
        <InitialAvatar name={namePart} index={0} />
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
    </div>
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

// ============================================================================
// SortablePlayCard — wraps PlayCard with @dnd-kit useSortable so plays can
// be drag-reordered to set merchant priority. Drag handle on the left, full
// row stays clickable. CSS transform for buttery 60fps drag.
// ============================================================================

function SortablePlayCard({
  play,
  expanded,
  onToggle,
  onOpenSandbox,
}: {
  play: PlaybookPlay
  expanded: boolean
  onToggle: () => void
  onOpenSandbox?: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: play.id,
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
    zIndex: isDragging ? 20 : "auto",
  }
  return (
    <div ref={setNodeRef} style={style} className="relative group/sort">
      {/* Drag handle — appears on hover, large invisible touch target */}
      <button
        {...attributes}
        {...listeners}
        aria-label="Reorder play"
        className={cn(
          "absolute left-1 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-md text-[var(--chidi-text-muted)]",
          "opacity-0 group-hover/sort:opacity-100 hover:bg-[var(--chidi-surface)] active:cursor-grabbing cursor-grab transition-opacity",
          isDragging && "opacity-100",
        )}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <PlayCard play={play} expanded={expanded} onToggle={onToggle} onOpenSandbox={onOpenSandbox} />
    </div>
  )
}
