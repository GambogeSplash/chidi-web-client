"use client"

/**
 * DeliveryHandoffPanel — three-mode delivery handoff form for the order
 * detail panel. Appears once an order is FULFILLED (or CONFIRMED + paid).
 *
 * Modes:
 *   1. In-house dispatch — rider name + phone + bike # + ETA
 *   2. Courier            — pick GIG / Sendbox / Kwik / Faramove + tracking# + ETA
 *   3. On-demand bike     — pick Glovo / Bolt / Faramove on-demand + ETA
 *
 * On submit we persist via setDelivery() and mark the delivery as
 * out_for_delivery so the orders list pill + chat tracking widget light up.
 * We also fire `chidi:auto-message` so any future inbox surface can pre-draft
 * a "Your order is on the way" message to the customer.
 *
 * Once a delivery exists, the panel collapses to a compact "✓ Out for
 * delivery via {mode}" state with a "View tracking" affordance (which simply
 * opens the conversation if linked, since the chat is the live tracking
 * surface in Phase 1).
 */

import { useEffect, useMemo, useState } from "react"
import {
  Bike,
  Truck,
  Zap,
  Check,
  ChevronRight,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  COURIERS,
  ON_DEMAND_PROVIDERS,
  courierColor,
  courierLabel,
  deliverySummary,
  formatEtaFromIso,
  getDelivery,
  modeLabel,
  providerColor,
  providerLabel,
  setDelivery,
  subscribe as subscribeDeliveries,
  type Courier,
  type Delivery,
  type DeliveryMode,
  type OnDemandProvider,
} from "@/lib/chidi/deliveries"
import type { Order } from "@/lib/api/orders"
import { chidiActed } from "@/lib/chidi/ai-toast"

interface DeliveryHandoffPanelProps {
  order: Order
  /**
   * Optional callback so the order detail can scroll/jump to the chat
   * when the merchant taps "View tracking" on the collapsed view.
   */
  onOpenConversation?: (conversationId: string) => void
}

const MODE_TABS: Array<{
  id: DeliveryMode
  label: string
  icon: typeof Bike
  blurb: string
}> = [
  {
    id: "own_dispatch",
    label: "In-house dispatch",
    icon: Bike,
    blurb: "Your rider on a bike.",
  },
  {
    id: "courier",
    label: "Courier",
    icon: Truck,
    blurb: "GIG, Sendbox, Kwik, Faramove.",
  },
  {
    id: "on_demand",
    label: "On-demand bike",
    icon: Zap,
    blurb: "Glovo, Bolt, Faramove on-demand.",
  },
]

export function DeliveryHandoffPanel({
  order,
  onOpenConversation,
}: DeliveryHandoffPanelProps) {
  // Subscribe to the deliveries store so this surface re-renders whenever
  // setDelivery is called from any other surface.
  const [delivery, setLocalDelivery] = useState<Delivery | null>(() =>
    getDelivery(order.id),
  )
  useEffect(() => {
    setLocalDelivery(getDelivery(order.id))
    return subscribeDeliveries((changedOrderId) => {
      if (changedOrderId === null || changedOrderId === order.id) {
        setLocalDelivery(getDelivery(order.id))
      }
    })
  }, [order.id])

  const [activeMode, setActiveMode] = useState<DeliveryMode>(
    () => delivery?.mode ?? "own_dispatch",
  )

  // Form state for the active tab. Stored as one bag so the merchant can
  // flip tabs without losing what they typed in another. Pre-fill from any
  // existing delivery record when present.
  const [formState, setFormState] = useState({
    riderName: delivery?.riderName ?? "",
    riderPhone: delivery?.riderPhone ?? "",
    bikeNumber: delivery?.bikeNumber ?? "",
    courier: (delivery?.courier ?? "GIG") as Courier,
    trackingNumber: delivery?.trackingNumber ?? "",
    provider: (delivery?.provider ?? "GLOVO") as OnDemandProvider,
    etaMinutes: 30,
  })

  // ===== Collapsed (already submitted) view =================================
  // Once a delivery is out_for_delivery, the merchant doesn't need the form
  // every time they open the order. They need a quiet receipt + a way back
  // into the chat where the customer is asking "where's my package?".
  if (delivery && delivery.status !== "scheduled") {
    return (
      <CollapsedPanel
        delivery={delivery}
        order={order}
        onOpenConversation={onOpenConversation}
        onEdit={() => {
          // Re-open the form by clearing the status to "scheduled" — but
          // we keep all the typed fields so the merchant can tweak.
          setDelivery(order.id, { status: "scheduled" })
        }}
      />
    )
  }

  // ===== Open form view =====================================================
  const handleSubmit = () => {
    const etaIso = new Date(
      Date.now() + formState.etaMinutes * 60_000,
    ).toISOString()
    const base: Partial<Delivery> & { mode: DeliveryMode } = {
      mode: activeMode,
      status: "out_for_delivery",
      scheduledAt: new Date().toISOString(),
      estimatedArrival: etaIso,
    }
    if (activeMode === "own_dispatch") {
      base.riderName = formState.riderName.trim() || undefined
      base.riderPhone = formState.riderPhone.trim() || undefined
      base.bikeNumber = formState.bikeNumber.trim() || undefined
    } else if (activeMode === "courier") {
      base.courier = formState.courier
      base.trackingNumber = formState.trackingNumber.trim() || undefined
    } else {
      base.provider = formState.provider
    }
    const saved = setDelivery(order.id, base)
    if (!saved) return

    // Auto-message hook — any future inbox surface can listen for this and
    // pre-fill the reply input with a customer-facing delivery message.
    if (typeof window !== "undefined") {
      const message = composeCustomerMessage(saved)
      window.dispatchEvent(
        new CustomEvent("chidi:auto-message", {
          detail: {
            orderId: order.id,
            conversationId: order.conversation_id ?? null,
            message,
          },
        }),
      )
      // Light merchant-facing ack so they see the action register.
      chidiActed({
        verb: "handed off",
        who: order.customer_name || "the customer",
        preview: deliverySummary(saved),
      })
    }
  }

  const canSubmit = (() => {
    if (activeMode === "own_dispatch") {
      return formState.riderName.trim().length > 0
    }
    if (activeMode === "courier") {
      return !!formState.courier
    }
    return !!formState.provider
  })()

  return (
    <div className="bg-white rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[var(--chidi-text-primary)]">
          Hand off for delivery
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)]">
          Phase 1
        </span>
      </div>

      {/* Mode tab strip — three even pills, icon + label */}
      <div
        role="tablist"
        aria-label="Delivery mode"
        className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[var(--chidi-surface)] mb-3"
      >
        {MODE_TABS.map((tab) => {
          const isActive = activeMode === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveMode(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-[11px] font-chidi-voice transition-colors motion-reduce:transition-none",
                isActive
                  ? "bg-[var(--card)] text-[var(--chidi-text-primary)] shadow-sm"
                  : "text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)]",
              )}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
              <span className="leading-tight text-center">{tab.label}</span>
            </button>
          )
        })}
      </div>

      <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice mb-3">
        {MODE_TABS.find((t) => t.id === activeMode)?.blurb}
      </p>

      {/* Form — three small bodies, one per mode */}
      {activeMode === "own_dispatch" && (
        <div className="space-y-3">
          <FieldRow>
            <Label htmlFor="hd-rider-name" className="text-[11px] text-[var(--chidi-text-muted)]">
              Rider name
            </Label>
            <Input
              id="hd-rider-name"
              value={formState.riderName}
              onChange={(e) =>
                setFormState((s) => ({ ...s, riderName: e.target.value }))
              }
              placeholder="e.g. Tunde"
              className="bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)]"
            />
          </FieldRow>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow>
              <Label htmlFor="hd-rider-phone" className="text-[11px] text-[var(--chidi-text-muted)]">
                Phone
              </Label>
              <Input
                id="hd-rider-phone"
                value={formState.riderPhone}
                onChange={(e) =>
                  setFormState((s) => ({ ...s, riderPhone: e.target.value }))
                }
                placeholder="0801…"
                className="bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)]"
              />
            </FieldRow>
            <FieldRow>
              <Label htmlFor="hd-bike-no" className="text-[11px] text-[var(--chidi-text-muted)]">
                Bike #
              </Label>
              <Input
                id="hd-bike-no"
                value={formState.bikeNumber}
                onChange={(e) =>
                  setFormState((s) => ({ ...s, bikeNumber: e.target.value }))
                }
                placeholder="23"
                className="bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)]"
              />
            </FieldRow>
          </div>
          <EtaPicker
            value={formState.etaMinutes}
            onChange={(v) => setFormState((s) => ({ ...s, etaMinutes: v }))}
          />
        </div>
      )}

      {activeMode === "courier" && (
        <div className="space-y-3">
          <CarrierGrid
            options={COURIERS.map((c) => ({ id: c.id, label: c.label, color: c.color }))}
            value={formState.courier}
            onChange={(id) => setFormState((s) => ({ ...s, courier: id as Courier }))}
          />
          <FieldRow>
            <Label htmlFor="hd-tracking" className="text-[11px] text-[var(--chidi-text-muted)]">
              Tracking number{" "}
              <span className="text-[var(--chidi-text-muted)]">(optional)</span>
            </Label>
            <Input
              id="hd-tracking"
              value={formState.trackingNumber}
              onChange={(e) =>
                setFormState((s) => ({ ...s, trackingNumber: e.target.value }))
              }
              placeholder="e.g. ABC123XYZ"
              className="bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)] font-mono tabular-nums"
            />
          </FieldRow>
          <EtaPicker
            value={formState.etaMinutes}
            onChange={(v) => setFormState((s) => ({ ...s, etaMinutes: v }))}
            label="Estimated arrival"
          />
        </div>
      )}

      {activeMode === "on_demand" && (
        <div className="space-y-3">
          <CarrierGrid
            options={ON_DEMAND_PROVIDERS.map((p) => ({
              id: p.id,
              label: p.label,
              color: p.color,
            }))}
            value={formState.provider}
            onChange={(id) =>
              setFormState((s) => ({ ...s, provider: id as OnDemandProvider }))
            }
          />
          <EtaPicker
            value={formState.etaMinutes}
            onChange={(v) => setFormState((s) => ({ ...s, etaMinutes: v }))}
            label="Estimated arrival"
          />
        </div>
      )}

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full mt-4 bg-[var(--chidi-text-primary)] hover:bg-[var(--chidi-text-primary)]/90 text-[var(--chidi-bg-primary)]"
      >
        <Check className="w-4 h-4 mr-2" />
        Send to delivery
      </Button>
    </div>
  )
}

// =============================================================================
// Collapsed (out_for_delivery / delivered) view
// =============================================================================

function CollapsedPanel({
  delivery,
  order,
  onOpenConversation,
  onEdit,
}: {
  delivery: Delivery
  order: Order
  onOpenConversation?: (conversationId: string) => void
  onEdit: () => void
}) {
  const isDelivered = delivery.status === "delivered"
  const summary = deliverySummary(delivery)

  return (
    <div className="bg-white rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
            isDelivered
              ? "bg-[var(--chidi-success)]/15 text-[var(--chidi-success)]"
              : "bg-[var(--chidi-win)]/15 text-[var(--chidi-win)]",
          )}
          aria-hidden
        >
          {isDelivered ? (
            <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
          ) : delivery.mode === "courier" ? (
            <Truck className="w-4 h-4" strokeWidth={1.8} />
          ) : (
            <Bike className="w-4 h-4" strokeWidth={1.8} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-[var(--chidi-text-primary)] leading-tight">
            {isDelivered
              ? `Delivered via ${modeLabel(delivery.mode).toLowerCase()}`
              : `Out for delivery via ${modeLabel(delivery.mode).toLowerCase()}`}
          </p>
          <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice mt-0.5 truncate">
            {summary}
          </p>
        </div>
        {!isDelivered && (
          <button
            type="button"
            onClick={onEdit}
            className="text-[11px] font-chidi-voice text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] underline underline-offset-2"
          >
            Edit
          </button>
        )}
      </div>

      {!isDelivered && order.conversation_id && onOpenConversation && (
        <button
          type="button"
          onClick={() => onOpenConversation(order.conversation_id!)}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-[12px] font-chidi-voice text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] py-2 rounded-lg transition-colors"
        >
          View tracking
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

// =============================================================================
// Sub-primitives
// =============================================================================

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-1">{children}</div>
}

function CarrierGrid({
  options,
  value,
  onChange,
}: {
  options: Array<{ id: string; label: string; color: string }>
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div role="radiogroup" className="grid grid-cols-2 gap-1.5">
      {options.map((opt) => {
        const isActive = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] font-chidi-voice transition-colors motion-reduce:transition-none text-left",
              isActive
                ? "border-[var(--chidi-text-primary)] bg-[var(--chidi-surface)] text-[var(--chidi-text-primary)]"
                : "border-[var(--chidi-border-subtle)] text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:border-[var(--chidi-text-muted)]",
            )}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: opt.color }}
              aria-hidden
            />
            <span className="truncate">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function EtaPicker({
  value,
  onChange,
  label = "ETA",
}: {
  value: number
  onChange: (mins: number) => void
  label?: string
}) {
  const presets = useMemo(
    () => [
      { mins: 15, label: "15 min" },
      { mins: 30, label: "30 min" },
      { mins: 60, label: "1 hr" },
      { mins: 120, label: "2 hr" },
    ],
    [],
  )
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[11px] text-[var(--chidi-text-muted)]">{label}</Label>
      <div className="flex items-center gap-1.5 flex-wrap">
        {presets.map((p) => {
          const isActive = value === p.mins
          return (
            <button
              key={p.mins}
              type="button"
              onClick={() => onChange(p.mins)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-chidi-voice border transition-colors motion-reduce:transition-none",
                isActive
                  ? "border-[var(--chidi-text-primary)] bg-[var(--chidi-text-primary)] text-[var(--chidi-bg-primary)]"
                  : "border-[var(--chidi-border-subtle)] text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)]",
              )}
            >
              {p.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// =============================================================================
// Compose a customer-facing delivery message from the delivery record.
// Used by the chidi:auto-message event so the future inbox surface can
// pre-fill the reply input.
// =============================================================================

function composeCustomerMessage(d: Delivery): string {
  const eta = formatEtaFromIso(d.estimatedArrival)
  if (d.mode === "own_dispatch") {
    const who = d.riderName?.trim() || "Our rider"
    const bike = d.bikeNumber?.trim() ? ` on bike ${d.bikeNumber.trim()}` : ""
    const phone = d.riderPhone?.trim() ? `, call him on ${d.riderPhone.trim()}` : ""
    return `Your order is on the way — ${who}${bike}, arriving ${eta || "shortly"}${phone}.`
  }
  if (d.mode === "courier") {
    const c = courierLabel(d.courier) || "your courier"
    const ref = d.trackingNumber?.trim() ? ` (tracking #${d.trackingNumber.trim()})` : ""
    return `Your order has shipped via ${c}${ref}. Estimated arrival ${eta || "soon"}.`
  }
  const p = providerLabel(d.provider) || "an on-demand rider"
  return `${p} is on the way with your order — arriving ${eta || "shortly"}.`
}
