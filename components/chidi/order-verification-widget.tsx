"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Check, 
  X, 
  Loader2, 
  Package, 
  User, 
  Phone, 
  Mail, 
  MapPin,
  AlertCircle
} from "lucide-react"
import { 
  type Order, 
  formatOrderAmount, 
  getOrderStatusDisplay 
} from "@/lib/api/orders"

interface OrderVerificationWidgetProps {
  order: Order
  onConfirm: () => Promise<void>
  onReject: (reason?: string) => Promise<void>
}

export function OrderVerificationWidget({ 
  order, 
  onConfirm, 
  onReject 
}: OrderVerificationWidgetProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setIsConfirming(true)
    setError(null)
    try {
      await onConfirm()
    } catch (err: any) {
      setError(err.message || "Failed to confirm order")
    } finally {
      setIsConfirming(false)
    }
  }

  const handleReject = async () => {
    setIsRejecting(true)
    setError(null)
    try {
      await onReject()
    } catch (err: any) {
      setError(err.message || "Failed to reject order")
    } finally {
      setIsRejecting(false)
    }
  }

  const isLoading = isConfirming || isRejecting
  const statusDisplay = getOrderStatusDisplay(order.status)

  const itemsSummary = order.items
    .slice(0, 2)
    .map(item => `${item.product_name}${item.quantity > 1 ? ` (x${item.quantity})` : ''}`)
    .join(', ')
  const moreItems = order.items.length > 2 ? ` +${order.items.length - 2} more` : ''

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-amber-600" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-amber-900 text-sm">
            Order Pending Verification
          </h4>
          <p className="text-xs text-amber-700 mt-0.5">
            Customer claims payment has been made. Please verify.
          </p>

          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <User className="w-4 h-4 text-gray-400" />
              <span>{order.customer_name}</span>
            </div>
            
            <div className="flex items-center gap-2 text-gray-700">
              <Package className="w-4 h-4 text-gray-400" />
              <span className="truncate">{itemsSummary}{moreItems}</span>
            </div>
            
            <div className="flex items-center gap-2 text-gray-900 font-medium">
              <span className="w-4 h-4 text-center text-gray-400">₦</span>
              <span>{formatOrderAmount(order.total, order.currency)}</span>
            </div>
          </div>

          {error && (
            <p className="mt-2 text-xs text-red-600">
              {error}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {isConfirming ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Check className="w-4 h-4 mr-1" />
              )}
              Confirm Payment
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleReject}
              disabled={isLoading}
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            >
              {isRejecting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <X className="w-4 h-4 mr-1" />
              )}
              Not Received
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface OrderDetailCardProps {
  order: Order
}

export function OrderDetailCard({ order }: OrderDetailCardProps) {
  const statusDisplay = getOrderStatusDisplay(order.status)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">Order Details</h4>
        <span className={`text-xs font-medium px-2 py-1 rounded ${statusDisplay.color} ${statusDisplay.bgColor}`}>
          {statusDisplay.text}
        </span>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex items-start gap-2">
          <User className="w-4 h-4 text-gray-400 mt-0.5" />
          <div>
            <p className="text-gray-900">{order.customer_name}</p>
            <div className="flex items-center gap-3 text-gray-500 text-xs mt-0.5">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {order.customer_phone}
              </span>
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {order.customer_email}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
          <p className="text-gray-700">{order.delivery_address}</p>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-900">Items</span>
          </div>
          <div className="space-y-1.5 pl-6">
            {order.items.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-gray-700">
                <span>
                  {item.product_name}
                  {item.quantity > 1 && <span className="text-gray-500"> x{item.quantity}</span>}
                </span>
                <span className="font-medium">
                  {formatOrderAmount(item.unit_price * item.quantity, order.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
          <span className="font-medium text-gray-900">Total</span>
          <span className="font-semibold text-gray-900 text-base">
            {formatOrderAmount(order.total, order.currency)}
          </span>
        </div>
      </div>
    </div>
  )
}
