"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  CheckCircle2,
  ChevronRight,
  MessageCircle,
  Loader2,
  Wallet,
  Pin,
  PinOff,
  RotateCcw,
  Archive,
} from "lucide-react"
import { type Order } from "@/lib/api/orders"
import { CustomerCharacter } from "./customer-character"
import { CurrencyAmount } from "./currency-amount"
import { ChidiCard, ChidiSection } from "./page-shell"
import { ArcFace } from "./arc-face"
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useIsMobile } from "@/components/ui/use-mobile"
import {
  PAYMENT_CONFIRMED_EVENT,
  formatConfirmedAgo,
  getConfirmation,
  type PaymentConfirmation,
} from "@/lib/chidi/payment-confirmations"
import {
  getPinned,
  togglePin,
  pin as pinOrder,
  unpin as unpinOrder,
  subscribe as subscribePinned,
  MAX_PINNED_ORDERS,
} from "@/lib/chidi/orders-pinned"
import {
  isArchived,
  manualArchive,
  restore as restoreOrder,
  subscribe as subscribeArchive,
} from "@/lib/chidi/orders-archive"
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
 *
 * Arc-style add-ons:
 *   - Pinned section per tab (when there are pins matching the tab's filter)
 *   - Past orders accordion in the Fulfilled tab (auto-archive >30d fulfilled)
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

  // Subscribe to pin + archive stores so the section composition reacts to
  // every pin/unpin or archive/restore from any row.
  const pinnedIds = usePinnedIds()
  const archiveTick = useArchiveTick()

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

  // Section refs so summary-stat clicks can scroll to the relevant block
  const needsAttentionRef = useRef<HTMLDivElement>(null)
  const inProgressRef = useRef<HTMLDivElement>(null)
  const doneTodayRef = useRef<HTMLDivElement>(null)

  // When a specific status filter is active, render a focused single-section
  // view (full list of that status, no collapse). When "all", show the
  // smart-sections layout below.
  if (filter !== "all") {
    return (
      <FilteredView
        filter={filter}
        orders={orders}
        grouped={grouped}
        onOpenOrder={onOpenOrder}
        onOpenConversation={onOpenConversation}
        onFulfill={onFulfill}
        actionLoadingId={actionLoadingId}
        selectedOrderId={selectedOrderId}
        onPaymentConfirmed={onPaymentConfirmed}
        pinnedIds={pinnedIds}
        archiveTick={archiveTick}
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
                pinned={pinnedIds.includes(order.id)}
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
                  pinned={pinnedIds.includes(order.id)}
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
            pinnedIds={pinnedIds}
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
          pinnedIds={pinnedIds}
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
          pinnedIds={pinnedIds}
        />
      )}

      {/* Quiet day */}
      {orders.length === 0 && (
        <div className="text-center py-16">
          <ArcFace size={32} className="mx-auto mb-4 text-[var(--chidi-text-muted)]" />
          <p className="ty-body-voice text-[var(--chidi-text-secondary)]">
            No orders yet.
          </p>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Pin + Archive subscriptions
// =============================================================================

/** Subscribe to the localStorage-backed pinned-orders list. */
function usePinnedIds(): string[] {
  const [ids, setIds] = useState<string[]>(() => getPinned())
  useEffect(() => {
    setIds(getPinned())
    const unsub = subscribePinned((next) => setIds(next))
    const onStorage = (e: StorageEvent) => {
      if (e.key === "chidi:orders-pinned") setIds(getPinned())
    }
    window.addEventListener("storage", onStorage)
    return () => {
      unsub()
      window.removeEventListener("storage", onStorage)
    }
  }, [])
  return ids
}

/**
 * Bumps a counter whenever archive overrides change so any consumer
 * recomputing `isArchived(order)` re-runs.  Returns the tick value (rarely
 * used directly — it's the *change* that matters as a render dependency).
 */
function useArchiveTick(): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const unsub = subscribeArchive(() => setTick((t) => t + 1))
    const onStorage = (e: StorageEvent) => {
      if (e.key === "chidi:orders-archive-overrides") setTick((t) => t + 1)
    }
    window.addEventListener("storage", onStorage)
    return () => {
      unsub()
      window.removeEventListener("storage", onStorage)
    }
  }, [])
  return tick
}

// =============================================================================
// Internals
// =============================================================================

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
  /** Whether this order is currently pinned. Drives the pin badge / button affordance. */
  pinned?: boolean
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

/**
 * Hover-revealed pin/unpin affordance that lives in the top-right of an order
 * card. Filled icon when pinned (always visible), outline icon when not
 * (visible on hover/focus only — Arc-style "ambient until you reach for it").
 */
function PinToggleButton({
  pinned,
  onToggle,
  alwaysVisible = false,
}: {
  pinned: boolean
  onToggle: () => void
  alwaysVisible?: boolean
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      aria-label={pinned ? "Unpin order" : "Pin order to top"}
      title={pinned ? "Unpin" : "Pin to top"}
      className={cn(
        "p-1 rounded-md transition-all motion-reduce:transition-none hover:bg-[var(--chidi-surface)] active:scale-90",
        pinned
          ? "text-[var(--chidi-text-primary)] opacity-100"
          : "text-[var(--chidi-text-muted)] opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
        alwaysVisible && "opacity-100",
      )}
    >
      {pinned ? (
        <Pin className="w-3.5 h-3.5 fill-current" strokeWidth={1.6} />
      ) : (
        <Pin className="w-3.5 h-3.5" strokeWidth={1.6} />
      )}
    </button>
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
  pinned = false,
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
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <ChidiCard
          className={cn(
            "p-3 chidi-card-lift relative overflow-hidden transition-colors group",
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
          {/* Top-right cluster: pin toggle + age tag / paid stamp */}
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <PinToggleButton pinned={pinned} onToggle={() => togglePin(order.id)} />
            {isConfirmedLocally && confirmation ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium font-chidi-voice px-1.5 py-0.5 rounded-full bg-[var(--chidi-success)]/15 text-[var(--chidi-success)]">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Paid {formatConfirmedAgo(confirmation.confirmedAt)}
              </span>
            ) : (
              tone === "warn" && ageHours > 4 && (
                <span
                  className={cn(
                    "text-[10px] font-medium font-chidi-voice px-1.5 py-0.5 rounded-full tabular-nums",
                    isUrgent
                      ? "bg-[var(--chidi-danger,#D14747)]/15 text-[var(--chidi-danger,#D14747)]"
                      : "bg-[var(--chidi-warning)]/15 text-[var(--chidi-warning)]",
                  )}
                >
                  {ageLabel}
                </span>
              )
            )}
          </div>

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
            <div className="flex-1 min-w-0 flex items-baseline justify-between gap-2 pr-16">
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
      </ContextMenuTrigger>
      <ContextMenuContent>
        {pinned ? (
          <ContextMenuItem onSelect={() => unpinOrder(order.id)}>
            <PinOff className="w-3.5 h-3.5 mr-2" />
            Unpin
          </ContextMenuItem>
        ) : (
          <ContextMenuItem onSelect={() => pinOrder(order.id)}>
            <Pin className="w-3.5 h-3.5 mr-2" />
            Pin to top
          </ContextMenuItem>
        )}
        {order.status === "FULFILLED" && (
          <ContextMenuItem onSelect={() => manualArchive(order.id)}>
            <Archive className="w-3.5 h-3.5 mr-2" />
            Move to Past orders
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
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
  pinnedIds?: string[]
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
  pinnedIds = [],
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
            "w-4 h-4 text-[var(--chidi-text-muted)] transition-transform motion-reduce:transition-none",
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
              pinned={pinnedIds.includes(order.id)}
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
  /** All orders (any status) — needed so the Fulfilled tab can find older
      fulfilled orders that fell outside the today/week buckets. */
  orders: Order[]
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
  pinnedIds: string[]
  /** Bumps when archive overrides change so isArchived() recomputes. */
  archiveTick: number
}

function FilteredView({
  filter,
  orders,
  grouped,
  onOpenOrder,
  onOpenConversation,
  onFulfill,
  actionLoadingId,
  selectedOrderId = null,
  onPaymentConfirmed,
  pinnedIds,
  archiveTick,
}: FilteredViewProps) {
  // The full set of fulfilled orders (any age). doneToday/doneThisWeek are
  // recency buckets used in the all-tabs view; here in the Fulfilled tab we
  // need every fulfilled order so the active/archived split is honest.
  const allFulfilled = useMemo(
    () => orders.filter((o) => o.status === "FULFILLED"),
    [orders],
  )

  const fulfilledSplit = useMemo(() => {
    if (filter !== "fulfilled") return { active: [] as Order[], archived: [] as Order[] }
    const active: Order[] = []
    const archived: Order[] = []
    for (const o of allFulfilled) {
      if (isArchived(o)) archived.push(o)
      else active.push(o)
    }
    return { active, archived }
    // archiveTick + pinnedIds force re-eval when overrides / pins change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFulfilled, filter, archiveTick, pinnedIds])

  const { rows, copy } = useMemo(() => {
    switch (filter) {
      case "pending":
        return {
          rows: grouped.needsAttention,
          copy: { eyebrow: "Need you", title: orderCountText(grouped.needsAttention.length, "waiting on payment"), empty: "Nothing waiting on payment." },
        }
      case "in_progress":
        return {
          rows: grouped.inProgress,
          copy: { eyebrow: "In progress", title: orderCountText(grouped.inProgress.length, "ready to ship"), empty: "Nothing in progress." },
        }
      case "fulfilled":
        return {
          rows: fulfilledSplit.active,
          copy: { eyebrow: "Fulfilled", title: orderCountText(fulfilledSplit.active.length, "fulfilled in the last 30 days"), empty: "Nothing fulfilled in the last 30 days." },
        }
      case "cancelled":
        return {
          rows: grouped.cancelled,
          copy: { eyebrow: "Cancelled", title: orderCountText(grouped.cancelled.length, "cancelled"), empty: "No cancellations." },
        }
    }
  }, [filter, grouped, fulfilledSplit.active])

  // Pinned subset that lives within THIS tab's status filter (so the section
  // only shows in tabs where pinned orders match the current view).
  const tabPinned = useMemo(() => {
    if (pinnedIds.length === 0) return [] as Order[]
    const inTab = filter === "fulfilled" ? fulfilledSplit.active : rows
    const byId = new Map(inTab.map((o) => [o.id, o]))
    return pinnedIds.map((id) => byId.get(id)).filter(Boolean) as Order[]
  }, [pinnedIds, rows, fulfilledSplit.active, filter])

  // Render the unpinned subset (everything in `rows` that isn't pinned)
  const unpinnedRows = useMemo(() => {
    if (tabPinned.length === 0) return rows
    const pinnedSet = new Set(tabPinned.map((o) => o.id))
    return rows.filter((o) => !pinnedSet.has(o.id))
  }, [rows, tabPinned])

  // Pending + In progress get the action-card treatment (large, with quick fulfill)
  // Fulfilled + Cancelled get the compact row treatment (denser scanning)
  const useActionCards = filter === "pending" || filter === "in_progress"
  const tone = filter === "pending" ? "warn" : "neutral"

  // Empty state — only show when active list AND pinned list AND archived list are all empty
  const isFullyEmpty =
    unpinnedRows.length === 0 &&
    tabPinned.length === 0 &&
    (filter !== "fulfilled" || fulfilledSplit.archived.length === 0)

  if (isFullyEmpty) {
    return (
      <div className="max-w-4xl mx-auto w-full px-4 lg:px-6 py-12 text-center">
        <p className="ty-meta mb-1.5">{copy.eyebrow}</p>
        <h3 className="ty-section text-[var(--chidi-text-primary)]">{copy.empty}</h3>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto w-full px-4 lg:px-6 py-4 lg:py-6 space-y-5">
      {/* Pinned section — only when this tab has pinned orders within it */}
      {tabPinned.length > 0 && (
        <PinnedSection
          orders={tabPinned}
          useActionCards={useActionCards}
          tone={tone}
          filter={filter}
          actionLoadingId={actionLoadingId}
          onOpenOrder={onOpenOrder}
          onOpenConversation={onOpenConversation}
          onFulfill={onFulfill}
          onPaymentConfirmed={onPaymentConfirmed}
          selectedOrderId={selectedOrderId}
        />
      )}

      {/* Active list (unpinned) */}
      {useActionCards ? (
        <div className="space-y-2">
          {unpinnedRows.map((order) => (
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
              pinned={false}
            />
          ))}
        </div>
      ) : unpinnedRows.length > 0 ? (
        <div
          className={cn(
            "rounded-xl border border-[var(--chidi-border-default)] bg-[var(--card)] chidi-paper overflow-hidden",
            filter === "cancelled" && "opacity-80",
          )}
        >
          <ul className="divide-y divide-[var(--chidi-border-subtle)]">
            {unpinnedRows.map((order) => (
              <FulfilledRow
                key={order.id}
                order={order}
                onOpenOrder={onOpenOrder}
                selected={selectedOrderId === order.id}
                pinned={false}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {/* Past orders accordion — Fulfilled tab only */}
      {filter === "fulfilled" && (
        <PastOrdersAccordion
          orders={fulfilledSplit.archived}
          onOpenOrder={onOpenOrder}
          selectedOrderId={selectedOrderId}
        />
      )}
    </div>
  )
}

function orderCountText(count: number, suffix: string): string {
  return `${count} ${count === 1 ? "order" : "orders"} ${suffix}`
}

interface PinnedSectionProps {
  orders: Order[]
  useActionCards: boolean
  tone: "warn" | "neutral"
  filter: Exclude<OrdersFilter, "all">
  actionLoadingId: string | null
  onOpenOrder: (o: Order) => void
  onOpenConversation?: (id: string) => void
  onFulfill: (id: string) => void
  onPaymentConfirmed?: (orderId: string) => void
  selectedOrderId?: string | null
}

/**
 * The "Pinned" section that sits above the active list in every tab when
 * there are pinned orders matching the tab's filter. Visually distinct via
 * a small "PINNED" eyebrow + filled pin glyph on each row.
 */
function PinnedSection({
  orders,
  useActionCards,
  tone,
  filter,
  actionLoadingId,
  onOpenOrder,
  onOpenConversation,
  onFulfill,
  onPaymentConfirmed,
  selectedOrderId,
}: PinnedSectionProps) {
  return (
    <div className="rounded-xl border border-[var(--chidi-border-default)] bg-[var(--card)] p-3 lg:p-4">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Pin className="w-3 h-3 fill-current text-[var(--chidi-text-primary)]" strokeWidth={1.6} />
        <p className="ty-meta text-[var(--chidi-text-primary)] tracking-[0.08em]">
          PINNED · {orders.length}/{MAX_PINNED_ORDERS}
        </p>
      </div>
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
              pinned
            />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-[var(--chidi-border-subtle)]">
          {orders.map((order) => (
            <FulfilledRow
              key={order.id}
              order={order}
              onOpenOrder={onOpenOrder}
              selected={selectedOrderId === order.id}
              pinned
            />
          ))}
        </ul>
      )}
    </div>
  )
}

interface PastOrdersAccordionProps {
  orders: Order[]
  onOpenOrder: (o: Order) => void
  selectedOrderId?: string | null
}

/**
 * Past orders — fulfilled orders auto-archived after 30 days.
 * Collapsed by default; expands on click. Each archived row shows a "Restore
 * to active" button so the merchant can pull one back if needed.
 */
function PastOrdersAccordion({ orders, onOpenOrder, selectedOrderId }: PastOrdersAccordionProps) {
  const [open, setOpen] = useState(false)

  if (orders.length === 0) return null

  return (
    <div className="pt-2">
      <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice mb-1.5 px-1">
        Past orders are fulfilled more than 30 days ago.
      </p>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-3 px-3 rounded-xl border border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface)] hover:bg-white text-left transition-colors group"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Archive className="w-3.5 h-3.5 text-[var(--chidi-text-muted)]" />
          <span className="ty-card-title text-[var(--chidi-text-primary)]">
            Past orders ({orders.length})
          </span>
        </div>
        <ChevronRight
          className={cn(
            "w-4 h-4 text-[var(--chidi-text-muted)] transition-transform motion-reduce:transition-none",
            open && "rotate-90",
          )}
        />
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-[var(--chidi-border-subtle)] bg-[var(--card)] overflow-hidden opacity-90">
          <ul className="divide-y divide-[var(--chidi-border-subtle)]">
            {orders.map((order) => (
              <ArchivedRow
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

function ArchivedRow({
  order,
  onOpenOrder,
  selected = false,
}: {
  order: Order
  onOpenOrder: (o: Order) => void
  selected?: boolean
}) {
  const orderNumber = `#${order.id.slice(-6).toUpperCase()}`
  const fulfilledDate = order.fulfilled_at
    ? new Date(order.fulfilled_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
    : ""

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 hover:bg-[var(--chidi-surface)] transition-colors",
        selected && "bg-[var(--chidi-surface)] shadow-[inset_3px_0_0_0_var(--chidi-text-primary)]",
      )}
    >
      <button
        type="button"
        onClick={() => onOpenOrder(order)}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
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
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--chidi-text-primary)] truncate">
              {order.customer_name}
            </span>
            <span className="text-[10px] text-[var(--chidi-text-muted)] font-chidi-voice tabular-nums">
              {orderNumber}
            </span>
          </div>
          {fulfilledDate && (
            <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice mt-0.5">
              Fulfilled {fulfilledDate}
            </p>
          )}
        </div>
        <CurrencyAmount
          amount={order.total}
          currency={order.currency}
          showDualHover={false}
          className="text-sm font-medium text-[var(--chidi-text-primary)] tabular-nums w-16 text-right flex-shrink-0"
        />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          restoreOrder(order.id)
        }}
        className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-chidi-voice text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] px-2 py-1 rounded-md hover:bg-white transition-colors"
        title="Restore to active"
      >
        <RotateCcw className="w-3 h-3" />
        Restore
      </button>
    </div>
  )
}

function FulfilledRow({
  order,
  onOpenOrder,
  selected = false,
  pinned = false,
}: {
  order: Order
  onOpenOrder: (o: Order) => void
  selected?: boolean
  pinned?: boolean
}) {
  const orderNumber = `#${order.id.slice(-6).toUpperCase()}`
  // Show up to 3 product thumbs as a tiny stack
  const thumbs = order.items.slice(0, 3)

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--chidi-surface)] transition-colors text-left relative group",
            selected && "bg-[var(--chidi-surface)] shadow-[inset_3px_0_0_0_var(--chidi-text-primary)]",
          )}
        >
          <button
            type="button"
            onClick={() => onOpenOrder(order)}
            className="flex items-center gap-3 flex-1 min-w-0 active:scale-[0.997] transition-transform motion-reduce:transition-none text-left"
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
          <PinToggleButton pinned={pinned} onToggle={() => togglePin(order.id)} />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {pinned ? (
          <ContextMenuItem onSelect={() => unpinOrder(order.id)}>
            <PinOff className="w-3.5 h-3.5 mr-2" />
            Unpin
          </ContextMenuItem>
        ) : (
          <ContextMenuItem onSelect={() => pinOrder(order.id)}>
            <Pin className="w-3.5 h-3.5 mr-2" />
            Pin to top
          </ContextMenuItem>
        )}
        {order.status === "FULFILLED" && (
          <ContextMenuItem onSelect={() => manualArchive(order.id)}>
            <Archive className="w-3.5 h-3.5 mr-2" />
            Move to Past orders
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
