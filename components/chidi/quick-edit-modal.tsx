"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, AlertTriangle, Package } from "lucide-react"
import type { DisplayProduct } from "@/lib/types/product"
import { getStockStatus } from "@/lib/utils/product-transformer"
import { cn } from "@/lib/utils"

interface QuickEditModalProps {
  product: DisplayProduct
  onClose: () => void
  onSave: (product: DisplayProduct) => void
}

export function QuickEditModal({ product, onClose, onSave }: QuickEditModalProps) {
  const [stockValue, setStockValue] = useState(product.stock.toString())
  const [restockCost, setRestockCost] = useState("")

  const getRestockSuggestions = () => {
    // Mock data - in real app this would come from sales analytics
    const suggestions = [
      { amount: 10, reason: "Weekly average", priority: "low" },
      { amount: 20, reason: "Recommended", priority: "medium" },
      { amount: 50, reason: "Bulk discount", priority: "high" },
    ]

    return suggestions
  }

  const suggestions = getRestockSuggestions()

  const handleSave = () => {
    if (stockValue) {
      const stockNum = Number.parseInt(stockValue)
      const updatedProduct: DisplayProduct = {
        ...product,
        stock: stockNum,
        stockStatus: getStockStatus(stockNum, product.reorderLevel),
      }

      onSave(updatedProduct)
      onClose()
      setStockValue("")
      setRestockCost("")
    }
  }

  const handleClose = () => {
    onClose()
    setStockValue("")
    setRestockCost("")
  }

  const handleSuggestionClick = (amount: number) => {
    setStockValue(amount.toString())
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-[var(--chidi-success)]/10 text-[var(--chidi-success)] border-[var(--chidi-success)]/20"
      case "medium":
        return "bg-[var(--chidi-accent)]/10 text-[var(--chidi-accent)] border-[var(--chidi-accent)]/20"
      case "low":
        return "bg-[var(--chidi-surface)] text-[var(--chidi-text-secondary)] border-[var(--chidi-border-subtle)]"
      default:
        return "bg-[var(--chidi-surface)] text-[var(--chidi-text-secondary)] border-[var(--chidi-border-subtle)]"
    }
  }

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm mx-auto bg-white border-[var(--chidi-border-default)]">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2 text-[var(--chidi-text-primary)]">
            <Package className="w-4 h-4" />
            Restock Product
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Info */}
          <div className="bg-[var(--chidi-surface)] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-[var(--chidi-text-primary)]">{product.name}</p>
                <p className="text-xs text-[var(--chidi-text-muted)]">Current stock: {product.stock} units</p>
              </div>
              {product.stockStatus === "out" && (
                <Badge className="bg-[var(--chidi-danger)]/10 text-[var(--chidi-danger)] border-[var(--chidi-danger)]/20">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Out of Stock
                </Badge>
              )}
            </div>
          </div>

          {/* Restock Suggestions */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[var(--chidi-text-secondary)]">Quick Restock Options</Label>
            <div className="grid grid-cols-3 gap-2">
              {suggestions.map((suggestion, index) => (
                <Card
                  key={index}
                  className={cn(
                    "cursor-pointer hover:shadow-sm transition-shadow border",
                    getPriorityColor(suggestion.priority)
                  )}
                  onClick={() => handleSuggestionClick(suggestion.amount)}
                >
                  <CardContent className="p-2 text-center">
                    <div className="text-sm font-bold">{suggestion.amount}</div>
                    <div className="text-xs">{suggestion.reason}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Manual Stock Input */}
          <div className="space-y-2">
            <Label htmlFor="stock" className="text-sm font-medium text-[var(--chidi-text-secondary)]">
              New Stock Count
            </Label>
            <Input
              id="stock"
              type="number"
              value={stockValue}
              onChange={(e) => setStockValue(e.target.value)}
              placeholder="Enter stock count"
              className="h-9 bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)]"
            />
          </div>

          {/* Cost Tracking */}
          <div className="space-y-2">
            <Label htmlFor="cost" className="text-sm font-medium text-[var(--chidi-text-secondary)]">
              Restock Cost (Optional)
            </Label>
            <Input
              id="cost"
              type="number"
              value={restockCost}
              onChange={(e) => setRestockCost(e.target.value)}
              placeholder="Enter total cost"
              className="h-9 bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)]"
            />
          </div>

          {/* Stock Level Indicator */}
          {stockValue && (
            <div className="bg-[var(--chidi-surface)] rounded-lg p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--chidi-success)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--chidi-text-primary)]">New stock level: {stockValue} units</p>
                  <p className="text-xs text-[var(--chidi-text-muted)]">
                    Status will be:{" "}
                    {Number.parseInt(stockValue) > 10
                      ? "Good Stock"
                      : Number.parseInt(stockValue) > 0
                        ? "Low Stock"
                        : "Out of Stock"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={handleClose} 
              className="flex-1 bg-white border-[var(--chidi-border-default)] text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-surface)]"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              className="flex-1 bg-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)] hover:bg-[var(--chidi-accent)]/90" 
              disabled={!stockValue}
            >
              Update Stock
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
