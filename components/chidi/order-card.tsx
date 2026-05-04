"use client"

/**
 * OrderCard — the draggable card primitive used by the Easels board.
 *
 * Built as a reusable surface so other places (a future "today's queue"
 * widget, the customer profile rail, the morning brief) can render the
 * same Order shape with the same affordances.
 *
 * Visual contract:
 *   ┌──────────────────────────────────┐
 *   │  Customer name      [chnl chip]  │  ← top
 *   │  "Wax print + 2 more"            │  ← middle
 *   │  ₦24,500                          │
 *   │  2h in stage         [Open ▸]    │  ← bottom (Open shows on hover)
 *   └──────────────────────────────────┘
 *
 * Channel-agnostic: WhatsApp + Telegram both render an outlined chip.
 * Anything else falls back to a small dot.
 *
 * Drag is implemented by the parent via @dnd-kit's useDraggable + cloning the
 * card into a DragOverlay. This component only needs to know whether it's
 * currently being dragged so it can dim/lift correctly.
 */

import { forwardRef, useState } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { TelegramIcon, WhatsAppIcon } from "@/components/ui/channel-icons"
import { CustomerCharacter } from "@/components/chidi/customer-character"
import { PaymentConfirmationWidget } from "@/components/chidi/payment-confirmation-widget"
import {
  type BoardStage,
  formatRelativeShort,
  getStageEnteredAt,
  isOverdue,
  normalizeChannel,
} from "@/lib/chidi/board-state"
import {
  type Order,
  formatOrderAmount,
} from "@/lib/api/orders"
import { cn } from "@/lib/utils"

interface OrderCardProps {
  order: Order
  stage: BoardStage
  /** True while the dnd-kit draggable is mid-drag — dims source. */
  isDragging?: boolean
  /** True when this card is the floating clone in the DragOverlay — lifts. */
  isOverlay?: boolean
  /** Greenflash 600ms after a successful drop into this column. */
  flash?: boolean
  /** Open the order in the orders detail panel. */
  onOpen?: () => void
  /** Fired after the merchant confirms payment via the Pending-pay popover. */
  onPaymentConfirmed?: () => void
  /** Keyboard focus marker — drives the focus ring. */
  focused?: boolean
  /** Tab index — set to 0 for the first card per column, -1 elsewhere. */
  tabIndex?: number
  /** Imperative key handler from the board (J/K/H/L/Enter/Space). */
  onKeyDown?: (e: React.KeyboardEvent) => void
  /** Drag attributes from useDraggable. */
  dragAttrs?: Record<string, unknown>
  /** Drag listeners from useDraggable. */
  dragListeners?: Record<string, unknown>
  /** CSS transform string from useDraggable. */
  dragTransform?: string
  className?: string
  style?: React.CSSProperties
}

export const OrderCard = forwardRef<HTMLDivElement, OrderCardProps>(
  function OrderCard(
    {
      order,
      stage,
      isDragging,
      isOverlay,
      flash,
      onOpen,
      onPaymentConfirmed,
      focused,
      tabIndex = -1,
      onKeyDown,
      dragAttrs,
      dragListeners,
      dragTransform,
      className,
      style,
    },
    ref,
  ) {
    const [payOpen, setPayOpen] = useState(false)
    const channel = normalizeChannel(order.channel)
    const enteredAt = getStageEnteredAt(order, stage)
    const overdue = isOverdue(order, stage)

    const itemSummary = (() => {
      const first = order.items?.[0]?.product_name?.trim()
      const more = (order.items?.length ?? 0) - 1
      if (!first) return "Items pending"
      if (more <= 0) return first
      return `${first} + ${more} more`
    })()

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={tabIndex}
        aria-label={`Order from ${order.customer_name}, ${formatOrderAmount(order.total, order.currency)}`}
        onKeyDown={onKeyDown}
        onClick={(e) => {
          // Drag handles are everywhere; click-to-open is the second affordance.
          // Ignore clicks that bubbled from interactive children (popover,
          // open pill).
          if ((e.target as HTMLElement).closest("[data-card-action]")) return
          onOpen?.()
        }}
        {...(dragAttrs as object)}
        {...(dragListeners as object)}
        className={cn(
          "group relative w-full text-left rounded-xl bg-[var(--card)] border",
          "border-[var(--chidi-border-default)] hover:border-[var(--chidi-text-muted)]",
          "px-3 py-2.5 cursor-grab active:cursor-grabbing select-none",
          "motion-safe:transition-[transform,box-shadow,opacity,border-color] motion-safe:duration-150",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-text-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
          focused && "ring-2 ring-[var(--chidi-text-primary)] ring-offset-2 ring-offset-[var(--background)]",
          isDragging && !isOverlay && "opacity-30",
          isOverlay && "shadow-2xl -translate-y-1 rotate-[1.5deg] cursor-grabbing border-[var(--chidi-text-primary)]",
          flash && "chidi-board-flash",
          className,
        )}
        style={{
          ...style,
          ...(dragTransform ? { transform: dragTransform } : null),
        }}
      >
        {/* Top row: customer character + name + channel chip */}
        <div className="flex items-center gap-2 min-w-0">
          <CustomerCharacter
            size="xs"
            name={order.customer_name}
            fallbackId={order.id}
          />
          <p className="flex-1 min-w-0 truncate text-[12.5px] font-semibold text-[var(--chidi-text-primary)] leading-snug">
            {order.customer_name || "Unknown customer"}
          </p>
          <ChannelChip kind={channel} rawLabel={order.channel} />
        </div>

        {/* Middle: items + total */}
        <p className="mt-1 text-[11.5px] text-[var(--chidi-text-secondary)] truncate leading-snug">
          {itemSummary}
        </p>
        <p className="mt-0.5 text-[12px] tabular-nums font-medium text-[var(--chidi-text-primary)]">
          {formatOrderAmount(order.total, order.currency)}
        </p>

        {/* Bottom: relative time + Open pill */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-[10.5px] uppercase tracking-wider tabular-nums",
              overdue
                ? "text-[var(--chidi-warn,#f5b856)] font-semibold"
                : "text-[var(--chidi-text-muted)]",
            )}
            title={`In ${stageLabel(stage)} for ${formatRelativeShort(enteredAt)}`}
          >
            {formatRelativeShort(enteredAt)}{overdue ? " · slow" : ""}
          </span>

          {onOpen && (
            <button
              data-card-action="open"
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onOpen()
              }}
              className={cn(
                "text-[10.5px] font-semibold px-2 py-0.5 rounded-full",
                "border border-[var(--chidi-border-default)] text-[var(--chidi-text-secondary)]",
                "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
                "hover:bg-[var(--chidi-surface)] hover:text-[var(--chidi-text-primary)]",
                "motion-safe:transition-opacity motion-safe:duration-150",
              )}
            >
              Open
            </button>
          )}
        </div>

        {/* Confirm-payment pill — only on PENDING_PAYMENT cards */}
        {stage === "PENDING_PAYMENT" && order.status === "PENDING_PAYMENT" && (
          <div className="mt-2 pt-2 border-t border-[var(--chidi-border-subtle)]">
            <Popover open={payOpen} onOpenChange={setPayOpen}>
              <PopoverTrigger asChild>
                <button
                  data-card-action="pay"
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "w-full inline-flex items-center justify-center gap-1.5",
                    "text-[11px] font-semibold rounded-md py-1.5 px-2",
                    "bg-[var(--chidi-win-soft,rgba(43,182,115,0.12))] text-[var(--chidi-win,#2bb673)]",
                    "border border-[var(--chidi-win,#2bb673)]/30",
                    "hover:bg-[var(--chidi-win,#2bb673)]/15",
                    "motion-safe:transition-colors",
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--chidi-win,#2bb673)]" />
                  Confirm payment
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                side="bottom"
                className="p-0 w-[320px] max-w-[92vw] overflow-hidden border-[var(--chidi-border-default)] bg-[var(--card)]"
                onClick={(e) => e.stopPropagation()}
              >
                <PaymentConfirmationWidget
                  order={order}
                  compact
                  onConfirm={() => {
                    setPayOpen(false)
                    onPaymentConfirmed?.()
                  }}
                  onReject={() => setPayOpen(false)}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
    )
  },
)

// =============================================================================
// Channel chip
// =============================================================================

function ChannelChip({
  kind,
  rawLabel,
}: {
  kind: ReturnType<typeof normalizeChannel>
  rawLabel?: string | null
}) {
  if (kind === "other") {
    return (
      <span
        title={rawLabel || "Other channel"}
        className="flex-shrink-0 text-[9.5px] uppercase tracking-wider px-1.5 py-0.5 rounded-md border border-[var(--chidi-border-subtle)] text-[var(--chidi-text-muted)]"
      >
        {rawLabel?.slice(0, 4) || "—"}
      </span>
    )
  }
  const Icon = kind === "whatsapp" ? WhatsAppIcon : TelegramIcon
  const label = kind === "whatsapp" ? "WhatsApp" : "Telegram"
  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md",
        "border border-[var(--chidi-border-subtle)] bg-transparent",
        "text-[var(--chidi-text-muted)]",
      )}
    >
      <Icon size={10} className="text-[var(--chidi-text-muted)]" />
      <span className="text-[9.5px] font-semibold uppercase tracking-wider">
        {kind === "whatsapp" ? "WA" : "TG"}
      </span>
    </span>
  )
}

// =============================================================================
// Helpers
// =============================================================================

function stageLabel(stage: BoardStage): string {
  switch (stage) {
    case "PENDING_PAYMENT":
      return "Pending pay"
    case "CONFIRMED":
      return "Confirmed"
    case "FULFILLED":
      return "Fulfilled"
    case "OUT_FOR_DELIVERY":
      return "Out for delivery"
  }
}
