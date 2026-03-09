"use client"

import {
  X,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  MessageSquare,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { formatCurrency, formatRelativeTime, getChannelDisplay } from "@/lib/api/analytics"
import { useCustomerDetail, analyticsKeys } from "@/lib/hooks/use-analytics"
import type { CustomerDetailResponse, OrderSummary, InteractionSummary } from "@/lib/types/analytics"
import { cn } from "@/lib/utils"

interface CustomerDetailProps {
  customerPhone: string
  onClose: () => void
}

export function CustomerDetail({ customerPhone, onClose }: CustomerDetailProps) {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error, isRefetching } = useCustomerDetail(customerPhone)

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: analyticsKeys.customerDetail(customerPhone) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-[var(--chidi-text-primary)]">
            Customer Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--chidi-accent)]" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <p className="text-sm text-red-500 mb-4">
                {(error as Error)?.message || "Failed to load customer details"}
              </p>
              <button
                onClick={handleRetry}
                disabled={isRefetching}
                className="flex items-center gap-2 text-sm text-[var(--chidi-accent)] font-medium"
              >
                <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
                Try again
              </button>
            </div>
          ) : data ? (
            <div className="p-4 space-y-6">
              {/* Customer Info */}
              <CustomerInfo customer={data.customer} />

              {/* Stats */}
              <CustomerStats customer={data.customer} />

              {/* Order History */}
              <OrderHistory orders={data.orders} />

              {/* Interaction Timeline */}
              {data.interactions.length > 0 && (
                <InteractionTimeline interactions={data.interactions} />
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function CustomerInfo({ customer }: { customer: CustomerDetailResponse["customer"] }) {
  return (
    <div className="space-y-3">
      {/* Name */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--chidi-surface)] flex items-center justify-center mx-auto mb-3">
          <span className="text-xl font-medium text-[var(--chidi-text-secondary)]">
            {getInitials(customer.name || customer.phone)}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-[var(--chidi-text-primary)]">
          {customer.name || "Unknown Customer"}
        </h3>
      </div>

      {/* Contact Info */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 text-sm">
          <Phone className="w-4 h-4 text-[var(--chidi-text-muted)]" />
          <span className="text-[var(--chidi-text-secondary)]">{customer.phone}</span>
        </div>
        {customer.email && (
          <div className="flex items-center gap-3 text-sm">
            <Mail className="w-4 h-4 text-[var(--chidi-text-muted)]" />
            <span className="text-[var(--chidi-text-secondary)]">{customer.email}</span>
          </div>
        )}
        {customer.address && (
          <div className="flex items-start gap-3 text-sm">
            <MapPin className="w-4 h-4 text-[var(--chidi-text-muted)] mt-0.5" />
            <span className="text-[var(--chidi-text-secondary)]">{customer.address}</span>
          </div>
        )}
      </div>

      {/* Channels */}
      {customer.channels.length > 0 && (
        <div className="flex items-center gap-2 pt-2">
          {customer.channels.map((channel) => {
            const display = getChannelDisplay(channel)
            return (
              <span
                key={channel}
                className={cn(
                  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                  display.color
                )}
                style={{ backgroundColor: `${getChannelBgColor(channel)}15` }}
              >
                {display.name}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CustomerStats({ customer }: { customer: CustomerDetailResponse["customer"] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard
        label="Total Spent"
        value={formatCurrency(customer.total_spent)}
      />
      <StatCard
        label="Orders"
        value={customer.order_count.toString()}
      />
      <StatCard
        label="Avg Order"
        value={formatCurrency(customer.avg_order_value)}
      />
      <StatCard
        label="Customer Since"
        value={formatDate(customer.first_order)}
      />
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs text-[var(--chidi-text-muted)] mb-1">{label}</div>
      <div className="text-sm font-semibold text-[var(--chidi-text-primary)]">{value}</div>
    </div>
  )
}

function OrderHistory({ orders }: { orders: OrderSummary[] }) {
  if (orders.length === 0) {
    return null
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <ShoppingBag className="w-4 h-4 text-[var(--chidi-text-muted)]" />
        <h4 className="text-sm font-medium text-[var(--chidi-text-primary)]">
          Order History
        </h4>
      </div>
      <div className="space-y-2">
        {orders.slice(0, 10).map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
        {orders.length > 10 && (
          <p className="text-xs text-[var(--chidi-text-muted)] text-center py-2">
            + {orders.length - 10} more orders
          </p>
        )}
      </div>
    </div>
  )
}

function OrderCard({ order }: { order: OrderSummary }) {
  const statusDisplay = getOrderStatusDisplay(order.status)
  const itemCount = Array.isArray(order.items) ? order.items.length : 0

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            statusDisplay.bgColor,
            statusDisplay.color
          )}
        >
          {statusDisplay.text}
        </span>
        <span className="text-sm font-semibold text-[var(--chidi-text-primary)]">
          {formatCurrency(order.total)}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-[var(--chidi-text-muted)]">
        <span>{itemCount} {itemCount === 1 ? "item" : "items"}</span>
        <span>{formatRelativeTime(order.created_at)}</span>
      </div>
    </div>
  )
}

function InteractionTimeline({ interactions }: { interactions: InteractionSummary[] }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-[var(--chidi-text-muted)]" />
        <h4 className="text-sm font-medium text-[var(--chidi-text-primary)]">
          Recent Interactions
        </h4>
      </div>
      <div className="space-y-2">
        {interactions.slice(0, 5).map((interaction) => (
          <div
            key={interaction.id}
            className="bg-[var(--chidi-surface)] rounded-lg p-3"
          >
            <p className="text-sm text-[var(--chidi-text-secondary)] line-clamp-2 mb-1">
              {interaction.summary}
            </p>
            <p className="text-xs text-[var(--chidi-text-muted)]">
              {formatRelativeTime(interaction.created_at)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function getChannelBgColor(channel: string): string {
  const colors: Record<string, string> = {
    WHATSAPP: "#25D366",
    TELEGRAM: "#0088cc",
    INSTAGRAM: "#E4405F",
    SMS: "#6B7280",
  }
  const normalized = channel?.toUpperCase() || "UNKNOWN"
  return colors[normalized] || "#9CA3AF"
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-"
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

function getOrderStatusDisplay(status: string): {
  text: string
  color: string
  bgColor: string
} {
  const map: Record<string, { text: string; color: string; bgColor: string }> = {
    PENDING_PAYMENT: { text: "Pending", color: "text-amber-600", bgColor: "bg-amber-50" },
    CONFIRMED: { text: "Confirmed", color: "text-blue-600", bgColor: "bg-blue-50" },
    FULFILLED: { text: "Fulfilled", color: "text-green-600", bgColor: "bg-green-50" },
    CANCELLED: { text: "Cancelled", color: "text-gray-500", bgColor: "bg-gray-100" },
  }
  return map[status] || { text: status, color: "text-gray-600", bgColor: "bg-gray-50" }
}
