"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Search, Filter, Plus, Download, Trash2 } from "lucide-react"
import type { DisplayProduct, StockStatus } from "@/lib/types/product"
import { getStockStatusLabel, getStockStatusColor } from "@/lib/utils/product-transformer"

interface ProductsTabProps {
  products: DisplayProduct[]
  onEditProduct: (product: DisplayProduct) => void
  onAddProduct: () => void
  onViewProduct: (product: DisplayProduct) => void
  onDeleteProducts?: (productIds: string[]) => void
}

export function ProductsTab({
  products,
  onEditProduct,
  onAddProduct,
  onViewProduct,
  onDeleteProducts,
}: ProductsTabProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [priceRange, setPriceRange] = useState({ min: "", max: "" })

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterStatus === "all" || product.stockStatus === filterStatus

    let matchesPrice = true
    if (priceRange.min || priceRange.max) {
      const price = product.sellingPrice
      const minPrice = priceRange.min ? Number.parseInt(priceRange.min) : 0
      const maxPrice = priceRange.max ? Number.parseInt(priceRange.max) : Number.POSITIVE_INFINITY
      matchesPrice = price >= minPrice && price <= maxPrice
    }

    return matchesSearch && matchesFilter && matchesPrice
  })

  const getProductImage = (product: DisplayProduct) => {
    if (product.image) return product.image
    return `/placeholder.svg?height=120&width=120&query=${encodeURIComponent(product.name)}`
  }

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts((prev) => [...prev, productId])
    } else {
      setSelectedProducts((prev) => prev.filter((id) => id !== productId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(filteredProducts.map((p) => p.id))
    } else {
      setSelectedProducts([])
    }
  }

  const handleExportProducts = () => {
    const csvContent = [
      "Name,Stock,Price,Status,SKU,Category",
      ...filteredProducts.map((p) => `${p.name},${p.stock},${p.displayPrice},${p.stockStatus},${p.sku},${p.category}`),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "products.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDeleteSelected = () => {
    if (onDeleteProducts && selectedProducts.length > 0) {
      onDeleteProducts(selectedProducts)
      setSelectedProducts([])
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Products</h2>
        <div className="flex gap-2">
          {selectedProducts.length > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={handleExportProducts}>
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
              <Button size="sm" variant="outline" onClick={handleDeleteSelected}>
                <Trash2 className="w-4 h-4 mr-1" />
                Delete ({selectedProducts.length})
              </Button>
            </>
          )}
          <Button size="sm" onClick={onAddProduct}>
            <Plus className="w-4 h-4 mr-1" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <h4 className="font-medium">Filters</h4>

              <div>
                <label className="text-sm font-medium">Price Range</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange((prev) => ({ ...prev, min: e.target.value }))}
                    type="number"
                  />
                  <Input
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange((prev) => ({ ...prev, max: e.target.value }))}
                    type="number"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPriceRange({ min: "", max: "" })
                    setFilterStatus("all")
                  }}
                >
                  Clear
                </Button>
                <Button size="sm" onClick={() => setShowFilters(false)}>
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {["all", "good", "low", "out"].map((status) => (
          <Button
            key={status}
            variant={filterStatus === status ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilterStatus(status)}
            className="capitalize"
          >
            {status === "all" ? "All" : getStockStatusLabel(status as StockStatus)}
          </Button>
        ))}
      </div>

      {/* Bulk Selection */}
      {filteredProducts.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Checkbox checked={selectedProducts.length === filteredProducts.length} onCheckedChange={handleSelectAll} />
          <span>Select all ({filteredProducts.length} products)</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="cursor-pointer hover:shadow-sm transition-shadow">
            <CardContent className="p-3">
              <div className="space-y-3">
                {/* Product Image */}
                <div className="relative">
                  <img
                    src={getProductImage(product)}
                    alt={product.name}
                    className="w-full h-24 object-cover rounded-md bg-gray-100"
                  />
                  <div className="absolute top-2 left-2">
                    <Checkbox
                      checked={selectedProducts.includes(product.id)}
                      onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-white/80 backdrop-blur-sm"
                    />
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge className={`text-xs ${getStockStatusColor(product.stockStatus)}`}>
                      {getStockStatusLabel(product.stockStatus)}
                    </Badge>
                  </div>
                </div>

                {/* Product Info */}
                <div className="space-y-2" onClick={() => onViewProduct(product)}>
                  <h3 className="font-medium text-sm leading-tight">{product.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">{product.displayPrice}</span>
                    <span className="text-xs text-muted-foreground">{product.stock} units</span>
                  </div>
                </div>

                {/* Edit Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditProduct(product)
                  }}
                >
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No products found</p>
        </div>
      )}
    </div>
  )
}
