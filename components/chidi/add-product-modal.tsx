"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Package, Loader2, ImageIcon, Trash2, Plus, ChevronDown, ChevronUp, Layers } from "lucide-react"
import { productsAPI } from "@/lib/api"
import { categoriesAPI, type ProductCategory, type CreateCategoryRequest } from "@/lib/api/categories"
import type { 
  DisplayProduct, 
  CreateProductRequest,
  VariationTypeInput,
  ProductVariantInput,
  DisplayProductWithVariations
} from "@/lib/types/product"
import { parseCurrency } from "@/lib/utils/product-transformer"

interface VariationType {
  id: string
  name: string
  options: string[]
}

interface VariantRow {
  id: string
  options: Record<string, string>
  stock: number
  priceAdjustment: number
}

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  onAddProduct: (product: DisplayProduct | DisplayProductWithVariations) => void
  isLoading?: boolean
  onError?: (error: string) => void
}

export function AddProductModal({ isOpen, onClose, onAddProduct, isLoading, onError }: AddProductModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    sellingPrice: "",
    costPrice: "",
    stock: "",
    lowStockThreshold: "",
    category: "",
    categoryId: "",
    description: "",
    brand: "",
  })
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Variations state
  const [showVariations, setShowVariations] = useState(false)
  const [variationTypes, setVariationTypes] = useState<VariationType[]>([])
  const [newVariationName, setNewVariationName] = useState("")
  const [newOptionInputs, setNewOptionInputs] = useState<Record<string, string>>({})
  const [variants, setVariants] = useState<VariantRow[]>([])
  const [showVariantTable, setShowVariantTable] = useState(false)

  // Fetch categories when modal opens
  useEffect(() => {
    if (isOpen) {
      setCategoriesLoading(true)
      categoriesAPI.getCategories()
        .then(setCategories)
        .catch((err) => {
          console.error('Failed to load categories:', err)
          // Fallback categories if API fails
          setCategories([])
        })
        .finally(() => setCategoriesLoading(false))
    }
  }, [isOpen])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleNumericInputChange = (field: string, value: string) => {
    const sanitized = value.replace(/^0+/, '') || ''
    setFormData((prev) => ({ ...prev, [field]: sanitized }))
    setError(null)
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      setError("Please enter a category name")
      return
    }

    setIsCreatingCategory(true)
    setError(null)

    try {
      const newCategory = await categoriesAPI.createCategory({
        name: newCategoryName.trim()
      })
      
      // Add to categories list and select it
      setCategories(prev => [...prev, newCategory])
      setFormData(prev => ({
        ...prev,
        categoryId: newCategory.id,
        category: newCategory.name
      }))
      
      // Reset the input
      setNewCategoryName("")
      setShowNewCategoryInput(false)
    } catch (err: any) {
      console.error("Failed to create category:", err)
      setError(err.message || "Failed to create category")
    } finally {
      setIsCreatingCategory(false)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB')
        return
      }
      
      setImageFile(file)
      setError(null)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB')
        return
      }
      
      setImageFile(file)
      setError(null)
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Variation handlers
  const addVariationType = () => {
    if (!newVariationName.trim()) return
    
    const newType: VariationType = {
      id: `vt-${Date.now()}`,
      name: newVariationName.trim(),
      options: []
    }
    setVariationTypes(prev => [...prev, newType])
    setNewVariationName("")
    setNewOptionInputs(prev => ({ ...prev, [newType.id]: "" }))
  }

  const removeVariationType = (typeId: string) => {
    setVariationTypes(prev => prev.filter(t => t.id !== typeId))
    setNewOptionInputs(prev => {
      const { [typeId]: _, ...rest } = prev
      return rest
    })
    // Clear variants when variation types change
    setVariants([])
  }

  const addOptionToType = (typeId: string) => {
    const optionValue = newOptionInputs[typeId]?.trim()
    if (!optionValue) return
    
    setVariationTypes(prev => prev.map(t => {
      if (t.id === typeId && !t.options.includes(optionValue)) {
        return { ...t, options: [...t.options, optionValue] }
      }
      return t
    }))
    setNewOptionInputs(prev => ({ ...prev, [typeId]: "" }))
    // Clear variants when options change
    setVariants([])
  }

  const removeOptionFromType = (typeId: string, option: string) => {
    setVariationTypes(prev => prev.map(t => {
      if (t.id === typeId) {
        return { ...t, options: t.options.filter(o => o !== option) }
      }
      return t
    }))
    // Clear variants when options change
    setVariants([])
  }

  // Generate all possible variant combinations
  const generateVariants = useCallback(() => {
    if (variationTypes.length === 0 || variationTypes.some(t => t.options.length === 0)) {
      setVariants([])
      return
    }

    const combinations: Record<string, string>[] = []
    
    const generate = (index: number, current: Record<string, string>) => {
      if (index === variationTypes.length) {
        combinations.push({ ...current })
        return
      }
      
      const type = variationTypes[index]
      for (const option of type.options) {
        current[type.name] = option
        generate(index + 1, current)
      }
    }
    
    generate(0, {})
    
    setVariants(combinations.map((opts, idx) => ({
      id: `var-${idx}`,
      options: opts,
      stock: 0,
      priceAdjustment: 0
    })))
    setShowVariantTable(true)
  }, [variationTypes])

  const updateVariantStock = (variantId: string, stock: number) => {
    setVariants(prev => prev.map(v => 
      v.id === variantId ? { ...v, stock: Math.max(0, stock) } : v
    ))
  }

  const updateVariantPrice = (variantId: string, adjustment: number) => {
    setVariants(prev => prev.map(v => 
      v.id === variantId ? { ...v, priceAdjustment: adjustment } : v
    ))
  }

  const hasVariations = variationTypes.length > 0 && variationTypes.every(t => t.options.length > 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const sellingPrice = parseCurrency(formData.sellingPrice)
      const costPrice = formData.costPrice ? parseCurrency(formData.costPrice) : sellingPrice * 0.7

      // Use the base64 image preview as the image URL if an image was selected
      const imageUrls: string[] = []
      if (imagePreview) {
        imageUrls.push(imagePreview)
      }

      // Check if we have variations
      if (hasVariations && variants.length > 0) {
        // Create product with variations
        const variationTypesInput: VariationTypeInput[] = variationTypes.map((vt, idx) => ({
          name: vt.name,
          options: vt.options.map((opt, optIdx) => ({ value: opt, sort_order: optIdx })),
          sort_order: idx
        }))

        const variantsInput: ProductVariantInput[] = variants.map(v => ({
          options: v.options,
          stock_quantity: v.stock,
          price_adjustment: v.priceAdjustment
        }))

        const createdProduct = await productsAPI.createProductWithVariations({
          name: formData.name,
          category: formData.category,
          cost_price: costPrice,
          selling_price: sellingPrice,
          low_stock_threshold: formData.lowStockThreshold ? parseInt(formData.lowStockThreshold) : undefined,
          description: formData.description || undefined,
          brand: formData.brand || undefined,
          image_urls: imageUrls.length > 0 ? imageUrls : undefined,
          variation_types: variationTypesInput,
          variants: variantsInput
        })
        onAddProduct(createdProduct)
      } else {
        // Create simple product without variations
        const stockNum = Number.parseInt(formData.stock) || 0
        const productData: CreateProductRequest = {
          name: formData.name,
          category: formData.category,
          cost_price: costPrice,
          selling_price: sellingPrice,
          stock_quantity: stockNum,
          low_stock_threshold: formData.lowStockThreshold ? parseInt(formData.lowStockThreshold) : undefined,
          description: formData.description || undefined,
          brand: formData.brand || undefined,
          image_urls: imageUrls.length > 0 ? imageUrls : undefined,
        }
        const createdProduct = await productsAPI.createProduct(productData)
        onAddProduct(createdProduct)
      }
      
      resetForm()
      onClose()
    } catch (err) {
      console.error('Failed to create product:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to create product'
      setError(errorMessage)
      if (onError) {
        onError(errorMessage)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      sellingPrice: "",
      costPrice: "",
      stock: "",
      lowStockThreshold: "",
      category: "",
      categoryId: "",
      description: "",
      brand: "",
    })
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setError(null)
    // Reset variations
    setShowVariations(false)
    setVariationTypes([])
    setNewVariationName("")
    setNewOptionInputs({})
    setVariants([])
    setShowVariantTable(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  // For products with variations, stock is managed per variant, not at product level
  const stockRequired = !hasVariations || variants.length === 0
  const isFormValid = formData.name && 
    formData.sellingPrice && 
    (formData.categoryId || formData.category) &&
    (stockRequired ? formData.stock : true) &&
    (!hasVariations || variants.length > 0)
  const isDisabled = !isFormValid || isSubmitting || isLoading || categoriesLoading

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal — wider for breathing room (max-w-2xl) and image-first hero */}
      <div className="relative w-full max-w-2xl mx-4 max-h-[92vh] bg-white border border-[var(--chidi-border-default)] rounded-2xl shadow-[0_24px_64px_-16px_rgba(0,0,0,0.25)] flex flex-col">
        {/* Header — noun title, no conversational fluff */}
        <div className="flex items-center justify-between px-6 lg:px-8 pt-5 pb-4 border-b border-[var(--chidi-border-subtle)]">
          <div className="min-w-0">
            <h2 className="ty-page-title text-[var(--chidi-text-primary)]">Add product</h2>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="flex-shrink-0 p-2 -mr-2 text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 lg:px-8 py-5">
          <form id="add-product-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Product Image — moved to TOP, hero-first (Bumpa / Square POS pattern) */}
            <div className="space-y-2">
              <Label className="text-[11px] font-chidi-voice text-[var(--chidi-text-muted)] uppercase tracking-wider">
                Photo
              </Label>
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface)] group">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-56 object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white rounded-lg transition-colors"
                    aria-label="Remove photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-[var(--chidi-border-subtle)] hover:border-[var(--chidi-accent)]/50 rounded-xl p-8 cursor-pointer transition-colors bg-[#FBE8C9]/40 hover:bg-[#FBE8C9]/70 chidi-paper"
                >
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="p-3 bg-white rounded-full shadow-sm">
                      <ImageIcon className="w-7 h-7 text-[var(--chidi-text-muted)]" strokeWidth={1.6} />
                    </div>
                    <div>
                      <p className="text-sm text-[var(--chidi-text-primary)] font-medium font-chidi-voice">
                        Drop a photo, or click to upload
                      </p>
                      <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice mt-1">
                        Customers buy what they can see. PNG, JPG, WEBP up to 5MB.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>

            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-[var(--chidi-text-secondary)]">
                Product Name <span className="text-[var(--chidi-danger)]">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Blue Ankara Dress"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)]"
                required
              />
            </div>

            {/* Selling Price and Cost Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sellingPrice" className="text-sm font-medium text-[var(--chidi-text-secondary)]">
                  Selling Price <span className="text-[var(--chidi-danger)]">*</span>
                </Label>
                <Input
                  id="sellingPrice"
                  placeholder="₦15,000"
                  value={formData.sellingPrice}
                  onChange={(e) => handleInputChange("sellingPrice", e.target.value)}
                  className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="costPrice" className="text-sm font-medium text-[var(--chidi-text-secondary)]">
                  Cost Price
                </Label>
                <Input
                  id="costPrice"
                  placeholder="₦10,000"
                  value={formData.costPrice}
                  onChange={(e) => handleInputChange("costPrice", e.target.value)}
                  className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)]"
                />
              </div>
            </div>

            {/* Brand */}
            <div className="space-y-2">
              <Label htmlFor="brand" className="text-sm font-medium text-[var(--chidi-text-secondary)]">
                Brand
              </Label>
              <Input
                id="brand"
                placeholder="e.g., Nike"
                value={formData.brand}
                onChange={(e) => handleInputChange("brand", e.target.value)}
                className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)]"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-[var(--chidi-text-secondary)]">
                  Category <span className="text-[var(--chidi-danger)]">*</span>
                </Label>
                {!showNewCategoryInput && (
                  <button
                    type="button"
                    onClick={() => setShowNewCategoryInput(true)}
                    className="text-xs text-[var(--chidi-accent)] hover:text-[var(--chidi-accent)]/80 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    New category
                  </button>
                )}
              </div>
              
              {showNewCategoryInput ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Electronics, Clothing"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleCreateCategory()
                      }
                      if (e.key === 'Escape') {
                        setShowNewCategoryInput(false)
                        setNewCategoryName("")
                      }
                    }}
                    className="flex-1 bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)]"
                    autoFocus
                    disabled={isCreatingCategory}
                  />
                  <Button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={isCreatingCategory || !newCategoryName.trim()}
                    size="sm"
                    className="bg-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)] hover:bg-[var(--chidi-accent)]/90 px-3"
                  >
                    {isCreatingCategory ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Add"
                    )}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setShowNewCategoryInput(false)
                      setNewCategoryName("")
                    }}
                    variant="ghost"
                    size="sm"
                    className="px-2 text-[var(--chidi-text-muted)]"
                    disabled={isCreatingCategory}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Select 
                  value={formData.categoryId} 
                  onValueChange={(value) => {
                    if (value === "__create_new__") {
                      setShowNewCategoryInput(true)
                      return
                    }
                    const selectedCat = categories.find(c => c.id === value)
                    setFormData(prev => ({ 
                      ...prev, 
                      categoryId: value,
                      category: selectedCat?.name || value 
                    }))
                    setError(null)
                  }}
                  disabled={categoriesLoading}
                >
                  <SelectTrigger className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)]">
                    <SelectValue placeholder={categoriesLoading ? "Loading categories..." : categories.length === 0 ? "Create your first category" : "Select category"} />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[var(--chidi-border-default)]">
                    {categories.length > 0 ? (
                      <>
                        {categories.map((cat) => (
                          <SelectItem 
                            key={cat.id} 
                            value={cat.id} 
                            className="text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)]"
                          >
                            {cat.icon && <span className="mr-2">{cat.icon}</span>}
                            {cat.name}
                          </SelectItem>
                        ))}
                        <div className="border-t border-[var(--chidi-border-subtle)] my-1" />
                        <SelectItem 
                          value="__create_new__" 
                          className="text-[var(--chidi-accent)] hover:bg-[var(--chidi-surface)]"
                        >
                          <Plus className="w-4 h-4 mr-2 inline" />
                          Create new category
                        </SelectItem>
                      </>
                    ) : !categoriesLoading ? (
                      <SelectItem 
                        value="__create_new__" 
                        className="text-[var(--chidi-accent)] hover:bg-[var(--chidi-surface)]"
                      >
                        <Plus className="w-4 h-4 mr-2 inline" />
                        Create your first category
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-[var(--chidi-text-secondary)]">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Describe your product..."
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={3}
                className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)] resize-none"
              />
            </div>

            {/* Product Variations */}
            <div className="space-y-3 border border-[var(--chidi-border-subtle)] rounded-lg p-4 bg-[var(--chidi-surface)]">
              <button
                type="button"
                onClick={() => setShowVariations(!showVariations)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[var(--chidi-text-muted)]" />
                  <span className="text-sm font-medium text-[var(--chidi-text-secondary)]">
                    Product Variations
                  </span>
                  {variationTypes.length > 0 && (
                    <span className="text-xs bg-[var(--chidi-accent)]/10 text-[var(--chidi-accent)] px-2 py-0.5 rounded-full">
                      {variationTypes.length} type{variationTypes.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {showVariations ? (
                  <ChevronUp className="w-4 h-4 text-[var(--chidi-text-muted)]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--chidi-text-muted)]" />
                )}
              </button>

              {showVariations && (
                <div className="space-y-4 pt-3 border-t border-[var(--chidi-border-subtle)]">
                  <p className="text-xs text-[var(--chidi-text-muted)]">
                    Add variations like Size, Color, or Material. Each combination will have its own stock.
                  </p>

                  {/* Existing variation types */}
                  {variationTypes.map((vt) => (
                    <div key={vt.id} className="space-y-2 p-3 bg-white rounded-lg border border-[var(--chidi-border-subtle)]">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[var(--chidi-text-primary)]">{vt.name}</span>
                        <button
                          type="button"
                          onClick={() => removeVariationType(vt.id)}
                          className="text-[var(--chidi-text-muted)] hover:text-[var(--chidi-danger)]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Options tags */}
                      <div className="flex flex-wrap gap-2">
                        {vt.options.map((opt) => (
                          <span
                            key={opt}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--chidi-surface)] rounded-md text-xs text-[var(--chidi-text-secondary)]"
                          >
                            {opt}
                            <button
                              type="button"
                              onClick={() => removeOptionFromType(vt.id, opt)}
                              className="text-[var(--chidi-text-muted)] hover:text-[var(--chidi-danger)]"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      
                      {/* Add option input */}
                      <div className="flex gap-2">
                        <Input
                          placeholder={`Add ${vt.name.toLowerCase()} option...`}
                          value={newOptionInputs[vt.id] || ""}
                          onChange={(e) => setNewOptionInputs(prev => ({ ...prev, [vt.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addOptionToType(vt.id)
                            }
                          }}
                          className="flex-1 h-8 text-sm bg-white border-[var(--chidi-border-subtle)]"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => addOptionToType(vt.id)}
                          disabled={!newOptionInputs[vt.id]?.trim()}
                          className="h-8 px-3 bg-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)]"
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Add new variation type */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Variation name (e.g., Color, Size)"
                      value={newVariationName}
                      onChange={(e) => setNewVariationName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addVariationType()
                        }
                      }}
                      className="flex-1 h-9 text-sm bg-white border-[var(--chidi-border-subtle)]"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={addVariationType}
                      disabled={!newVariationName.trim()}
                      className="h-9 px-4 bg-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)]"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Type
                    </Button>
                  </div>

                  {/* Generate variants button */}
                  {hasVariations && !showVariantTable && (
                    <Button
                      type="button"
                      onClick={generateVariants}
                      className="w-full bg-[var(--chidi-surface-elevated)] text-[var(--chidi-text-primary)] border border-[var(--chidi-border-default)] hover:bg-[var(--chidi-surface)]"
                    >
                      Generate {variationTypes.reduce((acc, t) => acc * t.options.length, 1)} Variant Combinations
                    </Button>
                  )}

                  {/* Variants table */}
                  {showVariantTable && variants.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[var(--chidi-text-secondary)]">
                          Variant Stock & Pricing
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setVariants([])
                            setShowVariantTable(false)
                          }}
                          className="text-xs text-[var(--chidi-text-muted)] hover:text-[var(--chidi-danger)]"
                        >
                          Reset
                        </button>
                      </div>
                      <div className="max-h-48 overflow-y-auto rounded-lg border border-[var(--chidi-border-subtle)]">
                        <table className="w-full text-sm">
                          <thead className="bg-[var(--chidi-surface)] sticky top-0">
                            <tr>
                              {variationTypes.map(vt => (
                                <th key={vt.id} className="px-3 py-2 text-left text-xs font-medium text-[var(--chidi-text-muted)]">
                                  {vt.name}
                                </th>
                              ))}
                              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--chidi-text-muted)]">Stock</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--chidi-text-muted)]">Price +/-</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-[var(--chidi-border-subtle)]">
                            {variants.map((variant) => (
                              <tr key={variant.id}>
                                {variationTypes.map(vt => (
                                  <td key={vt.id} className="px-3 py-2 text-[var(--chidi-text-primary)]">
                                    {variant.options[vt.name]}
                                  </td>
                                ))}
                                <td className="px-3 py-2">
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    min="0"
                                    value={variant.stock === 0 ? '' : variant.stock}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/^0+/, '') || '0'
                                      updateVariantStock(variant.id, parseInt(value) || 0)
                                    }}
                                    className="w-20 h-7 text-sm bg-white border-[var(--chidi-border-subtle)]"
                                    placeholder="0"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="-?[0-9]*"
                                    value={variant.priceAdjustment === 0 ? '' : variant.priceAdjustment}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/^(-?)0+/, '$1') || '0'
                                      updateVariantPrice(variant.id, parseInt(value) || 0)
                                    }}
                                    className="w-24 h-7 text-sm bg-white border-[var(--chidi-border-subtle)]"
                                    placeholder="0"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-[var(--chidi-text-muted)]">
                        Total stock: {variants.reduce((sum, v) => sum + v.stock, 0)} units across {variants.length} variants
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Stock field - only shown when no variations */}
            {(!hasVariations || variants.length === 0) && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock" className="text-sm font-medium text-[var(--chidi-text-secondary)]">
                    Stock Quantity <span className="text-[var(--chidi-danger)]">*</span>
                  </Label>
                  <Input
                    id="stock"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="10"
                    value={formData.stock}
                    onChange={(e) => handleNumericInputChange("stock", e.target.value.replace(/\D/g, ''))}
                    className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)]"
                    required={!hasVariations}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lowStockThreshold" className="text-sm font-medium text-[var(--chidi-text-secondary)]">
                    Low Stock Alert
                  </Label>
                  <Input
                    id="lowStockThreshold"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Default: 10"
                    value={formData.lowStockThreshold}
                    onChange={(e) => handleNumericInputChange("lowStockThreshold", e.target.value.replace(/\D/g, ''))}
                    className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)]"
                  />
                  <p className="text-xs text-[var(--chidi-text-muted)]">Alert when stock falls to this level</p>
                </div>
              </div>
            )}

          </form>
        </div>

        {/* Footer — primary CTA right-aligned, ghost cancel left */}
        <div className="flex items-center justify-between gap-3 px-6 lg:px-8 py-4 border-t border-[var(--chidi-border-subtle)]">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            className="text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-product-form"
            disabled={isDisabled}
            className="bg-[var(--chidi-accent)] hover:bg-[var(--chidi-accent)]/90 text-[var(--chidi-accent-foreground)] disabled:opacity-50 disabled:cursor-not-allowed px-6"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating
              </>
            ) : (
              'Add product'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
