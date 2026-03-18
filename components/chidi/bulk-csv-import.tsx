"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, CheckCircle, AlertCircle, ArrowLeft, ArrowRight, Loader2, FileSpreadsheet } from "lucide-react"
import { productsAPI } from "@/lib/api"
import type { BulkImportAnalysis, BulkImportResult, ColumnMapping, BulkImportFileType } from "@/lib/types/product"

interface BulkCSVImportProps {
  isOpen: boolean
  onClose: () => void
  onImport: (result: { imported: number; failed: number; products: any[] }) => void
  onError?: (error: string) => void
}

type Step = "upload" | "mapping" | "preview" | "importing" | "complete"

const CHIDI_FIELDS = [
  { value: "name", label: "Product Name", required: true },
  { value: "selling_price", label: "Selling Price", required: true },
  { value: "category", label: "Category", required: true },
  { value: "cost_price", label: "Cost Price" },
  { value: "description", label: "Description" },
  { value: "status", label: "Status/Availability" },
  { value: "stock_quantity", label: "Stock Quantity" },
  { value: "sku", label: "SKU" },
  { value: "brand", label: "Brand" },
  { value: "barcode", label: "Barcode/GTIN" },
  { value: "discount_price", label: "Sale Price" },
  { value: "image_link", label: "Main Image URL" },
  { value: "additional_image_link", label: "Additional Images" },
  { value: "image_urls", label: "Image URLs (Array)" },
  { value: "condition", label: "Condition" },
  { value: "product_url", label: "Product URL" },
  { value: "gender", label: "Gender" },
  { value: "age_group", label: "Age Group" },
  { value: "material", label: "Material" },
  { value: "pattern", label: "Pattern" },
  { value: "color", label: "Color (Variant)" },
  { value: "size", label: "Size (Variant)" },
  { value: "item_group_id", label: "Variant Group ID" },
  { value: "tags", label: "Tags" },
  { value: "weight", label: "Weight" },
  { value: "subcategory", label: "Subcategory" },
]

const FORMAT_LABELS: Record<string, string> = {
  meta: "Meta Catalog",
  chidi: "Chidi",
  shopify: "Shopify",
  unknown: "Unknown",
}

export function BulkCSVImport({ isOpen, onClose, onImport, onError }: BulkCSVImportProps) {
  const [step, setStep] = useState<Step>("upload")
  const [fileContent, setFileContent] = useState("")
  const [fileType, setFileType] = useState<BulkImportFileType>("csv")
  const [fileName, setFileName] = useState("")
  const [analysis, setAnalysis] = useState<BulkImportAnalysis | null>(null)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null)

  const resetState = useCallback(() => {
    setStep("upload")
    setFileContent("")
    setFileType("csv")
    setFileName("")
    setAnalysis(null)
    setColumnMapping({})
    setError("")
    setIsLoading(false)
    setImportResult(null)
  }, [])

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [resetState, onClose])

  const getFileType = (filename: string): BulkImportFileType => {
    const ext = filename.toLowerCase().split('.').pop()
    if (ext === 'xlsx' || ext === 'xls') return 'xlsx'
    if (ext === 'tsv') return 'tsv'
    return 'csv'
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError("")
    setIsLoading(true)
    
    const detectedType = getFileType(file.name)
    setFileType(detectedType)
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = async (event) => {
      let content: string
      
      if (detectedType === 'xlsx') {
        // For XLSX, convert ArrayBuffer to base64
        const arrayBuffer = event.target?.result as ArrayBuffer
        const bytes = new Uint8Array(arrayBuffer)
        let binary = ''
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        content = btoa(binary)
      } else {
        // For CSV/TSV, use text content
        content = event.target?.result as string
      }
      
      setFileContent(content)

      try {
        const result = await productsAPI.analyzeImport(content, detectedType)
        setAnalysis(result)
        setColumnMapping(result.column_mapping)
        setStep("mapping")
      } catch (err) {
        const message = err instanceof Error ? err.message : `Failed to analyze ${detectedType.toUpperCase()} file`
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }
    reader.onerror = () => {
      setError("Failed to read file")
      setIsLoading(false)
    }
    
    // Read as ArrayBuffer for XLSX, text for CSV/TSV
    if (detectedType === 'xlsx') {
      reader.readAsArrayBuffer(file)
    } else {
      reader.readAsText(file)
    }
  }

  const handleMappingChange = (csvHeader: string, chidiField: string | null) => {
    setColumnMapping(prev => ({
      ...prev,
      [csvHeader]: chidiField,
    }))
  }

  const handleProceedToPreview = () => {
    const requiredFields = ["name", "selling_price", "category"]
    const mappedFields = Object.values(columnMapping).filter(Boolean)
    
    const missingRequired = requiredFields.filter(f => !mappedFields.includes(f))
    if (missingRequired.length > 0) {
      setError(`Missing required field mappings: ${missingRequired.join(", ")}`)
      return
    }
    
    setError("")
    setStep("preview")
  }

  const handleExecuteImport = async () => {
    setStep("importing")
    setError("")

    try {
      const cleanMapping: ColumnMapping = {}
      for (const [header, field] of Object.entries(columnMapping)) {
        if (field) {
          cleanMapping[header] = field
        }
      }

      const result = await productsAPI.bulkImport(fileContent, cleanMapping, fileType)
      setImportResult(result)
      setStep("complete")
      
      onImport({
        imported: result.imported,
        failed: result.failed,
        products: [],
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to import products"
      setError(message)
      setStep("preview")
      if (onError) {
        onError(message)
      }
    }
  }

  const getMappedPreviewHeaders = () => {
    if (!analysis) return []
    return Object.entries(columnMapping)
      .filter(([_, field]) => field)
      .map(([header, field]) => ({ header, field: field as string }))
  }

  const renderUploadStep = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-[var(--chidi-text-secondary)]">Upload Product File</Label>
        <div className="border-2 border-dashed border-[var(--chidi-border-subtle)] rounded-lg p-8 hover:border-[var(--chidi-accent)]/50 transition-colors">
          <label className="flex flex-col items-center gap-3 cursor-pointer">
            {isLoading ? (
              <Loader2 className="w-10 h-10 text-[var(--chidi-accent)] animate-spin" />
            ) : (
              <Upload className="w-10 h-10 text-[var(--chidi-text-muted)]" />
            )}
            <div className="text-center">
              <span className="text-sm text-[var(--chidi-text-secondary)] block">
                {isLoading ? "Analyzing file..." : "Click to upload or drag and drop"}
              </span>
              <span className="text-xs text-[var(--chidi-text-muted)] block mt-1">
                CSV, TSV, or Excel (XLSX) • Supports Meta Catalog, Shopify, and custom formats
              </span>
            </div>
            <input 
              type="file" 
              accept=".csv,.tsv,.xlsx,.xls" 
              onChange={handleFileUpload} 
              className="hidden" 
              disabled={isLoading}
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="flex gap-2 p-3 bg-[var(--chidi-danger)]/5 border border-[var(--chidi-danger)]/20 rounded-lg text-sm text-[var(--chidi-danger)]">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )

  const renderMappingStep = () => {
    if (!analysis) return null

    const mappedHeaders = Object.entries(columnMapping).filter(([_, field]) => field)
    const unmappedHeaders = Object.entries(columnMapping).filter(([_, field]) => !field)

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-[var(--chidi-surface)] rounded-lg">
          <FileSpreadsheet className="w-5 h-5 text-[var(--chidi-accent)]" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--chidi-text-primary)]">{fileName}</p>
            <p className="text-xs text-[var(--chidi-text-muted)]">
              {analysis.total_rows} rows • Detected: {FORMAT_LABELS[analysis.detected_format] || analysis.detected_format}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-[var(--chidi-text-secondary)]">
            Column Mapping ({mappedHeaders.length} mapped, {unmappedHeaders.length} unmapped)
          </Label>
          
          <div className="border border-[var(--chidi-border-subtle)] rounded-lg overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--chidi-surface)] sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-[var(--chidi-text-secondary)]">CSV Column</th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--chidi-text-secondary)]">Maps To</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(columnMapping).map(([header, field]) => (
                  <tr key={header} className="border-t border-[var(--chidi-border-subtle)]">
                    <td className="px-3 py-2 text-[var(--chidi-text-primary)] font-mono text-xs">
                      {header}
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        value={field || "_skip"}
                        onValueChange={(value) => handleMappingChange(header, value === "_skip" ? null : value)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Skip this column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_skip" className="text-[var(--chidi-text-muted)]">
                            Skip this column
                          </SelectItem>
                          {CHIDI_FIELDS.map((f) => (
                            <SelectItem key={f.value} value={f.value}>
                              {f.label} {f.required && <span className="text-[var(--chidi-danger)]">*</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {error && (
          <div className="flex gap-2 p-3 bg-[var(--chidi-danger)]/5 border border-[var(--chidi-danger)]/20 rounded-lg text-sm text-[var(--chidi-danger)]">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            onClick={() => { setStep("upload"); setError(""); }}
            className="bg-white border-[var(--chidi-border-default)] text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-surface)]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button 
            onClick={handleProceedToPreview}
            className="flex-1 bg-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)] hover:bg-[var(--chidi-accent)]/90"
          >
            Preview Import
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  const renderPreviewStep = () => {
    if (!analysis) return null

    const mappedHeaders = getMappedPreviewHeaders()

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[var(--chidi-text-secondary)]">
              Preview ({analysis.preview_rows.length} of {analysis.total_rows} rows)
            </Label>
            <span className="text-xs text-[var(--chidi-text-muted)]">
              Scroll horizontally to see all columns →
            </span>
          </div>
          
          <div className="border border-[var(--chidi-border-subtle)] rounded-lg overflow-x-auto overflow-y-auto max-h-72">
            <table className="text-sm min-w-max">
              <thead className="bg-[var(--chidi-surface)] sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-[var(--chidi-text-muted)] whitespace-nowrap w-10 sticky left-0 bg-[var(--chidi-surface)]">
                    #
                  </th>
                  {mappedHeaders.map(({ field }) => (
                    <th key={field} className="px-3 py-2 text-left font-medium text-[var(--chidi-text-secondary)] whitespace-nowrap min-w-[120px]">
                      {CHIDI_FIELDS.find(f => f.value === field)?.label || field}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analysis.preview_rows.map((row, idx) => (
                  <tr key={idx} className="border-t border-[var(--chidi-border-subtle)] hover:bg-[var(--chidi-surface)]">
                    <td className="px-3 py-2 text-[var(--chidi-text-muted)] text-xs sticky left-0 bg-white">
                      {idx + 1}
                    </td>
                    {mappedHeaders.map(({ header, field }) => {
                      const value = row[header] || row[field] || "-"
                      const displayValue = typeof value === 'string' && value.length > 40 
                        ? value.substring(0, 40) + "..." 
                        : value
                      return (
                        <td 
                          key={field} 
                          className="px-3 py-2 text-[var(--chidi-text-primary)] whitespace-nowrap"
                          title={typeof value === 'string' ? value : undefined}
                        >
                          {displayValue}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {error && (
          <div className="flex gap-2 p-3 bg-[var(--chidi-danger)]/5 border border-[var(--chidi-danger)]/20 rounded-lg text-sm text-[var(--chidi-danger)]">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            onClick={() => { setStep("mapping"); setError(""); }}
            className="bg-white border-[var(--chidi-border-default)] text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-surface)]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button 
            onClick={handleExecuteImport}
            className="flex-1 bg-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)] hover:bg-[var(--chidi-accent)]/90"
          >
            Import {analysis.total_rows} Products
          </Button>
        </div>
      </div>
    )
  }

  const renderImportingStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Loader2 className="w-12 h-12 text-[var(--chidi-accent)] animate-spin" />
      <div className="text-center">
        <p className="text-lg font-medium text-[var(--chidi-text-primary)]">Importing products...</p>
        <p className="text-sm text-[var(--chidi-text-muted)]">This may take a moment</p>
      </div>
    </div>
  )

  const renderCompleteStep = () => {
    if (!importResult) return null

    const hasErrors = importResult.errors && importResult.errors.length > 0

    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center py-6 space-y-3">
          <CheckCircle className="w-12 h-12 text-[var(--chidi-success)]" />
          <div className="text-center">
            <p className="text-lg font-medium text-[var(--chidi-text-primary)]">Import Complete</p>
            <p className="text-sm text-[var(--chidi-text-muted)]">
              {importResult.imported} products imported
              {importResult.failed > 0 && `, ${importResult.failed} failed`}
            </p>
          </div>
        </div>

        {hasErrors && (
          <div className="space-y-2">
            <Label className="text-[var(--chidi-text-secondary)]">Errors ({importResult.errors.length})</Label>
            <div className="border border-[var(--chidi-danger)]/20 rounded-lg overflow-auto max-h-32 bg-[var(--chidi-danger)]/5">
              <ul className="p-3 space-y-1 text-sm text-[var(--chidi-danger)]">
                {importResult.errors.slice(0, 10).map((err, idx) => (
                  <li key={idx}>
                    Row {err.row}: {err.message}
                  </li>
                ))}
                {importResult.errors.length > 10 && (
                  <li className="text-[var(--chidi-text-muted)]">
                    ...and {importResult.errors.length - 10} more errors
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            onClick={resetState}
            className="flex-1 bg-white border-[var(--chidi-border-default)] text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-surface)]"
          >
            Import More
          </Button>
          <Button 
            onClick={handleClose}
            className="flex-1 bg-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)] hover:bg-[var(--chidi-accent)]/90"
          >
            Done
          </Button>
        </div>
      </div>
    )
  }

  const renderStepContent = () => {
    switch (step) {
      case "upload":
        return renderUploadStep()
      case "mapping":
        return renderMappingStep()
      case "preview":
        return renderPreviewStep()
      case "importing":
        return renderImportingStep()
      case "complete":
        return renderCompleteStep()
      default:
        return null
    }
  }

  const getStepTitle = () => {
    switch (step) {
      case "upload":
        return "Bulk Import Products"
      case "mapping":
        return "Map Columns"
      case "preview":
        return "Preview Import"
      case "importing":
        return "Importing..."
      case "complete":
        return "Import Complete"
      default:
        return "Bulk Import"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-white border-[var(--chidi-border-default)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--chidi-text-primary)]">{getStepTitle()}</DialogTitle>
        </DialogHeader>
        {renderStepContent()}
      </DialogContent>
    </Dialog>
  )
}
