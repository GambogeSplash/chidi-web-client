"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Package, Loader2, ImageIcon, Trash2, Plus } from "lucide-react"
import { productsAPI } from "@/lib/api"
import { categoriesAPI, type ProductCategory, type CreateCategoryRequest } from "@/lib/api/categories"
import type { DisplayProduct, CreateProductRequest } from "@/lib/types/product"
import { parseCurrency } from "@/lib/utils/product-transformer"

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  onAddProduct: (product: DisplayProduct) => void
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const stockNum = Number.parseInt(formData.stock) || 0
      const sellingPrice = parseCurrency(formData.sellingPrice)
      const costPrice = formData.costPrice ? parseCurrency(formData.costPrice) : sellingPrice * 0.7

      // Use the base64 image preview as the image URL if an image was selected
      const imageUrls: string[] = []
      if (imagePreview) {
        imageUrls.push(imagePreview)
      }

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
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const isFormValid = formData.name && formData.sellingPrice && formData.stock && (formData.categoryId || formData.category)
  const isDisabled = !isFormValid || isSubmitting || isLoading || categoriesLoading

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 max-h-[90vh] bg-white border border-[var(--chidi-border-default)] rounded-xl shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--chidi-border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--chidi-surface)] rounded-lg">
              <Package className="w-5 h-5 text-[var(--chidi-text-primary)]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--chidi-text-primary)]">Add New Product</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form id="add-product-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

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

            {/* Stock and Low Stock Threshold */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock" className="text-sm font-medium text-[var(--chidi-text-secondary)]">
                  Stock Quantity <span className="text-[var(--chidi-danger)]">*</span>
                </Label>
                <Input
                  id="stock"
                  type="number"
                  placeholder="10"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => handleInputChange("stock", e.target.value)}
                  className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lowStockThreshold" className="text-sm font-medium text-[var(--chidi-text-secondary)]">
                  Low Stock Alert
                </Label>
                <Input
                  id="lowStockThreshold"
                  type="number"
                  placeholder="Default: 10"
                  min="1"
                  value={formData.lowStockThreshold}
                  onChange={(e) => handleInputChange("lowStockThreshold", e.target.value)}
                  className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)]"
                />
                <p className="text-xs text-[var(--chidi-text-muted)]">Alert when stock falls to this level</p>
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

            {/* Product Image */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[var(--chidi-text-secondary)]">
                Product Image
              </Label>
              
              {imagePreview ? (
                <div className="relative rounded-lg overflow-hidden border border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface)]">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-40 object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-1.5 bg-[var(--chidi-danger)] hover:bg-[var(--chidi-danger)]/90 text-white rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-[var(--chidi-border-subtle)] hover:border-[var(--chidi-accent)]/50 rounded-lg p-6 cursor-pointer transition-colors bg-[var(--chidi-surface)] hover:bg-[var(--chidi-surface-elevated)]"
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="p-3 bg-white rounded-full">
                      <ImageIcon className="w-6 h-6 text-[var(--chidi-text-muted)]" />
                    </div>
                    <div>
                      <p className="text-sm text-[var(--chidi-text-secondary)]">Click to upload or drag and drop</p>
                      <p className="text-xs text-[var(--chidi-text-muted)] mt-1">PNG, JPG, WEBP up to 5MB</p>
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
          </form>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface)]">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose} 
            className="flex-1 bg-white border-[var(--chidi-border-default)] text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-surface)] hover:text-[var(--chidi-text-primary)]"
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            form="add-product-form"
            disabled={isDisabled} 
            className="flex-1 bg-[var(--chidi-accent)] hover:bg-[var(--chidi-accent)]/90 text-[var(--chidi-accent-foreground)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Add Product'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
