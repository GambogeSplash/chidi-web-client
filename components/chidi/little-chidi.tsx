"use client"

/**
 * Little Chidi — the Arc-browser "Little Arc" pattern, ported to Chidi.
 *
 * A 480px floating overlay (or full-width bottom sheet on mobile) summoned
 * with `⌘.` (period). The merchant peeks at an order / customer / product /
 * conversation without leaving their current view. Inline actions (confirm
 * payment, mark fulfilled, snooze, restock) fire WITHOUT closing the overlay
 * so the merchant can rip through several peeks. "Open" actions navigate.
 *
 * Data source: this overlay reads from the existing React Query caches via
 * the same hooks the rest of the dashboard uses (`useOrders`, `useProducts`,
 * `useConversations`, `useCustomers`). It NEVER fetches its own data — it's
 * a derived, ephemeral surface. No staleness concerns; whatever the dashboard
 * shows is what Little Chidi peeks at.
 *
 * Auto-dismiss rules:
 *   - Esc                                 → close
 *   - Click outside                       → close
 *   - 30s of no keystroke / no hover      → close (soft fade)
 *   - Router navigation                   → close
 *
 * Honors `prefers-reduced-motion` — instant open/close, no fade.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, usePathname, useParams } from "next/navigation"
import {
  X,
  ChevronRight,
  ShoppingBag,
  User as UserIcon,
  Package,
  MessageSquare,
  Clock,
  Search as SearchIcon,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { ChidiMark } from "./chidi-mark"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  useOrders,
  useConfirmOrder,
  useFulfillOrder,
} from "@/lib/hooks/use-orders"
import { useProducts, useUpdateStock } from "@/lib/hooks/use-products"
import { useConversations, useResolveConversation } from "@/lib/hooks/use-messaging"
import { useCustomers } from "@/lib/hooks/use-analytics"
import { formatOrderAmount } from "@/lib/api/orders"
import { formatRelativeTime } from "@/lib/api/analytics"
import {
  buildRecencyMap,
  getLastTab,
  getRecentPeeks,
  recordPeek,
  setLastTab,
  type LittleChidiResultType,
  type LittleChidiTab,
  type RecentPeek,
} from "@/lib/chidi/little-chidi"

// =============================================================================
// Types
// =============================================================================

interface LittleChidiProps {
  open: boolean
  initialQuery?: string
  initialTab?: LittleChidiTab
  onClose: () => void
}

interface BaseResult {
  type: LittleChidiResultType
  id: string
  title: string
  subtitle: string
  href?: string
  /** Higher = more recent / fresher; used for stale demotion. */
  freshness: number
  /** Per-row inline action chip text, if applicable. */
  chipLabel?: string
  /** Fires when the chip is pressed. Inline action — does NOT close overlay. */
  chipAction?: () => void
  /** Optional secondary inline action, surfaced on hover (desktop). */
  secondaryChipLabel?: string
  secondaryChipAction?: () => void
}

const TABS: { id: LittleChidiTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "orders", label: "Orders" },
  { id: "customers", label: "Customers" },
  { id: "products", label: "Products" },
  { id: "conversations", label: "Conversations" },
]

const MAX_VISIBLE = 8
const IDLE_TIMEOUT_MS = 30_000

// =============================================================================
// Component
// =============================================================================

export function LittleChidi({ open, initialQuery, initialTab, onClose }: LittleChidiProps) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const slug = (params?.slug as string | undefined) ?? undefined

  const [query, setQuery] = useState(initialQuery ?? "")
  const [tab, setTabState] = useState<LittleChidiTab>(initialTab ?? "all")
  const [recents, setRecents] = useState<RecentPeek[]>([])
  const [reducedMotion, setReducedMotion] = useState(false)
  const [closing, setClosing] = useState(false)

  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Pull from existing caches — these hooks are already mounted everywhere
  // else in the dashboard, so this re-uses the same query results.
  const { data: ordersData } = useOrders()
  const { data: productsData } = useProducts()
  const { data: conversationsData } = useConversations()
  const { data: customersData } = useCustomers(undefined, "last_order", 50)

  const confirmOrder = useConfirmOrder()
  const fulfillOrder = useFulfillOrder()
  const updateStock = useUpdateStock()
  const resolveConversation = useResolveConversation()

  // -------------------------------------------------------------------------
  // Open / close lifecycle: reset state, focus input, hydrate recents, capture
  // reduced-motion preference, and arm the idle timer.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!open) return
    setQuery(initialQuery ?? "")
    setTabState(initialTab ?? getLastTab())
    setRecents(getRecentPeeks())
    setClosing(false)
    if (typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
      setReducedMotion(mq.matches)
    }
    // Focus the input on the next tick so the autoFocus + open animation
    // don't fight each other.
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [open, initialQuery, initialTab])

  // Persist tab choice so reopen restores it.
  const setTab = useCallback((next: LittleChidiTab) => {
    setTabState(next)
    setLastTab(next)
  }, [])

  // Live-refresh recents when other surfaces record a peek (or we do).
  useEffect(() => {
    if (!open) return
    const onRecentsChange = () => setRecents(getRecentPeeks())
    window.addEventListener("chidi:little-chidi-recent-changed", onRecentsChange)
    return () => window.removeEventListener("chidi:little-chidi-recent-changed", onRecentsChange)
  }, [open])

  // -------------------------------------------------------------------------
  // Auto-dismiss: Esc, click-outside, idle timer, route change
  // -------------------------------------------------------------------------
  const requestClose = useCallback(() => {
    if (reducedMotion) {
      onClose()
      return
    }
    setClosing(true)
    // Match the close animation duration below (160ms).
    setTimeout(() => onClose(), 160)
  }, [onClose, reducedMotion])

  // Arm / re-arm the idle timer on activity.
  const armIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => requestClose(), IDLE_TIMEOUT_MS)
  }, [requestClose])

  useEffect(() => {
    if (!open) return
    armIdleTimer()
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [open, armIdleTimer])

  // Esc + click-outside
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        requestClose()
      } else {
        armIdleTimer()
      }
    }
    const onPointer = (e: MouseEvent) => {
      if (!panelRef.current) return
      if (e.target instanceof Node && panelRef.current.contains(e.target)) return
      requestClose()
    }
    document.addEventListener("keydown", onKey, true)
    document.addEventListener("mousedown", onPointer)
    return () => {
      document.removeEventListener("keydown", onKey, true)
      document.removeEventListener("mousedown", onPointer)
    }
  }, [open, requestClose, armIdleTimer])

  // Close on route change — Next 14's app router doesn't ship router events,
  // so we watch `pathname` instead. The first render after open captures the
  // current pathname; any change after that closes.
  const openedAtPathname = useRef<string | null>(null)
  useEffect(() => {
    if (!open) {
      openedAtPathname.current = null
      return
    }
    if (openedAtPathname.current === null) {
      openedAtPathname.current = pathname
      return
    }
    if (pathname !== openedAtPathname.current) {
      requestClose()
    }
  }, [open, pathname, requestClose])

  // -------------------------------------------------------------------------
  // Build the result pool from cached data, then rank against the query.
  // -------------------------------------------------------------------------

  const buildResults = useCallback((): BaseResult[] => {
    const out: BaseResult[] = []

    // Orders --------------------------------------------------------------
    const orders = ordersData?.orders ?? []
    for (const o of orders) {
      const created = new Date(o.created_at).getTime()
      const status =
        o.status === "PENDING_PAYMENT"
          ? "pending pay"
          : o.status === "CONFIRMED"
            ? "confirmed"
            : o.status === "FULFILLED"
              ? "fulfilled"
              : "cancelled"
      const customer = o.customer_name || o.customer_phone || "Customer"
      const orderShortId = o.id.slice(0, 6)
      out.push({
        type: "order",
        id: o.id,
        title: `Order #${orderShortId}`,
        subtitle: `${formatOrderAmount(o.total, o.currency)} · ${status} · ${customer}`,
        href: slug ? `/dashboard/${slug}?tab=orders` : undefined,
        freshness: created,
        chipLabel:
          o.status === "PENDING_PAYMENT"
            ? "Confirm payment"
            : o.status === "CONFIRMED"
              ? "Mark fulfilled"
              : undefined,
        chipAction:
          o.status === "PENDING_PAYMENT"
            ? () => {
                confirmOrder.mutate(o.id, {
                  onSuccess: () =>
                    toast.success("Payment confirmed", {
                      description: `Order #${orderShortId} marked as paid.`,
                    }),
                  onError: () => toast.error("Couldn't confirm payment"),
                })
              }
            : o.status === "CONFIRMED"
              ? () => {
                  fulfillOrder.mutate(
                    { orderId: o.id },
                    {
                      onSuccess: () =>
                        toast.success("Order fulfilled", {
                          description: `Order #${orderShortId} ready to go.`,
                        }),
                      onError: () => toast.error("Couldn't fulfill order"),
                    },
                  )
                }
              : undefined,
      })
    }

    // Customers -----------------------------------------------------------
    const customers = customersData?.customers ?? []
    for (const c of customers) {
      const lastOrderIso = c.last_order
      const lastTs = lastOrderIso ? new Date(lastOrderIso).getTime() : 0
      const display = c.name || c.phone
      const ago = lastOrderIso ? formatRelativeTime(lastOrderIso).toLowerCase() : "no orders yet"
      out.push({
        type: "customer",
        id: c.phone,
        title: display,
        subtitle: `${c.order_count} order${c.order_count === 1 ? "" : "s"} · last ${ago}`,
        href: slug ? `/dashboard/${slug}/customers` : undefined,
        freshness: lastTs,
      })
    }

    // Products ------------------------------------------------------------
    const products = productsData?.products ?? []
    for (const p of products) {
      const updatedTs = p.updatedAt ? new Date(p.updatedAt).getTime() : 0
      out.push({
        type: "product",
        id: p.id,
        title: p.name,
        subtitle: `${p.displayPrice} · ${p.stock} in stock`,
        href: slug ? `/dashboard/${slug}?tab=inventory` : undefined,
        freshness: updatedTs,
        chipLabel: p.stock <= p.reorderLevel ? "Restock +5" : undefined,
        chipAction:
          p.stock <= p.reorderLevel
            ? () => {
                updateStock.mutate(
                  { productId: p.id, quantityChange: 5, operation: "add" },
                  {
                    onSuccess: () =>
                      toast.success("Restocked", {
                        description: `${p.name} +5 (now ${p.stock + 5}).`,
                      }),
                    onError: () => toast.error("Couldn't restock"),
                  },
                )
              }
            : undefined,
      })
    }

    // Conversations -------------------------------------------------------
    const convos = conversationsData?.conversations ?? []
    for (const c of convos) {
      const lastTs = c.last_message_at ? new Date(c.last_message_at).getTime() : new Date(c.last_activity).getTime()
      const channelName =
        c.channel_type === "WHATSAPP"
          ? "WhatsApp"
          : c.channel_type === "TELEGRAM"
            ? "Telegram"
            : c.channel_type === "INSTAGRAM"
              ? "Instagram"
              : "Chat"
      const customerLabel = c.customer_name || "Customer"
      const ago = c.last_message_at ? formatRelativeTime(c.last_message_at).toLowerCase() : "—"
      out.push({
        type: "conversation",
        id: c.id,
        title: customerLabel,
        subtitle: `${channelName} · ${ago}${c.unread_count > 0 ? ` · ${c.unread_count} unread` : ""}`,
        href: slug ? `/dashboard/${slug}?tab=inbox` : undefined,
        freshness: lastTs,
        chipLabel: c.status === "NEEDS_HUMAN" ? "Snooze" : undefined,
        chipAction:
          c.status === "NEEDS_HUMAN"
            ? () => {
                resolveConversation.mutate(
                  { conversationId: c.id, returnToAi: true },
                  {
                    onSuccess: () => toast.success("Snoozed", { description: `${customerLabel} handed back to Chidi.` }),
                    onError: () => toast.error("Couldn't snooze"),
                  },
                )
              }
            : undefined,
      })
    }

    return out
  }, [
    ordersData,
    productsData,
    conversationsData,
    customersData,
    slug,
    confirmOrder,
    fulfillOrder,
    updateStock,
    resolveConversation,
  ])

  // -------------------------------------------------------------------------
  // Search ranking — see report at end of file for the exact algorithm.
  // -------------------------------------------------------------------------
  const ranked = useMemo<BaseResult[]>(() => {
    const pool = buildResults()
    const q = query.trim().toLowerCase()
    const recencyMap = buildRecencyMap()
    const now = Date.now()
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

    const scored = pool.map((item) => {
      let score = 0

      // Query relevance --------------------------------------------------
      if (q.length > 0) {
        const t = item.title.toLowerCase()
        const s = item.subtitle.toLowerCase()
        if (t === q) score += 1000
        else if (t.startsWith(q)) score += 500
        else if (t.includes(q)) score += 200
        else if (s.includes(q)) score += 80
        else score -= 9999 // not a hit at all → drop
      }

      // Tab bias (the active tab boosts its own type, doesn't filter out
      // the rest — except for "all" which boosts nothing).
      if (tab !== "all" && tabMatchesType(tab, item.type)) score += 60

      // Recent peeks boost: top recent → +120, decays linearly to +20.
      const recencyKey = `${item.type}:${item.id}`
      const recencyRank = recencyMap.get(recencyKey)
      if (recencyRank !== undefined) {
        score += Math.max(20, 120 - recencyRank * 5)
      }

      // Stale demotion: items untouched for >30d lose 40, >7d lose 15.
      const age = now - item.freshness
      if (item.freshness > 0) {
        if (age > THIRTY_DAYS) score -= 40
        else if (age > SEVEN_DAYS) score -= 15
      } else {
        // Items with no freshness (e.g., customer with no orders) drop.
        score -= 25
      }

      return { item, score }
    })

    return scored
      .filter((s) => s.score > -1000)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.item)
  }, [buildResults, query, tab])

  const visible = ranked.slice(0, MAX_VISIBLE)
  const overflow = Math.max(0, ranked.length - MAX_VISIBLE)

  // -------------------------------------------------------------------------
  // Open helper used by both the row click + the recent chip click.
  // -------------------------------------------------------------------------
  const openResult = useCallback(
    (r: BaseResult) => {
      recordPeek({ type: r.type, id: r.id, title: r.title })
      if (r.href) {
        requestClose()
        router.push(r.href)
      } else {
        requestClose()
      }
    },
    [router, requestClose],
  )

  // Resolve a recent peek back to a live result (so chips re-open the right thing).
  const allById = useMemo(() => {
    const map = new Map<string, BaseResult>()
    for (const r of buildResults()) map.set(`${r.type}:${r.id}`, r)
    return map
  }, [buildResults])

  if (!open) return null

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  const animClasses = reducedMotion
    ? ""
    : closing
      ? "little-chidi-out"
      : "little-chidi-in"

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Little Chidi quick peek"
      className="fixed inset-0 z-[120] pointer-events-none"
    >
      <div
        ref={panelRef}
        onMouseMove={armIdleTimer}
        onKeyDown={armIdleTimer}
        className={cn(
          // Mobile: full-width bottom sheet (~80vh). Desktop: 480x~620 panel
          // anchored bottom-right with 24px margin.
          "pointer-events-auto absolute bg-white/95 backdrop-blur-xl shadow-2xl border border-[var(--chidi-border-default)] flex flex-col overflow-hidden",
          "left-0 right-0 bottom-0 h-[80vh] rounded-t-2xl",
          "sm:left-auto sm:top-auto sm:bottom-6 sm:right-6 sm:h-[620px] sm:max-h-[calc(100vh-48px)] sm:w-[480px] sm:rounded-2xl",
          animClasses,
        )}
        style={{ transformOrigin: "bottom right" }}
      >
        {/* Header --------------------------------------------------------- */}
        <div className="flex items-center gap-2 px-4 h-12 border-b border-[var(--chidi-border-subtle)] flex-shrink-0">
          <ChidiMark size={18} variant="default" />
          <span className="text-[13px] font-medium text-[var(--chidi-text-primary)]">Quick peek</span>
          <kbd className="ml-2 text-[10px] font-mono text-[var(--chidi-text-muted)] bg-[var(--chidi-surface)] border border-[var(--chidi-border-subtle)] px-1.5 py-0.5 rounded">
            ⌘.
          </kbd>
          <button
            onClick={requestClose}
            aria-label="Close Little Chidi"
            className="ml-auto p-1 rounded text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search field --------------------------------------------------- */}
        <div className="px-3 pt-3 pb-2 flex-shrink-0">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--chidi-text-muted)] pointer-events-none" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search orders, customers, or products…"
              className="h-10 pl-9 text-[14px]"
            />
          </div>
        </div>

        {/* Tabs strip ----------------------------------------------------- */}
        <div className="px-3 pb-2 flex items-center gap-1 overflow-x-auto flex-shrink-0">
          {TABS.map((t) => {
            const active = t.id === tab
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-[var(--chidi-text-primary)] text-[var(--card)]"
                    : "text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-surface)]",
                )}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Results list --------------------------------------------------- */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
          {visible.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <p className="text-[12px] text-[var(--chidi-text-muted)]">
                {query.trim()
                  ? "Nothing matched. Try a different word."
                  : "Type to search — or pick from Recent below."}
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {visible.map((r) => (
                <ResultRow key={`${r.type}:${r.id}`} result={r} onOpen={() => openResult(r)} />
              ))}
              {overflow > 0 && (
                <li className="px-3 py-2 text-[10px] text-[var(--chidi-text-muted)] uppercase tracking-wider">
                  + {overflow} more — refine your search
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Footer: Recent peeks ------------------------------------------ */}
        {recents.length > 0 && (
          <div className="border-t border-[var(--chidi-border-subtle)] px-3 py-2 flex items-center gap-2 overflow-x-auto flex-shrink-0">
            <Clock className="w-3 h-3 text-[var(--chidi-text-muted)] flex-shrink-0" />
            <span className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] flex-shrink-0">
              Recent
            </span>
            {recents.slice(0, 5).map((p) => {
              const live = allById.get(`${p.type}:${p.id}`)
              return (
                <button
                  key={`${p.type}:${p.id}`}
                  onClick={() => {
                    if (live) {
                      openResult(live)
                    } else {
                      // Live data is gone (e.g. order archived) — surface the
                      // search term so the merchant can find the trail.
                      setQuery(p.title)
                    }
                  }}
                  className="px-2 py-1 rounded-full text-[11px] bg-[var(--chidi-surface)] text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-border-subtle)] transition-colors whitespace-nowrap max-w-[140px] truncate flex-shrink-0"
                  title={p.title}
                >
                  {p.title}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Sub-components
// =============================================================================

function ResultRow({ result, onOpen }: { result: BaseResult; onOpen: () => void }) {
  const Icon = iconForType(result.type)
  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer",
          "hover:bg-[var(--chidi-surface)] hover:-translate-y-px hover:shadow-sm transition-all",
        )}
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") onOpen()
        }}
      >
        <Icon className="w-3.5 h-3.5 text-[var(--chidi-text-muted)] flex-shrink-0" strokeWidth={1.8} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-[var(--chidi-text-primary)] truncate">
            {result.title}
          </p>
          <p className="text-[11px] text-[var(--chidi-text-muted)] truncate">{result.subtitle}</p>
        </div>
        {result.chipLabel && result.chipAction && (
          <button
            onClick={(e) => {
              // Inline action — DO NOT close overlay. Stop propagation so the
              // row's onOpen doesn't fire.
              e.stopPropagation()
              result.chipAction!()
            }}
            className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[var(--chidi-win-soft,rgba(108,249,216,0.16))] text-[var(--chidi-text-primary)] border border-[var(--chidi-win)]/30 hover:bg-[var(--chidi-win-soft,rgba(108,249,216,0.28))] transition-colors flex-shrink-0"
          >
            {result.chipLabel}
          </button>
        )}
        <ChevronRight className="w-3.5 h-3.5 text-[var(--chidi-text-muted)] flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
      </div>
    </li>
  )
}

// =============================================================================
// Helpers
// =============================================================================

function iconForType(type: LittleChidiResultType) {
  switch (type) {
    case "order":
      return ShoppingBag
    case "customer":
      return UserIcon
    case "product":
      return Package
    case "conversation":
      return MessageSquare
  }
}

function tabMatchesType(tab: LittleChidiTab, type: LittleChidiResultType): boolean {
  switch (tab) {
    case "orders":
      return type === "order"
    case "customers":
      return type === "customer"
    case "products":
      return type === "product"
    case "conversations":
      return type === "conversation"
    default:
      return false
  }
}
