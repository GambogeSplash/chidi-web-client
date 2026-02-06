"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Edit3, Loader2, ImageIcon, Trash2 } from "lucide-react"
import { productsAPI } from "@/lib/api"
import type { DisplayProduct } from "@/lib/types/product"

interface EditProductModalProps {
  isOpen: boolean
  onClose: () => void
  product: DisplayProduct
  onSave: (product: DisplayProduct) => void
  onError?: (error: string) => void
}

export function EditProductModal({ isOpen, onClose, product, onSave, onError }: EditProductModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    sellingPrice: "",
    costPrice: "",
    stock: "",
    category: "",
    description: "",
    brand: "",
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize form with product data when modal opens
  useEffect(() => {
    if (isOpen && product) {
      setFormData({
        name: product.name || "",
        sellingPrice: product.price?.replace(/[^\d.]/g, "") || "",
        costPrice: product.costPrice?.toString() || "",
        stock: product.stock?.toString() || "",
        category: product.category || "",
        description: product.description || "",
        brand: product.brand || "",
      })
      // Set existing image as preview if available
      setImagePreview(product.image || null)
      setImageFile(null)
      setError(null)
    }
  }, [isOpen, product])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError(null)
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
      // Only include fields that have values - all fields are optional
      const updateData: any = {}

      if (formData.name) updateData.name = formData.name
      if (formData.category) updateData.category = formData.category
      if (formData.sellingPrice) {
        const sellingPrice = parseFloat(formData.sellingPrice.replace(/,/g, ""))
        if (!isNaN(sellingPrice) && sellingPrice > 0) updateData.selling_price = sellingPrice
      }
      if (formData.stock) {
        const stockNum = Number.parseInt(formData.stock)
        if (!isNaN(stockNum) && stockNum >= 0) updateData.stock_quantity = stockNum
      }
      if (formData.costPrice) {
        const costPrice = parseFloat(formData.costPrice.replace(/,/g, ""))
        if (!isNaN(costPrice) && costPrice > 0) updateData.cost_price = costPrice
      }
      if (formData.description) updateData.description = formData.description
      if (formData.brand) updateData.brand = formData.brand
      if (imagePreview) updateData.image_urls = [imagePreview]

      console.log('📝 [EDIT_MODAL] Sending update data:', updateData)

      const updatedProduct = await productsAPI.updateProduct(product.id, updateData)
      onSave(updatedProduct)
      onClose()
    } catch (err) {
      console.error('Failed to update product:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to update product'
      setError(errorMessage)
      if (onError) {
        onError(errorMessage)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setError(null)
    onClose()
  }

  // All fields are optional - user can update any field they want
  const isDisabled = isSubmitting

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
              <Edit3 className="w-5 h-5 text-[var(--chidi-text-primary)]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--chidi-text-primary)]">Edit Product</h2>
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
          <form id="edit-product-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-[var(--chidi-text-secondary)]">
                Product Name
              </Label>
              <Input
                id="name"
                placeholder="e.g., Blue Ankara Dress"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)]"
              />
            </div>

            {/* Selling Price and Cost Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sellingPrice" className="text-sm font-medium text-[var(--chidi-text-secondary)]">
                  Selling Price
                </Label>
                <Input
                  id="sellingPrice"
                  placeholder="₦15,000"
                  value={formData.sellingPrice}
                  onChange={(e) => handleInputChange("sellingPrice", e.target.value)}
                  className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)]"
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

            {/* Stock and Brand */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock" className="text-sm font-medium text-[var(--chidi-text-secondary)]">
                  Stock Quantity
                </Label>
                <Input
                  id="stock"
                  type="number"
                  placeholder="10"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => handleInputChange("stock", e.target.value)}
                  className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)]"
                />
              </div>
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
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[var(--chidi-text-secondary)]">
                Category
              </Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                <SelectTrigger className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[var(--chidi-border-default)]">
                  <SelectItem value="fashion" className="text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)]">Fashion & Clothing</SelectItem>
                  <SelectItem value="electronics" className="text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)]">Electronics</SelectItem>
                  <SelectItem value="beauty" className="text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)]">Beauty & Cosmetics</SelectItem>
                  <SelectItem value="food" className="text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)]">Food & Beverages</SelectItem>
                  <SelectItem value="home" className="text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)]">Home & Living</SelectItem>
                  <SelectItem value="other" className="text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)]">Other</SelectItem>
                </SelectContent>
              </Select>
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
                    onError={(e) => (e.currentTarget.style.display = 'none')}
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
            form="edit-product-form"
            disabled={isDisabled} 
            className="flex-1 bg-[var(--chidi-accent)] hover:bg-[var(--chidi-accent)]/90 text-[var(--chidi-accent-foreground)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
