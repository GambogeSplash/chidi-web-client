"use client"

/**
 * OrdersBoard — Easels.
 *
 * Arc-browser-inspired kanban view of the merchant's pipeline.
 * Four columns: Pending pay → Confirmed → Fulfilled → Out for delivery.
 *
 * Drag-and-drop is powered by @dnd-kit/core (already in package.json) — it
 * gives us proper pointer + keyboard sensors, accessible drag descriptions,
 * and a DragOverlay for the lifted card. HTML5 native DnD was the fallback
 * but dnd-kit is strictly better here: it works on touch (no extra polyfill),
 * doesn't fight scroll on mobile, and ships keyboard support out of the box.
 *
 * Layout:
 *   - lg+: 4 columns equal-width, full page height minus chrome.
 *   - md:  2 columns; user scrolls horizontally for the rest.
 *   - <md: a single-column carousel snapped to the viewport, with a chip
 *          row at top to jump between stages.
 *
 * Animations:
 *   - Card-in: chidi-list-in (existing keyframe).
 *   - Drag-lift: pure CSS transition on the OrderCard.
 *   - Receiving-card flash: 600ms green glow via .chidi-board-flash
 *     (defined inline below as a local <style> so we don't touch globals.css).
 *   - All animations collapse to instant under prefers-reduced-motion.
 *
 * Keyboard:
 *   J / K — focus down/up within the focused column
 *   H / L — focus left/right across columns
 *   Enter — open the focused card
 *   Space + ArrowRight — advance the focused card to the next stage
 *   Space + ArrowLeft  — retreat the focused card to the previous stage
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import {
  ChevronLeft,
  ChevronRight,
  Inbox as InboxIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ChidiMark } from "@/components/chidi/chidi-mark"
import { OrderCard } from "@/components/chidi/order-card"
import {
  type Order,
} from "@/lib/api/orders"
import {
  useOrders,
  useConfirmOrder,
  useFulfillOrder,
} from "@/lib/hooks/use-orders"
import {
  STAGES,
  STAGE_ORDER,
  type BoardStage,
  OUT_FOR_DELIVERY,
  isOverdue,
  nextStage,
  planTransition,
  prevStage,
  readStageOverrides,
  resolveStage,
  setStageOverride,
  writeStageOverrides,
  type StageOverrideMap,
} from "@/lib/chidi/board-state"
import { hapticWin } from "@/lib/chidi/haptics"

interface OrdersBoardProps {
  slug: string
}

export function OrdersBoard({ slug }: OrdersBoardProps) {
  const router = useRouter()
  const { data, isLoading, isError } = useOrders(undefined)
  const confirmMutation = useConfirmOrder()
  const fulfillMutation = useFulfillOrder()

  // Client-only stage overrides (the OUT_FOR_DELIVERY shim).
  const [overrides, setOverrides] = useState<StageOverrideMap>({})
  useEffect(() => {
    setOverrides(readStageOverrides())
  }, [])
  const persistOverrides = useCallback((next: StageOverrideMap) => {
    setOverrides(next)
    writeStageOverrides(next)
  }, [])

  // Optimistic stage map — we apply moves instantly while the mutation flies.
  // Keyed by orderId so reverts on failure are simple deletes.
  const [optimisticStage, setOptimisticStage] = useState<Record<string, BoardStage>>({})
  const clearOptimistic = (orderId: string) =>
    setOptimisticStage((prev) => {
      if (!(orderId in prev)) return prev
      const next = { ...prev }
      delete next[orderId]
      return next
    })

  // Card-flash state — id of the card to flash green for 600ms after it lands.
  const [flashId, setFlashId] = useState<string | null>(null)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
  }, [])
  const triggerFlash = (orderId: string) => {
    setFlashId(orderId)
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    flashTimerRef.current = setTimeout(() => setFlashId(null), 700)
  }

  // Group orders by stage, applying overrides + optimistic moves.
  const orders = data?.orders ?? []
  const grouped = useMemo(() => {
    const buckets: Record<BoardStage, Order[]> = {
      PENDING_PAYMENT: [],
      CONFIRMED: [],
      FULFILLED: [],
      [OUT_FOR_DELIVERY]: [],
    }
    for (const o of orders) {
      const optimistic = optimisticStage[o.id]
      const stage = optimistic ?? resolveStage(o, overrides)
      if (!stage) continue
      buckets[stage].push(o)
    }
    // Sort within each bucket: oldest in stage first (most "needing attention").
    for (const stage of STAGE_ORDER) {
      buckets[stage].sort((a, b) => {
        const ta = new Date(a.created_at).getTime()
        const tb = new Date(b.created_at).getTime()
        return ta - tb
      })
    }
    return buckets
  }, [orders, overrides, optimisticStage])

  // Mobile carousel — which stage is centered.
  const [mobileStage, setMobileStage] = useState<BoardStage>("PENDING_PAYMENT")
  const mobileScrollRef = useRef<HTMLDivElement | null>(null)
  const scrollToMobileStage = (stage: BoardStage) => {
    setMobileStage(stage)
    const el = mobileScrollRef.current
    if (!el) return
    const idx = STAGE_ORDER.indexOf(stage)
    el.scrollTo({ left: el.clientWidth * idx, behavior: "smooth" })
  }
  // Sync centered stage when the user swipes.
  useEffect(() => {
    const el = mobileScrollRef.current
    if (!el) return
    const onScroll = () => {
      const idx = Math.round(el.scrollLeft / Math.max(1, el.clientWidth))
      const stage = STAGE_ORDER[Math.max(0, Math.min(STAGE_ORDER.length - 1, idx))]
      if (stage && stage !== mobileStage) setMobileStage(stage)
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [mobileStage])

  // Keyboard focus tracking: which stage column + which card index.
  const [focus, setFocus] = useState<{ stage: BoardStage; index: number }>({
    stage: "PENDING_PAYMENT",
    index: 0,
  })
  // Refs for every card so we can imperatively focus when the cursor moves.
  const cardRefs = useRef(new Map<string, HTMLDivElement>())
  const setCardRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(id, el)
    else cardRefs.current.delete(id)
  }, [])

  // Open an order in the orders tab.
  const openOrder = useCallback(
    (order: Order) => {
      // Use a normal route push so the dashboard mounts the orders tab; the
      // navigate-tab event also gets dispatched in case we're already inside
      // DashboardContent (we're not from this route, but it's harmless).
      router.push(`/dashboard/${slug}?tab=orders`)
      window.dispatchEvent(
        new CustomEvent("chidi:navigate-tab", { detail: { tab: "orders", orderId: order.id } }),
      )
    },
    [router, slug],
  )

  // ===== Drag-and-drop =====
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  )
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeFromStage, setActiveFromStage] = useState<BoardStage | null>(null)
  const [hoverStage, setHoverStage] = useState<BoardStage | null>(null)

  const activeOrder = useMemo(
    () => (activeId ? orders.find((o) => o.id === activeId) ?? null : null),
    [activeId, orders],
  )

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id)
    setActiveId(id)
    const fromStage = (e.active.data.current as { stage?: BoardStage })?.stage ?? null
    setActiveFromStage(fromStage)
  }
  const onDragOver = (e: DragOverEvent) => {
    if (e.over) setHoverStage(e.over.id as BoardStage)
    else setHoverStage(null)
  }

  const moveCard = useCallback(
    (orderId: string, from: BoardStage, to: BoardStage) => {
      if (from === to) return
      const plan = planTransition(orderId, from, to)
      if (plan.kind === "unsupported") {
        toast("Can't move that direction yet.", {
          description: "Backwards moves aren't supported on this board.",
        })
        return
      }
      if (plan.kind === "noop") return

      // Optimistic update
      setOptimisticStage((prev) => ({ ...prev, [orderId]: to }))
      triggerFlash(orderId)
      hapticWin()

      const onErr = (msg: string) => {
        clearOptimistic(orderId)
        toast.error("Couldn't move order. Try again.", { description: msg })
      }

      switch (plan.kind) {
        case "confirm":
          confirmMutation.mutate(orderId, {
            onSuccess: () => clearOptimistic(orderId),
            onError: (e: unknown) => onErr(e instanceof Error ? e.message : "Confirm failed"),
          })
          break
        case "fulfill":
          fulfillMutation.mutate(
            { orderId },
            {
              onSuccess: () => clearOptimistic(orderId),
              onError: (e: unknown) => onErr(e instanceof Error ? e.message : "Fulfill failed"),
            },
          )
          break
        case "out-for-delivery": {
          // If the backend doesn't have it yet as fulfilled, fulfill first.
          const order = orders.find((o) => o.id === orderId)
          const needsFulfill = order && order.status !== "FULFILLED"
          const writeOverride = () => {
            persistOverrides(setStageOverride(overrides, orderId, OUT_FOR_DELIVERY))
            clearOptimistic(orderId)
          }
          if (needsFulfill) {
            fulfillMutation.mutate(
              { orderId },
              {
                onSuccess: writeOverride,
                onError: (e: unknown) => onErr(e instanceof Error ? e.message : "Fulfill failed"),
              },
            )
          } else {
            writeOverride()
          }
          break
        }
        case "clear-out-for-delivery": {
          persistOverrides(setStageOverride(overrides, orderId, null))
          clearOptimistic(orderId)
          break
        }
      }
    },
    [confirmMutation, fulfillMutation, orders, overrides, persistOverrides],
  )

  const onDragEnd = (e: DragEndEvent) => {
    const id = activeId
    const from = activeFromStage
    setActiveId(null)
    setActiveFromStage(null)
    setHoverStage(null)
    if (!id || !from) return
    const overId = e.over?.id ? String(e.over.id) : null
    if (!overId) return
    if (!STAGE_ORDER.includes(overId as BoardStage)) return
    moveCard(id, from, overId as BoardStage)
  }

  // ===== Keyboard handling on cards =====
  const handleCardKey = (
    e: React.KeyboardEvent,
    order: Order,
    stage: BoardStage,
  ) => {
    const list = grouped[stage]
    const idx = list.findIndex((o) => o.id === order.id)

    const focusCard = (s: BoardStage, i: number) => {
      const arr = grouped[s]
      if (arr.length === 0) {
        setFocus({ stage: s, index: 0 })
        if (window.innerWidth < 768) scrollToMobileStage(s)
        return
      }
      const clamped = Math.max(0, Math.min(arr.length - 1, i))
      setFocus({ stage: s, index: clamped })
      const id = arr[clamped].id
      const el = cardRefs.current.get(id)
      el?.focus()
      if (window.innerWidth < 768) scrollToMobileStage(s)
    }

    switch (e.key) {
      case "j":
      case "J":
        e.preventDefault()
        focusCard(stage, idx + 1)
        break
      case "k":
      case "K":
        e.preventDefault()
        focusCard(stage, idx - 1)
        break
      case "h":
      case "H": {
        e.preventDefault()
        const prev = prevStage(stage)
        if (prev) focusCard(prev, idx)
        break
      }
      case "l":
      case "L": {
        e.preventDefault()
        const nxt = nextStage(stage)
        if (nxt) focusCard(nxt, idx)
        break
      }
      case "Enter":
        e.preventDefault()
        openOrder(order)
        break
      case "ArrowRight": {
        // Space-then-ArrowRight = advance. We accept just ArrowRight if
        // shiftKey is also pressed for power users.
        if (e.shiftKey) {
          e.preventDefault()
          const nxt = nextStage(stage)
          if (nxt) moveCard(order.id, stage, nxt)
        }
        break
      }
      case "ArrowLeft": {
        if (e.shiftKey) {
          e.preventDefault()
          const prev = prevStage(stage)
          if (prev) moveCard(order.id, stage, prev)
        }
        break
      }
      case " ": {
        // Space = arm + step. Listen for the next arrow.
        e.preventDefault()
        const onNext = (ke: KeyboardEvent) => {
          window.removeEventListener("keydown", onNext)
          if (ke.key === "ArrowRight") {
            const nxt = nextStage(stage)
            if (nxt) moveCard(order.id, stage, nxt)
          } else if (ke.key === "ArrowLeft") {
            const prev = prevStage(stage)
            if (prev) moveCard(order.id, stage, prev)
          }
        }
        window.addEventListener("keydown", onNext, { once: true })
        break
      }
    }
  }

  // ===== Loading + error =====
  if (isLoading) return <BoardSkeleton />
  if (isError) {
    return (
      <div className="px-6 py-12 text-center text-[13px] text-[var(--chidi-text-muted)]">
        Couldn't load the board. Refresh in a moment.
      </div>
    )
  }

  // ===== Render =====
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      {/* Mobile chip bar */}
      <div className="md:hidden -mx-4 px-4 pb-3 flex items-center gap-1.5 overflow-x-auto chidi-scroll-x">
        {STAGES.map((s) => {
          const count = grouped[s.id].length
          const overdueCount = grouped[s.id].filter((o) => isOverdue(o, s.id)).length
          const active = s.id === mobileStage
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollToMobileStage(s.id)}
              className={cn(
                "flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11.5px] font-semibold border",
                "motion-safe:transition-colors",
                active
                  ? "bg-[var(--chidi-text-primary)] text-[var(--background)] border-[var(--chidi-text-primary)]"
                  : "bg-[var(--card)] text-[var(--chidi-text-secondary)] border-[var(--chidi-border-default)] hover:bg-[var(--chidi-surface)]",
              )}
            >
              <span>{s.label}</span>
              <span className={cn(
                "tabular-nums px-1 rounded text-[10px]",
                active
                  ? "bg-white/15 text-[var(--background)]"
                  : "bg-[var(--chidi-surface)] text-[var(--chidi-text-muted)]",
              )}>{count}</span>
              {overdueCount > 0 && (
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: s.accent }}
                  aria-label={`${overdueCount} overdue`}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Mobile carousel: one column per page, scroll-snapped */}
      <div
        ref={mobileScrollRef}
        className="md:hidden -mx-4 flex overflow-x-auto snap-x snap-mandatory chidi-scroll-x"
        style={{ scrollPaddingInline: "1rem" }}
      >
        {STAGES.map((s) => (
          <div
            key={s.id}
            className="snap-center flex-shrink-0 w-screen px-4"
          >
            <Column
              stage={s.id}
              orders={grouped[s.id]}
              flashId={flashId}
              focus={focus}
              hoverStage={hoverStage}
              activeId={activeId}
              setCardRef={setCardRef}
              onOpen={openOrder}
              onCardKey={handleCardKey}
              variant="mobile"
              onColumnHeaderJump={(dir) => {
                const idx = STAGE_ORDER.indexOf(s.id)
                const target = STAGE_ORDER[idx + dir]
                if (target) scrollToMobileStage(target)
              }}
            />
          </div>
        ))}
      </div>

      {/* Tablet + desktop grid */}
      <div className="hidden md:grid md:gap-3 lg:gap-4 md:grid-cols-2 lg:grid-cols-4 md:overflow-x-auto md:snap-x md:snap-mandatory lg:overflow-visible lg:snap-none">
        {STAGES.map((s) => (
          <div
            key={s.id}
            className="md:snap-start lg:snap-align-none min-w-0"
          >
            <Column
              stage={s.id}
              orders={grouped[s.id]}
              flashId={flashId}
              focus={focus}
              hoverStage={hoverStage}
              activeId={activeId}
              setCardRef={setCardRef}
              onOpen={openOrder}
              onCardKey={handleCardKey}
              variant="desktop"
            />
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeOrder && activeFromStage ? (
          <OrderCard
            order={activeOrder}
            stage={activeFromStage}
            isOverlay
          />
        ) : null}
      </DragOverlay>

      {/* Local styles — receiving-card flash + scrollbar polish.
          Kept here (not globals.css) per task scope. */}
      <style jsx global>{`
        @keyframes chidiBoardFlash {
          0% { box-shadow: 0 0 0 0 rgba(43, 182, 115, 0.55); background-color: rgba(43, 182, 115, 0.10); }
          100% { box-shadow: 0 0 0 0 rgba(43, 182, 115, 0); background-color: transparent; }
        }
        .chidi-board-flash {
          animation: chidiBoardFlash 600ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .chidi-board-flash { animation: none; }
        }
        .chidi-scroll-x { scrollbar-width: thin; }
        .chidi-scroll-x::-webkit-scrollbar { height: 6px; }
        .chidi-scroll-x::-webkit-scrollbar-thumb {
          background: var(--chidi-border-default);
          border-radius: 999px;
        }
      `}</style>
    </DndContext>
  )
}

// =============================================================================
// Column
// =============================================================================

interface ColumnProps {
  stage: BoardStage
  orders: Order[]
  flashId: string | null
  focus: { stage: BoardStage; index: number }
  hoverStage: BoardStage | null
  activeId: string | null
  setCardRef: (id: string) => (el: HTMLDivElement | null) => void
  onOpen: (order: Order) => void
  onCardKey: (e: React.KeyboardEvent, order: Order, stage: BoardStage) => void
  variant: "desktop" | "mobile"
  onColumnHeaderJump?: (dir: -1 | 1) => void
}

function Column({
  stage,
  orders,
  flashId,
  focus,
  hoverStage,
  activeId,
  setCardRef,
  onOpen,
  onCardKey,
  variant,
  onColumnHeaderJump,
}: ColumnProps) {
  const meta = STAGES.find((s) => s.id === stage)!
  const overdueCount = orders.filter((o) => isOverdue(o, stage)).length
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  const isHovered = hoverStage === stage && activeId !== null

  return (
    <section
      ref={setNodeRef}
      aria-label={`${meta.label} column`}
      className={cn(
        "flex flex-col rounded-2xl border bg-[var(--chidi-surface)]/30",
        "border-[var(--chidi-border-subtle)]",
        "lg:h-[calc(100vh-9rem)]",
        isHovered && "border-[var(--chidi-text-primary)] bg-[var(--chidi-surface)]/60",
        isOver && "ring-2 ring-[var(--chidi-text-primary)]/40",
        "motion-safe:transition-[border-color,background-color] motion-safe:duration-150",
      )}
    >
      <header className="flex items-center justify-between gap-2 px-3 lg:px-4 pt-3 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {variant === "mobile" && onColumnHeaderJump && (
            <button
              type="button"
              onClick={() => onColumnHeaderJump(-1)}
              aria-label="Previous stage"
              className="-ml-1 p-1 rounded text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--chidi-text-primary)] truncate">
            {meta.label}
          </h2>
          <span className="text-[10px] tabular-nums px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--chidi-border-subtle)] text-[var(--chidi-text-muted)] flex-shrink-0">
            {orders.length}
          </span>
          {overdueCount > 0 && (
            <span
              title={`${overdueCount} overdue`}
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: meta.accent }}
            />
          )}
        </div>
        {variant === "mobile" && onColumnHeaderJump && (
          <button
            type="button"
            onClick={() => onColumnHeaderJump(1)}
            aria-label="Next stage"
            className="-mr-1 p-1 rounded text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)]"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </header>

      <div className={cn(
        "flex-1 min-h-0 px-2 pb-3",
        variant === "desktop" ? "overflow-y-auto" : "overflow-visible",
      )}>
        {orders.length === 0 ? (
          <ColumnEmpty hint={meta.emptyHint} />
        ) : (
          <ul className="space-y-2">
            {orders.map((order, i) => {
              const isFocused = focus.stage === stage && focus.index === i
              const tabIndex = i === 0 ? 0 : -1
              return (
                <li
                  key={order.id}
                  className="motion-safe:chidi-list-in"
                  style={{ animationDelay: `${i * 28}ms` }}
                >
                  <DraggableCard
                    order={order}
                    stage={stage}
                    flash={flashId === order.id}
                    focused={isFocused}
                    tabIndex={tabIndex}
                    setRef={setCardRef(order.id)}
                    onOpen={() => onOpen(order)}
                    onKeyDown={(e) => onCardKey(e, order, stage)}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

// =============================================================================
// DraggableCard — dnd-kit wrapper around OrderCard
// =============================================================================

interface DraggableCardProps {
  order: Order
  stage: BoardStage
  flash?: boolean
  focused?: boolean
  tabIndex?: number
  setRef: (el: HTMLDivElement | null) => void
  onOpen: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

function DraggableCard({
  order,
  stage,
  flash,
  focused,
  tabIndex,
  setRef,
  onOpen,
  onKeyDown,
}: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, isDragging, transform } =
    useDraggable({
      id: order.id,
      data: { stage },
    })

  const transformStyle = transform
    ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
    : undefined

  // Combine the dnd-kit ref with the board's keyboard ref.
  const composedRef = (el: HTMLDivElement | null) => {
    setNodeRef(el)
    setRef(el)
  }

  return (
    <OrderCard
      ref={composedRef}
      order={order}
      stage={stage}
      isDragging={isDragging}
      flash={flash}
      focused={focused}
      tabIndex={tabIndex}
      onOpen={onOpen}
      onKeyDown={onKeyDown}
      dragAttrs={attributes as unknown as Record<string, unknown>}
      dragListeners={listeners as unknown as Record<string, unknown>}
      dragTransform={transformStyle}
    />
  )
}

// =============================================================================
// Empty
// =============================================================================

function ColumnEmpty({ hint }: { hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-10 gap-2">
      <ChidiMark size={20} variant="muted" />
      <p className="text-[11.5px] text-[var(--chidi-text-muted)] leading-snug max-w-[16ch]">
        {hint}
      </p>
    </div>
  )
}

// =============================================================================
// Skeleton
// =============================================================================

function BoardSkeleton() {
  return (
    <div className="grid gap-3 lg:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, ci) => (
        <section
          key={ci}
          className="rounded-2xl border border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface)]/30 p-3 space-y-2 lg:h-[calc(100vh-9rem)]"
        >
          <div className="flex items-center gap-2 pb-1">
            <div className="h-2.5 w-20 rounded chidi-skeleton" />
            <div className="h-2.5 w-5 rounded chidi-skeleton" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--chidi-border-default)] bg-[var(--card)] p-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                <div className="h-3 flex-1 rounded chidi-skeleton" />
                <div className="h-3 w-10 rounded chidi-skeleton" />
              </div>
              <div className="h-2.5 w-3/4 rounded chidi-skeleton" />
              <div className="h-2.5 w-1/3 rounded chidi-skeleton" />
              <div className="flex items-center justify-between pt-1">
                <div className="h-2 w-10 rounded chidi-skeleton" />
                <div className="h-3 w-12 rounded chidi-skeleton" />
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}

// Inbox icon import retained in case future empty CTAs reference it.
void InboxIcon
