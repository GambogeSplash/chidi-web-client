"use client"

import { useState } from "react"
import { Search, Filter, Plus, MoreVertical, Package, AlertTriangle, CheckCircle, Heart, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { DisplayProduct } from "@/lib/types/product"

interface CatalogTabProps {
  products: DisplayProduct[]
  onAddProduct: () => void
  onEditProduct: (product: DisplayProduct) => void
  onViewProduct: (product: DisplayProduct) => void
  onBulkExport: () => void
}

export function CatalogTab({ products, onAddProduct, onEditProduct, onViewProduct, onBulkExport }: CatalogTabProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])

  // Derive categories dynamically from actual product data
  const categories = ["all", ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))]

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    )
  }

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: "Out of Stock", color: "destructive", icon: AlertTriangle }
    if (stock <= 5) return { label: "Low Stock", color: "warning", icon: AlertTriangle }
    return { label: "In Stock", color: "success", icon: CheckCircle }
  }

  return (
    <div className="flex flex-col h-full bg-gray-950 overflow-hidden">
      {/* Clean Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-800">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Inventory</h1>
          <p className="text-sm text-gray-400">Get intelligent, personalized answers by connecting your knowledge</p>
        </div>
        <Button 
          onClick={onAddProduct}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>

        {showFilters && (
          <div className="flex gap-2 flex-wrap mt-4">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={`capitalize ${
                  selectedCategory === category 
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                    : "border-gray-700 text-gray-300 hover:bg-gray-800"
                }`}
              >
                {category}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product.stock)
            const StockIcon = stockStatus.icon

            return (
              <div
                key={product.id}
                className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-all duration-200 group"
              >
                {/* Product Image */}
                <div className="relative aspect-square bg-gray-800">
                  {/* Top Actions */}
                  <div className="absolute top-3 left-3 z-10">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full"
                    >
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="absolute top-3 right-3 z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                        <DropdownMenuItem 
                          onClick={() => onViewProduct(product)}
                          className="text-gray-300 hover:bg-gray-700 hover:text-white"
                        >
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onEditProduct(product)}
                          className="text-gray-300 hover:bg-gray-700 hover:text-white"
                        >
                          Edit Product
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Stock Status Badge */}
                  {product.stock <= 5 && (
                    <div className="absolute bottom-3 left-3 z-10">
                      <Badge 
                        className={`text-xs px-2 py-1 ${
                          product.stock === 0 
                            ? 'bg-red-600 text-white' 
                            : 'bg-orange-600 text-white'
                        }`}
                      >
                        {product.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                      </Badge>
                    </div>
                  )}

                  {/* Product Image */}
                  <div
                    className="w-full h-full cursor-pointer overflow-hidden"
                    onClick={() => onViewProduct(product)}
                  >
                    {product.image ? (
                      <img
                        src={product.image || "/placeholder.svg"}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-800">
                        <Package className="w-16 h-16 text-gray-600" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3
                    className="font-medium text-white mb-2 line-clamp-2 cursor-pointer hover:text-emerald-400 transition-colors"
                    onClick={() => onViewProduct(product)}
                  >
                    {product.name}
                  </h3>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold text-emerald-400">{product.displayPrice}</p>
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm text-gray-400">4.5</span>
                    </div>
                  </div>

                  {product.variants && product.variants.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {product.variants.length} variant(s) available
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800">
                    <span className="text-xs text-gray-400 capitalize">{product.category}</span>
                    <span className="text-xs text-gray-400">{product.stock} units</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-white">No products found</h3>
            <p className="text-sm text-gray-400 mb-6">
              {searchQuery ? "Try adjusting your search" : "Start by adding your first product"}
            </p>
            <Button 
              onClick={onAddProduct} 
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
