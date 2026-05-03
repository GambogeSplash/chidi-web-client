"use client"

import { useMemo } from "react"
import { ShoppingBag, X } from "lucide-react"
import { CustomerCharacter } from "./customer-character"
import { ChidiMark } from "./chidi-mark"
import { CurrencyAmount } from "./currency-amount"
import { useCustomerDetail } from "@/lib/hooks/use-analytics"
import { formatCurrency, formatRelativeTime } from "@/lib/api/analytics"

interface CustomerProfileRailProps {
  customerName?: string | null
  customerId: string
  customerPhone?: string | null
  channelName?: string | null
  /** When provided, shown as a "X" close button to collapse the rail */
  onClose?: () => void
  /** Switches to the orders tab and pre-filters by this customer */
  onViewAllOrders?: (customerName: string) => void
  /** Switches to the orders tab AND auto-opens the specific order detail panel.
      Wired through DashboardContent → OrdersView's `initialOrderId` prop. */
  onOpenOrder?: (orderId: string) => void
  /** Spawns a Copilot conversation about this customer */
  onAskChidiAbout?: (customerName: string) => void
  className?: string
}

const VIP_THRESHOLD = 25_000

/**
 * Side rail surfaced on desktop when a conversation is open.
 *
 * Shows the *real* relationship: lifetime spend, order count, recency, and
 * the actual orders this customer has placed. All from the customers detail
 * endpoint, never seeded or fabricated. Stays quiet when the customer has
 * no history.
 */
export function CustomerProfileRail({
  customerName,
  customerId,
  customerPhone,
  channelName,
  onClose,
  onViewAllOrders,
  onOpenOrder,
  onAskChidiAbout,
  className,
}: CustomerProfileRailProps) {
  // customer_id from the conversation IS the phone (e.g. "+2348012345678")
  const { data, isLoading } = useCustomerDetail(customerId)
  const customer = data?.customer ?? null
  const orders = data?.orders ?? []

  const isVip = (customer?.total_spent ?? 0) >= VIP_THRESHOLD

  const recentOrders = useMemo(() => orders.slice(0, 3), [orders])

  const channelColor = channelName === "WhatsApp"
    ? "#25D366"
    : channelName === "Telegram"
      ? "#0088CC"
      : "#9CA3AF"

  return (
    <aside
      className={`hidden xl:flex flex-col flex-shrink-0 w-[300px] bg-[var(--chidi-surface)] border-l border-[var(--chidi-border-subtle)] overflow-y-auto ${className || ""}`}
      aria-label="Customer profile"
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-[var(--chidi-border-subtle)]">
        <div className="flex items-start justify-between mb-3">
          <p className="ty-meta text-[var(--chidi-text-muted)]">Customer</p>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 -mr-1 -mt-1 rounded text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-white"
              aria-label="Close profile"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Identity row: avatar + name + VIP star, left-aligned */}
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <CustomerCharacter
              name={customerName}
              fallbackId={customerId}
              size="lg"
            />
            {channelName && (
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--chidi-surface)]"
                style={{ backgroundColor: channelColor }}
                title={channelName}
                aria-label={channelName}
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[15px] font-medium text-[var(--chidi-text-primary)] truncate">
                {customerName || "Unknown customer"}
              </h3>
              {isVip && (
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium font-chidi-voice bg-amber-100 text-amber-800 uppercase tracking-wider flex-shrink-0"
                  aria-label="VIP customer"
                >
                  VIP
                </span>
              )}
            </div>
            {customerPhone && (
              <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice tabular-nums truncate mt-0.5">
                {customerPhone}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Relationship sentence — real numbers, written as a sentence */}
      <RelationshipLine
        loading={isLoading}
        firstTime={!customer || customer.order_count === 0}
        totalSpent={customer?.total_spent ?? 0}
        orderCount={customer?.order_count ?? 0}
        lastOrder={customer?.last_order ?? null}
      />

      {/* Recent orders — now with product thumbnails + click-through to the
          orders tab. Used to be text-only and unclickable. */}
      {!isLoading && recentOrders.length > 0 && (
        <div className="px-5 py-4 border-b border-[var(--chidi-border-subtle)]">
          <div className="flex items-center gap-1.5 mb-3">
            <ShoppingBag className="w-3 h-3 text-[var(--chidi-text-muted)]" />
            <p className="ty-meta text-[var(--chidi-text-muted)]">Recent orders</p>
          </div>
          <ul className="space-y-2">
            {recentOrders.map((order) => (
              <RecentOrderRow
                key={order.id}
                order={order}
                onOpen={() => {
                  // Deep-link to the specific order if the parent supports it.
                  // Falls back to the customer-filtered orders list otherwise.
                  if (onOpenOrder) onOpenOrder(order.id)
                  else onViewAllOrders?.(customerName ?? "")
                }}
              />
            ))}
          </ul>
        </div>
      )}

      <div className="flex-1" />

      {/* Cross-page actions */}
      <div className="px-5 py-3 border-t border-[var(--chidi-border-subtle)] space-y-1">
        {onViewAllOrders && customerName && (
          <button
            onClick={() => onViewAllOrders(customerName)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-chidi-voice text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:bg-white transition-colors active:scale-[0.98]"
          >
            <span className="inline-flex items-center gap-2">
              <ShoppingBag className="w-3.5 h-3.5" />
              View all orders
            </span>
            <span className="text-[var(--chidi-text-muted)]">→</span>
          </button>
        )}
        {onAskChidiAbout && customerName && (
          <button
            onClick={() => onAskChidiAbout(customerName)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-chidi-voice text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:bg-white transition-colors active:scale-[0.98]"
          >
            <span className="inline-flex items-center gap-2">
              <ChidiMark size={12} variant="muted" />
              Ask Chidi about {customerName.split(" ")[0]}
            </span>
            <span className="text-[var(--chidi-text-muted)]">→</span>
          </button>
        )}
      </div>
    </aside>
  )
}

interface RelationshipLineProps {
  loading: boolean
  firstTime: boolean
  totalSpent: number
  orderCount: number
  lastOrder: string | null
}

function RelationshipLine({ loading, firstTime, totalSpent, orderCount, lastOrder }: RelationshipLineProps) {
  if (loading) {
    return (
      <div className="px-5 py-4 border-b border-[var(--chidi-border-subtle)] space-y-2">
        <div className="h-3 w-3/4 chidi-skeleton" />
        <div className="h-3 w-1/2 chidi-skeleton" />
      </div>
    )
  }

  if (firstTime) {
    return (
      <div className="px-5 py-4 border-b border-[var(--chidi-border-subtle)]">
        <p className="text-[13px] font-chidi-voice text-[var(--chidi-text-secondary)]">
          First time talking to you.
        </p>
      </div>
    )
  }

  return (
    <div className="px-5 py-4 border-b border-[var(--chidi-border-subtle)]">
      <p className="text-[13px] font-chidi-voice text-[var(--chidi-text-secondary)] leading-relaxed">
        <CurrencyAmount
          amount={totalSpent}
          currency="NGN"
          compact
          showDualHover={false}
          className="font-medium text-[var(--chidi-text-primary)] tabular-nums"
        />{" "}
        across{" "}
        <span className="font-medium text-[var(--chidi-text-primary)] tabular-nums">
          {orderCount} {orderCount === 1 ? "order" : "orders"}
        </span>
        {lastOrder && (
          <>
            . Last one <span className="tabular-nums">{formatRelativeTime(lastOrder)}</span>.
          </>
        )}
      </p>
    </div>
  )
}

interface RecentOrderRowProps {
  order: {
    id: string
    items: any
    total: number
    created_at: string | null
    status: string
  }
  onOpen?: () => void
}

const STATUS_TONE: Record<string, { dot: string; label: string }> = {
  PENDING_PAYMENT: { dot: "bg-[var(--chidi-warning)]", label: "Pending" },
  CONFIRMED: { dot: "bg-[var(--chidi-text-muted)]", label: "Confirmed" },
  FULFILLED: { dot: "bg-[var(--chidi-win)]", label: "Fulfilled" },
  CANCELLED: { dot: "bg-[var(--chidi-text-muted)]", label: "Cancelled" },
}

function RecentOrderRow({ order, onOpen }: RecentOrderRowProps) {
  const items = Array.isArray(order.items) ? order.items : []
  const top = items[0] as { product_name?: string; quantity?: number; image_url?: string } | undefined
  const remaining = items.length - 1
  const tone = STATUS_TONE[order.status] || STATUS_TONE.CONFIRMED

  const summary = top?.product_name
    ? remaining > 0
      ? `${top.product_name} +${remaining}`
      : top.product_name
    : "Order"

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="w-full flex items-center gap-2.5 p-1.5 -mx-1.5 rounded-lg hover:bg-[var(--card)] transition-colors text-left active:scale-[0.99]"
      >
        {/* Product thumbnail (or initial fallback) */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-[var(--chidi-surface)] border border-[var(--chidi-border-subtle)] flex items-center justify-center">
          {top?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={top.image_url}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <ShoppingBag className="w-4 h-4 text-[var(--chidi-text-muted)]" strokeWidth={1.6} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] text-[var(--chidi-text-primary)] truncate font-medium font-sans">
              {summary}
            </span>
            <span className="text-[12px] text-[var(--chidi-text-primary)] tabular-nums flex-shrink-0 font-semibold font-sans">
              {formatCurrency(order.total)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
            <span className="text-[11px] text-[var(--chidi-text-muted)] font-sans">
              {tone.label}
            </span>
            {order.created_at && (
              <span className="text-[11px] text-[var(--chidi-text-muted)] ml-auto tabular-nums font-sans">
                {formatRelativeTime(order.created_at).replace(" ago", "")}
              </span>
            )}
          </div>
        </div>
      </button>
    </li>
  )
}
