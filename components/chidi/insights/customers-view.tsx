"use client"

import { useState, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Search, Star, Phone, Mail, RefreshCw, Users } from "lucide-react"
import { formatCurrency, formatRelativeTime, getChannelDisplay } from "@/lib/api/analytics"
import { useCustomers, analyticsKeys } from "@/lib/hooks/use-analytics"
import type { CustomerSummary } from "@/lib/types/analytics"
import { CustomerDetail } from "./customer-detail"
import { cn } from "@/lib/utils"

export function CustomersView() {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null)
  const queryClient = useQueryClient()

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading, isRefetching } = useCustomers(debouncedSearch, "total_spent", 50)

  const customers = data?.customers ?? []
  const total = data?.total ?? 0

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: analyticsKeys.customers(debouncedSearch, "total_spent") })
  }

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-[var(--chidi-text-primary)]">
              Customers
            </h2>
            <button
              onClick={handleRefresh}
              disabled={isLoading || isRefetching}
              className="p-2 text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-secondary)] disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
            </button>
          </div>
          <p className="text-xs text-[var(--chidi-text-muted)] mb-3">
            {total} total customers · Synced from your sales channels
          </p>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--chidi-text-muted)]" />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)]"
            />
          </div>
        </div>

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && customers.length === 0 ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <CustomerCardSkeleton key={i} />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-16 h-16 rounded-full bg-[var(--chidi-surface)] flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-[var(--chidi-text-muted)]" />
              </div>
              <h3 className="text-lg font-medium text-[var(--chidi-text-primary)] mb-2">
                {search ? "No customers found" : "No customers yet"}
              </h3>
              <p className="text-sm text-[var(--chidi-text-muted)] max-w-xs">
                {search
                  ? "Try a different search term"
                  : "Customer profiles are created automatically when people message you through connected channels."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {customers.map((customer) => (
                <CustomerCard
                  key={customer.phone}
                  customer={customer}
                  onClick={() => setSelectedCustomer(customer)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Customer Detail Sheet */}
      {selectedCustomer && (
        <CustomerDetail
          customerPhone={selectedCustomer.phone}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </>
  )
}

interface CustomerCardProps {
  customer: CustomerSummary
  onClick: () => void
}

function CustomerCard({ customer, onClick }: CustomerCardProps) {
  const initials = getInitials(customer.name || customer.phone)

  return (
    <button
      onClick={onClick}
      className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0 w-11 h-11 rounded-full bg-[var(--chidi-surface)] flex items-center justify-center">
          <span className="text-sm font-medium text-[var(--chidi-text-secondary)]">
            {initials}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-[var(--chidi-text-primary)] truncate">
              {customer.name || "Unknown"}
            </span>
            {customer.is_vip && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                <Star className="w-3 h-3 mr-0.5 fill-current" />
                VIP
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--chidi-text-muted)]">
            <Phone className="w-3 h-3" />
            <span>{customer.phone}</span>
          </div>
          {customer.email && (
            <div className="flex items-center gap-2 text-xs text-[var(--chidi-text-muted)] mt-0.5">
              <Mail className="w-3 h-3" />
              <span className="truncate">{customer.email}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex-shrink-0 text-right">
          <div className="text-sm font-semibold text-[var(--chidi-text-primary)]">
            {formatCurrency(customer.total_spent)}
          </div>
          <div className="text-xs text-[var(--chidi-text-muted)]">
            {customer.order_count} {customer.order_count === 1 ? "order" : "orders"}
          </div>
          <div className="text-xs text-[var(--chidi-text-muted)]">
            Last: {formatRelativeTime(customer.last_order)}
          </div>
        </div>
      </div>

      {/* Channel badges */}
      {customer.channels.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2 ml-14">
          {customer.channels.map((channel) => {
            const display = getChannelDisplay(channel)
            return (
              <span
                key={channel}
                className={cn(
                  "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
                  display.color,
                  "bg-opacity-10"
                )}
                style={{ backgroundColor: `${getChannelBgColor(channel)}20` }}
              >
                {display.name}
              </span>
            )
          })}
        </div>
      )}
    </button>
  )
}

function CustomerCardSkeleton() {
  return (
    <div className="p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-gray-200" />
        <div className="flex-1">
          <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
          <div className="h-3 w-24 bg-gray-200 rounded" />
        </div>
        <div className="text-right">
          <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
          <div className="h-3 w-16 bg-gray-200 rounded" />
        </div>
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
