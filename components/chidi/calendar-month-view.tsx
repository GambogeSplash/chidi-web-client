"use client"

/**
 * CalendarMonthView — full month grid surfaced from the Calendar Peek footer.
 *
 * Standard Sun-Sat month grid. Each day cell shows up to three event dots
 * (delivery / broadcast / follow-up). Click a day to expand an inline drawer
 * below the grid with that day's items + a quick "Add follow-up" form.
 *
 * Reads from the SAME aggregator as Calendar Peek (lib/chidi/calendar-events)
 * so any new follow-ups created here flow through the same `chidi:follow-ups`
 * localStorage and emit `chidi:follow-ups-changed` for downstream listeners.
 *
 * Keyboard:
 *   ←/→/↑/↓ — navigate days
 *   Enter   — open the focused day in the drawer
 *   Esc     — close the drawer (handled at the parent Sheet level too)
 *
 * Honors prefers-reduced-motion — collapses entrance animations to instant.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Package,
  Plus,
  CalendarCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useOrders } from "@/lib/hooks/use-orders"
import {
  addFollowUp,
  formatTime,
  getTodaysItems,
  subscribe as subscribeFollowUps,
  type TodaysItems,
} from "@/lib/chidi/calendar-events"

// --- Local helpers ----------------------------------------------------------

function startOfMonth(d: Date): Date {
  const x = new Date(d)
  x.setDate(1)
  x.setHours(0, 0, 0, 0)
  return x
}
function addMonths(d: Date, n: number): Date {
  const x = new Date(d)
  x.setMonth(x.getMonth() + n)
  return x
}
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
function fmtMonthYear(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" })
}
function fmtDayHeadline(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  })
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"]

interface DayCellData {
  date: Date
  inMonth: boolean
  isToday: boolean
  items: TodaysItems
}

interface CalendarMonthViewProps {
  /** Called with a route the parent should push then close the sheet. */
  onNavigate?: (href: string) => void
}

export function CalendarMonthView({ onNavigate }: CalendarMonthViewProps) {
  const router = useRouter()
  const params = useParams()
  const slug = params?.slug as string | undefined
  const { data: ordersData } = useOrders(undefined)
  const orders = useMemo(() => ordersData?.orders ?? [], [ordersData])

  const today = useMemo(() => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t
  }, [])

  const [cursor, setCursor] = useState<Date>(() => startOfMonth(today))
  const [selected, setSelected] = useState<Date>(today)
  // Drives a re-aggregation of follow-ups/broadcasts when localStorage moves.
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    window.addEventListener("chidi:follow-ups-changed", bump)
    window.addEventListener("chidi:broadcasts-changed", bump)
    const unsub = subscribeFollowUps(() => bump())
    return () => {
      window.removeEventListener("chidi:follow-ups-changed", bump)
      window.removeEventListener("chidi:broadcasts-changed", bump)
      unsub()
    }
  }, [])

  // Build the visible grid: 6 weeks, Sun-Sat, padded with prev/next month.
  const cells = useMemo<DayCellData[]>(() => {
    const first = startOfMonth(cursor)
    const startOffset = first.getDay() // 0..6, Sun-anchored
    const gridStart = new Date(first)
    gridStart.setDate(first.getDate() - startOffset)
    const out: DayCellData[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart)
      d.setDate(gridStart.getDate() + i)
      d.setHours(0, 0, 0, 0)
      const items = getTodaysItems(orders, d)
      out.push({
        date: d,
        inMonth: d.getMonth() === cursor.getMonth(),
        isToday: isSameDay(d, today),
        items,
      })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, orders, today, tick])

  const selectedItems = useMemo(
    () => getTodaysItems(orders, selected),
    [orders, selected, tick], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const goPrev = useCallback(() => setCursor((c) => addMonths(c, -1)), [])
  const goNext = useCallback(() => setCursor((c) => addMonths(c, 1)), [])
  const goToday = useCallback(() => {
    setCursor(startOfMonth(today))
    setSelected(today)
  }, [today])

  // ---- Keyboard nav across days -----------------------------------------
  const gridRef = useRef<HTMLDivElement>(null)
  const handleGridKey = (e: React.KeyboardEvent) => {
    let delta = 0
    if (e.key === "ArrowLeft") delta = -1
    else if (e.key === "ArrowRight") delta = 1
    else if (e.key === "ArrowUp") delta = -7
    else if (e.key === "ArrowDown") delta = 7
    else if (e.key === "Enter") {
      e.preventDefault()
      // Drawer already binds to selected; nothing else to do.
      return
    } else {
      return
    }
    e.preventDefault()
    const next = new Date(selected)
    next.setDate(next.getDate() + delta)
    setSelected(next)
    if (next.getMonth() !== cursor.getMonth()) {
      setCursor(startOfMonth(next))
    }
  }

  // ---- Navigation handlers (route → close sheet) ------------------------
  const navigate = useCallback(
    (href: string) => {
      if (onNavigate) onNavigate(href)
      else router.push(href)
    },
    [onNavigate, router],
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 lg:px-6 pt-3 pb-3 border-b border-[var(--chidi-border-subtle)]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous month"
            className="p-1.5 rounded-md text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next month"
            className="p-1.5 rounded-md text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <h3 className="ml-2 text-[14px] font-semibold font-chidi-voice text-[var(--chidi-text-primary)] tabular-nums">
            {fmtMonthYear(cursor)}
          </h3>
        </div>
        <button
          type="button"
          onClick={goToday}
          className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-[var(--chidi-surface)] hover:bg-[var(--chidi-surface)]/70 text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] transition-colors"
        >
          Today
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 px-3 lg:px-4 pt-3 pb-1.5">
        {WEEKDAY_LABELS.map((w, i) => (
          <div
            key={i}
            className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold text-center"
          >
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div
        ref={gridRef}
        role="grid"
        tabIndex={0}
        onKeyDown={handleGridKey}
        aria-label={`${fmtMonthYear(cursor)} calendar`}
        className="grid grid-cols-7 gap-1 px-3 lg:px-4 pb-3 chidi-cal-grid-in focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-text-primary)]/30 rounded-md"
      >
        {cells.map((cell) => (
          <DayCell
            key={cell.date.toISOString()}
            cell={cell}
            isSelected={isSameDay(cell.date, selected)}
            onSelect={(d) => {
              setSelected(d)
              if (d.getMonth() !== cursor.getMonth()) setCursor(startOfMonth(d))
            }}
          />
        ))}
      </div>

      {/* Inline drawer for the selected day */}
      <div className="border-t border-[var(--chidi-border-subtle)] flex-1 min-h-0 overflow-y-auto chidi-cal-drawer-in">
        <DayDrawer
          date={selected}
          items={selectedItems}
          onOpenOrder={(orderId) =>
            slug && navigate(`/dashboard/${slug}?tab=orders&order=${orderId}`)
          }
          onOpenInbox={(customerId) =>
            slug &&
            navigate(
              customerId
                ? `/dashboard/${slug}?tab=inbox&conversation=${customerId}`
                : `/dashboard/${slug}?tab=inbox`,
            )
          }
        />
      </div>
    </div>
  )
}

// =============================================================================
// Day cell
// =============================================================================

interface DayCellProps {
  cell: DayCellData
  isSelected: boolean
  onSelect: (d: Date) => void
}

function DayCell({ cell, isSelected, onSelect }: DayCellProps) {
  const { date, inMonth, isToday, items } = cell
  const total = items.total
  const dot = (count: number, color: string, label: string) =>
    count > 0 && (
      <span
        title={`${count} ${label}${count === 1 ? "" : "s"}`}
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
    )

  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      title={total > 0 ? `${total} thing${total === 1 ? "" : "s"} on ${fmtDayHeadline(date)}` : fmtDayHeadline(date)}
      aria-pressed={isSelected}
      aria-label={`${fmtDayHeadline(date)}${total > 0 ? `, ${total} item${total === 1 ? "" : "s"}` : ""}`}
      className={cn(
        "group relative aspect-square min-h-[44px] flex flex-col items-center justify-start py-1.5 px-1 rounded-md transition-colors text-left",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-text-primary)]/40",
        inMonth
          ? "text-[var(--chidi-text-primary)]"
          : "text-[var(--chidi-text-muted)]/50",
        isSelected && !isToday && "bg-[var(--chidi-surface)]",
        !isSelected && "hover:bg-[var(--chidi-surface)]/60",
        isToday && "ring-2 ring-[var(--chidi-win)] bg-[var(--chidi-win-soft)]/40",
      )}
    >
      <span
        className={cn(
          "text-[12px] tabular-nums font-medium leading-none",
          isToday && "text-[var(--chidi-win-foreground)] font-semibold",
        )}
      >
        {date.getDate()}
      </span>
      {/* Up to three dots: blue (delivery), green (broadcast), warning (follow-up) */}
      <span className="mt-1 flex items-center gap-0.5">
        {dot(items.deliveries.length, "var(--chidi-info, #5b8def)", "delivery")}
        {dot(items.broadcasts.length, "var(--chidi-win, #2bb673)", "broadcast")}
        {dot(items.followUps.length, "var(--chidi-warn, #f5b856)", "follow-up")}
      </span>
    </button>
  )
}

// =============================================================================
// Day drawer (selected-day items + add follow-up)
// =============================================================================

interface DayDrawerProps {
  date: Date
  items: TodaysItems
  onOpenOrder: (id: string) => void
  onOpenInbox: (customerId?: string) => void
}

function DayDrawer({ date, items, onOpenOrder, onOpenInbox }: DayDrawerProps) {
  const [showForm, setShowForm] = useState(false)
  const total = items.total

  return (
    <div className="px-5 lg:px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold mb-0.5">
            Day
          </p>
          <h4 className="text-[14px] font-semibold font-chidi-voice text-[var(--chidi-text-primary)] leading-snug">
            {fmtDayHeadline(date)}
          </h4>
          <p className="text-[11px] text-[var(--chidi-text-muted)] mt-0.5">
            {total === 0 ? "Nothing scheduled." : `${total} thing${total === 1 ? "" : "s"} on this day.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1 text-[11.5px] font-medium px-2.5 py-1.5 rounded-md bg-[var(--chidi-text-primary)] text-[var(--background)] hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3 h-3" strokeWidth={2.4} />
          {showForm ? "Cancel" : "Add event"}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--chidi-surface)]/60 border border-[var(--chidi-border-subtle)]">
          <AddFollowUpForm
            date={date}
            onCreated={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {total === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center text-center py-6 gap-2 text-[var(--chidi-text-muted)]">
          <CalendarCheck className="w-5 h-5" strokeWidth={1.5} />
          <p className="text-[12px] font-chidi-voice">A clean slate.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <Section title="Deliveries" icon={Package}>
            {items.deliveries.length === 0 ? (
              <Empty>Nothing scheduled.</Empty>
            ) : (
              items.deliveries.map((d) => (
                <Row
                  key={d.id}
                  time={formatTime(d.at)}
                  title={d.title}
                  onClick={() => onOpenOrder(d.id)}
                />
              ))
            )}
          </Section>
          <Section title="Broadcasts" icon={MessageSquare}>
            {items.broadcasts.length === 0 ? (
              <Empty>Nothing scheduled.</Empty>
            ) : (
              items.broadcasts.map((b) => (
                <Row
                  key={b.id}
                  time={formatTime(b.at)}
                  title={b.title}
                  meta={b.channels.map(channelLabel).join(" · ")}
                />
              ))
            )}
          </Section>
          <Section title="Follow-ups" icon={CalendarCheck}>
            {items.followUps.length === 0 ? (
              <Empty>Nothing scheduled.</Empty>
            ) : (
              items.followUps.map((f) => (
                <Row
                  key={f.id}
                  time={formatTime(f.at)}
                  title={f.title}
                  meta={f.customerName}
                  muted={f.completed}
                  onClick={() => onOpenInbox(f.customerId)}
                />
              ))
            )}
          </Section>
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3 h-3 text-[var(--chidi-text-muted)]" strokeWidth={2} />
        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold">
          {title}
        </p>
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 py-1.5 text-[11.5px] text-[var(--chidi-text-muted)] font-chidi-voice italic">
      {children}
    </p>
  )
}

function Row({
  time,
  title,
  meta,
  muted,
  onClick,
}: {
  time: string
  title: string
  meta?: string
  muted?: boolean
  onClick?: () => void
}) {
  const Tag = onClick ? "button" : "div"
  return (
    <Tag
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors",
        onClick && "hover:bg-[var(--chidi-surface)]/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-win)]/40",
        muted && "opacity-50 line-through",
      )}
    >
      <span className="text-[11px] tabular-nums font-mono text-[var(--chidi-text-muted)] w-12 flex-shrink-0 mt-0.5">
        {time}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[12.5px] text-[var(--chidi-text-primary)] font-chidi-voice truncate leading-tight">
          {title}
        </span>
        {meta && (
          <span className="block text-[10px] text-[var(--chidi-text-muted)] font-chidi-voice truncate mt-0.5">
            {meta}
          </span>
        )}
      </span>
    </Tag>
  )
}

function channelLabel(c: string): string {
  if (c === "WHATSAPP") return "WhatsApp"
  if (c === "TELEGRAM") return "Telegram"
  return c.toLowerCase()
}

// =============================================================================
// Add follow-up form (writes to chidi:follow-ups via addFollowUp)
// =============================================================================

function AddFollowUpForm({
  date,
  onCreated,
  onCancel,
}: {
  date: Date
  onCreated: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState("")
  const [time, setTime] = useState<string>("09:00")

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const due = new Date(date)
    const [h, m] = time.split(":").map(Number)
    due.setHours(h || 9, m || 0, 0, 0)
    addFollowUp({ title: title.trim(), dueAt: due })
    onCreated()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cal-month-title" className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-semibold">
          What's it for
        </label>
        <Input
          id="cal-month-title"
          autoFocus
          placeholder="Check in with Tola"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-[var(--card)] border-[var(--chidi-border-default)] font-chidi-voice text-[12.5px] h-9"
        />
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cal-month-time" className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-semibold">
            Time
          </label>
          <Input
            id="cal-month-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="bg-[var(--card)] border-[var(--chidi-border-default)] font-chidi-voice w-32 h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} className="h-9">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!title.trim()}
            className="bg-[var(--chidi-text-primary)] text-[var(--chidi-bg-primary)] hover:opacity-90 h-9"
          >
            Add
          </Button>
        </div>
      </div>
    </form>
  )
}
