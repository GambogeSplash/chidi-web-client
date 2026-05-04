"use client"

/**
 * DeliveryTrackingWidget — sticky in-chat strip that lights up whenever the
 * active conversation has an order with status === "out_for_delivery".
 *
 * Phase 1: no real GPS / map. We render a stylized "map" rectangle with a
 * tiny truck icon nudged across by ETA. The merchant gets:
 *   - One sentence: who is on the way, how long.
 *   - A "Mark delivered" button → marks delivered + fires chidi:auto-message
 *     with a courteous customer ping ("Has Tunde arrived? Just want to
 *     confirm 🙏").
 *
 * The widget only renders when there is a Delivery record AND its status is
 * "out_for_delivery". A delivered record collapses the widget away.
 */

import { useEffect, useMemo, useState } from "react"
import { Bike, Check, Loader2, Truck } from "lucide-react"
import {
  courierLabel,
  deliverySummary,
  formatEtaFromIso,
  getDelivery,
  markDelivered,
  modeLabel,
  providerLabel,
  subscribe as subscribeDeliveries,
  type Delivery,
} from "@/lib/chidi/deliveries"
import { cn } from "@/lib/utils"
import { chidiActed } from "@/lib/chidi/ai-toast"

interface DeliveryTrackingWidgetProps {
  /**
   * The order linked to the active conversation. Pass `null` if there is no
   * order; the widget will quietly render nothing.
   */
  orderId: string | null
  /**
   * If a conversation exists, we send the "Has the rider arrived?" auto-message
   * scoped to it via `chidi:auto-message`.
   */
  conversationId: string | null
  /**
   * Display name for the customer; used in the merchant-facing toast.
   */
  customerName?: string | null
}

export function DeliveryTrackingWidget({
  orderId,
  conversationId,
  customerName,
}: DeliveryTrackingWidgetProps) {
  const [delivery, setLocalDelivery] = useState<Delivery | null>(() =>
    orderId ? getDelivery(orderId) : null,
  )
  const [marking, setMarking] = useState(false)

  // Re-read from the store whenever it changes for our orderId (or globally).
  useEffect(() => {
    setLocalDelivery(orderId ? getDelivery(orderId) : null)
    if (!orderId) return
    return subscribeDeliveries((changedOrderId) => {
      if (changedOrderId === null || changedOrderId === orderId) {
        setLocalDelivery(getDelivery(orderId))
      }
    })
  }, [orderId])

  // Tick once a minute so the ETA string stays fresh while the widget sits open.
  const [nowTick, setNowTick] = useState(0)
  useEffect(() => {
    if (!delivery || delivery.status !== "out_for_delivery") return
    const id = window.setInterval(() => setNowTick((t) => t + 1), 60_000)
    return () => window.clearInterval(id)
  }, [delivery?.status])

  const etaLabel = useMemo(() => {
    void nowTick
    return formatEtaFromIso(delivery?.estimatedArrival)
  }, [delivery?.estimatedArrival, nowTick])

  if (!orderId || !delivery || delivery.status !== "out_for_delivery") {
    return null
  }

  const subjectName = (() => {
    if (delivery.mode === "own_dispatch") return delivery.riderName?.trim() || "Our rider"
    if (delivery.mode === "courier") return courierLabel(delivery.courier) || "Courier"
    return providerLabel(delivery.provider) || "On-demand rider"
  })()

  const Icon = delivery.mode === "courier" ? Truck : Bike

  // ETA progress fraction — used to position the truck dot on the placeholder
  // map. Best-effort: scheduledAt → estimatedArrival window, clamped to 0..1.
  const progress = (() => {
    void nowTick
    if (!delivery.estimatedArrival) return 0.5
    const start = new Date(delivery.scheduledAt).getTime()
    const end = new Date(delivery.estimatedArrival).getTime()
    const now = Date.now()
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0.5
    const frac = (now - start) / (end - start)
    if (frac <= 0) return 0.05
    if (frac >= 1) return 0.95
    return frac
  })()

  const handleMarkDelivered = () => {
    if (!orderId || marking) return
    setMarking(true)
    const saved = markDelivered(orderId)
    setMarking(false)
    if (!saved) return

    const message = `Has ${subjectName} arrived? Just want to confirm 🙏`
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("chidi:auto-message", {
          detail: {
            orderId,
            conversationId,
            message,
          },
        }),
      )
    }
    chidiActed({
      verb: "marked delivered",
      who: customerName || subjectName,
      preview: deliverySummary(saved),
    })
  }

  return (
    <div className="sticky top-0 z-10 px-3 pt-2 pb-2 border-b border-[var(--chidi-border-subtle)] bg-[var(--background)]">
      <div className="rounded-lg bg-[var(--chidi-surface)] border border-[var(--chidi-border-subtle)] overflow-hidden">
        {/* Map placeholder — token surface + a bike/truck dot pinned along
            the progress fraction. No real geo until Phase 2. */}
        <div
          className="relative h-16 bg-[var(--chidi-surface)] border-b border-[var(--chidi-border-subtle)] overflow-hidden"
          aria-hidden
        >
          {/* Faux road */}
          <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-[var(--chidi-border-default)]" />
          <div
            className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, transparent 0 8px, var(--chidi-text-muted) 8px 14px)",
              opacity: 0.35,
            }}
          />
          {/* Origin dot */}
          <span
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--chidi-text-muted)]"
            style={{ left: "4%" }}
          />
          {/* Destination dot */}
          <span
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--chidi-text-primary)]"
            style={{ right: "4%" }}
          />
          {/* Vehicle */}
          <span
            className="absolute top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--chidi-win)]/15 text-[var(--chidi-win)] motion-safe:transition-[left] duration-700 ease-out"
            style={{ left: `calc(${progress * 100}% - 12px)` }}
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
          </span>
        </div>

        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-chidi-voice text-[var(--chidi-text-primary)] truncate">
              <span className="font-medium">{subjectName}</span>{" "}
              <span className="text-[var(--chidi-text-secondary)]">
                is on the way
                {etaLabel ? <> · arriving {etaLabel}</> : null}
              </span>
            </p>
            <p className="text-[10.5px] text-[var(--chidi-text-muted)] font-chidi-voice tabular-nums truncate">
              {modeLabel(delivery.mode)} · {deliverySummary(delivery)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleMarkDelivered}
            disabled={marking}
            className={cn(
              "flex-shrink-0 inline-flex items-center gap-1.5 text-[12px] font-medium font-chidi-voice px-3 py-1.5 rounded-lg",
              "bg-[var(--chidi-success)] text-[var(--chidi-success-foreground)] hover:opacity-90 active:scale-[0.97] transition-colors motion-reduce:transition-none",
            )}
          >
            {marking ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            Mark delivered
          </button>
        </div>
      </div>
    </div>
  )
}
