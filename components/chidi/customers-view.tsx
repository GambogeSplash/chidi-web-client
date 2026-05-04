"use client"

/**
 * CustomersView — the main people surface.
 *
 * Composition:
 *   1. Snapshot strip — total / new this month / repeat rate / avg LTV
 *      All counts tween from 0 via useCountUp; respects reduced-motion.
 *   2. Segment chip strip + sort dropdown + "Send broadcast" CTA
 *   3. Customer table — avatar, name, channel chips, total spend, last order,
 *      "Open conversation" jumps to inbox via a window-level event the
 *      DashboardContent already listens for.
 *   4. Recent broadcasts — last 3 records from localStorage outbox.
 *
 * Channel-agnostic: every customer row shows the channels they're reachable
 * on (Telegram, WhatsApp, or both). The composer treats both as first-class.
 */

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  Pin,
  PinOff,
  Send,
  Sparkles,
} from "lucide-react"
import {
  getPinned as getPinnedCustomers,
  togglePin as toggleCustomerPin,
  unpin as unpinCustomer,
  subscribe as subscribePinnedCustomers,
  MAX_PINNED_CUSTOMERS,
} from "@/lib/chidi/customers-pinned"
import { hapticSoft } from "@/lib/chidi/haptics"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChidiPage, ChidiCard } from "./page-shell"
import { CustomerCharacter } from "./customer-character"
import { CustomerSegmentPicker } from "./customer-segment-picker"
import { BroadcastComposer } from "./broadcast-composer"
import { EmptyState } from "./empty-state"
import { CurrencyAmount } from "./currency-amount"
import { WhatsAppIcon, TelegramIcon } from "@/components/ui/channel-icons"
import { cn } from "@/lib/utils"
import { useCustomers } from "@/lib/hooks/use-analytics"
import { useCountUp } from "@/lib/chidi/use-count-up"
import { formatRelativeTime } from "@/lib/api/analytics"
import {
  applySegment,
  expandMultiChannel,
  getSegments,
  getSegmentById,
  sortCustomers,
  SORT_OPTIONS,
  type Segment,
  type SegmentId,
  type SortKey,
} from "@/lib/chidi/segments"
import {
  listBroadcasts,
  type BroadcastRecord,
} from "@/lib/chidi/broadcasts"
import type { CustomerSummary } from "@/lib/types/analytics"

const VALID_SEGMENTS: SegmentId[] = [
  "all",
  "vip",
  "new",
  "repeat",
  "churned",
  "channel-whatsapp",
  "channel-telegram",
  "channel-both",
]
const VALID_SORTS: SortKey[] = ["recent", "spend", "name"]

export function CustomersView() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params?.slug as string | undefined

  // Active segment + sort live in the URL so deep-links land correctly.
  const initialSegment = (() => {
    const raw = searchParams?.get("segment") as SegmentId | null
    return raw && VALID_SEGMENTS.includes(raw) ? raw : "all"
  })()
  const initialSort = (() => {
    const raw = searchParams?.get("sort") as SortKey | null
    return raw && VALID_SORTS.includes(raw) ? raw : "recent"
  })()

  const [active, setActive] = useState<SegmentId>(initialSegment)
  const [sortKey, setSortKey] = useState<SortKey>(initialSort)

  const { data, isLoading } = useCustomers(undefined, "total_spent", 200)

  // Widen channel ownership deterministically so "Both channels" isn't always
  // empty against the seed data. Pure derivation — see segments.ts comment.
  const customers = useMemo(
    () => expandMultiChannel(data?.customers ?? []),
    [data?.customers],
  )

  const segments = useMemo(() => getSegments(customers), [customers])
  const activeSegment = useMemo(
    () => getSegmentById(customers, active),
    [customers, active],
  )

  const filtered = useMemo(
    () => sortCustomers(applySegment(customers, active), sortKey),
    [customers, active, sortKey],
  )

  // Pinned customers — newest pin first. Subscribe to the store so the
  // strip and per-row glyphs stay in sync after a pin/unpin from any row.
  // Pinning is a focus tool, not a segment bypass: we intersect against
  // the active segment so a pinned VIP doesn't crash into the "Churned"
  // view when the merchant filters there.
  const [pinnedPhones, setPinnedPhones] = useState<string[]>([])
  useEffect(() => {
    setPinnedPhones(getPinnedCustomers())
    return subscribePinnedCustomers((phones) => setPinnedPhones(phones))
  }, [])
  const pinnedSet = useMemo(() => new Set(pinnedPhones), [pinnedPhones])
  const pinnedCustomers = useMemo(() => {
    if (pinnedPhones.length === 0) return [] as CustomerSummary[]
    const byPhone = new Map(filtered.map((c) => [c.phone, c]))
    const out: CustomerSummary[] = []
    for (const phone of pinnedPhones) {
      const c = byPhone.get(phone)
      if (c) out.push(c)
    }
    return out
  }, [filtered, pinnedPhones])
  const unpinnedCustomers = useMemo(
    () => (pinnedCustomers.length > 0 ? filtered.filter((c) => !pinnedSet.has(c.phone)) : filtered),
    [filtered, pinnedCustomers.length, pinnedSet],
  )

  const handleTogglePinCustomer = (phone: string) => {
    toggleCustomerPin(phone)
    hapticSoft()
  }
  const handleUnpinCustomer = (phone: string) => {
    unpinCustomer(phone)
    hapticSoft()
  }

  // Snapshot KPIs — these are derived from the unfiltered list so the
  // numbers don't change when the merchant narrows the segment.
  const snapshot = useMemo(() => buildSnapshot(customers), [customers])

  // Persist active segment + sort to the URL — replace, no scroll, no history
  // bloat. Skip on first mount to avoid clobbering the initial param.
  const firstWriteSkip = useFirstMountSkip()
  useEffect(() => {
    if (firstWriteSkip()) return
    const params = new URLSearchParams(searchParams?.toString() ?? "")
    if (active === "all") params.delete("segment")
    else params.set("segment", active)
    if (sortKey === "recent") params.delete("sort")
    else params.set("sort", sortKey)
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : "?", { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, sortKey])

  // Broadcast composer state
  const [composerSegment, setComposerSegment] = useState<Segment | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const composerAudience = useMemo(
    () => (composerSegment ? applySegment(customers, composerSegment.id) : []),
    [customers, composerSegment],
  )

  const openComposer = (seg: Segment) => {
    setComposerSegment(seg)
    setComposerOpen(true)
  }

  // Recent broadcasts — read once on mount + listen for queue events so the
  // strip refreshes after a successful send without a full page reload.
  const [broadcasts, setBroadcasts] = useState<BroadcastRecord[]>([])
  useEffect(() => {
    setBroadcasts(listBroadcasts())
    const refresh = () => setBroadcasts(listBroadcasts())
    if (typeof window !== "undefined") {
      window.addEventListener("chidi:broadcasts-changed", refresh)
      window.addEventListener("storage", refresh)
      return () => {
        window.removeEventListener("chidi:broadcasts-changed", refresh)
        window.removeEventListener("storage", refresh)
      }
    }
  }, [])

  const handleOpenConversation = (customer: CustomerSummary) => {
    if (typeof window === "undefined" || !slug) return
    // Ask the dashboard's listener to swap to the inbox tab. The dashboard's
    // page state owns the active conversation; we just hop tabs and let the
    // inbox surface its existing search/filters. Customer phone passes
    // through the URL as a lightweight intent so a future inbox can deep-link.
    router.push(`/dashboard/${slug}?tab=inbox&customer=${encodeURIComponent(customer.phone)}`)
  }

  return (
    <div className="flex flex-col h-full">
      <ChidiPage
        title="Customers"
        subtitle="Everyone you've sold to."
        width="wide"
        actions={
          customers.length > 0 ? (
            <button
              type="button"
              onClick={() => openComposer(activeSegment)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[13px] font-semibold bg-[var(--chidi-text-primary)] text-[var(--background)] hover:bg-[var(--chidi-text-primary)]/90 transition-colors"
            >
              <Send className="w-3.5 h-3.5" strokeWidth={2.2} />
              Send broadcast
            </button>
          ) : null
        }
      >
        {customers.length === 0 && !isLoading ? (
          <EmptyState
            art="inbox"
            title="No customers yet."
            description="Once someone messages you on WhatsApp or Telegram, they'll show up here. You can then segment them and send broadcasts."
          />
        ) : (
          <>
            {/* Snapshot strip */}
            <SnapshotStrip
              total={snapshot.total}
              newThisMonth={snapshot.newThisMonth}
              repeatRate={snapshot.repeatRate}
              avgLtv={snapshot.avgLtv}
            />

            {/* Segment chip strip + sort + count */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-0">
                <CustomerSegmentPicker
                  segments={segments}
                  active={active}
                  onChange={setActive}
                  onBroadcast={openComposer}
                />
              </div>
              <SortDropdown value={sortKey} onChange={setSortKey} />
            </div>

            {/* Result count caption */}
            <p className="mt-3 text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice">
              Showing {filtered.length.toLocaleString()} of {customers.length.toLocaleString()} —{" "}
              <span className="text-[var(--chidi-text-secondary)]">{activeSegment.hint}</span>
            </p>

            {/* Customer table — Pinned customers render in their own
                section above the main list (when any survive the active
                segment), so the merchant always finds their tier-A people
                first regardless of sort or filter. */}
            <CustomerTable
              pinnedCustomers={pinnedCustomers}
              customers={unpinnedCustomers}
              totalCount={filtered.length}
              isLoading={isLoading}
              onOpenConversation={handleOpenConversation}
              onTogglePin={handleTogglePinCustomer}
              onUnpin={handleUnpinCustomer}
            />

            {/* Recent broadcasts */}
            {broadcasts.length > 0 && (
              <RecentBroadcasts broadcasts={broadcasts.slice(0, 3)} />
            )}
          </>
        )}
      </ChidiPage>

      {/* Composer — Dialog auto-converts to bottom sheet on mobile via the
          existing Dialog primitive's responsive variant. */}
      {composerSegment && (
        <BroadcastComposer
          open={composerOpen}
          onOpenChange={(o) => {
            setComposerOpen(o)
            if (!o) setComposerSegment(null)
          }}
          segment={composerSegment}
          audience={composerAudience}
          onQueued={() => setBroadcasts(listBroadcasts())}
        />
      )}
    </div>
  )
}

// =============================================================================
// Snapshot strip
// =============================================================================

function SnapshotStrip({
  total,
  newThisMonth,
  repeatRate,
  avgLtv,
}: {
  total: number
  newThisMonth: number
  repeatRate: number
  avgLtv: number
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
      <KpiCard label="Total customers" value={Math.round(useCountUp(total))} format="int" />
      <KpiCard
        label="New this month"
        value={Math.round(useCountUp(newThisMonth))}
        format="int"
      />
      <KpiCard
        label="Repeat rate"
        value={Math.round(useCountUp(repeatRate))}
        format="pct"
      />
      <KpiCard label="Avg LTV" value={Math.round(useCountUp(avgLtv))} format="ngn" />
    </div>
  )
}

function KpiCard({
  label,
  value,
  format,
}: {
  label: string
  value: number
  format: "int" | "pct" | "ngn"
}) {
  return (
    <ChidiCard className="p-3.5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold">
        {label}
      </p>
      <div className="mt-1 text-[20px] font-semibold tabular-nums text-[var(--chidi-text-primary)]">
        {format === "int" && value.toLocaleString()}
        {format === "pct" && `${value}%`}
        {format === "ngn" && (
          <CurrencyAmount amount={value} currency="NGN" compact showDualHover={false} />
        )}
      </div>
    </ChidiCard>
  )
}

// =============================================================================
// Sort dropdown
// =============================================================================

function SortDropdown({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  const current = SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--chidi-border-default)] bg-[var(--card)] text-[12px] text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:border-[var(--chidi-text-muted)] transition-colors font-chidi-voice"
        >
          <ArrowUpDown className="w-3 h-3" strokeWidth={1.8} />
          <span>{current.label}</span>
          <ChevronDown className="w-3 h-3 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-[var(--card)]">
        {SORT_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onSelect={() => onChange(opt.value)}
            className={cn(
              "text-[13px] font-chidi-voice cursor-pointer",
              opt.value === value && "bg-[var(--chidi-surface)] text-[var(--chidi-text-primary)] font-medium",
            )}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// =============================================================================
// Customer table
// =============================================================================

function CustomerTable({
  pinnedCustomers,
  customers,
  totalCount,
  isLoading,
  onOpenConversation,
  onTogglePin,
  onUnpin,
}: {
  pinnedCustomers: CustomerSummary[]
  customers: CustomerSummary[]
  totalCount: number
  isLoading: boolean
  onOpenConversation: (c: CustomerSummary) => void
  onTogglePin: (phone: string) => void
  onUnpin: (phone: string) => void
}) {
  if (isLoading && totalCount === 0) {
    return <TableSkeleton />
  }

  if (totalCount === 0) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-[var(--chidi-border-default)] py-12 text-center">
        <p className="text-[13px] text-[var(--chidi-text-secondary)] font-chidi-voice">
          No customers in this segment yet.
        </p>
        <p className="text-[11px] text-[var(--chidi-text-muted)] mt-1">
          Try a different chip — or wait for more activity.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-3">
      {/* Pinned section — sits above the main table when any pinned
          customers survive the active segment. Same chrome as the main
          table so the merchant reads it as "first row of the same
          surface", with a slight bg tint per row for distinction. */}
      {pinnedCustomers.length > 0 && (
        <section
          className="rounded-xl border border-[var(--chidi-border-default)] bg-[var(--card)] overflow-hidden shadow-card"
          aria-label={`Pinned customers (${pinnedCustomers.length})`}
        >
          <div className="px-4 py-2 border-b border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface)]/50 flex items-baseline justify-between">
            <p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[var(--chidi-text-muted)] inline-flex items-center gap-1.5">
              <Pin className="w-3 h-3 fill-current text-[var(--chidi-text-secondary)]" strokeWidth={1.8} />
              Pinned
              <span className="tabular-nums opacity-70">
                {pinnedCustomers.length}
                {pinnedCustomers.length >= MAX_PINNED_CUSTOMERS && ` / ${MAX_PINNED_CUSTOMERS}`}
              </span>
            </p>
          </div>
          <ul role="list" className="divide-y divide-[var(--chidi-border-subtle)]">
            {pinnedCustomers.map((c) => (
              <CustomerRow
                key={c.phone}
                customer={c}
                pinned
                onOpenConversation={onOpenConversation}
                onTogglePin={onTogglePin}
                onUnpin={onUnpin}
              />
            ))}
          </ul>
        </section>
      )}

      {/* Main table — only shows the unpinned slice when pins are present
          (otherwise it shows the entire filtered set). Hidden when every
          customer in the segment is pinned (rare, but keeps the surface
          tidy). */}
      {customers.length > 0 && (
        <div className="rounded-xl border border-[var(--chidi-border-default)] bg-[var(--card)] overflow-hidden shadow-card">
          {/* Header — desktop only. On mobile we collapse to a stacked row. */}
          <div className="hidden lg:grid grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.4fr)] items-center gap-3 px-4 py-2 border-b border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface)]/50 text-[10px] uppercase tracking-[0.14em] font-semibold text-[var(--chidi-text-muted)]">
            <span>Customer</span>
            <span>Channels</span>
            <span className="text-right">Total spend</span>
            <span>Last order</span>
            <span className="text-right">Action</span>
          </div>
          <ul role="list" className="divide-y divide-[var(--chidi-border-subtle)]">
            {customers.map((c) => (
              <CustomerRow
                key={c.phone}
                customer={c}
                pinned={false}
                onOpenConversation={onOpenConversation}
                onTogglePin={onTogglePin}
                onUnpin={onUnpin}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * Row primitive — used for both the Pinned section and the main table.
 * The whole row navigates to the conversation on click; only the
 * pin/unpin button stops propagation so the merchant can pin without
 * being yanked into the chat surface.
 */
function CustomerRow({
  customer,
  pinned,
  onOpenConversation,
  onTogglePin,
  onUnpin,
}: {
  customer: CustomerSummary
  pinned: boolean
  onOpenConversation: (c: CustomerSummary) => void
  onTogglePin: (phone: string) => void
  onUnpin: (phone: string) => void
}) {
  const c = customer
  return (
    <li
      onClick={() => onOpenConversation(c)}
      className={cn(
        "grid grid-cols-[1fr_auto] lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.4fr)] items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--chidi-surface)]/50 motion-safe:transition-colors focus:outline-none focus-visible:bg-[var(--chidi-surface)]/50 group",
        pinned && "bg-[var(--chidi-surface)]/40",
      )}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpenConversation(c)
        }
      }}
      role="button"
      aria-label={`Open conversation with ${c.name || c.phone}`}
    >
      {/* Customer name + avatar — full width on mobile */}
      <div className="flex items-center gap-3 min-w-0 col-span-2 lg:col-span-1">
        <CustomerCharacter
          name={c.name}
          fallbackId={c.phone}
          size="md"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {pinned && (
              <Pin
                className="w-3 h-3 text-[var(--chidi-text-secondary)] flex-shrink-0 fill-current"
                strokeWidth={1.8}
                aria-label="Pinned"
              />
            )}
            <p className="text-[13.5px] font-medium text-[var(--chidi-text-primary)] truncate">
              {c.name || c.phone}
            </p>
          </div>
          <p className="text-[11px] text-[var(--chidi-text-muted)] font-mono truncate">
            {c.phone}
          </p>
        </div>
      </div>

      {/* Channels */}
      <div className="hidden lg:block">
        <ChannelChips channels={c.channels} />
      </div>

      {/* Spend — desktop right-aligned, mobile inline below name */}
      <div className="hidden lg:block text-right">
        {c.total_spent > 0 ? (
          <CurrencyAmount
            amount={c.total_spent}
            currency="NGN"
            className="text-[13px] tabular-nums text-[var(--chidi-text-primary)]"
            showDualHover={false}
          />
        ) : (
          <span className="text-[12px] text-[var(--chidi-text-muted)]">—</span>
        )}
      </div>

      {/* Last order */}
      <div className="hidden lg:block">
        <span className="text-[12px] text-[var(--chidi-text-secondary)] font-chidi-voice">
          {c.last_order ? formatRelativeTime(c.last_order) : "Never"}
        </span>
      </div>

      {/* Action — desktop only. Pin/unpin button is hover-revealed and
          sits before the conversation CTA. stopPropagation keeps the
          row's navigate-on-click behavior from firing. */}
      <div className="hidden lg:flex justify-end items-center gap-1">
        {pinned ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onUnpin(c.phone) }}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 motion-safe:transition-opacity inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)]"
            aria-label={`Unpin ${c.name || c.phone}`}
            title="Unpin"
          >
            <PinOff className="w-3.5 h-3.5" strokeWidth={1.8} />
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onTogglePin(c.phone) }}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 motion-safe:transition-opacity inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)]"
            aria-label={`Pin ${c.name || c.phone}`}
            title="Pin to top"
          >
            <Pin className="w-3.5 h-3.5" strokeWidth={1.8} />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenConversation(c) }}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] motion-safe:transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.8} />
          Open conversation
          <ChevronRight className="w-3 h-3 opacity-70" />
        </button>
      </div>

      {/* Mobile: combined meta row + tap-to-open. The whole strip below
          opens the conversation; for pinned rows on mobile, the unpin
          control sits as a sibling button next to it (NOT nested inside)
          so the markup stays valid HTML and tap targets don't conflict. */}
      <div className="lg:hidden col-span-2 -mx-4 -mb-3 px-4 pb-3 pt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenConversation(c) }}
          aria-label={`Open conversation with ${c.name || c.phone}`}
          className="flex-1 flex items-center gap-3 text-left min-w-0"
        >
          <ChannelChips channels={c.channels} compact />
          {c.total_spent > 0 && (
            <CurrencyAmount
              amount={c.total_spent}
              currency="NGN"
              compact
              className="text-[12px] tabular-nums text-[var(--chidi-text-primary)] ml-auto"
              showDualHover={false}
            />
          )}
          <span className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice">
            {c.last_order ? formatRelativeTime(c.last_order) : "Never"}
          </span>
        </button>
        {pinned ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onUnpin(c.phone) }}
            className="inline-flex items-center justify-center w-9 h-9 rounded-md text-[var(--chidi-text-muted)] flex-shrink-0 hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] motion-safe:active:scale-[0.95]"
            aria-label={`Unpin ${c.name || c.phone}`}
            title="Unpin"
          >
            <PinOff className="w-3.5 h-3.5" strokeWidth={1.8} />
          </button>
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-[var(--chidi-text-muted)] flex-shrink-0" />
        )}
      </div>
    </li>
  )
}

function TableSkeleton() {
  return (
    <div className="mt-3 rounded-xl border border-[var(--chidi-border-default)] bg-[var(--card)] overflow-hidden divide-y divide-[var(--chidi-border-subtle)]">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--chidi-surface)] motion-safe:animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div
              className="h-3 rounded bg-[var(--chidi-surface)] motion-safe:animate-pulse"
              style={{ width: `${52 + (i % 3) * 12}%` }}
            />
            <div
              className="h-2.5 rounded bg-[var(--chidi-surface)] motion-safe:animate-pulse"
              style={{ width: `${30 + (i % 2) * 16}%` }}
            />
          </div>
          <div className="hidden lg:block h-3 w-24 rounded bg-[var(--chidi-surface)] motion-safe:animate-pulse" />
          <div className="hidden lg:block h-3 w-16 rounded bg-[var(--chidi-surface)] motion-safe:animate-pulse" />
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// Channel chips
// =============================================================================

function ChannelChips({ channels, compact = false }: { channels: string[]; compact?: boolean }) {
  const set = new Set((channels ?? []).map((c) => c.toUpperCase()))
  const showWhatsApp = set.has("WHATSAPP")
  const showTelegram = set.has("TELEGRAM")
  if (!showWhatsApp && !showTelegram) {
    return <span className="text-[11px] text-[var(--chidi-text-muted)]">—</span>
  }
  return (
    <span className="inline-flex items-center gap-1">
      {showWhatsApp && (
        <ChannelPill kind="WHATSAPP" compact={compact} />
      )}
      {showTelegram && (
        <ChannelPill kind="TELEGRAM" compact={compact} />
      )}
    </span>
  )
}

function ChannelPill({ kind, compact }: { kind: "WHATSAPP" | "TELEGRAM"; compact?: boolean }) {
  const Icon = kind === "WHATSAPP" ? WhatsAppIcon : TelegramIcon
  const label = kind === "WHATSAPP" ? "WhatsApp" : "Telegram"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-[var(--chidi-surface)] text-[var(--chidi-text-secondary)]",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
      )}
      title={label}
    >
      <Icon size={compact ? 10 : 11} className="text-[var(--chidi-text-muted)]" />
      {!compact && <span>{label}</span>}
    </span>
  )
}

// =============================================================================
// Recent broadcasts strip
// =============================================================================

function RecentBroadcasts({ broadcasts }: { broadcasts: BroadcastRecord[] }) {
  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold">
          Recent broadcasts
        </p>
        <Sparkles className="w-3 h-3 text-[var(--chidi-text-muted)]" strokeWidth={1.8} />
      </div>
      <div className="space-y-2">
        {broadcasts.map((b) => (
          <div
            key={b.id}
            className="rounded-xl border border-[var(--chidi-border-subtle)] bg-[var(--card)] px-3.5 py-2.5"
          >
            <div className="flex items-center gap-3">
              <StatusDot status={b.status} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[var(--chidi-text-primary)] truncate">
                  {b.message.split("\n")[0]}
                </p>
                <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice truncate">
                  {describeStatus(b)} · {b.segmentLabel} · {b.audienceCount.toLocaleString()}{" "}
                  {b.audienceCount === 1 ? "person" : "people"} · {formatChannelTargets(b.channelTargets)}
                </p>
              </div>
              <span className="flex-shrink-0 text-[10px] tabular-nums text-[var(--chidi-text-muted)]">
                {formatRelativeTime(b.scheduledFor)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function StatusDot({ status }: { status: BroadcastRecord["status"] }) {
  const tone =
    status === "scheduled"
      ? "bg-[var(--chidi-warning)]"
      : status === "sent"
      ? "bg-[var(--chidi-text-muted)]"
      : "bg-[var(--chidi-win)]"
  return <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", tone)} aria-hidden />
}

function describeStatus(b: BroadcastRecord): string {
  if (b.status === "scheduled") return "Scheduled"
  if (b.status === "sent") return "Sent"
  return "Queued"
}

function formatChannelTargets(targets: string[]): string {
  const set = new Set(targets.map((t) => t.toUpperCase()))
  if (set.has("WHATSAPP") && set.has("TELEGRAM")) return "WhatsApp + Telegram"
  if (set.has("TELEGRAM")) return "Telegram"
  return "WhatsApp"
}

// =============================================================================
// Helpers
// =============================================================================

function buildSnapshot(customers: CustomerSummary[]) {
  const total = customers.length
  const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000
  const now = Date.now()
  const newThisMonth = customers.filter((c) => {
    if (!c.first_order) return false
    const t = new Date(c.first_order).getTime()
    return Number.isFinite(t) && now - t < ONE_MONTH_MS
  }).length
  const buyers = customers.filter((c) => (c.order_count ?? 0) > 0)
  const repeaters = buyers.filter((c) => (c.order_count ?? 0) >= 2).length
  const repeatRate = buyers.length > 0 ? Math.round((repeaters / buyers.length) * 100) : 0
  const totalSpend = buyers.reduce((s, c) => s + (c.total_spent || 0), 0)
  const avgLtv = buyers.length > 0 ? Math.round(totalSpend / buyers.length) : 0
  return { total, newThisMonth, repeatRate, avgLtv }
}

/**
 * Returns a function that returns true on the first call (so callers can
 * skip the initial-mount effect when persisting state to the URL).
 */
function useFirstMountSkip() {
  const ref = useState({ first: true })[0]
  return () => {
    if (ref.first) {
      ref.first = false
      return true
    }
    return false
  }
}
