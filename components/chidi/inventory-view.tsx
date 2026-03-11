"use client"

import { useState } from "react"
import { Search, Filter, Plus, MoreVertical, Package, AlertTriangle, CheckCircle, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyState } from "./empty-state"
import { ManageVariationsSheet } from "./manage-variations-sheet"
import { HintBanner } from "./hint-banner"
import { useFirstTimeHint } from "@/lib/hooks/use-first-time-hint"
import type { DisplayProduct } from "@/lib/types/product"
import { cn } from "@/lib/utils"

interface InventoryViewProps {
  products: DisplayProduct[]
  onAddProduct: () => void
  onEditProduct: (product: DisplayProduct) => void
  onViewProduct: (product: DisplayProduct) => void
  onProductsUpdated?: () => void
}

export function InventoryView({ products, onAddProduct, onEditProduct, onViewProduct, onProductsUpdated }: InventoryViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  
  // Variations sheet state
  const [variationsSheetOpen, setVariationsSheetOpen] = useState(false)
  const [selectedProductForVariations, setSelectedProductForVariations] = useState<DisplayProduct | null>(null)

  // First-time hint
  const { shouldShow: showFirstProductHint, dismiss: dismissFirstProductHint } = useFirstTimeHint("inventory_first_product")

  const handleManageVariations = (product: DisplayProduct) => {
    setSelectedProductForVariations(product)
    setVariationsSheetOpen(true)
  }

  const handleVariationsSheetClose = () => {
    setVariationsSheetOpen(false)
    setSelectedProductForVariations(null)
  }

  const handleVariationsUpdated = () => {
    onProductsUpdated?.()
  }

  // Derive categories dynamically from actual product data
  const categories = ["all", ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))]

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getStockStatus = (stock: number, reorderLevel: number) => {
    if (stock === 0) return { label: "Out of stock", variant: "danger" as const }
    if (stock <= reorderLevel) return { label: "Low stock", variant: "warning" as const }
    return { label: "In stock", variant: "success" as const }
  }

  const getStockBadgeClasses = (variant: "success" | "warning" | "danger") => {
    switch (variant) {
      case "success":
        return "bg-[var(--chidi-success)] text-[var(--chidi-success-foreground)]"
      case "warning":
        return "bg-[var(--chidi-warning)] text-[var(--chidi-warning-foreground)]"
      case "danger":
        return "bg-[var(--chidi-danger)] text-[var(--chidi-danger-foreground)]"
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[var(--chidi-border-subtle)]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--chidi-text-primary)]">Inventory</h2>
            <p className="text-xs text-[var(--chidi-text-muted)]">
              {products.length} product{products.length !== 1 ? "s" : ""}
              {(() => {
                const outOfStockCount = products.filter(p => p.stock === 0).length
                return outOfStockCount > 0 ? (
                  <span className="text-[var(--chidi-danger)]"> · {outOfStockCount} out of stock</span>
                ) : null
              })()}
            </p>
          </div>
          <Button 
            onClick={onAddProduct}
            size="sm"
            className="bg-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)] hover:bg-[var(--chidi-accent)]/90"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Search and filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--chidi-text-muted)]" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)]"
            />
          </div>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "h-9 w-9 border-[var(--chidi-border-subtle)]",
              showFilters && "bg-[var(--chidi-surface)]"
            )}
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {showFilters && (
          <div className="flex gap-2 flex-wrap mt-3">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "capitalize h-7 text-xs",
                  selectedCategory === category 
                    ? "bg-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)]" 
                    : "border-[var(--chidi-border-subtle)] text-[var(--chidi-text-secondary)]"
                )}
              >
                {category}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4">
        {filteredProducts.length === 0 ? (
          <EmptyState
            icon={Package}
            title={searchQuery ? "No products found" : "No products yet"}
            description={
              searchQuery 
                ? "Try adjusting your search or filter"
                : "Products you add here are what your AI uses to answer customer questions and take orders."
            }
            action={
              !searchQuery && (
                <Button 
                  onClick={onAddProduct}
                  className="bg-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)] hover:bg-[var(--chidi-accent)]/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-3">
            {/* First product hint */}
            {showFirstProductHint && products.length > 0 && (
              <HintBanner onDismiss={dismissFirstProductHint}>
                Your AI can now answer customer questions about your products.
              </HintBanner>
            )}
            
            <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => {
              const stockStatus = getStockStatus(product.stock, product.reorderLevel)

              return (
                <div
                  key={product.id}
                  className="bg-white border border-[var(--chidi-border-subtle)] rounded-xl overflow-hidden hover:border-[var(--chidi-border-default)] transition-colors"
                >
                  {/* Product Image */}
                  <div 
                    className="relative aspect-square bg-[var(--chidi-surface)] cursor-pointer"
                    onClick={() => onViewProduct(product)}
                  >
                    {/* More menu */}
                    <div className="absolute top-2 right-2 z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 bg-white/80 backdrop-blur-sm hover:bg-white"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white border-[var(--chidi-border-default)]">
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation()
                              onViewProduct(product)
                            }}
                            className="text-[var(--chidi-text-primary)]"
                          >
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation()
                              onEditProduct(product)
                            }}
                            className="text-[var(--chidi-text-primary)]"
                          >
                            Edit product
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleManageVariations(product)
                            }}
                            className="text-[var(--chidi-text-primary)]"
                          >
                            <Layers className="w-4 h-4 mr-2" />
                            Manage variations
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Stock status badge - show when stock is at or below reorder level */}
                    {product.stock <= product.reorderLevel && (
                      <div className="absolute bottom-2 left-2 z-10">
                        <Badge className={cn("text-[10px] border-0", getStockBadgeClasses(stockStatus.variant))}>
                          {stockStatus.label}
                        </Badge>
                      </div>
                    )}

                    {/* Image */}
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-[var(--chidi-text-muted)]" strokeWidth={1} />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-3">
                    <h3
                      className="font-medium text-sm text-[var(--chidi-text-primary)] mb-1 line-clamp-2 cursor-pointer"
                      onClick={() => onViewProduct(product)}
                    >
                      {product.name}
                    </h3>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-base font-semibold text-[var(--chidi-text-primary)]">
                        {product.displayPrice}
                      </p>
                      <span className="text-xs text-[var(--chidi-text-muted)]">
                        {product.stock} units
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-[var(--chidi-text-muted)] capitalize">
                        {product.category}
                      </p>
                      {product.hasVariants && (
                        <Badge 
                          variant="outline" 
                          className="text-[10px] px-1.5 py-0 h-4 border-[var(--chidi-accent)]/30 text-[var(--chidi-accent)]"
                        >
                          <Layers className="w-2.5 h-2.5 mr-0.5" />
                          Variants
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            </div>
          </div>
        )}
      </div>

      {/* Manage Variations Sheet */}
      {selectedProductForVariations && (
        <ManageVariationsSheet
          isOpen={variationsSheetOpen}
          onClose={handleVariationsSheetClose}
          product={selectedProductForVariations}
          onUpdate={handleVariationsUpdated}
        />
      )}
    </div>
  )
}
