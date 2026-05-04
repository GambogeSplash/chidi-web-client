"use client"

import { useEffect, useState } from "react"
import { X, Package, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useIsMobile } from "@/components/ui/use-mobile"
import { cn } from "@/lib/utils"
import { useOrder } from "@/lib/hooks/use-orders"
import {
  formatOrderAmount,
  getOrderStatusDisplay,
  type Order,
} from "@/lib/api/orders"
import { PaymentConfirmationWidget } from "@/components/chidi/payment-confirmation-widget"

interface ChatSplitViewProps {
  /** Whether the split view is currently visible. */
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The id of the order to display alongside the chat. */
  orderId: string | null
  /** The chat surface — slot in the existing channel-chat tree. */
  children: React.ReactNode
}

/**
 * ChatSplitView — Arc-style "split with order" wrapper around the chat.
 *
 * Behavior:
 *   - At lg+ and when open, the chat takes 60% width and the order detail
 *     takes 40% width, both rendered side-by-side. The order panel slides in
 *     from the right (220ms ease-out, instant under prefers-reduced-motion).
 *   - Below lg, the order detail is presented as a Sheet (right side) over
 *     the chat. The merchant on mobile/tablet doesn't have screen real
 *     estate for a true split.
 *   - Esc closes (Radix Sheet handles this on mobile; we mount our own
 *     keyboard listener for the desktop split since it isn't a dialog).
 *   - Cmd+\ toggle is owned by the parent (channel-chat) so it can be
 *     wired to the active conversation context.
 */
export function ChatSplitView({
  open,
  onOpenChange,
  orderId,
  children,
}: ChatSplitViewProps) {
  const isMobile = useIsMobile()

  // Esc to close on desktop split. Radix Sheet handles this for mobile.
  useEffect(() => {
    if (!open || isMobile) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onOpenChange(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, isMobile, onOpenChange])

  if (isMobile) {
    return (
      <>
        {children}
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent
            side="right"
            className="bg-white p-0 w-full sm:max-w-md overflow-y-auto"
          >
            <SheetHeader className="px-4 pt-4 pb-2 border-b border-[var(--chidi-border-subtle)]">
              <SheetTitle className="text-[var(--chidi-text-primary)] text-[15px] flex items-center gap-2">
                <Package className="w-4 h-4 text-[var(--chidi-text-secondary)]" />
                Order detail
              </SheetTitle>
            </SheetHeader>
            <OrderDetailPanel orderId={orderId} />
          </SheetContent>
        </Sheet>
      </>
    )
  }

  // Desktop: side-by-side layout with sliding order panel.
  return (
    <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
      {/* Scoped slide-in keyframes — kept inline so we don't have to touch
          globals.css. Honors prefers-reduced-motion. */}
      <style jsx>{`
        @keyframes chidiSplitSlideIn {
          from {
            transform: translateX(8%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .chidi-split-pane-order {
          animation: chidiSplitSlideIn 220ms cubic-bezier(0.2, 0.8, 0.2, 1)
            both;
        }
        @media (prefers-reduced-motion: reduce) {
          .chidi-split-pane-order {
            animation: none;
          }
        }
      `}</style>
      <div
        className={cn(
          "min-w-0 flex flex-col chidi-split-pane-chat",
          open ? "lg:w-3/5" : "w-full",
        )}
      >
        {children}
      </div>
      {open && (
        <aside
          className={cn(
            "hidden lg:flex flex-col w-2/5 min-w-0 border-l border-[var(--chidi-border-subtle)] bg-white",
            "chidi-split-pane-order",
          )}
          aria-label="Order detail"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--chidi-border-subtle)]">
            <div className="flex items-center gap-2 min-w-0">
              <Package className="w-4 h-4 text-[var(--chidi-text-secondary)] flex-shrink-0" />
              <p className="text-[13px] font-medium text-[var(--chidi-text-primary)] truncate">
                Order detail
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-7 w-7 text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)]"
              aria-label="Close split view (Esc)"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <OrderDetailPanel orderId={orderId} />
          </div>
        </aside>
      )}
    </div>
  )
}

/**
 * OrderDetailPanel — compact, side-panel-friendly view of an order.
 *
 * Intentionally NOT a duplicate of orders-view's full detail. We show only
 * what the merchant needs to act on while talking to the customer:
 *   - Customer name + status pill
 *   - Total + items list
 *   - PaymentConfirmationWidget (when PENDING_PAYMENT)
 */
function OrderDetailPanel({ orderId }: { orderId: string | null }) {
  const { data: order, isLoading, isError } = useOrder(orderId)

  if (!orderId) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-[13px] text-[var(--chidi-text-muted)] font-chidi-voice">
          No order linked to this conversation.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="px-4 py-4 space-y-3" aria-label="Loading order">
        <div className="chidi-skeleton h-4 w-1/2 rounded-md" />
        <div className="chidi-skeleton h-3 w-3/4 rounded-md" />
        <div className="chidi-skeleton h-20 w-full rounded-md" />
        <div className="chidi-skeleton h-10 w-full rounded-md" />
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-[13px] text-[var(--chidi-text-muted)] font-chidi-voice">
          Couldn't load this order.
        </p>
      </div>
    )
  }

  const status = getOrderStatusDisplay(order.status)
  const isPending = order.status === "PENDING_PAYMENT"

  return (
    <div className="px-4 py-3 space-y-4">
      {/* Header: customer + status pill */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-[var(--chidi-text-primary)] truncate">
            {order.customer_name || "Customer"}
          </p>
          <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice tabular-nums truncate">
            #{order.id.slice(-6).toUpperCase()} · {order.channel || "—"}
          </p>
        </div>
        <span
          className={cn(
            "flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium font-chidi-voice whitespace-nowrap",
            status.bgColor,
            status.color,
          )}
        >
          {status.text}
        </span>
      </div>

      {/* Total */}
      <div className="rounded-md border border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface)] px-3 py-2.5">
        <p className="text-[10px] uppercase tracking-wide text-[var(--chidi-text-muted)] font-chidi-voice">
          Total
        </p>
        <p className="text-[20px] font-medium text-[var(--chidi-text-primary)] tabular-nums leading-tight">
          {formatOrderAmount(order.total, order.currency)}
        </p>
      </div>

      {/* Items */}
      <ItemsList order={order} />

      {/* Payment widget — surface the action when PENDING. For other states
          we render a quiet status line instead so the panel still feels
          inhabited. */}
      {isPending ? (
        <PaymentConfirmationWidget order={order} bare />
      ) : (
        <div className="rounded-md bg-[var(--chidi-surface)] px-3 py-2 flex items-center gap-2">
          <Receipt className="w-3.5 h-3.5 text-[var(--chidi-text-secondary)]" />
          <p className="text-[12px] text-[var(--chidi-text-secondary)] font-chidi-voice">
            {order.status === "CONFIRMED" && "Payment confirmed."}
            {order.status === "FULFILLED" && "Order fulfilled."}
            {order.status === "CANCELLED" && "Order cancelled."}
          </p>
        </div>
      )}
    </div>
  )
}

function ItemsList({ order }: { order: Order }) {
  if (!order.items?.length) {
    return (
      <p className="text-[12px] text-[var(--chidi-text-muted)] font-chidi-voice">
        No items recorded.
      </p>
    )
  }
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-wide text-[var(--chidi-text-muted)] font-chidi-voice">
        Items
      </p>
      <ul className="space-y-1">
        {order.items.map((item, idx) => (
          <li
            key={`${item.product_id ?? "x"}-${idx}`}
            className="flex items-baseline justify-between gap-3 text-[13px]"
          >
            <span className="text-[var(--chidi-text-primary)] truncate">
              <span className="tabular-nums text-[var(--chidi-text-muted)] mr-1.5">
                {item.quantity}×
              </span>
              {item.product_name}
            </span>
            <span className="text-[var(--chidi-text-secondary)] tabular-nums flex-shrink-0">
              {formatOrderAmount(
                item.subtotal ?? item.unit_price * item.quantity,
                order.currency,
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
