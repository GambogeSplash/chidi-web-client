"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Check,
  Loader2,
  Image as ImageIcon,
  X,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  type Order,
  formatOrderAmount,
} from "@/lib/api/orders"
import {
  confirmPayment as persistConfirmation,
  getConfirmation,
  formatConfirmedAgo,
  type PaymentConfirmation,
} from "@/lib/chidi/payment-confirmations"
import { chidiWin } from "@/lib/chidi/ai-toast"
import { playWin } from "@/lib/chidi/sound"
import { hapticWin } from "@/lib/chidi/haptics"
import { cn } from "@/lib/utils"

interface PaymentConfirmationWidgetProps {
  order: Order
  /**
   * Called after a successful confirmation. Receives the persisted record
   * so callers can update local state, fire toasts, advance the order
   * status machine, etc.
   */
  onConfirm?: (record: PaymentConfirmation) => void
  /**
   * Called when the merchant taps "Mark not received" — the order stays in
   * PENDING_PAYMENT. Optional reason can be plumbed through later.
   */
  onReject?: (reason?: string) => void
  /** Compact variant for the chat banner (no big header). */
  compact?: boolean
  /** Hide the widget chrome (e.g. when already wrapped in a Sheet). */
  bare?: boolean
}

/**
 * The Payment Confirmation widget — surfaced on every PENDING_PAYMENT
 * order, both as an inline banner in chat and as a Sheet/Popover from
 * the orders list.
 *
 * Design notes:
 *  - Default amount = order total, but editable so the merchant can record
 *    a partial payment without leaving the dashboard.
 *  - Optional proof-of-payment image (transfer screenshot) stays on-device
 *    as a data URL; the merchant just needs the visual confirmation.
 *  - On confirm we persist locally, fire `chidi:payment-confirmed`, then
 *    animate a green check + win toast (honors prefers-reduced-motion).
 */
export function PaymentConfirmationWidget({
  order,
  onConfirm,
  onReject,
  compact = false,
  bare = false,
}: PaymentConfirmationWidgetProps) {
  // Existing record? Show the receipt instead of the form.
  const initialRecord = useMemo(() => getConfirmation(order.id), [order.id])
  const [record, setRecord] = useState<PaymentConfirmation | null>(initialRecord)

  const [amount, setAmount] = useState<string>(String(order.total))
  const [note, setNote] = useState<string>("")
  const [proofDataUrl, setProofDataUrl] = useState<string | undefined>(undefined)
  const [proofError, setProofError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [justConfirmed, setJustConfirmed] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    setReducedMotion(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false)
  }, [])

  const customerName = order.customer_name || "Customer"
  const orderNumber = `#${order.id.slice(-6).toUpperCase()}`

  const handleProofChange = (file: File | null) => {
    setProofError(null)
    if (!file) {
      setProofDataUrl(undefined)
      return
    }
    if (!file.type.startsWith("image/")) {
      setProofError("That file isn't an image.")
      return
    }
    // Cap at ~5MB so we don't blow out localStorage quota.
    if (file.size > 5 * 1024 * 1024) {
      setProofError("Image too large — keep it under 5MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === "string") setProofDataUrl(result)
    }
    reader.onerror = () => setProofError("Couldn't read that image.")
    reader.readAsDataURL(file)
  }

  const handleConfirm = () => {
    if (submitting) return
    const parsed = Number(amount)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setProofError("Enter the amount you received.")
      return
    }
    setSubmitting(true)
    const next = persistConfirmation(order.id, {
      amount: parsed,
      proofDataUrl,
      note: note.trim() || undefined,
    })
    setRecord(next)
    setJustConfirmed(true)
    playWin()
    hapticWin()
    chidiWin(`Payment from ${customerName} confirmed`, {
      description: `${formatOrderAmount(parsed, order.currency)} · order ${orderNumber}`,
    })
    onConfirm?.(next)
    // Settle the success animation, then leave the receipt on screen.
    window.setTimeout(() => setSubmitting(false), 400)
  }

  const handleReject = () => {
    if (submitting) return
    onReject?.()
  }

  // Already confirmed → receipt panel
  if (record) {
    return (
      <ReceiptPanel
        record={record}
        order={order}
        bare={bare}
        animateIn={justConfirmed && !reducedMotion}
      />
    )
  }

  const itemsSummary = order.items
    .slice(0, 2)
    .map((item) => `${item.product_name}${item.quantity > 1 ? ` ×${item.quantity}` : ""}`)
    .join(", ")
  const moreItems = order.items.length > 2 ? ` +${order.items.length - 2} more` : ""

  const containerClass = cn(
    !bare &&
      "rounded-xl bg-[var(--card)] border border-[var(--chidi-border-subtle)] chidi-paper shadow-sm",
    !bare && (compact ? "p-3" : "p-4"),
  )

  return (
    <div className={containerClass}>
      {/* Header — customer + total + reference */}
      <div className={cn("flex items-start gap-3", compact && "items-center")}>
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[var(--chidi-warning)]/15 text-[var(--chidi-warning)] flex items-center justify-center">
          <AlertCircle className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="ty-meta text-[var(--chidi-warning)]">Payment expected</p>
          <p className="ty-card-title text-[var(--chidi-text-primary)] mt-0.5 truncate">
            {customerName} owes you{" "}
            <span className="tabular-nums">
              {formatOrderAmount(order.total, order.currency)}
            </span>
          </p>
          <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice mt-0.5 truncate">
            Order {orderNumber} · {itemsSummary}{moreItems}
          </p>
        </div>
      </div>

      {/* Amount + reference fields */}
      <div className={cn("grid gap-2.5", compact ? "mt-3" : "mt-4 grid-cols-1")}>
        <label className="block">
          <span className="text-[11px] font-chidi-voice text-[var(--chidi-text-muted)] block mb-1">
            Amount received ({order.currency})
          </span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={submitting}
            className="w-full px-3 py-2 text-[14px] tabular-nums bg-[var(--chidi-surface)] border border-[var(--chidi-border-subtle)] rounded-lg text-[var(--chidi-text-primary)] outline-none focus-visible:border-[var(--chidi-text-muted)]/50 focus-visible:ring-[var(--chidi-win)]/20 focus-visible:ring-2 transition-[color,box-shadow] font-chidi-voice"
            placeholder={String(order.total)}
            aria-label="Amount received"
          />
        </label>

        <label className="block">
          <span className="text-[11px] font-chidi-voice text-[var(--chidi-text-muted)] block mb-1">
            Reference or note (optional)
          </span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={submitting}
            placeholder="e.g. GTBank transfer ref, paid via Opay"
            className="w-full px-3 py-2 text-[13px] bg-[var(--chidi-surface)] border border-[var(--chidi-border-subtle)] rounded-lg text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] outline-none focus-visible:border-[var(--chidi-text-muted)]/50 focus-visible:ring-[var(--chidi-win)]/20 focus-visible:ring-2 transition-[color,box-shadow] font-chidi-voice"
            aria-label="Reference or note"
          />
        </label>

        {/* Proof upload */}
        <div>
          <span className="text-[11px] font-chidi-voice text-[var(--chidi-text-muted)] block mb-1">
            Proof of payment (optional)
          </span>
          {proofDataUrl ? (
            <div className="flex items-start gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proofDataUrl}
                alt="Payment proof preview"
                className="w-16 h-16 object-cover rounded-md border border-[var(--chidi-border-subtle)]"
              />
              <button
                type="button"
                onClick={() => {
                  setProofDataUrl(undefined)
                  if (fileInputRef.current) fileInputRef.current.value = ""
                }}
                className="text-[12px] font-chidi-voice text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] inline-flex items-center gap-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Remove
              </button>
            </div>
          ) : (
            <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--chidi-surface)] border border-dashed border-[var(--chidi-border-subtle)] hover:bg-white text-[12px] font-chidi-voice text-[var(--chidi-text-secondary)] cursor-pointer transition-colors">
              <ImageIcon className="w-3.5 h-3.5" />
              Upload screenshot
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => handleProofChange(e.target.files?.[0] ?? null)}
                disabled={submitting}
              />
            </label>
          )}
          {proofError && (
            <p className="mt-1.5 text-[11px] text-[var(--chidi-danger,#D14747)] font-chidi-voice">
              {proofError}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className={cn("flex items-center gap-2", compact ? "mt-3" : "mt-4")}>
        <Button
          onClick={handleConfirm}
          disabled={submitting}
          className="flex-1 bg-[var(--chidi-success)] hover:bg-[var(--chidi-success)]/90 text-[var(--chidi-success-foreground)]"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
          ) : (
            <Check className="w-4 h-4 mr-1.5" />
          )}
          Confirm payment received
        </Button>
        <button
          type="button"
          onClick={handleReject}
          disabled={submitting}
          className="px-3 py-2 text-[12px] font-chidi-voice text-[var(--chidi-text-muted)] hover:text-[var(--chidi-danger,#D14747)] transition-colors"
        >
          Mark not received
        </button>
      </div>
    </div>
  )
}

interface ReceiptPanelProps {
  record: PaymentConfirmation
  order: Order
  bare?: boolean
  animateIn?: boolean
}

function ReceiptPanel({ record, order, bare, animateIn }: ReceiptPanelProps) {
  return (
    <div
      className={cn(
        !bare &&
          "rounded-xl bg-[var(--chidi-win-soft,rgba(108,249,216,0.12))] border border-[var(--chidi-win)]/30 p-4 chidi-paper",
        animateIn && "chidi-bubble-settle",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex-shrink-0 w-9 h-9 rounded-full bg-[var(--chidi-success)] text-[var(--chidi-success-foreground)] flex items-center justify-center",
            animateIn && "chidi-bubble-settle",
          )}
        >
          <Check className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="ty-meta text-[var(--chidi-success)]">Confirmed</p>
          <p className="ty-card-title text-[var(--chidi-text-primary)] mt-0.5">
            {formatOrderAmount(record.amount, order.currency)} from {order.customer_name || "customer"}
          </p>
          <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice mt-0.5">
            Confirmed {formatConfirmedAgo(record.confirmedAt)}
            {record.note ? ` · ${record.note}` : ""}
          </p>
          {record.proofDataUrl && (
            <div className="mt-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={record.proofDataUrl}
                alt="Payment proof"
                className="w-20 h-20 object-cover rounded-md border border-[var(--chidi-border-subtle)]"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
