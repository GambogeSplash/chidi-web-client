"use client"

import { useState, useEffect } from "react"
import { 
  ShoppingBag, 
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
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ordersAPI, 
  type Order, 
  type OrderStatus,
  getOrderStatusDisplay,
  formatOrderAmount
} from "@/lib/api/orders"

type FilterStatus = OrderStatus | 'ALL'

export function OrdersView() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>('ALL')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    loadOrders()
  }, [selectedFilter])

  const loadOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const filter = selectedFilter === 'ALL' ? undefined : selectedFilter
      const response = await ordersAPI.getOrders({ status: filter })
      setOrders(response.orders)
    } catch (err: any) {
      setError(err.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const handleFulfill = async (orderId: string) => {
    setActionLoading(orderId)
    try {
      const updated = await ordersAPI.fulfillOrder(orderId)
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o))
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updated)
      }
    } catch (err) {
      console.error('Failed to fulfill order:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async (orderId: string) => {
    setActionLoading(orderId)
    try {
      const updated = await ordersAPI.cancelOrder(orderId)
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o))
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updated)
      }
    } catch (err) {
      console.error('Failed to cancel order:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const filterTabs: { id: FilterStatus; label: string; icon: typeof ShoppingBag }[] = [
    { id: 'ALL', label: 'All', icon: ShoppingBag },
    { id: 'PENDING_PAYMENT', label: 'Pending', icon: AlertCircle },
    { id: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle },
    { id: 'FULFILLED', label: 'Fulfilled', icon: Package },
    { id: 'CANCELLED', label: 'Cancelled', icon: XCircle },
  ]

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

  if (loading && orders.length === 0) {
    return (
      <div className="flex-1 bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--chidi-accent)]" />
      </div>
    )
  }

  return (
    <div className="flex-1 bg-white flex">
      {/* Orders List - Hidden on mobile when order is selected */}
      <div className={`${selectedOrder ? 'hidden md:flex md:w-1/2 md:border-r border-[var(--chidi-border-subtle)]' : 'w-full'} flex flex-col`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--chidi-border-subtle)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-[var(--chidi-text-primary)]">Orders</h1>
              <p className="text-sm text-[var(--chidi-text-muted)]">
                {orders.length} order{orders.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={loadOrders}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filterTabs.map(tab => {
              const isActive = selectedFilter === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedFilter(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive 
                      ? 'bg-[var(--chidi-accent)] text-white' 
                      : 'bg-[var(--chidi-surface)] text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-surface-hover)]'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto">
          {error ? (
            <div className="p-6 text-center text-red-600">{error}</div>
          ) : orders.length === 0 ? (
            <div className="p-6 text-center text-[var(--chidi-text-muted)]">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No orders found</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--chidi-border-subtle)]">
              {orders.map(order => {
                const statusDisplay = getOrderStatusDisplay(order.status)
                const isSelected = selectedOrder?.id === order.id
                
                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`w-full px-6 py-4 text-left hover:bg-[var(--chidi-surface)] transition-colors ${
                      isSelected ? 'bg-[var(--chidi-surface)]' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--chidi-text-primary)]">
                            {order.customer_name}
                          </span>
                          <Badge className={`${statusDisplay.color} ${statusDisplay.bgColor} border-0 text-[10px]`}>
                            {statusDisplay.text}
                          </Badge>
                        </div>
                        <p className="text-sm text-[var(--chidi-text-muted)] truncate mt-0.5">
                          {order.items.map(i => i.product_name).join(', ')}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm font-medium text-[var(--chidi-text-primary)]">
                            {formatOrderAmount(order.total, order.currency)}
                          </span>
                          <span className="text-xs text-[var(--chidi-text-muted)]">
                            {formatDate(order.created_at)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--chidi-text-muted)] flex-shrink-0 mt-1" />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Panel - Full width on mobile, half on desktop */}
      {selectedOrder && (
        <div className="w-full md:w-1/2 flex flex-col bg-[var(--chidi-surface)]">
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
              <h3 className="text-sm font-medium text-[var(--chidi-text-primary)] mb-3">Customer</h3>
              <div className="space-y-2 text-sm">
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

            {/* Order Items */}
            <div className="bg-white rounded-lg p-4">
              <h3 className="text-sm font-medium text-[var(--chidi-text-primary)] mb-3">Items</h3>
              <div className="space-y-3">
                {selectedOrder.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-[var(--chidi-text-primary)]">{item.product_name}</span>
                      {item.quantity > 1 && (
                        <span className="text-[var(--chidi-text-muted)]"> x{item.quantity}</span>
                      )}
                    </div>
                    <span className="font-medium text-[var(--chidi-text-primary)]">
                      {formatOrderAmount(item.unit_price * item.quantity, selectedOrder.currency)}
                    </span>
                  </div>
                ))}
                <div className="pt-3 border-t border-[var(--chidi-border-subtle)] flex items-center justify-between">
                  <span className="font-medium text-[var(--chidi-text-primary)]">Total</span>
                  <span className="font-semibold text-lg text-[var(--chidi-text-primary)]">
                    {formatOrderAmount(selectedOrder.total, selectedOrder.currency)}
                  </span>
                </div>
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
                disabled={actionLoading === selectedOrder.id}
                className="w-full bg-[var(--chidi-success)] hover:bg-[var(--chidi-success)]/90"
              >
                {actionLoading === selectedOrder.id ? (
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
                disabled={actionLoading === selectedOrder.id}
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
              >
                {actionLoading === selectedOrder.id ? (
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
    </div>
  )
}
