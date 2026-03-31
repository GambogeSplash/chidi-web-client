"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { 
  Folder, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  AlertTriangle,
  Check,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Package,
  Hash
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  categoriesAPI, 
  type ProductCategory, 
  type CreateCategoryRequest,
  type UpdateCategoryRequest 
} from "@/lib/api/categories"

// Common emoji options for category icons
const EMOJI_OPTIONS = [
  "📦", "👕", "👟", "💻", "📱", "🎧", "🏠", "🍔", "💄", "⚽",
  "📚", "🎮", "🎨", "🔧", "💊", "🌿", "🎁", "✨", "🛒", "🏷️"
]

/**
 * Generate a SKU code from a category name
 * Takes first 3 consonants, or first 3 characters if not enough consonants
 */
function generateSkuCode(name: string): string {
  const consonants = name.toUpperCase().replace(/[^BCDFGHJKLMNPQRSTVWXYZ]/g, "")
  if (consonants.length >= 3) {
    return consonants.slice(0, 3)
  }
  // Fallback to first 3 alphanumeric characters
  const alphanumeric = name.toUpperCase().replace(/[^A-Z0-9]/g, "")
  return alphanumeric.slice(0, 3).padEnd(3, "X")
}

/**
 * Generate a URL-safe slug from a category name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

interface CategoryFormData {
  name: string
  icon: string
  sku_code: string
  slug: string
}

export function CategorySettings() {
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null)

  // Form state
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    icon: "📦",
    sku_code: "",
    slug: ""
  })

  // Load categories on mount
  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await categoriesAPI.getCategories(true) // Include product count
      setCategories(data)
    } catch (err: any) {
      console.error("Failed to load categories:", err)
      setError(err.message || "Failed to load categories")
    } finally {
      setIsLoading(false)
    }
  }

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      sku_code: generateSkuCode(name),
      slug: generateSlug(name)
    })
  }

  const handleAddCategory = async () => {
    if (!formData.name.trim()) {
      setError("Category name is required")
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      
      const request: CreateCategoryRequest = {
        name: formData.name.trim(),
        slug: formData.slug,
        sku_code: formData.sku_code,
        icon: formData.icon || undefined
      }
      
      await categoriesAPI.createCategory(request)
      await loadCategories()
      
      setShowAddDialog(false)
      resetForm()
      setSuccess("Category created successfully")
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      console.error("Failed to create category:", err)
      setError(err.message || "Failed to create category")
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditCategory = async () => {
    if (!selectedCategory || !formData.name.trim()) {
      setError("Category name is required")
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      
      const request: UpdateCategoryRequest = {
        name: formData.name.trim(),
        slug: formData.slug,
        sku_code: formData.sku_code,
        icon: formData.icon || undefined
      }
      
      await categoriesAPI.updateCategory(selectedCategory.id, request)
      await loadCategories()
      
      setShowEditDialog(false)
      setSelectedCategory(null)
      resetForm()
      setSuccess("Category updated successfully")
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      console.error("Failed to update category:", err)
      setError(err.message || "Failed to update category")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return

    try {
      setIsSaving(true)
      setError(null)
      
      await categoriesAPI.deleteCategory(selectedCategory.id)
      await loadCategories()
      
      setShowDeleteDialog(false)
      setSelectedCategory(null)
      setSuccess("Category deleted successfully")
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      console.error("Failed to delete category:", err)
      setError(err.message || "Failed to delete category")
    } finally {
      setIsSaving(false)
    }
  }

  const handleMoveCategory = async (category: ProductCategory, direction: "up" | "down") => {
    const currentIndex = categories.findIndex(c => c.id === category.id)
    if (currentIndex === -1) return
    
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= categories.length) return

    // Create new order
    const newCategories = [...categories]
    const [removed] = newCategories.splice(currentIndex, 1)
    newCategories.splice(newIndex, 0, removed)

    // Optimistically update UI
    setCategories(newCategories)

    try {
      const categoryIds = newCategories.map(c => c.id)
      await categoriesAPI.reorderCategories(categoryIds)
    } catch (err: any) {
      console.error("Failed to reorder categories:", err)
      // Revert on error
      await loadCategories()
      setError(err.message || "Failed to reorder categories")
    }
  }

  const openEditDialog = (category: ProductCategory) => {
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      icon: category.icon || "📦",
      sku_code: category.sku_code,
      slug: category.slug
    })
    setShowEditDialog(true)
  }

  const openDeleteDialog = (category: ProductCategory) => {
    setSelectedCategory(category)
    setShowDeleteDialog(true)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      icon: "📦",
      sku_code: "",
      slug: ""
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--chidi-text-muted)]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4" />
          {success}
        </div>
      )}

      <Card className="bg-white border-[var(--chidi-border-subtle)]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-[var(--chidi-text-primary)] flex items-center gap-2">
              <Folder className="w-5 h-5" />
              Product Categories
            </CardTitle>
            <CardDescription className="text-[var(--chidi-text-muted)] mt-1">
              Organize your products into categories. These are used for filtering and SKU generation.
            </CardDescription>
          </div>
          <Button
            onClick={() => {
              resetForm()
              setShowAddDialog(true)
            }}
            className="btn-cta"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8 text-[var(--chidi-text-muted)]">
              <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No categories yet. Add your first category to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((category, index) => (
                <div
                  key={category.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-[var(--chidi-border-subtle)] hover:bg-[var(--chidi-surface)] transition-colors group"
                >
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => handleMoveCategory(category, "up")}
                      disabled={index === 0}
                      className="p-0.5 rounded hover:bg-[var(--chidi-border-subtle)] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="w-3 h-3 text-[var(--chidi-text-muted)]" />
                    </button>
                    <button
                      onClick={() => handleMoveCategory(category, "down")}
                      disabled={index === categories.length - 1}
                      className="p-0.5 rounded hover:bg-[var(--chidi-border-subtle)] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronDown className="w-3 h-3 text-[var(--chidi-text-muted)]" />
                    </button>
                  </div>

                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-[var(--chidi-surface)] flex items-center justify-center text-lg">
                    {category.icon || "📦"}
                  </div>

                  {/* Name and details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--chidi-text-primary)] truncate">
                        {category.name}
                      </span>
                      {category.is_default && (
                        <span className="text-[10px] font-medium text-[var(--chidi-text-muted)] bg-[var(--chidi-surface)] px-1.5 py-0.5 rounded">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--chidi-text-muted)]">
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {category.sku_code}
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {category.product_count ?? 0} products
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)]"
                      onClick={() => openEditDialog(category)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-[var(--chidi-text-muted)] hover:text-[var(--chidi-danger)]"
                      onClick={() => openDeleteDialog(category)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Category Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-white border-[var(--chidi-border-subtle)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--chidi-text-primary)]">Add Category</DialogTitle>
            <DialogDescription className="text-[var(--chidi-text-secondary)]">
              Create a new product category for your inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[var(--chidi-text-primary)]">
                Category Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Electronics, Clothing, Food"
                className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)]"
              />
            </div>

            {/* Icon */}
            <div className="space-y-2">
              <Label className="text-[var(--chidi-text-primary)]">Icon</Label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: emoji })}
                    className={`w-9 h-9 rounded-lg border text-lg flex items-center justify-center transition-colors ${
                      formData.icon === emoji
                        ? "border-[var(--chidi-accent)] bg-[var(--chidi-accent)]/10"
                        : "border-[var(--chidi-border-subtle)] hover:bg-[var(--chidi-surface)]"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* SKU Code */}
            <div className="space-y-2">
              <Label htmlFor="sku_code" className="text-[var(--chidi-text-primary)]">
                SKU Code
              </Label>
              <Input
                id="sku_code"
                value={formData.sku_code}
                onChange={(e) => setFormData({ ...formData, sku_code: e.target.value.toUpperCase().slice(0, 4) })}
                placeholder="ELC"
                maxLength={4}
                className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] uppercase font-mono"
              />
              <p className="text-xs text-[var(--chidi-text-muted)]">
                3-4 letter code used in product SKUs (e.g., ELC for Electronics → SKU: BUS-ELC-0001)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              className="border-[var(--chidi-border-subtle)] text-[var(--chidi-text-secondary)]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCategory}
              disabled={isSaving || !formData.name.trim()}
              className="btn-cta"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-white border-[var(--chidi-border-subtle)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--chidi-text-primary)]">Edit Category</DialogTitle>
            <DialogDescription className="text-[var(--chidi-text-secondary)]">
              Update the category details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-[var(--chidi-text-primary)]">
                Category Name
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Electronics, Clothing, Food"
                className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)]"
              />
            </div>

            {/* Icon */}
            <div className="space-y-2">
              <Label className="text-[var(--chidi-text-primary)]">Icon</Label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: emoji })}
                    className={`w-9 h-9 rounded-lg border text-lg flex items-center justify-center transition-colors ${
                      formData.icon === emoji
                        ? "border-[var(--chidi-accent)] bg-[var(--chidi-accent)]/10"
                        : "border-[var(--chidi-border-subtle)] hover:bg-[var(--chidi-surface)]"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* SKU Code */}
            <div className="space-y-2">
              <Label htmlFor="edit-sku_code" className="text-[var(--chidi-text-primary)]">
                SKU Code
              </Label>
              <Input
                id="edit-sku_code"
                value={formData.sku_code}
                onChange={(e) => setFormData({ ...formData, sku_code: e.target.value.toUpperCase().slice(0, 4) })}
                placeholder="ELC"
                maxLength={4}
                className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] uppercase font-mono"
              />
              <p className="text-xs text-[var(--chidi-text-muted)]">
                Changing this will not affect existing product SKUs.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              className="border-[var(--chidi-border-subtle)] text-[var(--chidi-text-secondary)]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditCategory}
              disabled={isSaving || !formData.name.trim()}
              className="btn-cta"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-white border-[var(--chidi-border-subtle)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--chidi-text-primary)]">Delete Category?</DialogTitle>
            <DialogDescription className="text-[var(--chidi-text-secondary)]">
              {selectedCategory && (selectedCategory.product_count ?? 0) > 0 ? (
                <>
                  <span className="text-[var(--chidi-danger)] font-medium">
                    Warning: This category has {selectedCategory.product_count} products.
                  </span>
                  <br />
                  Products will not be deleted, but their category will be unset.
                </>
              ) : (
                "Are you sure you want to delete this category? This action cannot be undone."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="border-[var(--chidi-border-subtle)] text-[var(--chidi-text-secondary)]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCategory}
              disabled={isSaving}
              className="bg-[var(--chidi-danger)] text-[var(--chidi-danger-foreground)] hover:bg-[var(--chidi-danger)]/90"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
