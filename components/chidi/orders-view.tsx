"use client"

import { ShoppingBag } from "lucide-react"
import { ComingSoonState } from "./empty-state"

export function OrdersView() {
  return (
    <div className="flex-1 bg-white">
      <ComingSoonState
        icon={ShoppingBag}
        title="Orders"
        description="Track and manage customer orders. View order history, update statuses, and handle fulfillment all in one place."
      />
    </div>
  )
}
