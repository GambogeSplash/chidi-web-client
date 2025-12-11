"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera, X } from "lucide-react"
import { productsAPI } from "@/lib/api"

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  onAddProduct: (product: any) => void
  isLoading?: boolean
  onError?: (error: string) => void
}

export function AddProductModal({ isOpen, onClose, onAddProduct, isLoading, onError }: AddProductModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    stock: "",
    category: "",
    description: "",
    image: null as File | null,
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [variantsText, setVariantsText] = useState("")
  const [variantsError, setVariantsError] = useState<string | null>(null)
  const [variants, setVariants] = useState<Array<{ name: string; options: string[] }>>([])
  const [showJsonPreview, setShowJsonPreview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }))
      const reader = new FileReader()
      reader.onload = (e) => setImagePreview(e.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const stockNum = Number.parseInt(formData.stock)
      const priceFormatted = formData.price.startsWith("₦") ? formData.price : `₦${formData.price}`

      // Use structured variants if present, otherwise parse JSON text
      let parsedVariants: any[] = []
      if (variants.length > 0) {
        parsedVariants = variants
      } else if (variantsText.trim()) {
        try {
          const parsed = JSON.parse(variantsText)
          if (!Array.isArray(parsed)) throw new Error("Variants must be a JSON array")
          parsedVariants = parsed
          setVariantsError(null)
        } catch (err: any) {
          setVariantsError(err?.message || "Invalid variants JSON")
          setIsSubmitting(false)
          return
        }
      }

      const productData = {
        name: formData.name,
        price: priceFormatted,
        stock: stockNum,
        category: formData.category,
        description: formData.description,
        variants: parsedVariants.length > 0 ? parsedVariants : undefined,
        // Image upload would be handled separately in a real API
        imageUrl: imagePreview // Placeholder for now
      }

      // Call the API to create the product
      const createdProduct = await productsAPI.createProduct(productData)
      onAddProduct(createdProduct)

      // Reset form
      resetForm()
      onClose()
    } catch (error) {
      console.error('Failed to create product:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create product'
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
      price: "",
      stock: "",
      category: "",
      description: "",
      image: null,
    })
    setImagePreview(null)
    setVariantsText("")
    setVariantsError(null)
    setVariants([])
    setShowJsonPreview(false)
  }

  const isFormValid = formData.name && formData.price && formData.stock && formData.category
  const isDisabled = !isFormValid || isSubmitting || isLoading

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Image */}
          <div className="space-y-2">
            <Label>Product Image</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview || "/placeholder.svg"}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0"
                    onClick={() => {
                      setImagePreview(null)
                      setFormData((prev) => ({ ...prev, image: null }))
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center cursor-pointer">
                  <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Add product photo</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Blue Ankara Dress"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
            />
          </div>

          {/* Price and Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                placeholder="15,000"
                value={formData.price}
                onChange={(e) => handleInputChange("price", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Stock Quantity *</Label>
              <Input
                id="stock"
                type="number"
                placeholder="10"
                value={formData.stock}
                onChange={(e) => handleInputChange("stock", e.target.value)}
                required
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fashion">Fashion & Clothing</SelectItem>
                <SelectItem value="electronics">Electronics</SelectItem>
                <SelectItem value="beauty">Beauty & Cosmetics</SelectItem>
                <SelectItem value="food">Food & Beverages</SelectItem>
                <SelectItem value="home">Home & Living</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your product..."
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={3}
            />
          </div>

          {/* Variants Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Variants</Label>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowJsonPreview((s) => !s)}>
                  {showJsonPreview ? "Hide JSON" : "Show JSON"}
                </Button>
              </div>
            </div>

            {variants.map((v, idx) => (
              <div key={idx} className="p-2 border rounded-lg">
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="Variant name (e.g., Size)"
                    value={v.name}
                    onChange={(e) => setVariants((prev) => prev.map((p, i) => (i === idx ? { ...p, name: e.target.value } : p)))}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setVariants((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </Button>
                </div>
                <div className="mt-2">
                  <Label className="text-xs">Options (comma separated)</Label>
                  <Input
                    placeholder="e.g., S,M,L"
                    value={v.options.join(",")}
                    onChange={(e) => setVariants((prev) => prev.map((p, i) => (i === idx ? { ...p, options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } : p)))}
                  />
                </div>
              </div>
            ))}

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setVariants((prev) => [...prev, { name: "", options: [] }])}
              >
                Add Variant Group
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setVariantsText(JSON.stringify(variants, null, 2)); setShowJsonPreview(true) }}>
                Sync to JSON
              </Button>
            </div>

            {showJsonPreview && (
              <Textarea
                id="variants"
                placeholder='Example: [{"name":"Size","options":["S","M","L"]}]'
                value={variantsText || JSON.stringify(variants, null, 2)}
                onChange={(e) => setVariantsText(e.target.value)}
                rows={4}
              />
            )}

            {variantsError ? <p className="text-sm text-red-500">{variantsError}</p> : null}
            <p className="text-sm text-muted-foreground">Use the structured editor, or paste a JSON array. You can sync between them.</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button type="submit" disabled={isDisabled} className="flex-1">
              {isSubmitting ? 'Creating...' : 'Add Product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
