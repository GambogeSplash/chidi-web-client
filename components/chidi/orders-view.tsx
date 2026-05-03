"use client"

import { useState, useEffect, useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  Loader2,
  Package,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  X,
  MessageCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  type Order,
  type OrderStatus,
  getOrderStatusDisplay,
  formatOrderAmount,
} from "@/lib/api/orders"
import {
  useOrders,
  useOrder,
  useFulfillOrder,
  useCancelOrder,
  ordersKeys,
} from "@/lib/hooks/use-orders"
import { CurrencyAmount } from "./currency-amount"
import { ReceiptPreview } from "./receipt-preview"
import { chidiWin } from "@/lib/chidi/ai-toast"
import { playWin } from "@/lib/chidi/sound"
import { hapticWin } from "@/lib/chidi/haptics"
import { useDashboardAuth } from "@/lib/providers/dashboard-auth-context"
import { buildVoiceContext, emptyOrdersMood, winFulfilled } from "@/lib/chidi/voice"
import { CustomerCharacter } from "./customer-character"
import { OrdersSmart, type OrdersFilter } from "./orders-smart"
import { EmptyArt } from "./empty-art"
import { cn } from "@/lib/utils"
import { ChidiLoader } from "./chidi-loader"
import { MilestoneModal } from "./milestone-modal"
import { detectMilestone, type MilestoneCard } from "@/lib/chidi/milestones"

type FilterStatus = OrderStatus | 'ALL'

interface OrdersViewProps {
  initialOrderId?: string | null
  onOrderSelected?: () => void
  onOpenConversation?: (conversationId: string) => void
}

export function OrdersView({ initialOrderId, onOrderSelected, onOpenConversation }: OrdersViewProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const queryClient = useQueryClient()

  // Fetch specific order if initialOrderId is provided
  const { data: initialOrder } = useOrder(initialOrderId || null)
  
  // Auto-select order when initialOrderId changes and order is fetched
  useEffect(() => {
    if (initialOrder && initialOrderId) {
      setSelectedOrder(initialOrder)
      onOrderSelected?.()
    }
  }, [initialOrder, initialOrderId, onOrderSelected])

  const { data, isLoading, isRefetching, isError, error } = useOrders(undefined)
  const fulfillMutation = useFulfillOrder()
  const cancelMutation = useCancelOrder()

  const orders = data?.orders ?? []

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ordersKeys.list(undefined) })
  }

  // Track which row to flash with the win color when an order completes —
  // this is the merchant's actual income; the moment deserves marking.
  const [winFlashOrderId, setWinFlashOrderId] = useState<string | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [activeMilestone, setActiveMilestone] = useState<MilestoneCard | null>(null)
  const [orderSearch, setOrderSearch] = useState("")
  // Default to "Need you" — that's where the merchant should land. The
  // "All" smart-sections view has been dropped; tabs are now action-oriented.
  const [filter, setFilter] = useState<OrdersFilter>("pending")
  const { user } = useDashboardAuth()

  // Counts per status — drives the tab badges
  const counts = useMemo(() => ({
    pending: orders.filter((o) => o.status === "PENDING_PAYMENT").length,
    in_progress: orders.filter((o) => o.status === "CONFIRMED").length,
    fulfilled: orders.filter((o) => o.status === "FULFILLED").length,
    cancelled: orders.filter((o) => o.status === "CANCELLED").length,
  }), [orders])

  // Filter orders by search query (customer name / order number / product name)
  const visibleOrders = useMemo(() => {
    if (!orderSearch.trim()) return orders
    const q = orderSearch.trim().toLowerCase()
    return orders.filter((o) =>
      (o.customer_name || "").toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q) ||
      o.items.some((i) => i.product_name?.toLowerCase().includes(q)),
    )
  }, [orders, orderSearch])
  const businessName = (user as any)?.businessName || "Your Business"

  const handleFulfill = async (orderId: string) => {
    fulfillMutation.mutate(
      { orderId },
      {
        onSuccess: (updatedOrder) => {
          if (selectedOrder?.id === orderId) {
            setSelectedOrder(updatedOrder)
          }
          setWinFlashOrderId(orderId)
          window.setTimeout(() => setWinFlashOrderId((id) => (id === orderId ? null : id)), 1500)
          playWin()
          hapticWin()
          chidiWin(winFulfilled(updatedOrder.customer_name, updatedOrder.items.length))

          // Earned moment? Check if this push crossed a milestone threshold.
          // Total fulfilled orders = current total + 1 (this one).
          const totalFulfilled = (data?.orders.filter((o) => o.status === 'FULFILLED').length ?? 0) + 1
          const uniqueCustomers = new Set(data?.orders.map((o) => o.customer_phone) ?? []).size
          const milestone = detectMilestone({ totalOrders: totalFulfilled, totalCustomers: uniqueCustomers })
          if (milestone) {
            window.setTimeout(() => setActiveMilestone(milestone), 1800)
          }
        },
      }
    )
  }

  const handleCancel = async (orderId: string) => {
    cancelMutation.mutate(
      { orderId },
      {
        onSuccess: (updatedOrder) => {
          if (selectedOrder?.id === orderId) {
            setSelectedOrder(updatedOrder)
          }
        },
      }
    )
  }

  const isActionLoading = fulfillMutation.isPending || cancelMutation.isPending
  const actionLoadingId = fulfillMutation.isPending 
    ? fulfillMutation.variables?.orderId 
    : cancelMutation.isPending 
    ? cancelMutation.variables?.orderId 
    : null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Relative time for list rows — match the inbox treatment so recency reads at a glance
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const diffMs = Date.now() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
  }

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex-1 bg-[var(--background)] flex items-center justify-center">
        <ChidiLoader context="orders" size="md" />
      </div>
    )
  }

  return (
    <div className="flex-1 bg-[var(--background)] flex">
      {/* Orders List - Hidden on mobile when order is selected.
          Detail pane is now narrower (40% on lg+) so the list breathes. */}
      <div className={cn(
        'flex flex-col',
        selectedOrder
          ? 'hidden md:flex md:flex-1 md:border-r border-[var(--chidi-border-subtle)]'
          : 'w-full',
      )}>
        {/* Header — noun + inline meta + search. Action-first. */}
        <div className="border-b border-[var(--chidi-border-subtle)]">
          <div className="max-w-4xl mx-auto w-full px-4 lg:px-6 py-4 lg:py-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h1 className="ty-page-title text-[var(--chidi-text-primary)]">Orders</h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isLoading || isRefetching}
                className="h-9 w-9"
                aria-label="Refresh"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Search — finds across customer, item, order# */}
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Search by customer, product, or order number..."
                className="w-full pl-9 pr-3 py-2 text-[13px] bg-[var(--chidi-surface)] border border-[var(--chidi-border-subtle)] rounded-lg text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--chidi-win)]/20 focus:border-[var(--chidi-border-default)] font-chidi-voice"
                onChange={(e) => setOrderSearch(e.target.value)}
                value={orderSearch}
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--chidi-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
              </svg>
            </div>

            {/* Status tabs — quick swap into a focused single-status view */}
            <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1" role="tablist">
              {([
                { id: "pending" as const, label: "Need you", count: counts.pending, tone: "warn" as const },
                { id: "in_progress" as const, label: "In progress", count: counts.in_progress },
                { id: "fulfilled" as const, label: "Fulfilled", count: counts.fulfilled },
                { id: "cancelled" as const, label: "Cancelled", count: counts.cancelled },
              ]).map((tab) => {
                const isActive = filter === tab.id
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setFilter(tab.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-chidi-voice transition-colors active:scale-[0.97] whitespace-nowrap flex-shrink-0",
                      isActive
                        ? "bg-[var(--chidi-text-primary)] text-[var(--chidi-bg-primary)]"
                        : "bg-[var(--chidi-surface)] text-[var(--chidi-text-secondary)] hover:bg-white border border-[var(--chidi-border-subtle)]",
                    )}
                  >
                    <span className={cn("font-medium", (tab as any).tone === "warn" && !isActive && "text-[var(--chidi-warning)]")}>
                      {tab.label}
                    </span>
                    {tab.count > 0 && (
                      <span className={cn(
                        "text-[10px] tabular-nums px-1 rounded-full min-w-[16px] text-center",
                        isActive ? "bg-white/20 text-current" : "text-[var(--chidi-text-muted)]",
                      )}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto">
          {isError ? (
            <div className="p-6 text-center text-red-600">
              {(error as Error)?.message || 'Failed to load orders'}
            </div>
          ) : orders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
              <EmptyArt variant="orders" size={104} className="text-[var(--chidi-text-muted)] mb-5" />
              <h3 className="ty-page-title text-[var(--chidi-text-primary)] mb-2">No orders yet.</h3>
              <p className="ty-body-voice text-[var(--chidi-text-secondary)] max-w-sm">
                {emptyOrdersMood(buildVoiceContext())}
              </p>
            </div>
          ) : (
            <OrdersSmart
              orders={visibleOrders}
              onOpenOrder={(o) => setSelectedOrder(o)}
              onOpenConversation={onOpenConversation}
              onFulfill={(id) => handleFulfill(id)}
              actionLoadingId={actionLoadingId ?? null}
              filter={filter}
            />
          )}
        </div>
      </div>

      {/* Order Detail Panel - Full width on mobile, ~40% on desktop (was 50%) */}
      {selectedOrder && (
        <div className="w-full md:w-[440px] lg:w-[480px] xl:w-[520px] flex flex-col bg-[var(--chidi-surface)]">
          {/* Header */}
          <div className="px-4 md:px-6 py-4 bg-white border-b border-[var(--chidi-border-subtle)]">
            <div className="flex items-center justify-between gap-3">
              {/* Back button - visible on mobile */}
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex items-center gap-1.5 px-2 py-1.5 -ml-2 rounded-lg text-sm font-medium text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] active:bg-[var(--chidi-surface-hover)] transition-colors md:hidden"
              >
                <ChevronLeft className="w-5 h-5" />
                Orders
              </button>
              
              <div className="flex-1 md:flex-none text-center md:text-left">
                <h2 className="font-semibold text-[var(--chidi-text-primary)]">Order Details</h2>
                <p className="text-xs text-[var(--chidi-text-muted)] mt-0.5 hidden md:block">
                  {formatDate(selectedOrder.created_at)}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge className={`${getOrderStatusDisplay(selectedOrder.status).color} ${getOrderStatusDisplay(selectedOrder.status).bgColor} border-0`}>
                  {getOrderStatusDisplay(selectedOrder.status).text}
                </Badge>
                {/* Close button - visible on desktop */}
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="hidden md:flex p-1.5 rounded-md hover:bg-[var(--chidi-surface)] text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
            {/* Customer Info */}
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-[var(--chidi-text-primary)]">Customer</h3>
                {selectedOrder.conversation_id && onOpenConversation && (
                  <button
                    onClick={() => onOpenConversation(selectedOrder.conversation_id!)}
                    className="inline-flex items-center gap-1 text-xs font-chidi-voice text-[var(--chidi-accent)] hover:text-[var(--chidi-text-primary)] transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Open conversation
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="space-y-2 text-sm font-chidi-voice">
                <div className="flex items-center gap-2 text-[var(--chidi-text-secondary)]">
                  <User className="w-4 h-4 text-[var(--chidi-text-muted)]" />
                  {selectedOrder.customer_name}
                </div>
                <div className="flex items-center gap-2 text-[var(--chidi-text-secondary)]">
                  <Phone className="w-4 h-4 text-[var(--chidi-text-muted)]" />
                  {selectedOrder.customer_phone}
                </div>
                <div className="flex items-center gap-2 text-[var(--chidi-text-secondary)]">
                  <Mail className="w-4 h-4 text-[var(--chidi-text-muted)]" />
                  {selectedOrder.customer_email}
                </div>
                <div className="flex items-start gap-2 text-[var(--chidi-text-secondary)]">
                  <MapPin className="w-4 h-4 text-[var(--chidi-text-muted)] mt-0.5" />
                  {selectedOrder.delivery_address}
                </div>
              </div>
            </div>

            {/* Order Items — image rows */}
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-[var(--chidi-text-primary)]">Items</h3>
                <button
                  onClick={() => setShowReceipt(true)}
                  className="text-xs font-chidi-voice text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] transition-colors"
                >
                  Preview customer receipt →
                </button>
              </div>
              <ul className="space-y-2.5">
                {selectedOrder.items.map((item, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <span
                      className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-[var(--chidi-surface)] border border-[var(--chidi-border-subtle)] flex items-center justify-center"
                    >
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-xs text-[var(--chidi-text-muted)] font-medium">
                          {item.product_name?.[0]?.toUpperCase() || "?"}
                        </span>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--chidi-text-primary)] font-chidi-voice leading-tight truncate">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-[var(--chidi-text-muted)] font-chidi-voice tabular-nums mt-0.5">
                        {formatOrderAmount(item.unit_price, selectedOrder.currency)} × {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-[var(--chidi-text-primary)] tabular-nums flex-shrink-0">
                      {formatOrderAmount(item.unit_price * item.quantity, selectedOrder.currency)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-3 border-t border-[var(--chidi-border-subtle)] flex items-baseline justify-between">
                <span className="ty-meta">Total</span>
                <CurrencyAmount
                  amount={selectedOrder.total}
                  currency={selectedOrder.currency}
                  className="text-[20px] font-semibold tabular-nums text-[var(--chidi-text-primary)]"
                />
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg p-4">
              <h3 className="text-sm font-medium text-[var(--chidi-text-primary)] mb-3">Timeline</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-[var(--chidi-text-secondary)]">
                  <Clock className="w-4 h-4 text-[var(--chidi-text-muted)]" />
                  Created: {formatDate(selectedOrder.created_at)}
                </div>
                {selectedOrder.confirmed_at && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Confirmed: {formatDate(selectedOrder.confirmed_at)}
                  </div>
                )}
                {selectedOrder.fulfilled_at && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Package className="w-4 h-4" />
                    Fulfilled: {formatDate(selectedOrder.fulfilled_at)}
                  </div>
                )}
                {selectedOrder.cancelled_at && (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="w-4 h-4" />
                    Cancelled: {formatDate(selectedOrder.cancelled_at)}
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {selectedOrder.notes && (
              <div className="bg-white rounded-lg p-4">
                <h3 className="text-sm font-medium text-[var(--chidi-text-primary)] mb-2">Notes</h3>
                <p className="text-sm text-[var(--chidi-text-secondary)] whitespace-pre-wrap">
                  {selectedOrder.notes}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          {selectedOrder.status === 'CONFIRMED' && (
            <div className="px-4 md:px-6 py-4 bg-white border-t border-[var(--chidi-border-subtle)]">
              <Button
                onClick={() => handleFulfill(selectedOrder.id)}
                disabled={actionLoadingId === selectedOrder.id}
                className="w-full bg-[var(--chidi-success)] hover:bg-[var(--chidi-success)]/90"
              >
                {actionLoadingId === selectedOrder.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Package className="w-4 h-4 mr-2" />
                )}
                Mark as Fulfilled
              </Button>
            </div>
          )}
          {(selectedOrder.status === 'PENDING_PAYMENT' || selectedOrder.status === 'CONFIRMED') && (
            <div className="px-4 md:px-6 py-3 bg-white border-t border-[var(--chidi-border-subtle)]">
              <Button
                variant="outline"
                onClick={() => handleCancel(selectedOrder.id)}
                disabled={actionLoadingId === selectedOrder.id}
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
              >
                {actionLoadingId === selectedOrder.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Cancel Order
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Branded customer receipt preview */}
      {selectedOrder && (
        <ReceiptPreview
          order={selectedOrder}
          businessName={businessName}
          open={showReceipt}
          onClose={() => setShowReceipt(false)}
        />
      )}

      {/* Milestone celebration — fires once per threshold crossed */}
      <MilestoneModal milestone={activeMilestone} onClose={() => setActiveMilestone(null)} />
    </div>
  )
}
