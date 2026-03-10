"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  X, 
  Plus, 
  Loader2, 
  Package,
  Trash2,
  Edit2,
  Check,
  AlertCircle
} from "lucide-react"
import { productsAPI } from "@/lib/api"
import type { 
  DisplayProduct,
  DisplayProductWithVariations,
  VariationTypeResponse,
  ProductVariantResponse,
  UpdateVariantRequest
} from "@/lib/types/product"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils/product-transformer"

interface ManageVariationsSheetProps {
  isOpen: boolean
  onClose: () => void
  product: DisplayProduct
  onUpdate?: () => void
}

export function ManageVariationsSheet({ 
  isOpen, 
  onClose, 
  product,
  onUpdate 
}: ManageVariationsSheetProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [productData, setProductData] = useState<DisplayProductWithVariations | null>(null)
  
  // New variation type form
  const [newTypeName, setNewTypeName] = useState("")
  const [newTypeOptions, setNewTypeOptions] = useState("")
  const [addingType, setAddingType] = useState(false)
  
  // Editing variant state
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null)
  const [editingVariantData, setEditingVariantData] = useState<{
    stock_quantity: number
    price_adjustment: number
  } | null>(null)
  
  // Add new variant form state
  const [showAddVariant, setShowAddVariant] = useState(false)
  const [newVariantOptions, setNewVariantOptions] = useState<Record<string, string>>({})
  const [newVariantStock, setNewVariantStock] = useState(0)
  const [newVariantPriceAdj, setNewVariantPriceAdj] = useState(0)
  const [addingVariant, setAddingVariant] = useState(false)

  // Fetch full product data with variations
  const fetchProductData = useCallback(async () => {
    if (!product?.id) return
    
    setLoading(true)
    setError(null)
    
    try {
      const data = await productsAPI.getProductWithVariations(product.id)
      setProductData(data)
    } catch (err) {
      console.error('Failed to fetch product variations:', err)
      setError('Failed to load variations. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [product?.id])

  useEffect(() => {
    if (isOpen && product) {
      fetchProductData()
    }
  }, [isOpen, product, fetchProductData])

  // Reset state when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setNewTypeName("")
      setNewTypeOptions("")
      setEditingVariantId(null)
      setEditingVariantData(null)
      setError(null)
      setShowAddVariant(false)
      setNewVariantOptions({})
      setNewVariantStock(0)
      setNewVariantPriceAdj(0)
    }
  }, [isOpen])

  const handleAddVariationType = async () => {
    if (!newTypeName.trim() || !productData) return
    
    const options = newTypeOptions
      .split(',')
      .map(o => o.trim())
      .filter(o => o.length > 0)
    
    if (options.length === 0) {
      setError('Please add at least one option (comma-separated)')
      return
    }
    
    setAddingType(true)
    setError(null)
    
    try {
      await productsAPI.addVariationType(productData.id, {
        name: newTypeName.trim(),
        options: options
      })
      
      setNewTypeName("")
      setNewTypeOptions("")
      await fetchProductData()
      onUpdate?.()
    } catch (err) {
      console.error('Failed to add variation type:', err)
      setError('Failed to add variation type. Please try again.')
    } finally {
      setAddingType(false)
    }
  }

  const handleDeleteVariationType = async (typeId: string) => {
    if (!productData) return
    
    if (!confirm('Delete this variation type? All associated variants will be removed.')) {
      return
    }
    
    setSaving(true)
    setError(null)
    
    try {
      await productsAPI.deleteVariationType(productData.id, typeId)
      await fetchProductData()
      onUpdate?.()
    } catch (err) {
      console.error('Failed to delete variation type:', err)
      setError('Failed to delete variation type. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const startEditingVariant = (variant: ProductVariantResponse) => {
    setEditingVariantId(variant.id)
    setEditingVariantData({
      stock_quantity: variant.stock_quantity,
      price_adjustment: variant.price_adjustment
    })
  }

  const cancelEditingVariant = () => {
    setEditingVariantId(null)
    setEditingVariantData(null)
  }

  const saveVariant = async () => {
    if (!editingVariantId || !editingVariantData || !productData) return
    
    setSaving(true)
    setError(null)
    
    try {
      const updateData: UpdateVariantRequest = {
        stock_quantity: editingVariantData.stock_quantity,
        price_adjustment: editingVariantData.price_adjustment
      }
      
      await productsAPI.updateVariant(productData.id, editingVariantId, updateData)
      
      setEditingVariantId(null)
      setEditingVariantData(null)
      await fetchProductData()
      onUpdate?.()
    } catch (err) {
      console.error('Failed to update variant:', err)
      setError('Failed to save variant. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteVariant = async (variantId: string) => {
    if (!productData) return
    
    if (!confirm('Delete this variant?')) {
      return
    }
    
    setSaving(true)
    setError(null)
    
    try {
      await productsAPI.deleteVariant(productData.id, variantId)
      await fetchProductData()
      onUpdate?.()
    } catch (err) {
      console.error('Failed to delete variant:', err)
      setError('Failed to delete variant. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddVariant = async () => {
    if (!productData || !productData.variationTypes) return
    
    // Check all variation types have a selected option
    const missingTypes = productData.variationTypes.filter(vt => !newVariantOptions[vt.name])
    if (missingTypes.length > 0) {
      setError(`Please select: ${missingTypes.map(t => t.name).join(', ')}`)
      return
    }
    
    // Check if this combination already exists
    const existingVariant = productData.variants?.find(v => {
      return Object.entries(newVariantOptions).every(
        ([key, value]) => v.options[key] === value
      )
    })
    if (existingVariant) {
      setError('This variant combination already exists')
      return
    }
    
    setAddingVariant(true)
    setError(null)
    
    try {
      await productsAPI.addVariant(productData.id, {
        options: newVariantOptions,
        stock_quantity: newVariantStock,
        price_adjustment: newVariantPriceAdj
      })
      
      // Reset form
      setShowAddVariant(false)
      setNewVariantOptions({})
      setNewVariantStock(0)
      setNewVariantPriceAdj(0)
      
      await fetchProductData()
      onUpdate?.()
    } catch (err) {
      console.error('Failed to add variant:', err)
      setError('Failed to add variant. Please try again.')
    } finally {
      setAddingVariant(false)
    }
  }

  const getVariantLabel = (variant: ProductVariantResponse) => {
    return Object.values(variant.options).join(' / ')
  }

  const totalStock = productData?.variants?.reduce((sum, v) => sum + v.stock_quantity, 0) ?? 0

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-lg overflow-y-auto bg-white"
      >
        <SheetHeader className="border-b border-[var(--chidi-border-subtle)] pb-4">
          <SheetTitle className="text-[var(--chidi-text-primary)]">
            Manage Variations
          </SheetTitle>
          <SheetDescription className="text-[var(--chidi-text-muted)]">
            {product?.name}
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--chidi-text-muted)]">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p className="text-sm">Loading variations...</p>
            </div>
          ) : !productData?.hasVariants && productData?.variationTypes?.length === 0 ? (
            /* No Variations Yet */
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package className="w-12 h-12 text-[var(--chidi-text-muted)] mb-3" strokeWidth={1} />
              <p className="text-sm text-[var(--chidi-text-secondary)] mb-1">
                No variations yet
              </p>
              <p className="text-xs text-[var(--chidi-text-muted)] max-w-[200px]">
                Add variation types like Size, Color, or Material to create product variants.
              </p>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="flex gap-4 p-3 bg-[var(--chidi-surface)] rounded-lg">
                <div>
                  <p className="text-xs text-[var(--chidi-text-muted)]">Variation Types</p>
                  <p className="text-lg font-semibold text-[var(--chidi-text-primary)]">
                    {productData?.variationTypes?.length ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--chidi-text-muted)]">Variants</p>
                  <p className="text-lg font-semibold text-[var(--chidi-text-primary)]">
                    {productData?.variants?.length ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--chidi-text-muted)]">Total Stock</p>
                  <p className="text-lg font-semibold text-[var(--chidi-text-primary)]">
                    {totalStock}
                  </p>
                </div>
              </div>

              {/* Variation Types Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-[var(--chidi-text-primary)]">
                  Variation Types
                </h3>
                
                {productData?.variationTypes?.map((type) => (
                  <div 
                    key={type.id} 
                    className="p-3 border border-[var(--chidi-border-subtle)] rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[var(--chidi-text-primary)]">
                        {type.name}
                      </span>
                      <button
                        onClick={() => handleDeleteVariationType(type.id)}
                        disabled={saving}
                        className="text-[var(--chidi-text-muted)] hover:text-[var(--chidi-danger)] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {type.options.map((opt) => (
                        <Badge 
                          key={opt.id} 
                          variant="secondary"
                          className="bg-[var(--chidi-surface)] text-[var(--chidi-text-secondary)] text-xs"
                        >
                          {opt.value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Variants Table */}
              {productData?.variants && productData.variants.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-[var(--chidi-text-primary)]">
                    Variants ({productData.variants.length})
                  </h3>
                  
                  <div className="border border-[var(--chidi-border-subtle)] rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-[var(--chidi-surface)]">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-[var(--chidi-text-muted)]">
                            Variant
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-[var(--chidi-text-muted)]">
                            Stock
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-[var(--chidi-text-muted)]">
                            Price Adj.
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-[var(--chidi-text-muted)]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--chidi-border-subtle)]">
                        {productData.variants.map((variant) => (
                          <tr key={variant.id} className="bg-white">
                            <td className="px-3 py-2">
                              <div className="font-medium text-[var(--chidi-text-primary)]">
                                {getVariantLabel(variant)}
                              </div>
                              <div className="text-xs text-[var(--chidi-text-muted)]">
                                {variant.sku}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              {editingVariantId === variant.id ? (
                                <Input
                                  type="number"
                                  min={0}
                                  value={editingVariantData?.stock_quantity ?? 0}
                                  onChange={(e) => setEditingVariantData(prev => prev ? {
                                    ...prev,
                                    stock_quantity: parseInt(e.target.value) || 0
                                  } : null)}
                                  className="h-8 w-20 text-sm"
                                />
                              ) : (
                                <span className={cn(
                                  "text-[var(--chidi-text-primary)]",
                                  variant.stock_quantity === 0 && "text-[var(--chidi-danger)]"
                                )}>
                                  {variant.stock_quantity}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {editingVariantId === variant.id ? (
                                <Input
                                  type="number"
                                  value={editingVariantData?.price_adjustment ?? 0}
                                  onChange={(e) => setEditingVariantData(prev => prev ? {
                                    ...prev,
                                    price_adjustment: parseFloat(e.target.value) || 0
                                  } : null)}
                                  className="h-8 w-24 text-sm"
                                />
                              ) : (
                                <span className={cn(
                                  variant.price_adjustment > 0 && "text-green-600",
                                  variant.price_adjustment < 0 && "text-red-600"
                                )}>
                                  {variant.price_adjustment > 0 ? '+' : ''}
                                  {variant.price_adjustment !== 0 
                                    ? formatCurrency(variant.price_adjustment) 
                                    : '—'}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {editingVariantId === variant.id ? (
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={saveVariant}
                                    disabled={saving}
                                    className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  >
                                    {saving ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Check className="w-4 h-4" />
                                    )}
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={cancelEditingVariant}
                                    disabled={saving}
                                    className="h-7 w-7 text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)]"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => startEditingVariant(variant)}
                                    className="h-7 w-7 text-[var(--chidi-text-muted)] hover:text-[var(--chidi-accent)]"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleDeleteVariant(variant.id)}
                                    disabled={saving}
                                    className="h-7 w-7 text-[var(--chidi-text-muted)] hover:text-[var(--chidi-danger)]"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Add New Variant */}
          {!loading && productData?.variationTypes && productData.variationTypes.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-[var(--chidi-border-subtle)]">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-[var(--chidi-text-primary)]">
                  Add Variant
                </h3>
                {!showAddVariant && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddVariant(true)}
                    className="h-7 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    New Variant
                  </Button>
                )}
              </div>
              
              {showAddVariant && (
                <div className="space-y-3 p-3 bg-[var(--chidi-surface)] rounded-lg">
                  {/* Option selectors for each variation type */}
                  {productData.variationTypes.map((vt) => (
                    <div key={vt.id} className="space-y-1">
                      <label className="text-xs font-medium text-[var(--chidi-text-secondary)]">
                        {vt.name}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {vt.options.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setNewVariantOptions(prev => ({
                              ...prev,
                              [vt.name]: opt.value
                            }))}
                            className={cn(
                              "px-2 py-1 text-xs rounded border transition-colors",
                              newVariantOptions[vt.name] === opt.value
                                ? "bg-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)] border-[var(--chidi-accent)]"
                                : "bg-white text-[var(--chidi-text-secondary)] border-[var(--chidi-border-subtle)] hover:border-[var(--chidi-text-muted)]"
                            )}
                          >
                            {opt.value}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {/* Stock and price adjustment */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-[var(--chidi-text-secondary)]">
                        Stock
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={newVariantStock}
                        onChange={(e) => setNewVariantStock(parseInt(e.target.value) || 0)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-[var(--chidi-text-secondary)]">
                        Price Adj.
                      </label>
                      <Input
                        type="number"
                        value={newVariantPriceAdj}
                        onChange={(e) => setNewVariantPriceAdj(parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm"
                        placeholder="+/- 0"
                      />
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAddVariant(false)
                        setNewVariantOptions({})
                        setNewVariantStock(0)
                        setNewVariantPriceAdj(0)
                      }}
                      disabled={addingVariant}
                      className="flex-1 h-8"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddVariant}
                      disabled={addingVariant || Object.keys(newVariantOptions).length !== productData.variationTypes.length}
                      className="flex-1 h-8 bg-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)] hover:bg-[var(--chidi-accent)]/90"
                    >
                      {addingVariant ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3 mr-1" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add New Variation Type */}
          {!loading && (
            <div className="space-y-3 pt-4 border-t border-[var(--chidi-border-subtle)]">
              <h3 className="text-sm font-medium text-[var(--chidi-text-primary)]">
                Add Variation Type
              </h3>
              
              <div className="space-y-2">
                <Input
                  placeholder="Type name (e.g., Size, Color)"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="h-9 text-sm bg-white border-[var(--chidi-border-subtle)]"
                />
                <Input
                  placeholder="Options (comma-separated, e.g., S, M, L, XL)"
                  value={newTypeOptions}
                  onChange={(e) => setNewTypeOptions(e.target.value)}
                  className="h-9 text-sm bg-white border-[var(--chidi-border-subtle)]"
                />
                <Button
                  onClick={handleAddVariationType}
                  disabled={!newTypeName.trim() || !newTypeOptions.trim() || addingType}
                  className="w-full h-9 bg-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)] hover:bg-[var(--chidi-accent)]/90"
                >
                  {addingType ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Variation Type
                    </>
                  )}
                </Button>
              </div>
              
              <p className="text-xs text-[var(--chidi-text-muted)]">
                Variation types define product attributes (e.g., Size, Color). After adding types, create specific variants using the "Add Variant" section above.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
