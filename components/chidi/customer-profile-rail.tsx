"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ShoppingBag, X, Plus, Tag as TagIcon, FileText } from "lucide-react"
import { CustomerCharacter } from "./customer-character"
import { ChidiMark } from "./chidi-mark"
import { CurrencyAmount } from "./currency-amount"
import { useCustomerDetail } from "@/lib/hooks/use-analytics"
import { formatCurrency, formatRelativeTime } from "@/lib/api/analytics"
import {
  SUGGESTED_TAGS,
  addTag as addTagToStore,
  getEntry as getCustomerEntry,
  removeTag as removeTagFromStore,
  setNote as setNoteInStore,
  subscribe as subscribeCustomerTags,
  type CustomerTagsEntry,
} from "@/lib/chidi/customer-tags"

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
 *
 * Tags + notes are local-only (lib/chidi/customer-tags) — the merchant's
 * private CRM scratchpad. Channel-agnostic: keyed off customerId, which is
 * already channel-prefixed by the messaging API.
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

      {/* Tags — local-only chips. Channel-agnostic. Suggested pills appear
          below the input only when the customer has none yet. */}
      <TagsSection customerId={customerId} />

      {/* Notes — single textarea, autosaves on blur. */}
      <NotesSection customerId={customerId} />

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

// =====================================================================
// TAGS SECTION
// =====================================================================

function useCustomerEntry(customerId: string): CustomerTagsEntry {
  const [entry, setEntry] = useState<CustomerTagsEntry>(() =>
    customerId ? getCustomerEntry(customerId) : { tags: [], note: "", updatedAt: "" },
  )
  useEffect(() => {
    if (!customerId) return
    setEntry(getCustomerEntry(customerId))
    return subscribeCustomerTags((store) => {
      setEntry(store[customerId] ?? { tags: [], note: "", updatedAt: "" })
    })
  }, [customerId])
  return entry
}

function TagsSection({ customerId }: { customerId: string }) {
  const entry = useCustomerEntry(customerId)
  const [draft, setDraft] = useState("")
  const inputRef = useRef<HTMLInputElement | null>(null)

  const commitDraft = () => {
    const t = draft.trim()
    if (!t || !customerId) {
      setDraft("")
      return
    }
    addTagToStore(customerId, t)
    setDraft("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      commitDraft()
    } else if (e.key === "Backspace" && !draft && entry.tags.length > 0) {
      // Quick-remove last chip on Backspace when input empty (Linear-style)
      removeTagFromStore(customerId, entry.tags[entry.tags.length - 1])
    } else if (e.key === "Escape") {
      setDraft("")
    }
  }

  const suggestions = useMemo(() => {
    const taken = new Set(entry.tags.map((t) => t.toLowerCase()))
    return SUGGESTED_TAGS.filter((s) => !taken.has(s.toLowerCase())).slice(0, 6)
  }, [entry.tags])

  return (
    <div className="px-5 py-4 border-b border-[var(--chidi-border-subtle)]">
      <div className="flex items-center gap-1.5 mb-2">
        <TagIcon className="w-3 h-3 text-[var(--chidi-text-muted)]" />
        <p className="ty-meta text-[var(--chidi-text-muted)]">Tags</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {entry.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-[var(--chidi-text-primary)]/8 text-[11px] text-[var(--chidi-text-primary)] font-chidi-voice"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTagFromStore(customerId, tag)}
              aria-label={`Remove ${tag}`}
              className="ml-0.5 w-4 h-4 rounded-full inline-flex items-center justify-center text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-white"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}

        {/* Inline-add chip — same shape as the chips around it */}
        <span className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full border border-dashed border-[var(--chidi-border-default)] text-[11px]">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitDraft}
            placeholder={entry.tags.length === 0 ? "add tag" : "add"}
            className="bg-transparent outline-none w-20 placeholder:text-[var(--chidi-text-muted)] text-[var(--chidi-text-primary)]"
            aria-label="Add tag"
          />
          <button
            type="button"
            onClick={commitDraft}
            aria-label="Add tag"
            className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-white"
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
        </span>
      </div>

      {/* Suggested pills — only shown when nothing yet, so the section stays
          calm once the merchant has tagged the customer. */}
      {entry.tags.length === 0 && suggestions.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium mb-1.5">
            Suggested
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addTagToStore(customerId, s)}
                className="px-2 py-0.5 rounded-full text-[11px] text-[var(--chidi-text-secondary)] bg-white border border-[var(--chidi-border-subtle)] hover:text-[var(--chidi-text-primary)] hover:border-[var(--chidi-border-default)] transition-colors font-chidi-voice"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// =====================================================================
// NOTES SECTION
// =====================================================================

function NotesSection({ customerId }: { customerId: string }) {
  const entry = useCustomerEntry(customerId)
  const [draft, setDraft] = useState(entry.note)
  const [savedFlash, setSavedFlash] = useState(false)
  const lastSyncedRef = useRef(entry.note)

  // Re-sync local draft when the upstream entry changes (e.g. another tab
  // edited the note). Avoid clobbering an in-progress edit.
  useEffect(() => {
    if (entry.note !== lastSyncedRef.current && draft === lastSyncedRef.current) {
      setDraft(entry.note)
    }
    lastSyncedRef.current = entry.note
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.note])

  const commit = () => {
    if (!customerId) return
    if (draft === entry.note) return
    setNoteInStore(customerId, draft)
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1200)
  }

  return (
    <div className="px-5 py-4 border-b border-[var(--chidi-border-subtle)]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <FileText className="w-3 h-3 text-[var(--chidi-text-muted)]" />
          <p className="ty-meta text-[var(--chidi-text-muted)]">Notes</p>
        </div>
        {savedFlash && (
          <span className="text-[10px] text-[var(--chidi-text-muted)] font-chidi-voice motion-safe:animate-in motion-safe:fade-in">
            Saved
          </span>
        )}
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        placeholder="Anything Chidi should remember about this customer…"
        rows={3}
        className="w-full text-[12.5px] bg-white border border-[var(--chidi-border-subtle)] rounded-lg p-2 resize-none focus:outline-none focus:border-[var(--chidi-border-default)] focus:ring-1 focus:ring-[var(--chidi-text-muted)]/20 placeholder:text-[var(--chidi-text-muted)] text-[var(--chidi-text-primary)] font-chidi-voice"
        aria-label="Private note"
      />
    </div>
  )
}
