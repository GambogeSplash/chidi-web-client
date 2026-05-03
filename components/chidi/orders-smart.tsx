"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  CheckCircle2,
  ChevronRight,
  MessageCircle,
  Loader2,
  Wallet,
} from "lucide-react"
import { type Order } from "@/lib/api/orders"
import { CustomerCharacter } from "./customer-character"
import { CurrencyAmount } from "./currency-amount"
import { ChidiCard, ChidiSection } from "./page-shell"
import { ChidiMark } from "./chidi-mark"
import { PaymentConfirmationWidget } from "./payment-confirmation-widget"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useIsMobile } from "@/components/ui/use-mobile"
import {
  PAYMENT_CONFIRMED_EVENT,
  formatConfirmedAgo,
  getConfirmation,
  type PaymentConfirmation,
} from "@/lib/chidi/payment-confirmations"
import { cn } from "@/lib/utils"

const CHANNEL_COLOR: Record<string, string> = {
  WHATSAPP: "#25D366",
  TELEGRAM: "#0088CC",
  INSTAGRAM: "#E4405F",
  SMS: "#9CA3AF",
}

function channelBadgeColor(channel?: string): string {
  if (!channel) return "#9CA3AF"
  return CHANNEL_COLOR[channel.toUpperCase()] || "#9CA3AF"
}

export type OrdersFilter = "all" | "pending" | "in_progress" | "fulfilled" | "cancelled"

interface OrdersSmartProps {
  orders: Order[]
  onOpenOrder: (order: Order) => void
  onOpenConversation?: (conversationId: string) => void
  onFulfill: (orderId: string) => void
  actionLoadingId: string | null
  filter?: OrdersFilter
  /** Currently-open order in the right detail panel — used to highlight
      the matching row so the user always sees which one they picked. */
  selectedOrderId?: string | null
  /** Fired after the merchant confirms payment via the inline widget so the
      orders list can advance the order from PENDING_PAYMENT → CONFIRMED. */
  onPaymentConfirmed?: (orderId: string) => void
}

/**
 * The smart-sections view of the Orders page. Replaces "browse a long list"
 * with "show me what needs me right now" as the default mental model.
 *
 * Sections:
 *   1. Need your attention — pending payment + needs human
 *   2. In progress — confirmed, waiting fulfillment (with inline Mark fulfilled CTA)
 *   3. Done today / Done this week — fulfilled, collapsed by default
 */
export function OrdersSmart({
  orders,
  onOpenOrder,
  onOpenConversation,
  onFulfill,
  actionLoadingId,
  filter = "all",
  selectedOrderId = null,
  onPaymentConfirmed,
}: OrdersSmartProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startOfToday = today.getTime()
  const startOfWeek = startOfToday - 6 * 86400000

  const grouped = useMemo(() => {
    const needsAttention: Order[] = []
    const inProgress: Order[] = []
    const doneToday: Order[] = []
    const doneThisWeek: Order[] = []
    const cancelled: Order[] = []

    for (const o of orders) {
      const created = new Date(o.created_at).getTime()
      if (o.status === "PENDING_PAYMENT") needsAttention.push(o)
      else if (o.status === "CONFIRMED") inProgress.push(o)
      else if (o.status === "FULFILLED") {
        if (created >= startOfToday) doneToday.push(o)
        else if (created >= startOfWeek) doneThisWeek.push(o)
      } else if (o.status === "CANCELLED") cancelled.push(o)
    }

    return { needsAttention, inProgress, doneToday, doneThisWeek, cancelled }
  }, [orders, startOfToday, startOfWeek])

  const todayRevenue = grouped.doneToday.reduce((s, o) => s + o.total, 0)
  const weekRevenue = grouped.doneThisWeek.reduce((s, o) => s + o.total, 0) + todayRevenue
  const pendingCount = grouped.needsAttention.length

  // Section refs so summary-stat clicks can scroll to the relevant block
  const needsAttentionRef = useRef<HTMLDivElement>(null)
  const inProgressRef = useRef<HTMLDivElement>(null)
  const doneTodayRef = useRef<HTMLDivElement>(null)

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => () => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  // When a specific status filter is active, render a focused single-section
  // view (full list of that status, no collapse). When "all", show the
  // smart-sections layout below.
  if (filter !== "all") {
    return (
      <FilteredView
        filter={filter}
        grouped={grouped}
        onOpenOrder={onOpenOrder}
        onOpenConversation={onOpenConversation}
        onFulfill={onFulfill}
        actionLoadingId={actionLoadingId}
        selectedOrderId={selectedOrderId}
        onPaymentConfirmed={onPaymentConfirmed}
      />
    )
  }

  return (
    <div className="max-w-4xl mx-auto w-full px-4 lg:px-6 py-4 lg:py-6 space-y-5">
      {/* No inline summary strip — the tab counts already carry these numbers */}

      {/* Section 1: Need your attention — full warm bg + dot accent on eyebrow */}
      {grouped.needsAttention.length > 0 && (
        <div
          ref={needsAttentionRef}
          className="rounded-xl bg-[var(--chidi-warning)]/6 border border-[var(--chidi-warning)]/15 p-4 lg:p-5 chidi-paper"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--chidi-warning)]" />
            <p className="ty-meta text-[var(--chidi-warning)]">Need your attention</p>
          </div>
          <h3 className="ty-section text-[var(--chidi-text-primary)] mb-3">
            {grouped.needsAttention.length === 1
              ? "1 order waiting on payment"
              : `${grouped.needsAttention.length} orders waiting on payment`}
          </h3>
          <div className="space-y-2">
            {grouped.needsAttention.map((order) => (
              <SmartOrderCard
                key={order.id}
                order={order}
                tone="warn"
                onOpenOrder={onOpenOrder}
                onOpenConversation={onOpenConversation}
                primaryActionLabel="Open order"
                selected={selectedOrderId === order.id}
                onPaymentConfirmed={onPaymentConfirmed}
              />
            ))}
          </div>
        </div>
      )}

      {/* Section 2: In progress */}
      {grouped.inProgress.length > 0 && (
        <div ref={inProgressRef}>
          <ChidiSection
            eyebrow="In progress"
            title={
              grouped.inProgress.length === 1
                ? "1 order ready to ship"
                : `${grouped.inProgress.length} orders ready to ship`
            }
          >
            <div className="space-y-2">
              {grouped.inProgress.map((order) => (
                <SmartOrderCard
                  key={order.id}
                  order={order}
                  tone="neutral"
                  onOpenOrder={onOpenOrder}
                  onOpenConversation={onOpenConversation}
                  primaryActionLabel={actionLoadingId === order.id ? "Marking…" : "Mark fulfilled"}
                  primaryActionLoading={actionLoadingId === order.id}
                  onPrimaryAction={() => onFulfill(order.id)}
                  selected={selectedOrderId === order.id}
                />
              ))}
            </div>
          </ChidiSection>
        </div>
      )}

      {/* Section 3: Done today — collapsible (open by default), shows top 5 with reveal more */}
      {grouped.doneToday.length > 0 && (
        <div ref={doneTodayRef}>
          <CollapsibleFulfilledSection
            eyebrow="Today"
            title={`${grouped.doneToday.length} fulfilled today`}
            orders={grouped.doneToday}
            onOpenOrder={onOpenOrder}
            initialVisible={5}
            defaultOpen={true}
            selectedOrderId={selectedOrderId}
          />
        </div>
      )}

      {/* Section 4: This week — collapsed by default */}
      {grouped.doneThisWeek.length > 0 && (
        <CollapsibleFulfilledSection
          eyebrow="This week (earlier)"
          title={`${grouped.doneThisWeek.length} more fulfilled`}
          orders={grouped.doneThisWeek}
          onOpenOrder={onOpenOrder}
          initialVisible={5}
          defaultOpen={false}
          selectedOrderId={selectedOrderId}
        />
      )}

      {/* Cancelled — collapsed by default, footer feel */}
      {grouped.cancelled.length > 0 && (
        <CollapsibleFulfilledSection
          eyebrow="Cancelled"
          title={`${grouped.cancelled.length} cancelled`}
          orders={grouped.cancelled}
          onOpenOrder={onOpenOrder}
          initialVisible={5}
          defaultOpen={false}
          dim
          selectedOrderId={selectedOrderId}
        />
      )}

      {/* Quiet day */}
      {orders.length === 0 && (
        <div className="text-center py-16">
          <ChidiMark size={32} variant="muted" className="mx-auto mb-4" />
          <p className="ty-body-voice text-[var(--chidi-text-secondary)]">
            No orders yet.
          </p>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Internals
// =============================================================================

function SummaryStat({
  label,
  value,
  sub,
  tone,
  onClick,
}: {
  label: string
  value: React.ReactNode
  sub?: string
  tone?: "win" | "warn"
  onClick?: () => void
}) {
  const Wrapper = onClick ? "button" : "div"
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        "bg-[var(--chidi-surface)] rounded-xl p-3 text-left w-full transition-colors",
        onClick && "hover:bg-white hover:shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-win)]/40",
      )}
    >
      <p className="ty-meta mb-1">{label}</p>
      <p
        className={cn(
          "ty-section tabular-nums",
          tone === "win" && "text-[var(--chidi-win)]",
          tone === "warn" && "text-[var(--chidi-warning)]",
          !tone && "text-[var(--chidi-text-primary)]",
        )}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs text-[var(--chidi-text-muted)] font-chidi-voice mt-0.5">
          {sub}
        </p>
      )}
    </Wrapper>
  )
}

interface SmartOrderCardProps {
  order: Order
  tone: "warn" | "neutral"
  onOpenOrder: (order: Order) => void
  onOpenConversation?: (conversationId: string) => void
  primaryActionLabel: string
  primaryActionLoading?: boolean
  onPrimaryAction?: () => void
  /** This row is the one currently open in the right detail panel */
  selected?: boolean
  /** Notify parent (orders-view) so it can advance the state machine. */
  onPaymentConfirmed?: (orderId: string) => void
}

/**
 * Subscribe to local payment-confirmation state for one order so the row
 * shows the right pill (Confirm or Paid badge) and re-renders when other
 * surfaces fire `chidi:payment-confirmed`.
 */
function usePaymentConfirmation(orderId: string): PaymentConfirmation | null {
  const [record, setRecord] = useState<PaymentConfirmation | null>(() => getConfirmation(orderId))
  useEffect(() => {
    setRecord(getConfirmation(orderId))
    const onConfirmed = (e: Event) => {
      const detail = (e as CustomEvent<PaymentConfirmation>).detail
      if (detail?.orderId === orderId) {
        setRecord(detail)
      } else {
        // Cross-surface — re-read in case storage changed
        setRecord(getConfirmation(orderId))
      }
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === "chidi:payment-confirmations") {
        setRecord(getConfirmation(orderId))
      }
    }
    window.addEventListener(PAYMENT_CONFIRMED_EVENT, onConfirmed as EventListener)
    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener(PAYMENT_CONFIRMED_EVENT, onConfirmed as EventListener)
      window.removeEventListener("storage", onStorage)
    }
  }, [orderId])
  return record
}

/**
 * Renders the "Confirm payment" pill that opens the widget in a Sheet
 * (mobile) or Popover (desktop). Used inline on every PENDING_PAYMENT row.
 */
function ConfirmPaymentTrigger({
  order,
  onConfirmed,
}: {
  order: Order
  onConfirmed?: (orderId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const isMobile = useIsMobile()

  const pill = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        setOpen(true)
      }}
      className="inline-flex items-center gap-1.5 text-[12px] font-medium font-chidi-voice px-3 py-1.5 rounded-lg bg-[var(--chidi-success)] text-[var(--chidi-success-foreground)] hover:opacity-90 active:scale-[0.97] transition-colors"
      aria-label={`Confirm payment for order ${order.id.slice(-6).toUpperCase()}`}
    >
      <Wallet className="w-3.5 h-3.5" />
      Confirm payment
    </button>
  )

  if (isMobile) {
    return (
      <>
        {pill}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="bg-[var(--background)] p-0 max-h-[90vh] overflow-y-auto rounded-t-2xl"
          >
            <SheetHeader>
              <SheetTitle className="text-[var(--chidi-text-primary)]">
                Confirm payment
              </SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-6">
              <PaymentConfirmationWidget
                order={order}
                bare
                onConfirm={() => {
                  onConfirmed?.(order.id)
                  // Let the success animation breathe before dismissing.
                  window.setTimeout(() => setOpen(false), 1400)
                }}
                onReject={() => setOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{pill}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[360px] p-0 bg-transparent border-0 shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        <PaymentConfirmationWidget
          order={order}
          onConfirm={() => {
            onConfirmed?.(order.id)
            window.setTimeout(() => setOpen(false), 1400)
          }}
          onReject={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}

function SmartOrderCard({
  order,
  tone,
  onOpenOrder,
  onOpenConversation,
  primaryActionLabel,
  primaryActionLoading,
  onPrimaryAction,
  selected = false,
  onPaymentConfirmed,
}: SmartOrderCardProps) {
  const orderNumber = `#${order.id.slice(-6).toUpperCase()}`
  // Local confirmation log — drives the "Paid Xh ago" badge and replaces the
  // warn-tone CTA with a quiet receipt stamp once the merchant has confirmed.
  const confirmation = usePaymentConfirmation(order.id)
  const isPendingPayment = order.status === "PENDING_PAYMENT"
  const isConfirmedLocally = isPendingPayment && !!confirmation

  // Time-aging cue (Square KDS pattern). Pending payment ages through:
  // < 4h: normal · 4-12h: aging · 12-24h: stale · 24h+: urgent
  const ageHours = (Date.now() - new Date(order.created_at).getTime()) / 3_600_000
  const isAgingWarn = tone === "warn" && ageHours > 12
  const isUrgent = tone === "warn" && ageHours > 24
  const ageLabel =
    ageHours < 1
      ? `${Math.max(1, Math.round(ageHours * 60))}m old`
      : ageHours < 24
        ? `${Math.round(ageHours)}h old`
        : `${Math.round(ageHours / 24)}d old`

  return (
    <ChidiCard
      className={cn(
        "p-3 chidi-card-lift relative overflow-hidden transition-colors",
        // Aging cues
        isAgingWarn && !isUrgent && "ring-1 ring-[var(--chidi-warning)]/30",
        isUrgent && "ring-1 ring-[var(--chidi-danger,#D14747)]/40",
        // Selected state — same vocabulary as inbox active conversation:
        // inset-left accent (zero layout shift) + subtle surface tint so
        // the merchant sees exactly which order is open in the right pane.
        selected &&
          "bg-[var(--chidi-surface)] shadow-[inset_3px_0_0_0_var(--chidi-text-primary)] ring-1 ring-[var(--chidi-text-primary)]/15",
      )}
    >
      {/* Age tag for warn-tone orders that have been sitting too long.
          Once locally confirmed, the row swaps to a calm "Paid Xh ago" stamp. */}
      {isConfirmedLocally && confirmation ? (
        <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-medium font-chidi-voice px-1.5 py-0.5 rounded-full bg-[var(--chidi-success)]/15 text-[var(--chidi-success)]">
          <CheckCircle2 className="w-2.5 h-2.5" />
          Paid {formatConfirmedAgo(confirmation.confirmedAt)}
        </span>
      ) : (
        tone === "warn" && ageHours > 4 && (
          <span
            className={cn(
              "absolute top-2 right-2 text-[10px] font-medium font-chidi-voice px-1.5 py-0.5 rounded-full tabular-nums",
              isUrgent
                ? "bg-[var(--chidi-danger,#D14747)]/15 text-[var(--chidi-danger,#D14747)]"
                : "bg-[var(--chidi-warning)]/15 text-[var(--chidi-warning)]",
            )}
          >
            {ageLabel}
          </span>
        )
      )}

      {/* Header: customer + order number */}
      <div onClick={() => onOpenOrder(order)} className="flex items-center gap-3 cursor-pointer">
        <div className="relative flex-shrink-0">
          <CustomerCharacter
            name={order.customer_name}
            fallbackId={order.id}
            size="md"
          />
          {order.channel && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--card)]"
              style={{ backgroundColor: channelBadgeColor(order.channel) }}
              title={order.channel}
              aria-label={order.channel}
            />
          )}
        </div>
        <div className="flex-1 min-w-0 flex items-baseline justify-between gap-2">
          <span className="ty-card-title text-[var(--chidi-text-primary)] truncate">
            {order.customer_name}
          </span>
          <span className="text-[10px] text-[var(--chidi-text-muted)] font-chidi-voice tabular-nums flex-shrink-0">
            {orderNumber}
          </span>
        </div>
      </div>

      {/* Items — KDS-style list with product images. Capped at 3 to keep
          the card scannable; "+N more" reveals on click into detail. */}
      <ul
        onClick={() => onOpenOrder(order)}
        className="mt-2.5 pt-2.5 border-t border-[var(--chidi-border-subtle)] space-y-1.5 cursor-pointer"
      >
        {order.items.slice(0, 3).map((item, idx) => (
          <li key={idx} className="flex items-center gap-2.5">
            <ProductThumb src={item.image_url} name={item.product_name} size={28} />
            <span className="flex-1 min-w-0 text-[13px] text-[var(--chidi-text-primary)] font-chidi-voice truncate">
              {item.product_name}
            </span>
            <span className="text-[11px] text-[var(--chidi-text-muted)] tabular-nums flex-shrink-0">
              ×{item.quantity}
            </span>
            <CurrencyAmount
              amount={item.unit_price * item.quantity}
              currency={order.currency}
              showDualHover={false}
              compact
              className="text-[12px] text-[var(--chidi-text-secondary)] tabular-nums w-14 text-right flex-shrink-0"
            />
          </li>
        ))}
        {order.items.length > 3 && (
          <li className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice pl-[38px]">
            +{order.items.length - 3} more
          </li>
        )}
      </ul>

      {/* Total + actions */}
      <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-[var(--chidi-border-subtle)]">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pending payment? Surface the merchant's most-tapped action right
              here, before they need to open the detail panel. */}
          {isPendingPayment && !isConfirmedLocally && (
            <ConfirmPaymentTrigger order={order} onConfirmed={onPaymentConfirmed} />
          )}
          {onPrimaryAction && (
            <button
              onClick={onPrimaryAction}
              disabled={primaryActionLoading}
              className={cn(
                "inline-flex items-center gap-1.5 text-[12px] font-medium font-chidi-voice px-3 py-1.5 rounded-lg active:scale-[0.97] transition-colors",
                tone === "warn"
                  ? "bg-[var(--chidi-warning)] text-[var(--chidi-warning-foreground)] hover:opacity-90"
                  : "bg-[var(--chidi-text-primary)] text-[var(--chidi-bg-primary)] hover:opacity-90",
              )}
            >
              {primaryActionLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              {primaryActionLabel}
            </button>
          )}
          {!onPrimaryAction && (
            <button
              onClick={() => onOpenOrder(order)}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium font-chidi-voice px-3 py-1.5 rounded-lg bg-[var(--chidi-text-primary)] text-[var(--chidi-bg-primary)] hover:opacity-90 active:scale-[0.97] transition-colors"
            >
              {primaryActionLabel}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          {order.conversation_id && onOpenConversation && (
            <button
              onClick={() => onOpenConversation(order.conversation_id!)}
              className="inline-flex items-center gap-1.5 text-[12px] font-chidi-voice px-2.5 py-1.5 rounded-lg text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-surface)] hover:text-[var(--chidi-text-primary)] active:scale-[0.97] transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Chat
            </button>
          )}
        </div>
        <CurrencyAmount
          amount={order.total}
          currency={order.currency}
          showDualHover={false}
          className="text-[16px] font-semibold tabular-nums text-[var(--chidi-text-primary)]"
        />
      </div>
    </ChidiCard>
  )
}

// Small product thumbnail. Image when present, fallback to colored initial.
interface ProductThumbProps {
  src?: string | null
  name: string
  size?: number
  className?: string
}

function ProductThumb({ src, name, size = 32, className }: ProductThumbProps) {
  const initial = (name?.trim()[0] || "?").toUpperCase()
  return (
    <span
      className={cn(
        "rounded-md overflow-hidden flex-shrink-0 bg-[var(--chidi-surface)] border border-[var(--chidi-border-subtle)] flex items-center justify-center",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <span className="text-[10px] font-medium text-[var(--chidi-text-muted)]">{initial}</span>
      )}
    </span>
  )
}

interface CollapsibleFulfilledSectionProps {
  eyebrow: string
  title: string
  orders: Order[]
  onOpenOrder: (o: Order) => void
  initialVisible?: number
  defaultOpen?: boolean
  dim?: boolean
  selectedOrderId?: string | null
}

/**
 * Sectioned fulfilled-orders block. Collapsed by default (or open) with a
 * "show all N" reveal once expanded. Caps the initial render at `initialVisible`
 * so the merchant doesn't get hit with a wall of 30+ done rows.
 */
function CollapsibleFulfilledSection({
  eyebrow,
  title,
  orders,
  onOpenOrder,
  initialVisible = 5,
  defaultOpen = false,
  dim = false,
  selectedOrderId = null,
}: CollapsibleFulfilledSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? orders : orders.slice(0, initialVisible)
  const hidden = orders.length - visible.length

  return (
    <div className={cn(dim && "opacity-70")}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-3 border-t border-[var(--chidi-border-subtle)] text-left group"
        aria-expanded={open}
      >
        <div>
          <p className="ty-meta">{eyebrow}</p>
          <p className="ty-card-title text-[var(--chidi-text-primary)] mt-1">{title}</p>
        </div>
        <ChevronRight
          className={cn(
            "w-4 h-4 text-[var(--chidi-text-muted)] transition-transform",
            open && "rotate-90",
          )}
        />
      </button>
      {open && (
        <div className="space-y-1.5 pt-2">
          {visible.map((order) => (
            <FulfilledRow
              key={order.id}
              order={order}
              onOpenOrder={onOpenOrder}
              selected={selectedOrderId === order.id}
            />
          ))}
          {hidden > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full text-center text-[12px] font-chidi-voice text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-secondary)] py-2 transition-colors"
            >
              Show {hidden} more
            </button>
          )}
        </div>
      )}
    </div>
  )
}

interface FilteredViewProps {
  filter: Exclude<OrdersFilter, "all">
  grouped: {
    needsAttention: Order[]
    inProgress: Order[]
    doneToday: Order[]
    doneThisWeek: Order[]
    cancelled: Order[]
  }
  onOpenOrder: (o: Order) => void
  onOpenConversation?: (id: string) => void
  onFulfill: (id: string) => void
  actionLoadingId: string | null
  selectedOrderId?: string | null
  onPaymentConfirmed?: (orderId: string) => void
}

function FilteredView({ filter, grouped, onOpenOrder, onOpenConversation, onFulfill, actionLoadingId, selectedOrderId = null, onPaymentConfirmed }: FilteredViewProps) {
  const { orders, copy } = useMemo(() => {
    switch (filter) {
      case "pending":
        return {
          orders: grouped.needsAttention,
          copy: { eyebrow: "Need you", title: orderCountText(grouped.needsAttention.length, "waiting on payment"), empty: "Nothing waiting on payment." },
        }
      case "in_progress":
        return {
          orders: grouped.inProgress,
          copy: { eyebrow: "In progress", title: orderCountText(grouped.inProgress.length, "ready to ship"), empty: "Nothing in progress." },
        }
      case "fulfilled":
        return {
          orders: [...grouped.doneToday, ...grouped.doneThisWeek],
          copy: { eyebrow: "Fulfilled", title: orderCountText(grouped.doneToday.length + grouped.doneThisWeek.length, "fulfilled this week"), empty: "Nothing fulfilled yet." },
        }
      case "cancelled":
        return {
          orders: grouped.cancelled,
          copy: { eyebrow: "Cancelled", title: orderCountText(grouped.cancelled.length, "cancelled"), empty: "No cancellations." },
        }
    }
  }, [filter, grouped])

  if (orders.length === 0) {
    return (
      <div className="max-w-4xl mx-auto w-full px-4 lg:px-6 py-12 text-center">
        <p className="ty-meta mb-1.5">{copy.eyebrow}</p>
        <h3 className="ty-section text-[var(--chidi-text-primary)]">{copy.empty}</h3>
      </div>
    )
  }

  // Pending + In progress get the action-card treatment (large, with quick fulfill)
  // Fulfilled + Cancelled get the compact row treatment (denser scanning)
  const useActionCards = filter === "pending" || filter === "in_progress"
  const tone = filter === "pending" ? "warn" : "neutral"

  return (
    <div className="max-w-4xl mx-auto w-full px-4 lg:px-6 py-4 lg:py-6">
      {/* No section subtitle — the active tab label already names the state */}
      {useActionCards ? (
        <div className="space-y-2">
          {orders.map((order) => (
            <SmartOrderCard
              key={order.id}
              order={order}
              tone={tone}
              onOpenOrder={onOpenOrder}
              onOpenConversation={onOpenConversation}
              primaryActionLabel={
                filter === "pending"
                  ? "Open order"
                  : actionLoadingId === order.id
                    ? "Marking…"
                    : "Mark fulfilled"
              }
              primaryActionLoading={actionLoadingId === order.id}
              onPrimaryAction={filter === "in_progress" ? () => onFulfill(order.id) : undefined}
              selected={selectedOrderId === order.id}
              onPaymentConfirmed={onPaymentConfirmed}
            />
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "rounded-xl border border-[var(--chidi-border-default)] bg-[var(--card)] chidi-paper overflow-hidden",
            filter === "cancelled" && "opacity-80",
          )}
        >
          <ul className="divide-y divide-[var(--chidi-border-subtle)]">
            {orders.map((order) => (
              <FulfilledRow
                key={order.id}
                order={order}
                onOpenOrder={onOpenOrder}
                selected={selectedOrderId === order.id}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function orderCountText(count: number, suffix: string): string {
  return `${count} ${count === 1 ? "order" : "orders"} ${suffix}`
}

function FulfilledRow({
  order,
  onOpenOrder,
  selected = false,
}: {
  order: Order
  onOpenOrder: (o: Order) => void
  selected?: boolean
}) {
  const orderNumber = `#${order.id.slice(-6).toUpperCase()}`
  // Show up to 3 product thumbs as a tiny stack
  const thumbs = order.items.slice(0, 3)

  return (
    <button
      onClick={() => onOpenOrder(order)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--chidi-surface)] active:scale-[0.997] transition-colors text-left relative",
        // Selected: subtle surface tint + an inset left-border via ring
        selected &&
          "bg-[var(--chidi-surface)] shadow-[inset_3px_0_0_0_var(--chidi-text-primary)]",
      )}
    >
      <div className="relative flex-shrink-0">
        <CustomerCharacter name={order.customer_name} fallbackId={order.id} size="sm" />
        {order.channel && (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--background)]"
            style={{ backgroundColor: channelBadgeColor(order.channel) }}
            aria-label={order.channel}
          />
        )}
      </div>

      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-sm text-[var(--chidi-text-primary)] truncate">
          {order.customer_name}
        </span>
        <span className="text-[10px] text-[var(--chidi-text-muted)] font-chidi-voice tabular-nums">
          {orderNumber}
        </span>
      </div>

      {/* Product thumbs — overlapping stack */}
      {thumbs.length > 0 && (
        <div className="flex -space-x-1.5 flex-shrink-0">
          {thumbs.map((item, i) => (
            <ProductThumb
              key={i}
              src={item.image_url}
              name={item.product_name}
              size={22}
              className="ring-2 ring-[var(--background)]"
            />
          ))}
        </div>
      )}

      <CurrencyAmount
        amount={order.total}
        currency={order.currency}
        showDualHover={false}
        className="text-sm font-medium text-[var(--chidi-text-primary)] tabular-nums w-16 text-right flex-shrink-0"
      />
    </button>
  )
}
