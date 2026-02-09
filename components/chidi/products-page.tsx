"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Filter, Plus, Package, AlertTriangle, CheckCircle, Download, Trash2 } from "lucide-react"

interface ProductsPageProps {
  products: any[]
  onAddProduct: () => void
  onEditProduct: (product: any) => void
  onViewProduct: (product: any) => void
  onDeleteProducts: (productIds: number[]) => void
  onBulkExport: () => void
}

export function ProductsPage({
  products,
  onAddProduct,
  onEditProduct,
  onViewProduct,
  onDeleteProducts,
  onBulkExport,
}: ProductsPageProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [stockFilter, setStockFilter] = useState("all")

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category)))]

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
    const matchesStock =
      stockFilter === "all" ||
      (stockFilter === "low" && product.stock <= product.reorderLevel && product.stock > 0) ||
      (stockFilter === "out" && product.stock === 0) ||
      (stockFilter === "good" && product.stock > product.reorderLevel)

    return matchesSearch && matchesCategory && matchesStock
  })

  const toggleProductSelection = (productId: number) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    )
  }

  const toggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(filteredProducts.map((p) => p.id))
    }
  }

  const getStockStatus = (stock: number, reorderLevel: number) => {
    if (stock === 0) return { label: "Out of Stock", color: "bg-red-100 text-red-800", icon: AlertTriangle }
    if (stock <= reorderLevel)
      return { label: `Low Stock (${stock})`, color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle }
    return { label: `In Stock (${stock})`, color: "bg-green-100 text-green-800", icon: CheckCircle }
  }

  const handleDeleteSelected = () => {
    if (confirm(`Delete ${selectedProducts.length} selected products?`)) {
      onDeleteProducts(selectedProducts)
      setSelectedProducts([])
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Product Catalog</h2>
          <p className="text-sm text-muted-foreground">
            {products.length} total products • {products.filter((p) => p.stock === 0).length} out of stock
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBulkExport} className="hidden lg:flex bg-transparent">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={onAddProduct}>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search products by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>

          {showFilters && (
            <div className="space-y-3 pt-3 border-t">
              <div>
                <p className="text-sm font-medium mb-2">Category</p>
                <div className="flex gap-2 flex-wrap">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="capitalize"
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Stock Status</p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={stockFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStockFilter("all")}
                  >
                    All
                  </Button>
                  <Button
                    variant={stockFilter === "good" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStockFilter("good")}
                  >
                    In Stock
                  </Button>
                  <Button
                    variant={stockFilter === "low" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStockFilter("low")}
                  >
                    Low Stock
                  </Button>
                  <Button
                    variant={stockFilter === "out" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStockFilter("out")}
                  >
                    Out of Stock
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedProducts.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm font-medium">{selectedProducts.length} products selected</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onBulkExport}>
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
              <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedProducts([])}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Table (Desktop) */}
      <div className="hidden lg:block">
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4 w-12">
                    <Checkbox
                      checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left p-4">Product</th>
                  <th className="text-left p-4">Category</th>
                  <th className="text-left p-4">Price</th>
                  <th className="text-left p-4">Stock</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-right p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product.stock, product.reorderLevel)
                  const StockIcon = stockStatus.icon

                  return (
                    <tr key={product.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={() => toggleProductSelection(product.id)}
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewProduct(product)}>
                          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                            {product.image ? (
                              <img
                                src={product.image || "/placeholder.svg"}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">ID: {product.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary" className="capitalize">
                          {product.category}
                        </Badge>
                      </td>
                      <td className="p-4 font-medium">{product.price}</td>
                      <td className="p-4">
                        <span className={stockStatus.stock === 0 ? "text-red-600 font-medium" : ""}>
                          {product.stock} units
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge className={stockStatus.color}>
                          <StockIcon className="w-3 h-3 mr-1" />
                          {stockStatus.label}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => onEditProduct(product)}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No products found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery ? "Try adjusting your filters" : "Start by adding your first product"}
                </p>
                <Button onClick={onAddProduct}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Products Grid (Mobile) */}
      <div className="lg:hidden grid grid-cols-2 gap-4">
        {filteredProducts.map((product) => {
          const stockStatus = getStockStatus(product.stock, product.reorderLevel)
          const StockIcon = stockStatus.icon

          return (
            <Card key={product.id} className="overflow-hidden">
              <div className="relative">
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    checked={selectedProducts.includes(product.id)}
                    onCheckedChange={() => toggleProductSelection(product.id)}
                    className="bg-white/80 backdrop-blur-sm"
                  />
                </div>

                <div
                  className="aspect-square bg-muted flex items-center justify-center cursor-pointer"
                  onClick={() => onViewProduct(product)}
                >
                  {product.image ? (
                    <img
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-12 h-12 text-muted-foreground" />
                  )}
                </div>
              </div>

              <CardContent className="p-3">
                <h3 className="font-medium text-sm mb-1 line-clamp-2">{product.name}</h3>
                <p className="text-lg font-bold text-primary mb-2">{product.price}</p>

                <div className="space-y-2">
                  <Badge className={`text-xs w-full justify-center ${stockStatus.color}`}>
                    <StockIcon className="w-3 h-3 mr-1" />
                    {product.stock} units
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-transparent"
                    onClick={() => onEditProduct(product)}
                  >
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {filteredProducts.length === 0 && (
          <div className="col-span-2 text-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No products found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? "Try adjusting your filters" : "Start by adding your first product"}
            </p>
            <Button onClick={onAddProduct}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
