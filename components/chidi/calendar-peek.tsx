"use client"

/**
 * CalendarPeek — Arc-style "today" widget anchored on the nav rail.
 *
 * Three sections (Deliveries · Broadcasts · Follow-ups) backed by
 * lib/chidi/calendar-events.ts. Live: polls every 5 minutes for the
 * next-day rollover so the widget swaps to a fresh day window without a
 * page refresh.
 *
 * Trigger lives in the consumer (nav-rail / app-header). This module exports:
 *
 *   <CalendarPeek>{trigger}</CalendarPeek>
 *
 * The body is a Popover on desktop (click-outside-to-close handled by Radix).
 * Mobile callsites can reuse the same component — the Popover anchors to
 * whatever Trigger is supplied.
 */

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronRight,
  MessageSquare,
  Package,
  Plus,
  X,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useOrders } from "@/lib/hooks/use-orders"
import {
  addFollowUp,
  formatDateHeadline,
  formatTime,
  getTodaysItems,
  subscribe as subscribeFollowUps,
  type TodaysItems,
} from "@/lib/chidi/calendar-events"
import { CalendarMonthView } from "./calendar-month-view"

interface CalendarPeekProps {
  /** The trigger element — passed as the SheetTrigger child. */
  children: React.ReactNode
  /** Side relative to the trigger. Default "right" so it pops out of the rail. */
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
}

export function CalendarPeek({ children, side = "right", align = "start" }: CalendarPeekProps) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={10}
        className="w-[320px] p-0 bg-[var(--card)] border-[var(--chidi-border-default)] chidi-cal-peek-in"
      >
        <CalendarPeekBody onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  )
}

/** Read today's count for the badge — exported so the rail can render the
 *  little number bubble next to the Calendar icon without mounting the
 *  whole popover. Re-renders when broadcasts/follow-ups/orders change. */
export function useTodaysCount(): number {
  const { data } = useOrders(undefined)
  const orders = data?.orders ?? []
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const bump = () => setTick((t) => t + 1)
    window.addEventListener("chidi:follow-ups-changed", bump)
    window.addEventListener("chidi:broadcasts-changed", bump)
    return () => {
      window.removeEventListener("chidi:follow-ups-changed", bump)
      window.removeEventListener("chidi:broadcasts-changed", bump)
    }
  }, [])
  // Tick used as effect dependency below.
  void tick
  return getTodaysItems(orders).total
}

interface CalendarPeekBodyProps {
  onClose: () => void
}

function CalendarPeekBody({ onClose }: CalendarPeekBodyProps) {
  const router = useRouter()
  const params = useParams()
  const slug = params?.slug as string | undefined
  const { data: ordersData } = useOrders(undefined)
  const orders = ordersData?.orders ?? []

  const [now, setNow] = useState<Date>(() => new Date())
  const [items, setItems] = useState<TodaysItems>(() => getTodaysItems(orders))
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [monthOpen, setMonthOpen] = useState(false)

  // Re-aggregate whenever orders refetch or follow-ups/broadcasts change.
  useEffect(() => {
    setItems(getTodaysItems(orders, now))
    const bump = () => setItems(getTodaysItems(orders, now))
    window.addEventListener("chidi:follow-ups-changed", bump)
    window.addEventListener("chidi:broadcasts-changed", bump)
    const unsub = subscribeFollowUps(() => bump())
    return () => {
      window.removeEventListener("chidi:follow-ups-changed", bump)
      window.removeEventListener("chidi:broadcasts-changed", bump)
      unsub()
    }
  }, [orders, now])

  // Roll over to the new day at midnight (poll every 5 min).
  useEffect(() => {
    const id = window.setInterval(() => {
      const fresh = new Date()
      if (fresh.toDateString() !== now.toDateString()) {
        setNow(fresh)
      }
    }, 5 * 60_000)
    return () => window.clearInterval(id)
  }, [now])

  const goOrder = (orderId: string) => {
    if (slug) router.push(`/dashboard/${slug}?tab=orders&order=${orderId}`)
    onClose()
  }
  const goCustomers = () => {
    if (slug) router.push(`/dashboard/${slug}/customers`)
    onClose()
  }
  const goInbox = (customerId?: string) => {
    if (slug) {
      router.push(
        customerId
          ? `/dashboard/${slug}?tab=inbox&conversation=${customerId}`
          : `/dashboard/${slug}?tab=inbox`,
      )
    }
    onClose()
  }

  return (
    <div className="flex flex-col">
      {/* Date header */}
      <div className="px-4 pt-4 pb-3 border-b border-[var(--chidi-border-subtle)] flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-chidi-voice text-[15px] font-semibold text-[var(--chidi-text-primary)]">
              {formatDateHeadline(now)}
            </h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--chidi-win-soft)] text-[var(--chidi-win-foreground)] font-chidi-voice font-medium">
              Today
            </span>
          </div>
          <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice mt-0.5">
            {items.total === 0
              ? "Quiet day."
              : `${items.total} thing${items.total === 1 ? "" : "s"} on deck.`}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close calendar"
          className="p-1 -mr-1 rounded text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)]"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="px-2 py-2 max-h-[420px] overflow-y-auto">
        <Section title="Deliveries" icon={Package}>
          {items.deliveries.length === 0 ? (
            <EmptyLine>Nothing scheduled.</EmptyLine>
          ) : (
            items.deliveries.map((d) => (
              <Row
                key={d.id}
                time={formatTime(d.at)}
                title={d.title}
                onClick={() => goOrder(d.id)}
              />
            ))
          )}
        </Section>

        <Section title="Broadcasts" icon={MessageSquare}>
          {items.broadcasts.length === 0 ? (
            <EmptyLine>Nothing scheduled.</EmptyLine>
          ) : (
            items.broadcasts.map((b) => (
              <Row
                key={b.id}
                time={formatTime(b.at)}
                title={b.title}
                meta={b.channels.map(channelLabel).join(" · ")}
                onClick={goCustomers}
              />
            ))
          )}
        </Section>

        <Section title="Follow-ups" icon={CalendarIcon}>
          {items.followUps.length === 0 ? (
            <EmptyLine>Nothing scheduled.</EmptyLine>
          ) : (
            items.followUps.map((f) => (
              <Row
                key={f.id}
                time={formatTime(f.at)}
                title={f.title}
                meta={f.customerName}
                muted={f.completed}
                onClick={() => goInbox(f.customerId)}
              />
            ))
          )}
        </Section>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-[var(--chidi-border-subtle)] flex items-center gap-1.5">
        <Sheet open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <SheetTrigger asChild>
            <button className="flex-1 flex items-center justify-center gap-2 h-8 rounded-md bg-[var(--chidi-surface)] hover:bg-[var(--chidi-surface)]/70 transition-colors text-[12px] font-chidi-voice font-medium text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)]">
              <Plus className="w-3 h-3" strokeWidth={2.4} />
              Schedule
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md p-0 bg-[var(--card)]">
            <SheetHeader className="px-5 pt-5 pb-3 border-b border-[var(--chidi-border-subtle)]">
              <SheetTitle className="font-chidi-voice text-[var(--chidi-text-primary)]">
                Schedule
              </SheetTitle>
              <p className="text-[12px] text-[var(--chidi-text-muted)] font-chidi-voice">
                Drop it on today's list. Channel-agnostic, all in one place.
              </p>
            </SheetHeader>
            <div className="px-5 py-4">
              <ScheduleForm
                onCreated={() => {
                  setScheduleOpen(false)
                }}
                onCancel={() => setScheduleOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
        <Sheet open={monthOpen} onOpenChange={setMonthOpen}>
          <SheetTrigger asChild>
            <button className="flex-1 flex items-center justify-center gap-2 h-8 rounded-md bg-[var(--chidi-surface)] hover:bg-[var(--chidi-surface)]/70 transition-colors text-[12px] font-chidi-voice font-medium text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)]">
              <CalendarDays className="w-3 h-3" strokeWidth={2.4} />
              View full calendar
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-lg p-0 bg-[var(--card)] flex flex-col">
            <SheetHeader className="px-5 pt-5 pb-2 border-b border-[var(--chidi-border-subtle)]">
              <SheetTitle className="font-chidi-voice text-[var(--chidi-text-primary)]">
                Calendar
              </SheetTitle>
              <p className="text-[12px] text-[var(--chidi-text-muted)] font-chidi-voice">
                Deliveries, broadcasts, follow-ups — all in one month view.
              </p>
            </SheetHeader>
            <div className="flex-1 min-h-0 overflow-hidden">
              <CalendarMonthView
                onNavigate={(href) => {
                  setMonthOpen(false)
                  onClose()
                  router.push(href)
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: LucideIcon
  children: React.ReactNode
}) {
  return (
    <section className="px-1 py-1.5">
      <div className="flex items-center gap-1.5 px-2 mb-1">
        <Icon className="w-3 h-3 text-[var(--chidi-text-muted)]" strokeWidth={2} />
        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-medium">
          {title}
        </p>
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </section>
  )
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2.5 py-1.5 text-[12px] text-[var(--chidi-text-muted)] font-chidi-voice italic">
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
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors",
        "hover:bg-[var(--chidi-surface)]/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-win)]/40",
        muted && "opacity-50 line-through",
      )}
    >
      <span className="text-[11px] tabular-nums font-mono text-[var(--chidi-text-muted)] w-12 flex-shrink-0">
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
      <ChevronRight className="w-3 h-3 text-[var(--chidi-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </button>
  )
}

function channelLabel(c: string): string {
  if (c === "WHATSAPP") return "WhatsApp"
  if (c === "TELEGRAM") return "Telegram"
  return c.toLowerCase()
}

interface ScheduleFormProps {
  onCreated: () => void
  onCancel: () => void
}

/**
 * Schedule form. We persist follow-ups directly (the only one of the three
 * sources that's user-creatable from this surface). Deliveries come from
 * orders and Broadcasts from the broadcast composer — both have richer
 * dedicated flows we don't want to duplicate.
 */
function ScheduleForm({ onCreated, onCancel }: ScheduleFormProps) {
  const [type, setType] = useState<"follow-up" | "delivery" | "broadcast">("follow-up")
  const [title, setTitle] = useState("")
  const [time, setTime] = useState<string>(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() + 30)
    const h = d.getHours().toString().padStart(2, "0")
    const m = d.getMinutes().toString().padStart(2, "0")
    return `${h}:${m}`
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const due = new Date()
    const [h, m] = time.split(":").map(Number)
    due.setHours(h || 9, m || 0, 0, 0)
    addFollowUp({
      title: type === "follow-up" ? title : `${typeLabel(type)}: ${title}`,
      dueAt: due,
    })
    onCreated()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-[var(--chidi-text-secondary)] font-chidi-voice">
          Type
        </label>
        <div className="flex items-center gap-1.5">
          {(["follow-up", "delivery", "broadcast"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "flex-1 px-2.5 py-1.5 rounded-md text-[12px] font-chidi-voice border transition-colors",
                type === t
                  ? "bg-[var(--chidi-text-primary)] text-[var(--chidi-bg-primary)] border-[var(--chidi-text-primary)]"
                  : "bg-[var(--chidi-surface)] text-[var(--chidi-text-secondary)] border-[var(--chidi-border-default)] hover:border-[var(--chidi-text-muted)]",
              )}
            >
              {typeLabel(t)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="cal-title" className="text-[11px] font-medium text-[var(--chidi-text-secondary)] font-chidi-voice">
          What's it for
        </label>
        <Input
          id="cal-title"
          autoFocus
          placeholder={titlePlaceholder(type)}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-[var(--chidi-surface)] border-[var(--chidi-border-default)] font-chidi-voice"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="cal-time" className="text-[11px] font-medium text-[var(--chidi-text-secondary)] font-chidi-voice">
          Time
        </label>
        <Input
          id="cal-time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="bg-[var(--chidi-surface)] border-[var(--chidi-border-default)] font-chidi-voice w-32"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!title.trim()}
          className="bg-[var(--chidi-text-primary)] text-[var(--chidi-bg-primary)] hover:opacity-90"
        >
          Add to today
        </Button>
      </div>
    </form>
  )
}

function typeLabel(t: "follow-up" | "delivery" | "broadcast"): string {
  if (t === "follow-up") return "Follow-up"
  if (t === "delivery") return "Delivery"
  return "Broadcast"
}

function titlePlaceholder(t: "follow-up" | "delivery" | "broadcast"): string {
  if (t === "follow-up") return "Check in with Tola"
  if (t === "delivery") return "Drop off Bola's order"
  return "Send Friday update"
}
