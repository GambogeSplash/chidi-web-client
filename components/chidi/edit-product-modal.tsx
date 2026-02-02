"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Edit3, Loader2 } from "lucide-react"
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
    imageUrl: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        imageUrl: product.image || "",
      })
      setError(null)
    }
  }, [isOpen, product])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError(null)
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
      if (formData.imageUrl) updateData.image_urls = [formData.imageUrl]

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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 max-h-[90vh] bg-gray-900 border border-gray-800 rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Edit3 className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="text-lg font-semibold text-white">Edit Product</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form id="edit-product-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-300">
                Product Name
              </Label>
              <Input
                id="name"
                placeholder="e.g., Blue Ankara Dress"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Selling Price and Cost Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sellingPrice" className="text-sm font-medium text-gray-300">
                  Selling Price
                </Label>
                <Input
                  id="sellingPrice"
                  placeholder="₦15,000"
                  value={formData.sellingPrice}
                  onChange={(e) => handleInputChange("sellingPrice", e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="costPrice" className="text-sm font-medium text-gray-300">
                  Cost Price
                </Label>
                <Input
                  id="costPrice"
                  placeholder="₦10,000"
                  value={formData.costPrice}
                  onChange={(e) => handleInputChange("costPrice", e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Stock and Brand */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock" className="text-sm font-medium text-gray-300">
                  Stock Quantity
                </Label>
                <Input
                  id="stock"
                  type="number"
                  placeholder="10"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => handleInputChange("stock", e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand" className="text-sm font-medium text-gray-300">
                  Brand
                </Label>
                <Input
                  id="brand"
                  placeholder="e.g., Nike"
                  value={formData.brand}
                  onChange={(e) => handleInputChange("brand", e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-300">
                Category
              </Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="fashion" className="text-white hover:bg-gray-700">Fashion & Clothing</SelectItem>
                  <SelectItem value="electronics" className="text-white hover:bg-gray-700">Electronics</SelectItem>
                  <SelectItem value="beauty" className="text-white hover:bg-gray-700">Beauty & Cosmetics</SelectItem>
                  <SelectItem value="food" className="text-white hover:bg-gray-700">Food & Beverages</SelectItem>
                  <SelectItem value="home" className="text-white hover:bg-gray-700">Home & Living</SelectItem>
                  <SelectItem value="other" className="text-white hover:bg-gray-700">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-300">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Describe your product..."
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={3}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            {/* Image URL */}
            <div className="space-y-2">
              <Label htmlFor="imageUrl" className="text-sm font-medium text-gray-300">
                Image URL
              </Label>
              <Input
                id="imageUrl"
                placeholder="https://example.com/image.jpg"
                value={formData.imageUrl}
                onChange={(e) => handleInputChange("imageUrl", e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {formData.imageUrl && (
                <div className="mt-2 rounded-lg overflow-hidden border border-gray-700">
                  <img 
                    src={formData.imageUrl} 
                    alt="Preview" 
                    className="w-full h-32 object-cover"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-800 bg-gray-900/50">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose} 
            className="flex-1 bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            form="edit-product-form"
            disabled={isDisabled} 
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
