"use client"

/**
 * StockMovementsPanel — vertical-timeline view of every stock change for a
 * single product, plus an inline "+ Record movement" form at the top.
 *
 * Why a Sheet (not a modal)?
 *   The merchant is often referencing the product itself while reading the
 *   ledger — a side sheet keeps the product card visible (esp. on desktop)
 *   and the dismissal gesture is the same swipe pattern the rest of the
 *   inventory surface uses.
 */

import { useEffect, useMemo, useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  Wrench,
  Plus,
  History,
} from "lucide-react"
import {
  getMovements,
  recordMovement,
  subscribe as subscribeMovements,
  MOVEMENT_LABELS,
  type StockMovement,
  type StockMovementKind,
} from "@/lib/chidi/stock-movements"
import { formatRelativeTime } from "@/lib/chidi/product-activity"
import { hapticSoft } from "@/lib/chidi/haptics"
import { cn } from "@/lib/utils"

interface StockMovementsPanelProps {
  productId: string | null
  productName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Fired after a movement is recorded so callers can reflect stock totals. */
  onMovementRecorded?: (movement: StockMovement) => void
}

const KIND_OPTIONS: { kind: StockMovementKind; label: string; sign: 1 | -1 }[] = [
  { kind: "received", label: "Received", sign: 1 },
  { kind: "sold", label: "Sold", sign: -1 },
  { kind: "damaged", label: "Damaged", sign: -1 },
  { kind: "adjustment", label: "Adjustment", sign: 1 },
]

export function StockMovementsPanel({
  productId,
  productName,
  open,
  onOpenChange,
  onMovementRecorded,
}: StockMovementsPanelProps) {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [kind, setKind] = useState<StockMovementKind>("received")
  const [qtyInput, setQtyInput] = useState("")
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Subscribe to ledger changes so the timeline reacts when other surfaces
  // (e.g. the inventory inline cell) record a movement while the panel is open.
  useEffect(() => {
    if (!open || !productId) return
    setMovements(getMovements(productId))
    return subscribeMovements(() => {
      if (productId) setMovements(getMovements(productId))
    })
  }, [open, productId])

  // Reset the form whenever the panel opens for a different product.
  useEffect(() => {
    if (open) {
      setKind("received")
      setQtyInput("")
      setNote("")
    }
  }, [open, productId])

  const handleRecord = () => {
    if (!productId) return
    const qtyAbs = parseInt(qtyInput, 10)
    if (!Number.isFinite(qtyAbs) || qtyAbs <= 0) return
    const sign = KIND_OPTIONS.find((k) => k.kind === kind)?.sign ?? 1
    setSubmitting(true)
    const m = recordMovement(productId, kind, sign * qtyAbs, note || undefined)
    setSubmitting(false)
    if (m) {
      hapticSoft()
      onMovementRecorded?.(m)
      setQtyInput("")
      setNote("")
    }
  }

  // Net change since seeding — gives the merchant a "running total" anchor
  // at the top so they can see whether the timeline is mostly inflows or
  // outflows at a glance.
  const netChange = useMemo(
    () => movements.reduce((sum, m) => sum + m.qty, 0),
    [movements],
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col gap-0 bg-[var(--background)]"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-[var(--chidi-border-subtle)]">
          <div className="flex items-center gap-2.5">
            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--chidi-surface)] flex items-center justify-center">
              <History className="w-4 h-4 text-[var(--chidi-text-primary)]" />
            </span>
            <div className="min-w-0">
              <SheetTitle className="text-[15px] font-semibold text-[var(--chidi-text-primary)] truncate">
                Stock movements
              </SheetTitle>
              <SheetDescription className="text-[12px] text-[var(--chidi-text-muted)] truncate">
                {productName ? productName : "Every change to this product's stock."}
              </SheetDescription>
            </div>
          </div>
          {movements.length > 0 && (
            <div className="mt-3 flex items-center gap-3 text-[11px] font-chidi-voice text-[var(--chidi-text-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="tabular-nums">{movements.length}</span> entr
                {movements.length === 1 ? "y" : "ies"}
              </span>
              <span aria-hidden className="text-[var(--chidi-border-default)]">
                |
              </span>
              <span className="inline-flex items-center gap-1.5">
                Net:{" "}
                <span
                  className={cn(
                    "tabular-nums font-semibold",
                    netChange > 0
                      ? "text-[var(--chidi-success)]"
                      : netChange < 0
                        ? "text-[var(--chidi-warning)]"
                        : "text-[var(--chidi-text-secondary)]",
                  )}
                >
                  {netChange > 0 ? "+" : ""}
                  {netChange}
                </span>
              </span>
            </div>
          )}
        </SheetHeader>

        {/* Record form — sits at the top so the merchant doesn't have to
            scroll the whole timeline before they can add an entry. */}
        <div className="px-5 py-4 border-b border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface)]/40">
          <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-chidi-voice mb-2">
            Record movement
          </p>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {KIND_OPTIONS.map((opt) => (
              <button
                key={opt.kind}
                type="button"
                onClick={() => setKind(opt.kind)}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-chidi-voice border motion-safe:active:scale-[0.97] transition-colors",
                  kind === opt.kind
                    ? "bg-[var(--chidi-text-primary)] text-[var(--background)] border-[var(--chidi-text-primary)]"
                    : "bg-white text-[var(--chidi-text-secondary)] border-[var(--chidi-border-subtle)] hover:border-[var(--chidi-border-default)]",
                )}
              >
                <KindGlyph kind={opt.kind} className="w-3 h-3" />
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value.replace(/[^0-9]/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && qtyInput) handleRecord()
              }}
              placeholder="Qty"
              inputMode="numeric"
              className="h-9 w-20 text-center tabular-nums bg-white border-[var(--chidi-border-subtle)]"
              aria-label="Quantity"
            />
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && qtyInput) handleRecord()
              }}
              placeholder="Note (optional)"
              className="flex-1 h-9 bg-white border-[var(--chidi-border-subtle)] text-[13px]"
              aria-label="Note"
            />
            <button
              type="button"
              onClick={handleRecord}
              disabled={!qtyInput || parseInt(qtyInput, 10) <= 0 || submitting}
              className="inline-flex items-center gap-1 h-9 px-3 rounded-md text-[12px] font-semibold font-chidi-voice bg-[var(--chidi-text-primary)] text-[var(--background)] hover:bg-[var(--chidi-text-primary)]/90 disabled:opacity-40 disabled:cursor-not-allowed motion-safe:active:scale-[0.97] transition-colors flex-shrink-0"
              aria-label="Record movement"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.4} />
              Add
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 text-[var(--chidi-text-muted)]">
              <span className="w-10 h-10 rounded-full bg-[var(--chidi-surface)] flex items-center justify-center mb-3">
                <History className="w-4 h-4" />
              </span>
              <p className="text-[13px] font-chidi-voice">No movements yet.</p>
              <p className="text-[11px] mt-1">
                Edit stock from the inventory list, or add one above.
              </p>
            </div>
          ) : (
            <ol className="relative pl-5">
              {/* Spine */}
              <span
                aria-hidden
                className="absolute left-[7px] top-1.5 bottom-1.5 w-px bg-[var(--chidi-border-subtle)]"
              />
              {movements.map((m) => (
                <li key={m.id} className="relative pb-4 last:pb-0">
                  <span
                    aria-hidden
                    className="absolute -left-5 top-1 w-3.5 h-3.5 rounded-full border-2 border-[var(--background)] flex items-center justify-center bg-[var(--chidi-surface)]"
                  >
                    <KindDot kind={m.kind} />
                  </span>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <KindGlyph
                          kind={m.kind}
                          className={cn("w-3.5 h-3.5", kindIconColor(m.kind))}
                        />
                        <span className="text-[13px] font-medium text-[var(--chidi-text-primary)]">
                          {MOVEMENT_LABELS[m.kind]}
                        </span>
                        <span
                          className={cn(
                            "text-[12px] font-semibold tabular-nums",
                            m.qty > 0
                              ? "text-[var(--chidi-success)]"
                              : "text-[var(--chidi-warning)]",
                          )}
                        >
                          {m.qty > 0 ? "+" : ""}
                          {m.qty}
                        </span>
                      </div>
                      {m.note && (
                        <p className="text-[12px] text-[var(--chidi-text-secondary)] mt-0.5 font-chidi-voice break-words">
                          {m.note}
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--chidi-text-muted)] tabular-nums font-chidi-voice flex-shrink-0">
                      {formatRelativeTime(m.at)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function kindIconColor(kind: StockMovementKind): string {
  switch (kind) {
    case "received":
      return "text-[var(--chidi-success)]"
    case "sold":
      return "text-[var(--chidi-win)]"
    case "damaged":
      return "text-[var(--chidi-danger)]"
    case "adjustment":
      return "text-[var(--chidi-text-secondary)]"
  }
}

function KindGlyph({
  kind,
  className,
}: {
  kind: StockMovementKind
  className?: string
}) {
  switch (kind) {
    case "received":
      return <ArrowDownToLine className={className} />
    case "sold":
      return <ArrowUpFromLine className={className} />
    case "damaged":
      return <AlertTriangle className={className} />
    case "adjustment":
      return <Wrench className={className} />
  }
}

function KindDot({ kind }: { kind: StockMovementKind }) {
  return (
    <span
      className={cn(
        "block w-1.5 h-1.5 rounded-full",
        kind === "received" && "bg-[var(--chidi-success)]",
        kind === "sold" && "bg-[var(--chidi-win)]",
        kind === "damaged" && "bg-[var(--chidi-danger)]",
        kind === "adjustment" && "bg-[var(--chidi-text-secondary)]",
      )}
    />
  )
}
