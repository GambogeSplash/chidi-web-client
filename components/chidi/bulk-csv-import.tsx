"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, CheckCircle, AlertCircle } from "lucide-react"
import { productsAPI } from "@/lib/api"

interface BulkCSVImportProps {
  isOpen: boolean
  onClose: () => void
  onImport: (result: { imported: number; failed: number; products: any[] }) => void
  onError?: (error: string) => void
}

export function BulkCSVImport({ isOpen, onClose, onImport, onError }: BulkCSVImportProps) {
  const [csvContent, setCsvContent] = useState("")
  const [preview, setPreview] = useState<any[]>([])
  const [error, setError] = useState("")
  const [isImporting, setIsImporting] = useState(false)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setCsvContent(content)
      setError("")

      try {
        // Simple CSV parsing for preview (real parsing happens on server)
        const lines = content.trim().split('\n')
        const headers = lines[0].split(',')
        const rows = lines.slice(1, 6).map(line => {
          const values = line.split(',')
          const obj: any = {}
          headers.forEach((header, index) => {
            obj[header.trim()] = values[index]?.trim() || ''
          })
          return obj
        })
        setPreview(rows)
      } catch (err) {
        setError("Failed to parse CSV. Make sure headers are: name, price, stock, category, description")
      }
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!csvContent) {
      setError("Please upload a CSV file")
      return
    }

    setIsImporting(true)
    setError("")

    try {
      // Use API to handle bulk import
      const result = await productsAPI.bulkImport(csvContent)
      
      onImport({
        imported: result.imported,
        failed: result.failed,
        products: [] // Products will be reloaded from main app after import
      })
      
      setCsvContent("")
      setPreview([])
      setError("")
      onClose()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to import products. Please check your CSV format."
      setError(errorMessage)
      if (onError) {
        onError(errorMessage)
      }
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Products via CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* CSV Upload */}
          <div className="space-y-2">
            <Label>Upload CSV File</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
              <label className="flex flex-col items-center gap-2 cursor-pointer">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to upload CSV or drag and drop</span>
                <span className="text-xs text-muted-foreground/60">
                  CSV format: name, price, stock, category, description
                </span>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div className="space-y-2">
              <Label>Preview (showing first 5 products)</Label>
              <div className="border border-border rounded-lg overflow-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Name</th>
                      <th className="px-3 py-2 text-left font-medium">Price</th>
                      <th className="px-3 py-2 text-left font-medium">Stock</th>
                      <th className="px-3 py-2 text-left font-medium">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((product, idx) => (
                      <tr key={idx} className="border-t border-border hover:bg-muted/50">
                        <td className="px-3 py-2">{product.name}</td>
                        <td className="px-3 py-2">₦{product.price}</td>
                        <td className="px-3 py-2">{product.stock}</td>
                        <td className="px-3 py-2 capitalize">{product.category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!csvContent || isImporting} className="flex-1">
              {isImporting ? 'Importing...' : `Import ${preview.length > 0 ? `${preview.length}+` : ''} Products`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
