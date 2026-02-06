"use client"

import { Package, AlertTriangle, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DisplayProduct } from "@/lib/types/product"

// ============ TYPE DEFINITIONS ============

interface ProductItem {
  name: string
  sku?: string
  quantity?: number
  price?: string
  description?: string
  image?: string
}

interface CategoryBlock {
  category: string
  totalValue?: string
  productCount?: number
  items: ProductItem[]
}

interface MetricItem {
  label: string
  value: string
  change?: string
  isPositive?: boolean
}

interface HighlightBlock {
  productName: string
  metric: string
  value: string
  supportingText: string[]
  image?: string
}

interface ParsedContent {
  type: "inventory" | "metrics" | "restock" | "highlight" | "numbered-products" | "product-list" | "text"
  headerText?: string
  footerText?: string
  categories?: CategoryBlock[]
  metrics?: MetricItem[]
  listItems?: ProductItem[]
  restockItems?: ProductItem[]
  highlight?: HighlightBlock
}

// ============ PRODUCT MATCHING ============

function findProductByName(name: string, products: DisplayProduct[]): DisplayProduct | undefined {
  const normalizedName = name.toLowerCase().trim()
  
  // Try exact match first
  let match = products.find(p => p.name.toLowerCase() === normalizedName)
  if (match) return match
  
  // Try partial match (product name contains search or vice versa)
  match = products.find(p => 
    p.name.toLowerCase().includes(normalizedName) || 
    normalizedName.includes(p.name.toLowerCase())
  )
  if (match) return match
  
  // Try fuzzy match - check if most words match
  const searchWords = normalizedName.split(/\s+/)
  match = products.find(p => {
    const productWords = p.name.toLowerCase().split(/\s+/)
    const matchingWords = searchWords.filter(sw => 
      productWords.some(pw => pw.includes(sw) || sw.includes(pw))
    )
    return matchingWords.length >= Math.min(2, searchWords.length)
  })
  
  return match
}

// ============ PARSING FUNCTIONS ============

/**
 * Parse numbered product list format like:
 * **1. iPhone 15 Pro Max** (SKU: TG0001)
 * Price: ₦1,200,000 | Stock: 25 units
 * Description text here...
 */
function parseNumberedProductList(content: string, products: DisplayProduct[]): { items: ProductItem[], headerText?: string } | null {
  const lines = content.split('\n')
  const items: ProductItem[] = []
  let headerText: string | undefined
  let currentProduct: ProductItem | null = null
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    // Check for numbered product header: **1. Product Name** (SKU: XXX)
    const numberedMatch = line.match(/^\*\*(\d+)\.\s*(.+?)\*\*\s*(?:\(SKU:\s*([^)]+)\))?/)
    if (numberedMatch) {
      // Save previous product if exists
      if (currentProduct) {
        items.push(currentProduct)
      }
      
      const productName = numberedMatch[2].trim()
      const matchedProduct = findProductByName(productName, products)
      
      currentProduct = {
        name: productName,
        sku: numberedMatch[3]?.trim(),
        image: matchedProduct?.image
      }
      continue
    }
    
    // Check for Price/Stock line: Price: ₦1,200,000 | Stock: 25 units
    if (currentProduct) {
      const priceStockMatch = line.match(/Price:\s*(₦?[\d,\.]+(?:[KMB])?)\s*\|\s*Stock:\s*(\d+)\s*units?/i)
      if (priceStockMatch) {
        currentProduct.price = priceStockMatch[1].trim()
        currentProduct.quantity = parseInt(priceStockMatch[2])
        continue
      }
      
      // Check for just price line
      const priceMatch = line.match(/^Price:\s*(₦?[\d,\.]+(?:[KMB])?)/i)
      if (priceMatch) {
        currentProduct.price = priceMatch[1].trim()
        continue
      }
      
      // Check for just stock line
      const stockMatch = line.match(/^Stock:\s*(\d+)\s*units?/i)
      if (stockMatch) {
        currentProduct.quantity = parseInt(stockMatch[1])
        continue
      }
      
      // Otherwise it's a description line (not starting with special chars)
      if (!line.startsWith('**') && !line.startsWith('-') && !line.startsWith('•')) {
        currentProduct.description = line
        continue
      }
    }
    
    // First non-product line before any products is the header
    if (!currentProduct && !headerText && !line.startsWith('**')) {
      headerText = line
    }
  }
  
  // Don't forget the last product
  if (currentProduct) {
    items.push(currentProduct)
  }
  
  return items.length > 0 ? { items, headerText } : null
}

function parseHighlightResponse(content: string, products: DisplayProduct[]): HighlightBlock | null {
  // Match patterns like "**Phone Case iPhone 15 Pro** has your highest unit count at **200 units**"
  const highlightMatch = content.match(/\*\*(.+?)\*\*\s+(?:has|is|was)\s+(?:your\s+)?(.+?)\s+(?:at|with|of)?\s*\*\*(.+?)\*\*/)
  
  if (highlightMatch) {
    const productName = highlightMatch[1].trim()
    const lines = content.split('\n').filter(l => l.trim())
    const supportingText = lines.slice(1).map(l => l.trim()).filter(l => l.length > 0)
    
    const matchedProduct = findProductByName(productName, products)
    
    return {
      productName,
      metric: highlightMatch[2].trim(),
      value: highlightMatch[3].trim(),
      supportingText,
      image: matchedProduct?.image
    }
  }
  
  return null
}

function parseSimpleProductList(content: string, products: DisplayProduct[]): ProductItem[] | null {
  const items: ProductItem[] = []
  const lines = content.split('\n')
  
  for (const line of lines) {
    const simpleMatch = line.match(/^[•·\-\*]\s*(.+?)(?:\s*-\s*(.+))?$/)
    if (simpleMatch) {
      const productName = simpleMatch[1].trim()
      if (productName.includes('(') && productName.includes('products)')) continue
      
      const matchedProduct = findProductByName(productName, products)
      items.push({
        name: productName,
        price: simpleMatch[2]?.trim(),
        image: matchedProduct?.image,
        quantity: matchedProduct?.stock
      })
    }
  }
  
  return items.length > 0 ? items : null
}

function parseInventoryResponse(content: string, products: DisplayProduct[]): CategoryBlock[] | null {
  const blocks: CategoryBlock[] = []
  const lines = content.split('\n')
  
  let currentBlock: CategoryBlock | null = null
  
  for (const line of lines) {
    const categoryMatch = line.match(/\*\*(.+?)\s*\((\d+)\s*products?\)\s*-\s*(.+?)(?:value)?\*\*/)
    if (categoryMatch) {
      if (currentBlock) blocks.push(currentBlock)
      currentBlock = {
        category: categoryMatch[1].trim(),
        productCount: parseInt(categoryMatch[2]),
        totalValue: categoryMatch[3].trim(),
        items: []
      }
      continue
    }
    
    const itemMatch = line.match(/[•·\-]\s*(.+?)\s*-\s*(\d+)\s*units?\s*(?:at\s*)?(.+?)(?:\s*each)?$/)
    if (itemMatch && currentBlock) {
      const productName = itemMatch[1].trim()
      const matchedProduct = findProductByName(productName, products)
      currentBlock.items.push({
        name: productName,
        quantity: parseInt(itemMatch[2]),
        price: itemMatch[3].trim(),
        image: matchedProduct?.image
      })
      continue
    }
    
    const simpleItemMatch = line.match(/[•·\-]\s*(.+?)\s*\((\d+)\s*units?\)(?:\s*-\s*(.+))?/)
    if (simpleItemMatch && currentBlock) {
      const productName = simpleItemMatch[1].trim()
      const matchedProduct = findProductByName(productName, products)
      currentBlock.items.push({
        name: productName,
        quantity: parseInt(simpleItemMatch[2]),
        description: simpleItemMatch[3]?.trim(),
        image: matchedProduct?.image
      })
    }
  }
  
  if (currentBlock) blocks.push(currentBlock)
  
  return blocks.length > 0 ? blocks : null
}

function parseRestockItems(content: string, products: DisplayProduct[]): ProductItem[] | null {
  const items: ProductItem[] = []
  const lines = content.split('\n')
  
  const hasRestockKeyword = /restock|low stock|out of stock|running low/i.test(content)
  if (!hasRestockKeyword) return null
  
  for (const line of lines) {
    const itemMatch = line.match(/[•·\-]\s*(.+?)\s*\((\d+)\s*units?\)\s*(?:-\s*(.+))?/)
    if (itemMatch) {
      const productName = itemMatch[1].trim()
      const matchedProduct = findProductByName(productName, products)
      items.push({
        name: productName,
        quantity: parseInt(itemMatch[2]),
        description: itemMatch[3]?.trim(),
        image: matchedProduct?.image
      })
    }
  }
  
  return items.length > 0 ? items : null
}

function parseMetrics(content: string): MetricItem[] | null {
  const metrics: MetricItem[] = []
  const lines = content.split('\n')
  
  for (const line of lines) {
    const metricMatch = line.match(/(.+?):\s*(₦?[\d,\.]+[KMB]?)\s*(\([+-]?\d+%?\))?/)
    if (metricMatch) {
      const change = metricMatch[3]?.replace(/[()]/g, '')
      metrics.push({
        label: metricMatch[1].trim(),
        value: metricMatch[2].trim(),
        change: change,
        isPositive: change ? change.startsWith('+') || !change.startsWith('-') : undefined
      })
    }
  }
  
  return metrics.length >= 2 ? metrics : null
}

function parseContent(content: string, products: DisplayProduct[]): ParsedContent {
  const lines = content.split('\n').filter(l => l.trim())
  let headerText: string | undefined
  
  if (lines.length > 0 && !lines[0].startsWith('**') && !lines[0].startsWith('•') && !lines[0].startsWith('-')) {
    headerText = lines[0]
  }
  
  // Check for numbered product list first (highest priority for this format)
  const numberedProducts = parseNumberedProductList(content, products)
  if (numberedProducts && numberedProducts.items.length > 0) {
    return { 
      type: "numbered-products", 
      headerText: numberedProducts.headerText || headerText, 
      listItems: numberedProducts.items 
    }
  }
  
  // Check for inventory breakdown
  const categories = parseInventoryResponse(content, products)
  if (categories && categories.length > 0) {
    return { type: "inventory", headerText, categories }
  }
  
  // Check for single product highlight
  const highlight = parseHighlightResponse(content, products)
  if (highlight) {
    return { type: "highlight", highlight }
  }
  
  // Check for restock recommendations
  const restockItems = parseRestockItems(content, products)
  if (restockItems && restockItems.length > 0) {
    const restockHeader = lines.find(l => /restock|consider|recommend/i.test(l))
    return { 
      type: "restock", 
      headerText: restockHeader || headerText, 
      restockItems 
    }
  }
  
  // Check for simple product list
  const listItems = parseSimpleProductList(content, products)
  if (listItems && listItems.length > 0) {
    return { type: "product-list", headerText, listItems }
  }
  
  // Check for metrics
  const metrics = parseMetrics(content)
  if (metrics && metrics.length > 0) {
    return { type: "metrics", headerText, metrics }
  }
  
  // Default to text
  return { type: "text" }
}

// ============ MARKDOWN RENDERING ============

function renderMarkdownText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

// ============ RENDER COMPONENTS ============

const CARD_MAX_WIDTH = "max-w-sm"

interface HighlightBlockProps {
  highlight: HighlightBlock
}

function HighlightBlockComponent({ highlight }: HighlightBlockProps) {
  return (
    <div className={cn("space-y-3 w-full", CARD_MAX_WIDTH)}>
      <div className="bg-white border border-[var(--chidi-border-subtle)] rounded-xl overflow-hidden">
        {highlight.image && (
          <div className="w-full h-40 bg-[var(--chidi-surface)]">
            <img 
              src={highlight.image} 
              alt={highlight.productName}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="p-4">
          <div className="flex items-start gap-3">
            {!highlight.image && (
              <div className="w-12 h-12 rounded-xl bg-[var(--chidi-accent)]/5 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-6 h-6 text-[var(--chidi-accent)]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-[var(--chidi-text-primary)] text-base">
                {highlight.productName}
              </h4>
              <p className="text-sm text-[var(--chidi-text-muted)] mt-0.5">
                {highlight.metric}
              </p>
              <p className="text-2xl font-bold text-[var(--chidi-text-primary)] mt-2">
                {highlight.value}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {highlight.supportingText.length > 0 && (
        <div className="space-y-2 px-1">
          {highlight.supportingText.map((text, idx) => (
            <p key={idx} className="text-sm text-[var(--chidi-text-secondary)] leading-relaxed">
              {renderMarkdownText(text)}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

interface NumberedProductListProps {
  items: ProductItem[]
  headerText?: string
}

function NumberedProductList({ items, headerText }: NumberedProductListProps) {
  return (
    <div className="space-y-3 w-full max-w-lg">
      {headerText && (
        <p className="text-sm text-[var(--chidi-text-primary)] mb-2">
          {renderMarkdownText(headerText)}
        </p>
      )}
      
      <div className="border border-[var(--chidi-border-subtle)] rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto scrollbar-none">
        <table className="w-full text-sm min-w-[400px]">
          <thead>
            <tr className="bg-[var(--chidi-surface)] border-b border-[var(--chidi-border-subtle)]">
              <th className="text-left py-2.5 px-3 font-medium text-[var(--chidi-text-muted)]">Product</th>
              <th className="text-right py-2.5 px-3 font-medium text-[var(--chidi-text-muted)] w-20">Stock</th>
              <th className="text-right py-2.5 px-3 font-medium text-[var(--chidi-text-muted)] w-28">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--chidi-border-subtle)]">
            {items.map((item, idx) => (
              <tr key={idx} className="hover:bg-[var(--chidi-surface)]/50">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-3">
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[var(--chidi-surface)] flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-[var(--chidi-text-muted)]" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--chidi-text-primary)] truncate">
                        {item.name}
                      </p>
                      {item.sku && (
                        <p className="text-xs text-[var(--chidi-text-muted)]">
                          SKU: {item.sku}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-right">
                  {item.quantity !== undefined ? (
                    <span className="text-[var(--chidi-text-secondary)]">
                      {item.quantity}
                    </span>
                  ) : (
                    <span className="text-[var(--chidi-text-muted)]">—</span>
                  )}
                </td>
                <td className="py-3 px-3 text-right">
                  {item.price ? (
                    <span className="font-medium text-[var(--chidi-text-primary)]">
                      {item.price.startsWith('₦') ? item.price : `₦${item.price}`}
                    </span>
                  ) : (
                    <span className="text-[var(--chidi-text-muted)]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

interface ProductListProps {
  items: ProductItem[]
  headerText?: string
}

function ProductListTable({ items, headerText }: ProductListProps) {
  return (
    <div className="space-y-2 w-full max-w-lg">
      {headerText && (
        <p className="text-sm text-[var(--chidi-text-primary)] mb-3">
          {renderMarkdownText(headerText)}
        </p>
      )}
      
      <div className="border border-[var(--chidi-border-subtle)] rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto scrollbar-none">
        <table className="w-full text-sm min-w-[350px]">
          <thead>
            <tr className="bg-[var(--chidi-surface)] border-b border-[var(--chidi-border-subtle)]">
              <th className="text-left py-2 px-3 font-medium text-[var(--chidi-text-muted)]">Product</th>
              <th className="text-right py-2 px-3 font-medium text-[var(--chidi-text-muted)]">Stock</th>
              <th className="text-right py-2 px-3 font-medium text-[var(--chidi-text-muted)]">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--chidi-border-subtle)]">
            {items.map((item, idx) => (
              <tr key={idx} className="hover:bg-[var(--chidi-surface)]/50">
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2.5">
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-8 h-8 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded bg-[var(--chidi-surface)] flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-[var(--chidi-text-muted)]" />
                      </div>
                    )}
                    <span className="text-[var(--chidi-text-primary)] line-clamp-1">
                      {item.name}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right text-[var(--chidi-text-muted)]">
                  {item.quantity !== undefined ? `${item.quantity}` : '—'}
                </td>
                <td className="py-2.5 px-3 text-right font-medium text-[var(--chidi-text-primary)]">
                  {item.price || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

interface InventoryBlockProps {
  categories: CategoryBlock[]
  headerText?: string
}

function InventoryBlock({ categories, headerText }: InventoryBlockProps) {
  return (
    <div className="space-y-4 w-full max-w-lg">
      {headerText && (
        <p className="text-sm text-[var(--chidi-text-primary)]">
          {renderMarkdownText(headerText)}
        </p>
      )}
      
      {categories.map((block, idx) => (
        <div 
          key={idx}
          className="border border-[var(--chidi-border-subtle)] rounded-lg overflow-hidden bg-white"
        >
          <div className="flex items-center justify-between px-3 py-2 bg-[var(--chidi-surface)] border-b border-[var(--chidi-border-subtle)]">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-[var(--chidi-text-muted)]" />
              <span className="font-medium text-sm text-[var(--chidi-text-primary)]">
                {block.category}
              </span>
              {block.productCount && (
                <span className="text-xs text-[var(--chidi-text-muted)]">
                  ({block.productCount})
                </span>
              )}
            </div>
            {block.totalValue && (
              <span className="text-sm font-semibold text-[var(--chidi-text-primary)]">
                {block.totalValue}
              </span>
            )}
          </div>
          
          <div className="overflow-x-auto scrollbar-none">
          <table className="w-full text-sm min-w-[350px]">
            <tbody className="divide-y divide-[var(--chidi-border-subtle)]">
              {block.items.map((item, itemIdx) => (
                <tr key={itemIdx} className="hover:bg-[var(--chidi-surface)]/50">
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2.5">
                      {item.image ? (
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-8 h-8 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-[var(--chidi-surface)] flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-[var(--chidi-text-muted)]" />
                        </div>
                      )}
                      <span className="text-[var(--chidi-text-primary)] line-clamp-1">
                        {item.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right text-[var(--chidi-text-muted)] whitespace-nowrap">
                    {item.quantity !== undefined ? `${item.quantity} units` : ''}
                  </td>
                  <td className="py-2 px-3 text-right font-medium text-[var(--chidi-text-primary)] whitespace-nowrap">
                    {item.price || ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      ))}
    </div>
  )
}

interface RestockBlockProps {
  items: ProductItem[]
  headerText?: string
}

function RestockBlock({ items, headerText }: RestockBlockProps) {
  return (
    <div className="space-y-2 w-full max-w-lg">
      {headerText && (
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-[var(--chidi-warning)]" />
          <p className="text-sm font-medium text-[var(--chidi-text-primary)]">
            {headerText.replace(/\*\*/g, '')}
          </p>
        </div>
      )}
      
      <div className="border border-[var(--chidi-warning)]/30 rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto scrollbar-none">
        <table className="w-full text-sm min-w-[300px]">
          <thead>
            <tr className="bg-[var(--chidi-warning)]/5 border-b border-[var(--chidi-warning)]/20">
              <th className="text-left py-2 px-3 font-medium text-[var(--chidi-text-muted)]">Product</th>
              <th className="text-right py-2 px-3 font-medium text-[var(--chidi-text-muted)]">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--chidi-border-subtle)]">
            {items.map((item, idx) => (
              <tr key={idx}>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2.5">
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-8 h-8 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded bg-[var(--chidi-surface)] flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-[var(--chidi-text-muted)]" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-[var(--chidi-text-primary)] line-clamp-1 block">
                        {item.name}
                      </span>
                      {item.description && (
                        <span className="text-xs text-[var(--chidi-text-muted)] line-clamp-1 block">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right">
                  {item.quantity !== undefined && (
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full inline-block",
                      item.quantity <= 5 
                        ? "bg-[var(--chidi-danger)]/10 text-[var(--chidi-danger)]"
                        : item.quantity <= 20
                        ? "bg-[var(--chidi-warning)]/10 text-[var(--chidi-warning)]"
                        : "bg-[var(--chidi-surface)] text-[var(--chidi-text-muted)]"
                    )}>
                      {item.quantity} units
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

interface MetricsBlockProps {
  metrics: MetricItem[]
  headerText?: string
}

function MetricsBlock({ metrics, headerText }: MetricsBlockProps) {
  return (
    <div className="space-y-2 w-full max-w-lg">
      {headerText && (
        <p className="text-sm text-[var(--chidi-text-primary)] mb-3">
          {renderMarkdownText(headerText)}
        </p>
      )}
      
      <div className="border border-[var(--chidi-border-subtle)] rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto scrollbar-none">
        <table className="w-full text-sm min-w-[280px]">
          <tbody className="divide-y divide-[var(--chidi-border-subtle)]">
            {metrics.map((metric, idx) => (
              <tr key={idx}>
                <td className="py-2.5 px-3 text-[var(--chidi-text-muted)]">
                  {metric.label}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className="font-semibold text-[var(--chidi-text-primary)]">
                    {metric.value}
                  </span>
                  {metric.change && (
                    <span className={cn(
                      "text-xs font-medium ml-2",
                      metric.isPositive 
                        ? "text-[var(--chidi-success)]" 
                        : "text-[var(--chidi-danger)]"
                    )}>
                      {metric.change}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

function TextBlock({ content }: { content: string }) {
  const lines = content.split('\n').filter(l => l.trim())
  
  return (
    <div className="space-y-2 max-w-lg">
      {lines.map((line, idx) => (
        <p key={idx} className="text-sm leading-relaxed text-[var(--chidi-text-primary)]">
          {renderMarkdownText(line)}
        </p>
      ))}
    </div>
  )
}

// ============ MAIN COMPONENT ============

interface CopilotMessageContentProps {
  content: string
  role: "user" | "assistant"
  products?: DisplayProduct[]
}

export function CopilotMessageContent({ content, role, products = [] }: CopilotMessageContentProps) {
  if (role === "user") {
    return (
      <p className="text-sm leading-relaxed whitespace-pre-wrap">
        {content}
      </p>
    )
  }
  
  const parsed = parseContent(content, products)
  
  switch (parsed.type) {
    case "highlight":
      return (
        <HighlightBlockComponent 
          highlight={parsed.highlight!}
        />
      )
    
    case "numbered-products":
      return (
        <NumberedProductList 
          items={parsed.listItems!}
          headerText={parsed.headerText}
        />
      )
    
    case "product-list":
      return (
        <ProductListTable 
          items={parsed.listItems!}
          headerText={parsed.headerText}
        />
      )
    
    case "inventory":
      return (
        <InventoryBlock 
          categories={parsed.categories!} 
          headerText={parsed.headerText}
        />
      )
    
    case "restock":
      return (
        <RestockBlock 
          items={parsed.restockItems!}
          headerText={parsed.headerText}
        />
      )
    
    case "metrics":
      return (
        <MetricsBlock 
          metrics={parsed.metrics!}
          headerText={parsed.headerText}
        />
      )
    
    default:
      return <TextBlock content={content} />
  }
}
