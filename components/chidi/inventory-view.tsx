"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Search, Filter, Plus, MoreVertical, Package, AlertTriangle, CheckCircle, Layers, Upload, ChevronDown, LayoutGrid, List, TrendingUp, Trash2, Tag, Archive, X, ArrowUpDown, ArrowUp, ArrowDown, GripVertical, SlidersHorizontal, Check, Pin, PinOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { CurrencyAmount } from "./currency-amount"
import { productsAPI } from "@/lib/api/products"
import { useQueryClient } from "@tanstack/react-query"
import { productsKeys } from "@/lib/hooks/use-products"
import { getStoredInventoryId } from "@/lib/api/products"
import { hapticSoft } from "@/lib/chidi/haptics"
import { EditableCell } from "./editable-cell"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { EmptyState } from "./empty-state"
import { ManageVariationsSheet } from "./manage-variations-sheet"
import { HintBanner } from "./hint-banner"
import { useFirstTimeHint } from "@/lib/hooks/use-first-time-hint"
import type { DisplayProduct } from "@/lib/types/product"
import { cn } from "@/lib/utils"
import {
  getPinned as getPinnedProducts,
  togglePin as toggleProductPin,
  unpin as unpinProduct,
  subscribe as subscribePinnedProducts,
  MAX_PINNED_PRODUCTS,
} from "@/lib/chidi/inventory-pinned"

// Filter/sort labels — single source of truth so dropdown + sheet + active
// chip all read from the same string.
type StockFilter = "all" | "low" | "out"
type SortKeyExt = "recent" | "name" | "stock" | "price" | "custom"
const FILTER_LABEL: Record<StockFilter, string> = {
  all: "All products",
  low: "Low stock",
  out: "Out of stock",
}
const SORT_LABEL: Record<SortKeyExt, string> = {
  recent: "Recently added",
  name: "Name (A–Z)",
  stock: "Stock (low → high)",
  price: "Price (low → high)",
  custom: "Custom order",
}

interface InventoryViewProps {
  products: DisplayProduct[]
  onAddProduct: () => void
  onEditProduct: (product: DisplayProduct) => void
  onViewProduct: (product: DisplayProduct) => void
  onProductsUpdated?: () => void
  onBulkImport?: () => void
}

export function InventoryView({ products, onAddProduct, onEditProduct, onViewProduct, onProductsUpdated, onBulkImport }: InventoryViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [addChooserOpen, setAddChooserOpen] = useState(false)

  // Stock filter — initialized from URL (?filter=low|out), survives refresh.
  const initialFilter = (() => {
    const f = searchParams.get("filter")
    if (f === "low" || f === "low_stock") return "low" as StockFilter
    if (f === "out" || f === "out_of_stock") return "out" as StockFilter
    return "all" as StockFilter
  })()
  const [stockFilter, setStockFilterState] = useState<StockFilter>(initialFilter)

  // setStockFilter wrapper — also pushes the filter into the URL so refresh
  // preserves the merchant's view. Replace, not push, so the back button
  // doesn't fill with filter-state breadcrumbs.
  const setStockFilter = (next: StockFilter) => {
    setStockFilterState(next)
    if (typeof window === "undefined") return
    const params = new URLSearchParams(searchParams.toString())
    if (next === "all") params.delete("filter")
    else params.set("filter", next === "low" ? "low_stock" : "out_of_stock")
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  // Sync external URL changes (e.g. notification deep-link "?filter=low_stock")
  useEffect(() => {
    const f = searchParams.get("filter")
    const next: StockFilter =
      f === "low" || f === "low_stock"
        ? "low"
        : f === "out" || f === "out_of_stock"
          ? "out"
          : "all"
    if (next !== stockFilter) setStockFilterState(next)
    // intentionally exclude stockFilter from deps — we only react to URL changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  void showFilters; void setShowFilters // unused after categories shelf refactor; left for now
  // Bulk select state. Selecting one product reveals the actions toolbar.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  // Sort state for the list view.
  type SortKey = "name" | "price" | "stock" | "recent" | "custom"
  const [sortKey, setSortKey] = useState<SortKey>("recent")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  // Mobile filter/sort sheets — bottom-sheet pickers shown only on small
  // screens. Desktop uses the inline dropdowns instead.
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [sortSheetOpen, setSortSheetOpen] = useState(false)
  // Custom display order — only respected when sortKey === "custom".
  // Persists across the session in localStorage.
  const [customOrder, setCustomOrder] = useState<string[]>(() => {
    if (typeof window === "undefined") return []
    try {
      return JSON.parse(localStorage.getItem("chidi_inventory_order") || "[]")
    } catch {
      return []
    }
  })
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Pinned products — newest pin first. Subscribe to store changes so the
  // strip and per-row glyphs stay in sync (e.g. unpinning from inside a
  // pinned card collapses that card out of the strip without a re-render
  // dance). Reads from localStorage on mount, writes flow back through the
  // store helpers below.
  const [pinnedIds, setPinnedIds] = useState<string[]>([])
  useEffect(() => {
    setPinnedIds(getPinnedProducts())
    return subscribePinnedProducts((ids) => setPinnedIds(ids))
  }, [])
  const handleTogglePin = (id: string) => {
    toggleProductPin(id)
    hapticSoft()
  }
  const handleUnpin = (id: string) => {
    unpinProduct(id)
    hapticSoft()
  }

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const clearSelection = () => setSelectedIds(new Set())
  const selectAll = () => setSelectedIds(new Set(products.map((p) => p.id)))
  const selectedCount = selectedIds.size

  const handleBulkDelete = async () => {
    const inventoryId = getStoredInventoryId()
    if (!inventoryId || selectedCount === 0) return
    if (!confirm(`Delete ${selectedCount} product${selectedCount === 1 ? "" : "s"}? This can't be undone.`)) return
    await Promise.all(
      Array.from(selectedIds).map((id) => productsAPI.deleteProduct(id).catch(() => null)),
    )
    queryClient.invalidateQueries({ queryKey: productsKeys.all })
    clearSelection()
  }

  // Bulk discount + archive — open inline popovers from the toolbar.
  const [discountPopoverOpen, setDiscountPopoverOpen] = useState(false)
  const [discountPercent, setDiscountPercent] = useState("10")

  const handleBulkDiscount = async () => {
    const inventoryId = getStoredInventoryId()
    if (!inventoryId || selectedCount === 0) return
    const pct = parseInt(discountPercent, 10)
    if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) return
    // Apply discount to each selected product. Stub: backend bulk endpoint
    // would replace this Promise.all once available.
    await Promise.all(
      Array.from(selectedIds).map((id) => {
        const p = products.find((x) => x.id === id)
        if (!p) return null
        const discounted = Math.round(p.sellingPrice * (1 - pct / 100))
        return productsAPI
          .updateProduct(id, { discount_price: discounted })
          .catch(() => null)
      }),
    )
    queryClient.invalidateQueries({ queryKey: productsKeys.all })
    setDiscountPopoverOpen(false)
    clearSelection()
  }

  const handleBulkArchive = async () => {
    const inventoryId = getStoredInventoryId()
    if (!inventoryId || selectedCount === 0) return
    if (!confirm(`Archive ${selectedCount} product${selectedCount === 1 ? "" : "s"}? They'll stop showing to customers but stay in your records.`)) return
    await Promise.all(
      Array.from(selectedIds).map((id) =>
        productsAPI.updateProduct(id, { status: "INACTIVE" as any }).catch(() => null),
      ),
    )
    queryClient.invalidateQueries({ queryKey: productsKeys.all })
    clearSelection()
  }

  const setSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "name" ? "asc" : "desc")
    }
  }

  // Inline-edit handler. Optimistic via React Query refetch on success.
  const handleInlineEdit = async (productId: string, field: "selling_price" | "stock_quantity", raw: string) => {
    const inventoryId = getStoredInventoryId()
    if (!inventoryId) return
    const value = field === "selling_price" ? parseFloat(raw) : parseInt(raw, 10)
    if (!Number.isFinite(value)) return
    try {
      if (field === "stock_quantity") {
        await productsAPI.updateStock(productId, value, "set")
      } else {
        await productsAPI.updateProduct(productId, { selling_price: value })
      }
      queryClient.invalidateQueries({ queryKey: productsKeys.all })
      hapticSoft()
    } catch (e) {
      // Roll back is handled by EditableCell; nothing to do here
      throw e
    }
  }

  // Inventory totals — surfaced as header chips for the merchant's "what do I own?"
  const totalValue = products.reduce((sum, p) => sum + (p.costPrice || 0) * p.stock, 0)
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= p.reorderLevel).length
  const outOfStockCount = products.filter((p) => p.stock === 0).length

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

  // Derive categories dynamically from actual product data, with counts
  const categoryCounts = products.reduce<Record<string, number>>((acc, p) => {
    if (!p.category) return acc
    acc[p.category] = (acc[p.category] ?? 0) + 1
    return acc
  }, {})
  const categories = ["all", ...Object.keys(categoryCounts).sort()]

  const filteredProducts = products
    .filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "low" && product.stock > 0 && product.stock <= product.reorderLevel) ||
        (stockFilter === "out" && product.stock === 0)
      return matchesSearch && matchesCategory && matchesStock
    })
    .sort((a, b) => {
      if (sortKey === "custom") {
        // Items in customOrder come first in their saved order; the rest fall to the back
        const ai = customOrder.indexOf(a.id)
        const bi = customOrder.indexOf(b.id)
        if (ai === -1 && bi === -1) return a.name.localeCompare(b.name)
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      }
      const dir = sortDir === "asc" ? 1 : -1
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir
      if (sortKey === "price") return (a.sellingPrice - b.sellingPrice) * dir
      if (sortKey === "stock") return (a.stock - b.stock) * dir
      // recent
      return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir
    })

  const persistCustomOrder = (order: string[]) => {
    setCustomOrder(order)
    if (typeof window !== "undefined") {
      localStorage.setItem("chidi_inventory_order", JSON.stringify(order))
    }
  }

  const handleDragStart = (e: React.DragEvent, productId: string) => {
    setDraggingId(productId)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", productId)
  }
  const handleDragOver = (e: React.DragEvent, productId: string) => {
    e.preventDefault()
    if (draggingId && draggingId !== productId) setDragOverId(productId)
  }
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const sourceId = draggingId
    setDraggingId(null)
    setDragOverId(null)
    if (!sourceId || sourceId === targetId) return

    // Build new order based on filteredProducts current visual position
    const currentIds = filteredProducts.map((p) => p.id)
    const sourceIdx = currentIds.indexOf(sourceId)
    const targetIdx = currentIds.indexOf(targetId)
    if (sourceIdx === -1 || targetIdx === -1) return
    const next = [...currentIds]
    next.splice(sourceIdx, 1)
    next.splice(targetIdx, 0, sourceId)
    // Switch into custom mode and persist
    setSortKey("custom")
    persistCustomOrder(next)
    hapticSoft()
  }
  const handleDragEnd = () => {
    setDraggingId(null)
    setDragOverId(null)
  }

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

  // Pinned product set + the survives-current-filter list. Pinning is a
  // focus tool, not a filter bypass — if the merchant filters to "Out of
  // stock", pinned in-stock items don't crash the strip into view. Newest
  // pin renders first (matches the store contract), and the main collection
  // omits anything already in the strip so cards never duplicate.
  const pinnedIdSet = new Set(pinnedIds)
  const pinnedProducts: DisplayProduct[] = (() => {
    if (pinnedIds.length === 0) return []
    const byId = new Map(filteredProducts.map((p) => [p.id, p]))
    const out: DisplayProduct[] = []
    for (const id of pinnedIds) {
      const p = byId.get(id)
      if (p) out.push(p)
    }
    return out
  })()
  const unpinnedProducts: DisplayProduct[] =
    pinnedProducts.length > 0
      ? filteredProducts.filter((p) => !pinnedIdSet.has(p.id))
      : filteredProducts

  // Single source of truth for rendering a product as either a list-row or
  // grid-card. Both the Pinned strip and the main collection call this so
  // pinning is purely a position change — same chrome, same interactions.
  // The `pinned` flag swaps the corner glyph (filled vs outline) and turns
  // the more-actions menu's "Pin to top" into "Unpin".
  const renderProduct = (product: DisplayProduct, pinned: boolean) => {
    const stockStatus = getStockStatus(product.stock, product.reorderLevel)
    const isSelected = selectedIds.has(product.id)

    if (viewMode === "list") {
      const updatedAgo = (() => {
        const days = Math.floor((Date.now() - new Date(product.updatedAt).getTime()) / 86400000)
        if (days < 1) return "today"
        if (days < 7) return `${days}d`
        if (days < 30) return `${Math.floor(days / 7)}w`
        return `${Math.floor(days / 30)}mo`
      })()
      return (
        <div
          key={product.id}
          draggable={!pinned}
          onDragStart={(e) => { if (!pinned) handleDragStart(e, product.id) }}
          onDragOver={(e) => { if (!pinned) handleDragOver(e, product.id) }}
          onDrop={(e) => { if (!pinned) handleDrop(e, product.id) }}
          onDragEnd={handleDragEnd}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--chidi-surface)] transition-colors text-left cursor-pointer group",
            isSelected && "bg-[var(--chidi-win-soft)]/40",
            pinned && "bg-[var(--chidi-surface)]/40",
            draggingId === product.id && "opacity-40",
            dragOverId === product.id && "border-t-2 border-t-[var(--chidi-win)]",
          )}
          onClick={() => onViewProduct(product)}
        >
          {/* Drag handle — shows on row hover. Pinned rows skip it: the
              Pinned strip's order is "most-recently-pinned first", not
              custom-order, so dragging would just be a confusing no-op. */}
          <span
            className="w-4 flex items-center justify-center text-[var(--chidi-text-muted)] opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
            title={pinned ? "Pinned" : "Drag to reorder"}
          >
            {!pinned && <GripVertical className="w-3.5 h-3.5" />}
          </span>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => { e.stopPropagation(); toggleSelected(product.id) }}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-[var(--chidi-border-default)] accent-[var(--chidi-win)] cursor-pointer"
            aria-label={`Select ${product.name}`}
          />
          <div className="relative flex-shrink-0 chidi-row-with-hover-image">
            <div className="w-10 h-10 rounded-md overflow-hidden bg-[var(--chidi-surface)] flex items-center justify-center">
              {product.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-4 h-4 text-[var(--chidi-text-muted)]" />
              )}
            </div>
            {/* Hover-pop preview — 1.5x lifted thumbnail with shadow.
                Pure CSS, see .chidi-row-with-hover-image in globals.css */}
            {product.image && (
              <div
                data-hover-image
                className="absolute left-12 top-1/2 -translate-y-1/2 z-30 w-32 h-32 rounded-xl overflow-hidden shadow-[0_18px_40px_-10px_rgba(0,0,0,0.35)] border border-[var(--chidi-border-default)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.image} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {pinned && (
                <Pin
                  className="w-3 h-3 text-[var(--chidi-text-secondary)] flex-shrink-0 fill-current"
                  strokeWidth={1.8}
                  aria-label="Pinned"
                />
              )}
              <p className="text-sm font-medium text-[var(--chidi-text-primary)] truncate">{product.name}</p>
              {/* Stock-status pill — clickable; filters list to that status */}
              {product.stock <= product.reorderLevel && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const target = product.stock === 0 ? "out" : "low"
                    setStockFilter(stockFilter === target ? "all" : target)
                  }}
                  className={cn(
                    "text-[9px] font-medium border-0 flex-shrink-0 px-1.5 py-0.5 rounded-md motion-safe:active:scale-[0.97] transition-opacity hover:opacity-80",
                    getStockBadgeClasses(stockStatus.variant),
                  )}
                  title={`Filter to ${stockStatus.label.toLowerCase()}`}
                >
                  {stockStatus.label}
                </button>
              )}
              {product.hasVariants && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleManageVariations(product) }}
                  className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-[var(--chidi-accent)]/30 text-[var(--chidi-accent)] hover:bg-[var(--chidi-accent)]/5 active:scale-[0.97] font-chidi-voice flex-shrink-0"
                  title="Manage variations"
                >
                  <Layers className="w-2.5 h-2.5" />
                  Variants
                </button>
              )}
            </div>
            {/* Category — clickable; filters list to that category */}
            {product.category ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedCategory(
                    selectedCategory === product.category ? "all" : product.category,
                  )
                }}
                className="text-xs text-[var(--chidi-text-muted)] capitalize font-chidi-voice hover:text-[var(--chidi-text-secondary)] hover:underline underline-offset-2 motion-safe:active:scale-[0.98] text-left"
                title={`Filter to ${product.category}`}
              >
                {product.category}
              </button>
            ) : (
              <p className="text-xs text-[var(--chidi-text-muted)] capitalize font-chidi-voice">—</p>
            )}
          </div>
          <span className="hidden sm:block w-20 text-right text-sm font-semibold text-[var(--chidi-text-primary)]">
            <EditableCell
              value={product.sellingPrice}
              prefix="₦"
              inputMode="decimal"
              align="right"
              hint="Click to edit price"
              onCommit={(v) => handleInlineEdit(product.id, "selling_price", v)}
              className="text-sm font-semibold text-[var(--chidi-text-primary)]"
            />
          </span>
          <span className="hidden sm:block w-16 text-right text-sm text-[var(--chidi-text-secondary)] font-chidi-voice">
            <EditableCell
              value={product.stock}
              inputMode="numeric"
              align="right"
              hint="Click to edit stock"
              onCommit={(v) => handleInlineEdit(product.id, "stock_quantity", v)}
              className="text-sm text-[var(--chidi-text-secondary)]"
            />
          </span>
          <span className="hidden md:block w-20 text-right text-[11px] text-[var(--chidi-text-muted)] tabular-nums font-chidi-voice">{updatedAgo}</span>
          {/* Hover-revealed unpin button — only renders for pinned rows.
              Sits next to the more-actions menu so the row footprint stays
              identical between pinned and unpinned. */}
          {pinned && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleUnpin(product.id) }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 motion-safe:transition-opacity w-7 h-7 flex items-center justify-center rounded hover:bg-white text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)]"
              aria-label={`Unpin ${product.name}`}
              title="Unpin"
            >
              <PinOff className="w-3.5 h-3.5" />
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                draggable={false}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-white text-[var(--chidi-text-muted)]"
                aria-label="More actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-[var(--chidi-border-default)]">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewProduct(product) }}>View details</DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditProduct(product) }}>Edit product</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleTogglePin(product.id) }}>
                {pinned ? (
                  <>
                    <PinOff className="w-4 h-4 mr-2" />
                    Unpin
                  </>
                ) : (
                  <>
                    <Pin className="w-4 h-4 mr-2" />
                    Pin to top
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleManageVariations(product) }}>
                <Layers className="w-4 h-4 mr-2" />
                Manage variations
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }

    // Grid card — same logic, different chrome.
    return (
      <div
        key={product.id}
        className={cn(
          "group bg-white border rounded-xl overflow-hidden transition-all relative",
          "hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12)] hover:-translate-y-0.5",
          isSelected
            ? "border-[var(--chidi-win)] ring-2 ring-[var(--chidi-win)]/30"
            : pinned
              ? "border-[var(--chidi-text-muted)]/40"
              : product.stock === 0
                ? "border-[var(--chidi-warning)]/40 ring-1 ring-[var(--chidi-warning)]/20"
                : product.stock <= product.reorderLevel
                  ? "border-[var(--chidi-warning)]/25"
                  : "border-[var(--chidi-border-subtle)] hover:border-[var(--chidi-border-default)]",
        )}
      >
        {/* Selection checkbox — top-left, only visible on hover or when selected */}
        <label
          className={cn(
            "absolute top-2 left-2 z-20 w-6 h-6 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center motion-safe:transition-opacity cursor-pointer",
            isSelected || selectedCount > 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100 hover:opacity-100",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelected(product.id)}
            className="w-3.5 h-3.5 rounded border-[var(--chidi-border-default)] accent-[var(--chidi-win)] cursor-pointer"
            aria-label={`Select ${product.name}`}
          />
        </label>

        {/* Product Image */}
        <div
          className="relative aspect-square bg-[var(--chidi-image-placeholder)] overflow-hidden cursor-pointer chidi-paper"
          onClick={() => onViewProduct(product)}
        >
          {/* Stock status pill — clickable; filters to that status */}
          {product.stock <= product.reorderLevel && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                const target = product.stock === 0 ? "out" : "low"
                setStockFilter(stockFilter === target ? "all" : target)
              }}
              className={cn(
                "absolute top-2 right-10 z-10 inline-flex items-center gap-1 text-[10px] font-medium font-chidi-voice px-2 py-0.5 rounded-full backdrop-blur-sm motion-safe:active:scale-[0.97] hover:opacity-90 motion-safe:transition-opacity",
                product.stock === 0
                  ? "bg-[var(--chidi-warning)]/95 text-white"
                  : "bg-[var(--chidi-warning)]/15 text-[var(--chidi-warning)] border border-[var(--chidi-warning)]/30",
              )}
              title={`Filter to ${product.stock === 0 ? "out of stock" : "low stock"}`}
            >
              {product.stock === 0 ? "Out" : "Low"}
            </button>
          )}

          {/* Pin glyph — sits beside the selection checkbox slot. Filled
              icon = pinned. Hovering the card swaps it for a clickable
              unpin button so the merchant can release it without opening
              the more-actions menu. */}
          {pinned && (
            <div className="absolute top-2 left-10 z-10">
              <span
                className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/90 backdrop-blur-sm text-[var(--chidi-text-secondary)] group-hover:hidden"
                aria-label="Pinned"
                title="Pinned"
              >
                <Pin className="w-3 h-3 fill-current" strokeWidth={1.8} />
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleUnpin(product.id) }}
                className="hidden group-hover:inline-flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-sm text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] motion-safe:active:scale-[0.95]"
                aria-label={`Unpin ${product.name}`}
                title="Unpin"
              >
                <PinOff className="w-3 h-3" strokeWidth={1.8} />
              </button>
            </div>
          )}

          {/* More menu */}
          <div className="absolute top-2 right-2 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 bg-white/85 backdrop-blur-sm hover:bg-white"
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
                  onClick={(e) => { e.stopPropagation(); handleTogglePin(product.id) }}
                  className="text-[var(--chidi-text-primary)]"
                >
                  {pinned ? (
                    <>
                      <PinOff className="w-4 h-4 mr-2" />
                      Unpin
                    </>
                  ) : (
                    <>
                      <Pin className="w-4 h-4 mr-2" />
                      Pin to top
                    </>
                  )}
                </DropdownMenuItem>
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

          {/* Image with hover zoom — image is the product, lean into it.
              Empty slot routes to the edit modal so "Add image" actually
              delivers an image-upload surface. */}
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover motion-safe:transition-transform motion-safe:duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEditProduct(product)
              }}
              className="w-full h-full flex flex-col items-center justify-center text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-surface)]/40 motion-safe:transition-colors motion-safe:active:scale-[0.99]"
              title="Add a product image"
            >
              <Package className="w-10 h-10 mb-1.5" strokeWidth={1.2} />
              <span className="text-[10px] font-chidi-voice">Add image</span>
            </button>
          )}
        </div>

        {/* Product Info */}
        <div className="p-3">
          <h3
            className="font-medium text-[13px] text-[var(--chidi-text-primary)] mb-1.5 truncate cursor-pointer"
            onClick={() => onViewProduct(product)}
            title={product.name}
          >
            {product.name}
          </h3>

          <div className="flex items-baseline justify-between mb-1.5">
            <p className="text-[15px] font-semibold tabular-nums text-[var(--chidi-text-primary)]">
              {product.displayPrice}
            </p>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  product.stock === 0
                    ? "bg-[var(--chidi-warning)]"
                    : product.stock <= product.reorderLevel
                      ? "bg-[var(--chidi-warning)]"
                      : "bg-[var(--chidi-success)]",
                )}
              />
              <span className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice tabular-nums">
                {product.stock} in stock
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            {/* Category — clickable; filters list to that category */}
            {product.category ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedCategory(
                    selectedCategory === product.category ? "all" : product.category,
                  )
                }}
                className="text-[10px] text-[var(--chidi-text-muted)] capitalize font-chidi-voice hover:text-[var(--chidi-text-secondary)] hover:underline underline-offset-2 motion-safe:active:scale-[0.98]"
                title={`Filter to ${product.category}`}
              >
                {product.category}
              </button>
            ) : (
              <span className="text-[10px] text-[var(--chidi-text-muted)] capitalize font-chidi-voice">—</span>
            )}
            {product.hasVariants && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleManageVariations(product)
                }}
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-[var(--chidi-accent)]/30 text-[var(--chidi-accent)] hover:bg-[var(--chidi-accent)]/5 active:scale-[0.97] font-chidi-voice"
                title="Manage variations"
              >
                <Layers className="w-2.5 h-2.5" />
                Variants
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] min-h-0 overflow-hidden">
      {/* Header — noun title + summary chips. No conversational subtitle. */}
      <div className="px-4 lg:px-6 pt-4 lg:pt-5 pb-3 border-b border-[var(--chidi-border-subtle)]">
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="min-w-0">
            <h1 className="ty-page-title text-[var(--chidi-text-primary)]">Inventory</h1>
            {/* Stat tiles removed — the row was visually noisy and the
                low/out filters are reachable from the search-row dropdown
                and from per-row stock pills. Worth was informational only. */}
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-0.5 bg-[var(--chidi-surface)] rounded-lg p-0.5 border border-[var(--chidi-border-subtle)]" role="tablist" aria-label="View mode">
              <button
                role="tab"
                aria-selected={viewMode === "grid"}
                onClick={() => setViewMode("grid")}
                className={cn(
                  "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
                  viewMode === "grid"
                    ? "bg-white text-[var(--chidi-text-primary)] shadow-sm"
                    : "text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-secondary)]"
                )}
                title="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                role="tab"
                aria-selected={viewMode === "list"}
                onClick={() => setViewMode("list")}
                className={cn(
                  "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
                  viewMode === "list"
                    ? "bg-white text-[var(--chidi-text-primary)] shadow-sm"
                    : "text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-secondary)]"
                )}
                title="List view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* "Add product" — single click opens a small modal where the
                merchant picks the path (manually OR import). Modal beats
                dropdown because the choices deserve a moment, not a hover. */}
            <Button size="sm" className="btn-cta" onClick={() => setAddChooserOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add product
            </Button>
          </div>
        </div>

        {/* Search + filter + sort row.
            Mobile: search fills row; filter/sort collapse to two icon buttons
            that open bottom sheets so the row never wraps awkwardly.
            Desktop (md+): inline dropdowns next to the search field. */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--chidi-text-muted)]" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)]"
            />
          </div>

          {/* Mobile: icon buttons (open bottom sheets) */}
          <button
            onClick={() => setFilterSheetOpen(true)}
            className={cn(
              "md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md border text-[var(--chidi-text-secondary)] active:scale-[0.97] flex-shrink-0",
              stockFilter !== "all"
                ? "bg-[var(--chidi-text-primary)] text-[var(--chidi-bg-primary)] border-[var(--chidi-text-primary)]"
                : "bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)] hover:bg-white",
            )}
            aria-label="Filter products"
            title="Filter"
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSortSheetOpen(true)}
            className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md border bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)] text-[var(--chidi-text-secondary)] hover:bg-white active:scale-[0.97] flex-shrink-0"
            aria-label="Sort products"
            title="Sort"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* Desktop: inline dropdowns */}
          {/* Filter — shows All products + every category. Stock-status
              filtering (low / out) lives on the per-row stock pills, not
              here, per merchant feedback. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "hidden md:inline-flex items-center gap-1.5 h-9 px-3 rounded-md border text-[12px] font-chidi-voice active:scale-[0.97] flex-shrink-0",
                  selectedCategory !== "all"
                    ? "bg-[var(--chidi-text-primary)] text-[var(--chidi-bg-primary)] border-[var(--chidi-text-primary)]"
                    : "bg-[var(--chidi-surface)] text-[var(--chidi-text-secondary)] border-[var(--chidi-border-subtle)] hover:bg-white",
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="capitalize">{selectedCategory === "all" ? "All products" : selectedCategory}</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-[var(--chidi-border-default)] min-w-[220px]">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-semibold">
                Show
              </DropdownMenuLabel>
              {categories.map((category) => {
                const count = category === "all" ? products.length : (categoryCounts[category] ?? 0)
                const isActive = selectedCategory === category
                return (
                  <DropdownMenuItem
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={cn("flex items-center justify-between gap-3", isActive && "bg-[var(--chidi-surface)] font-medium")}
                  >
                    <span className="capitalize">{category === "all" ? "All products" : category}</span>
                    <span className="tabular-nums text-[10px] text-[var(--chidi-text-muted)]">{count}</span>
                  </DropdownMenuItem>
                )
              })}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-semibold">
                Sort by
              </DropdownMenuLabel>
              {(["recent", "name", "stock", "price"] as SortKeyExt[]).map((k) => (
                <DropdownMenuItem
                  key={`sort-${k}`}
                  onClick={() => {
                    setSortKey(k as SortKey)
                    setSortDir(k === "name" ? "asc" : k === "stock" || k === "price" ? "asc" : "desc")
                  }}
                  className={cn("flex items-center justify-between gap-3", sortKey === k && "bg-[var(--chidi-surface)] font-medium")}
                >
                  <span>{SORT_LABEL[k]}</span>
                  {sortKey === k && <Check className="w-3 h-3 text-[var(--chidi-text-muted)]" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort merged into the same dropdown as Filter (above) — see the
              "Sort by" group inside the Filter dropdown's content. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hidden items-center gap-1.5 h-9 px-3 rounded-md border bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)] text-[var(--chidi-text-secondary)] text-[12px] font-chidi-voice hover:bg-white active:scale-[0.97] flex-shrink-0">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{SORT_LABEL[sortKey]}</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-[var(--chidi-border-default)]">
              {(["recent", "name", "stock", "price"] as SortKeyExt[]).map((k) => (
                <DropdownMenuItem
                  key={k}
                  onClick={() => {
                    setSortKey(k as SortKey)
                    setSortDir(k === "name" ? "asc" : k === "stock" || k === "price" ? "asc" : "desc")
                  }}
                  className={cn(sortKey === k && "bg-[var(--chidi-surface)] font-medium")}
                >
                  {SORT_LABEL[k]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Active filter chip — visible whenever a non-"all" filter is set,
            with a remove (×) so the merchant can clear it from anywhere. */}
        {stockFilter !== "all" && (
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium">
              Filter
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-chidi-voice text-[var(--chidi-bg-primary)] bg-[var(--chidi-text-primary)] px-2 py-1 rounded-full">
              {FILTER_LABEL[stockFilter]}
              <button
                onClick={() => setStockFilter("all")}
                aria-label="Clear filter"
                className="ml-0.5 hover:opacity-80 active:scale-[0.92]"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
            <span className="text-[11px] text-[var(--chidi-text-muted)] tabular-nums">
              {filteredProducts.length} of {products.length}
            </span>
          </div>
        )}

      </div>

      {/* Bulk actions toolbar — slides in from top when items are selected */}
      {selectedCount > 0 && (
        <div className="px-4 py-2.5 bg-[var(--chidi-text-primary)] text-[var(--chidi-bg-primary)] flex items-center gap-3 border-b border-[var(--chidi-border-default)] chidi-tab-in">
          <span className="ty-card-title font-chidi-voice tabular-nums">
            {selectedCount} selected
          </span>
          <div className="flex-1" />
          <button
            onClick={selectAll}
            className="text-xs font-chidi-voice opacity-80 hover:opacity-100 px-2 py-1 rounded"
          >
            Select all
          </button>
          <button
            onClick={handleBulkDelete}
            className="inline-flex items-center gap-1.5 text-xs font-chidi-voice px-2.5 py-1.5 rounded hover:bg-white/10 active:scale-[0.97]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
          <Popover open={discountPopoverOpen} onOpenChange={setDiscountPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                className="inline-flex items-center gap-1.5 text-xs font-chidi-voice px-2.5 py-1.5 rounded hover:bg-white/10 active:scale-[0.97]"
              >
                <Tag className="w-3.5 h-3.5" />
                Discount
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-64 p-3 bg-[var(--card)] border-[var(--chidi-border-default)] text-[var(--chidi-text-primary)]"
              sideOffset={8}
            >
              <p className="ty-meta mb-2">Apply a discount</p>
              <div className="flex items-center gap-2 mb-3">
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value.replace(/[^0-9]/g, ""))}
                  onKeyDown={(e) => { if (e.key === "Enter") handleBulkDiscount() }}
                  className="h-9 w-20 text-center tabular-nums bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)]"
                  autoFocus
                />
                <span className="text-sm text-[var(--chidi-text-muted)] font-chidi-voice">% off</span>
                <span className="ml-auto text-xs text-[var(--chidi-text-muted)] font-chidi-voice">
                  for {selectedCount}
                </span>
              </div>
              <button
                onClick={handleBulkDiscount}
                disabled={!discountPercent || parseInt(discountPercent) <= 0 || parseInt(discountPercent) >= 100}
                className="w-full btn-cta py-2 rounded-md text-sm font-medium font-chidi-voice"
              >
                Apply
              </button>
            </PopoverContent>
          </Popover>
          <button
            onClick={handleBulkArchive}
            className="inline-flex items-center gap-1.5 text-xs font-chidi-voice px-2.5 py-1.5 rounded hover:bg-white/10 active:scale-[0.97]"
          >
            <Archive className="w-3.5 h-3.5" />
            Archive
          </button>
          <button
            onClick={clearSelection}
            className="p-1.5 rounded hover:bg-white/10 active:scale-[0.97]"
            aria-label="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4">
        {filteredProducts.length === 0 ? (
          <EmptyState
            art={searchQuery ? "search" : "inventory"}
            title={searchQuery ? "Nothing matched that." : "Let's stock the shop."}
            description={
              searchQuery
                ? "Try a different search or clear the filter."
                : "Add the products you sell."
            }
            action={
              !searchQuery && (
                <Button
                  onClick={onAddProduct}
                  className="btn-cta"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add your first product
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-3">
            {/* First product hint */}
            {showFirstProductHint && products.length > 0 && (
              <HintBanner onDismiss={dismissFirstProductHint}>
                Chidi can now answer customer questions about these products.
              </HintBanner>
            )}

            {/* Pinned strip — sits above the main collection in BOTH grid and
                list view modes. Hidden when there are no pinned items
                surviving the active filter. The container chrome matches the
                main collection so the merchant reads it as "first row of the
                same surface", not a separate widget. Counter is shown
                discreetly so the merchant knows when they're approaching the
                cap (8). */}
            {pinnedProducts.length > 0 && (
              <section
                className="space-y-2"
                aria-label={`Pinned products (${pinnedProducts.length})`}
              >
                <div className="flex items-baseline justify-between px-1">
                  <p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[var(--chidi-text-muted)] inline-flex items-center gap-1.5">
                    <Pin className="w-3 h-3 fill-current text-[var(--chidi-text-secondary)]" strokeWidth={1.8} />
                    Pinned
                    <span className="tabular-nums opacity-70">
                      {pinnedProducts.length}
                      {pinnedProducts.length >= MAX_PINNED_PRODUCTS && ` / ${MAX_PINNED_PRODUCTS}`}
                    </span>
                  </p>
                </div>
                <div className={cn(
                  viewMode === "grid"
                    ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
                    : "flex flex-col divide-y divide-[var(--chidi-border-subtle)] bg-white border border-[var(--chidi-border-subtle)] rounded-xl overflow-hidden",
                )}>
                  {pinnedProducts.map((product) => renderProduct(product, true))}
                </div>
              </section>
            )}

            {/* Sortable column headers — list view only */}
            {viewMode === "list" && (
              <div className="flex items-center gap-3 px-3 py-2 bg-[var(--chidi-surface)] border border-[var(--chidi-border-subtle)] rounded-t-xl text-[10px] uppercase tracking-wider font-chidi-voice text-[var(--chidi-text-muted)]">
                <span className="w-4" /> {/* drag handle column */}
                <span className="w-5" />
                <span className="w-10" />
                <SortHeader label="Name" active={sortKey === "name"} dir={sortDir} onClick={() => setSort("name")} className="flex-1" />
                <SortHeader label="Price" active={sortKey === "price"} dir={sortDir} onClick={() => setSort("price")} className="hidden sm:flex w-20 justify-end" />
                <SortHeader label="Stock" active={sortKey === "stock"} dir={sortDir} onClick={() => setSort("stock")} className="hidden sm:flex w-16 justify-end" />
                <SortHeader label="Updated" active={sortKey === "recent"} dir={sortDir} onClick={() => setSort("recent")} className="hidden md:flex w-20 justify-end" />
                <span className="w-7" />
              </div>
            )}

            {/* Custom-order indicator — shown when sort is custom, lets user reset */}
            {viewMode === "list" && sortKey === "custom" && customOrder.length > 0 && (
              <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-[var(--chidi-win-soft)]/50 border-x border-[var(--chidi-border-subtle)] text-[11px] font-chidi-voice text-[var(--chidi-text-secondary)]">
                <span className="inline-flex items-center gap-1.5">
                  <GripVertical className="w-3 h-3 text-[var(--chidi-win)]" />
                  Custom order — drag to rearrange
                </span>
                <button
                  onClick={() => { persistCustomOrder([]); setSortKey("recent") }}
                  className="text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] active:scale-[0.97]"
                >
                  Reset
                </button>
              </div>
            )}

            <div className={cn(
              viewMode === "grid"
                ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
                : "flex flex-col divide-y divide-[var(--chidi-border-subtle)] bg-white border border-[var(--chidi-border-subtle)] border-t-0 rounded-b-xl overflow-hidden"
            )}>
              {unpinnedProducts.map((product) => renderProduct(product, false))}
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

      {/* Mobile Filter Sheet — bottom sheet, full list of stock states */}
      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl p-5 max-h-[70vh]"
        >
          <div aria-hidden className="mx-auto -mt-1 mb-2 h-1.5 w-10 rounded-full bg-[var(--chidi-border-default)]/70" />
          <SheetHeader className="p-0 mb-4">
            <SheetTitle className="text-[15px] font-semibold text-[var(--chidi-text-primary)]">Filter products</SheetTitle>
          </SheetHeader>
          <ul className="space-y-1">
            {(Object.keys(FILTER_LABEL) as StockFilter[]).map((k) => {
              const isActive = stockFilter === k
              const count =
                k === "all" ? products.length : k === "low" ? lowStockCount : outOfStockCount
              return (
                <li key={k}>
                  <button
                    onClick={() => {
                      setStockFilter(k)
                      setFilterSheetOpen(false)
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl text-[14px] font-chidi-voice text-left active:scale-[0.99] min-h-[48px]",
                      isActive
                        ? "bg-[var(--chidi-text-primary)] text-[var(--chidi-bg-primary)]"
                        : "bg-[var(--chidi-surface)] text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)]/70",
                    )}
                  >
                    <span>{FILTER_LABEL[k]}</span>
                    <span className={cn("tabular-nums text-[12px]", isActive ? "opacity-80" : "text-[var(--chidi-text-muted)]")}>
                      {count}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </SheetContent>
      </Sheet>

      {/* Mobile Sort Sheet — bottom sheet for sort key */}
      <Sheet open={sortSheetOpen} onOpenChange={setSortSheetOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl p-5 max-h-[70vh]"
        >
          <div aria-hidden className="mx-auto -mt-1 mb-2 h-1.5 w-10 rounded-full bg-[var(--chidi-border-default)]/70" />
          <SheetHeader className="p-0 mb-4">
            <SheetTitle className="text-[15px] font-semibold text-[var(--chidi-text-primary)]">Sort by</SheetTitle>
          </SheetHeader>
          <ul className="space-y-1">
            {(["recent", "name", "stock", "price"] as SortKeyExt[]).map((k) => {
              const isActive = sortKey === k
              return (
                <li key={k}>
                  <button
                    onClick={() => {
                      setSortKey(k as SortKey)
                      setSortDir(k === "name" ? "asc" : k === "stock" || k === "price" ? "asc" : "desc")
                      setSortSheetOpen(false)
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl text-[14px] font-chidi-voice text-left active:scale-[0.99] min-h-[48px]",
                      isActive
                        ? "bg-[var(--chidi-text-primary)] text-[var(--chidi-bg-primary)]"
                        : "bg-[var(--chidi-surface)] text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)]/70",
                    )}
                  >
                    <span>{SORT_LABEL[k]}</span>
                    {isActive && <CheckCircle className="w-4 h-4 opacity-80" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </div>
  )
}

interface SortHeaderProps {
  label: string
  active: boolean
  dir: "asc" | "desc"
  onClick: () => void
  className?: string
}

function SortHeader({ label, active, dir, onClick, className }: SortHeaderProps) {
  const Arrow = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 hover:text-[var(--chidi-text-secondary)] active:scale-[0.97]",
        active && "text-[var(--chidi-text-primary)]",
        className,
      )}
    >
      <span>{label}</span>
      <Arrow className="w-2.5 h-2.5 opacity-60" />
    </button>
  )
}
