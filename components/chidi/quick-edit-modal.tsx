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
        return "bg-green-100 text-green-800 border-green-200"
      case "medium":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4" />
            Restock Product
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Info */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{product.name}</p>
                <p className="text-xs text-muted-foreground">Current stock: {product.stock} units</p>
              </div>
              {product.stockStatus === "out" && (
                <Badge className="bg-red-100 text-red-800 border-red-200">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Out of Stock
                </Badge>
              )}
            </div>
          </div>

          {/* Restock Suggestions */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quick Restock Options</Label>
            <div className="grid grid-cols-3 gap-2">
              {suggestions.map((suggestion, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer hover:shadow-sm transition-shadow ${getPriorityColor(suggestion.priority)}`}
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
            <Label htmlFor="stock" className="text-sm font-medium">
              New Stock Count
            </Label>
            <Input
              id="stock"
              type="number"
              value={stockValue}
              onChange={(e) => setStockValue(e.target.value)}
              placeholder="Enter stock count"
              className="h-9"
            />
          </div>

          {/* Cost Tracking */}
          <div className="space-y-2">
            <Label htmlFor="cost" className="text-sm font-medium">
              Restock Cost (Optional)
            </Label>
            <Input
              id="cost"
              type="number"
              value={restockCost}
              onChange={(e) => setRestockCost(e.target.value)}
              placeholder="Enter total cost"
              className="h-9"
            />
          </div>

          {/* Stock Level Indicator */}
          {stockValue && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium">New stock level: {stockValue} units</p>
                  <p className="text-xs text-muted-foreground">
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
            <Button variant="outline" onClick={handleClose} className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1" disabled={!stockValue}>
              Update Stock
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
