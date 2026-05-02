"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"
import { ChidiMark } from "./chidi-mark"
import { formatCurrency } from "@/lib/utils/currency"
import type { Order } from "@/lib/api/orders"

interface ReceiptPreviewProps {
  order: Order
  businessName: string
  open: boolean
  onClose: () => void
}

/**
 * Customer receipt — engineered to feel like an actual paper receipt, not a
 * branded admin invoice card.
 *
 *   - Tall narrow form (≈340px)
 *   - Off-white paper tone (#FBF6EE) with subtle grain (chidi-paper)
 *   - Monospace throughout (Geist Mono via Tailwind font-mono)
 *   - Centered composition, dashed/asterisk dividers between sections
 *   - Jagged perforation top + bottom (CSS mask)
 *   - Tabular numerics, right-aligned line totals
 *   - Big bold TOTAL at the bottom; AMOUNT DUE if unpaid
 *   - CSS-generated barcode pattern
 *   - "Powered by Chidi" tasteful footer
 *
 * Reference: Square POS receipt, Toast receipt, classic thermal-printer paper.
 */
export function ReceiptPreview({ order, businessName, open, onClose }: ReceiptPreviewProps) {
  const subtotal = order.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
  const isPaid = order.status === "FULFILLED" || order.status === "CONFIRMED"
  const orderNo = order.id.slice(-8).toUpperCase()
  const date = new Date(order.created_at)

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[360px] p-0 bg-transparent border-0 shadow-none">
        <DialogTitle className="sr-only">Customer receipt preview</DialogTitle>

        {/* Receipt itself — mock paper with jagged perforated top + bottom */}
        <div
          id="chidi-receipt-print"
          className="relative chidi-paper font-mono text-[var(--chidi-text-primary)] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.45)]"
          style={{
            backgroundColor: "#FBF6EE",
            // Triangular zigzag top + bottom edges via CSS mask. 10px tall sawtooth.
            WebkitMask:
              "linear-gradient(135deg, #000 25%, transparent 25%) 0 0/12px 10px, linear-gradient(-135deg, #000 25%, transparent 25%) 6px 0/12px 10px, linear-gradient(135deg, #000 25%, transparent 25%) 0 100%/12px 10px, linear-gradient(-135deg, #000 25%, transparent 25%) 6px 100%/12px 10px, linear-gradient(#000, #000) 0 10px / 100% calc(100% - 20px)",
            WebkitMaskRepeat: "repeat-x, repeat-x, repeat-x, repeat-x, no-repeat",
            mask:
              "linear-gradient(135deg, #000 25%, transparent 25%) 0 0/12px 10px, linear-gradient(-135deg, #000 25%, transparent 25%) 6px 0/12px 10px, linear-gradient(135deg, #000 25%, transparent 25%) 0 100%/12px 10px, linear-gradient(-135deg, #000 25%, transparent 25%) 6px 100%/12px 10px, linear-gradient(#000, #000) 0 10px / 100% calc(100% - 20px)",
            maskRepeat: "repeat-x, repeat-x, repeat-x, repeat-x, no-repeat",
          }}
        >
          <div className="relative z-[2] px-7 py-12 space-y-3">
            {/* Header — merchant name centered, all caps, small caps feel */}
            <div className="text-center space-y-1">
              <p className="text-[10px] tracking-[0.3em] text-[var(--chidi-text-muted)]">
                * RECEIPT *
              </p>
              <h2
                className="font-serif text-xl tracking-tight leading-tight"
                style={{ color: "#2D1810" }}
              >
                {businessName}
              </h2>
              <p className="text-[10px] tracking-wider text-[var(--chidi-text-muted)] uppercase">
                Powered by Chidi
              </p>
            </div>

            <DashedDivider />

            {/* Order meta — left/right pairs */}
            <div className="text-[11px] space-y-1.5 leading-snug">
              <MetaRow label="ORDER" value={`#${orderNo}`} />
              <MetaRow
                label="DATE"
                value={date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
              />
              <MetaRow
                label="TIME"
                value={date.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: false })}
              />
              {order.customer_name && (
                <MetaRow label="CUSTOMER" value={order.customer_name} />
              )}
              {order.delivery_address && (
                <div className="pt-1">
                  <span className="text-[10px] text-[var(--chidi-text-muted)] tracking-wider">SHIP TO</span>
                  <p className="text-[11px] leading-snug mt-0.5">{order.delivery_address}</p>
                </div>
              )}
            </div>

            <DashedDivider />

            {/* Items */}
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="text-[11px] leading-snug">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[var(--chidi-text-primary)] truncate">
                      {item.product_name}
                    </span>
                    <span className="tabular-nums flex-shrink-0">
                      {formatCurrency(item.unit_price * item.quantity, order.currency)}
                    </span>
                  </div>
                  {item.quantity > 1 && (
                    <div className="text-[10px] text-[var(--chidi-text-muted)] tabular-nums">
                      {item.quantity} × {formatCurrency(item.unit_price, order.currency)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <DashedDivider />

            {/* Subtotal + total */}
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-baseline justify-between text-[var(--chidi-text-secondary)]">
                <span>SUBTOTAL</span>
                <span className="tabular-nums">{formatCurrency(subtotal, order.currency)}</span>
              </div>
              <div className="flex items-baseline justify-between pt-2">
                <span className="text-[12px] tracking-[0.2em] font-medium">TOTAL</span>
                <span
                  className="font-serif text-xl tabular-nums tracking-tight"
                  style={{ color: "#2D1810" }}
                >
                  {formatCurrency(order.total, order.currency)}
                </span>
              </div>
            </div>

            {/* Paid stamp / amount due */}
            <div className="flex justify-center pt-1">
              {isPaid ? (
                <div
                  className="inline-block border-2 px-4 py-1 -rotate-3"
                  style={{
                    borderColor: "#1F4023",
                    color: "#1F4023",
                  }}
                >
                  <p className="text-[12px] tracking-[0.25em] font-bold leading-none">PAID</p>
                </div>
              ) : (
                <div
                  className="inline-block border-2 border-dashed px-4 py-1"
                  style={{
                    borderColor: "#3F1808",
                    color: "#3F1808",
                  }}
                >
                  <p className="text-[10px] tracking-[0.25em] leading-none">AMOUNT DUE</p>
                </div>
              )}
            </div>

            <StarDivider />

            {/* Thanks line */}
            <p className="text-center text-[11px] leading-snug px-2 text-[var(--chidi-text-secondary)]">
              Thank you for shopping with{" "}
              <span className="font-serif text-[var(--chidi-text-primary)]">{businessName}</span>.
              <br />
              Come again soon.
            </p>

            <StarDivider />

            {/* Generated barcode (CSS-only) */}
            <div className="space-y-1">
              <Barcode seed={orderNo} />
              <p className="text-center text-[10px] tabular-nums tracking-[0.25em] text-[var(--chidi-text-secondary)]">
                {orderNo}
              </p>
            </div>

            {/* Tiny footer */}
            <div className="flex items-center justify-center gap-1.5 pt-2 text-[9px] text-[var(--chidi-text-muted)] tracking-wider uppercase">
              <ChidiMark size={10} variant="muted" />
              <span>Sent by Chidi · chidi.app</span>
            </div>
          </div>
        </div>

        {/* Action bar — outside the receipt itself */}
        <div className="flex items-center justify-between gap-2 mt-3 print:hidden">
          <p className="text-[11px] text-white/85 font-chidi-voice">
            This is what your customer sees.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="bg-white/95 hover:bg-white text-[var(--chidi-text-primary)] border-white/30"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print / save PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DashedDivider() {
  return (
    <div className="border-t border-dashed border-[var(--chidi-text-muted)]/40" aria-hidden />
  )
}

function StarDivider() {
  return (
    <p
      className="text-center text-[10px] tracking-[0.5em] text-[var(--chidi-text-muted)] select-none"
      aria-hidden
    >
      * * * * * * *
    </p>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[10px] text-[var(--chidi-text-muted)] tracking-wider whitespace-nowrap">
        {label}
      </span>
      <span className="text-[11px] tabular-nums truncate text-right">{value}</span>
    </div>
  )
}

interface BarcodeProps {
  seed: string
}

/**
 * CSS-only barcode pattern. Deterministically generates a vertical-stripe
 * pattern from the order number — not a real Code 128, but visually correct
 * and unique per order.
 */
function Barcode({ seed }: BarcodeProps) {
  let h = 5381
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h) + seed.charCodeAt(i)
    h = h & 0xffffffff
  }
  // Generate ~50 stripes with widths 1-3px and visible/transparent state
  const bars: { w: number; on: boolean }[] = []
  let acc = Math.abs(h)
  for (let i = 0; i < 50; i++) {
    bars.push({ w: 1 + (acc & 0x3), on: (acc & 0x4) === 0 })
    acc = (acc * 1103515245 + 12345) & 0xffffffff
  }
  return (
    <div className="flex items-stretch h-10 gap-px" aria-hidden>
      {bars.map((b, i) => (
        <span
          key={i}
          style={{
            width: `${b.w}px`,
            backgroundColor: b.on ? "#2D1810" : "transparent",
          }}
        />
      ))}
    </div>
  )
}
