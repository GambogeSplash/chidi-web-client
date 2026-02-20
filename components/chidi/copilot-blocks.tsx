"use client"

import ReactMarkdown from "react-markdown"
import { Package, AlertTriangle, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DisplayProduct } from "@/lib/types/product"

// ============ TYPE DEFINITIONS ============

interface ProductItem {
  name: string
  sku?: string
  quantity?: number
  stock?: number // alias for quantity from JSON
  price?: string
  description?: string
  note?: string // alias for description from JSON
  image?: string
}

interface CategoryItem {
  category: string
  value?: string
  detail?: string
  count?: number
  items?: ProductItem[]
}

interface MetricItem {
  label: string
  value: string
  change?: string
  isPositive?: boolean
}

interface HighlightData {
  productName: string
  metric: string
  value: string
  supportingText?: string[]
  image?: string
}

// Display block types that the LLM can produce
type DisplayBlockType = "text" | "product_table" | "categories" | "metrics" | "restock" | "highlight"

interface DisplayBlock {
  type: DisplayBlockType
  header?: string
  data?: ProductItem[] | CategoryItem[] | MetricItem[] | HighlightData
  content?: string // For text blocks
}

interface ParsedResponse {
  blocks: DisplayBlock[]
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

// ============ STRUCTURED RESPONSE PARSER ============

/**
 * Parse LLM response that may contain <display> tags.
 * Falls back to plain text if no tags found.
 * 
 * Format: <display type="product_table" header="Optional header">JSON_DATA</display>
 */
function parseStructuredResponse(content: string, products: DisplayProduct[]): ParsedResponse {
  const blocks: DisplayBlock[] = []
  const displayRegex = /<display\s+type="([^"]+)"(?:\s+header="([^"]*)")?\s*>([\s\S]*?)<\/display>/g
  
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = displayRegex.exec(content)) !== null) {
    // Capture any plain text before this display block
    const textBefore = content.slice(lastIndex, match.index).trim()
    if (textBefore) {
      blocks.push({ type: "text", content: textBefore })
    }

    // Parse the display block
    const blockType = match[1] as DisplayBlockType
    const header = match[2] || undefined
    const jsonContent = match[3].trim()

    try {
      const data = JSON.parse(jsonContent)
      
      // Enrich product data with images from the products array
      if (blockType === "product_table" || blockType === "restock") {
        const items = data as ProductItem[]
        for (const item of items) {
          if (item.name && !item.image) {
            const matched = findProductByName(item.name, products)
            if (matched?.image) item.image = matched.image
          }
          // Normalize stock/quantity
          if (item.stock !== undefined && item.quantity === undefined) {
            item.quantity = item.stock
          }
          // Normalize note/description
          if (item.note && !item.description) {
            item.description = item.note
          }
        }
      }
      
      // Enrich category items with images
      if (blockType === "categories") {
        const categories = data as CategoryItem[]
        for (const cat of categories) {
          if (cat.items) {
            for (const item of cat.items) {
              if (item.name && !item.image) {
                const matched = findProductByName(item.name, products)
                if (matched?.image) item.image = matched.image
              }
            }
          }
        }
      }
      
      // Enrich highlight with image
      if (blockType === "highlight") {
        const highlight = data as HighlightData
        if (highlight.productName && !highlight.image) {
          const matched = findProductByName(highlight.productName, products)
          if (matched?.image) highlight.image = matched.image
        }
      }
      
      blocks.push({ type: blockType, header, data })
    } catch {
      // If JSON parsing fails, treat the whole thing as text
      blocks.push({ type: "text", content: match[0] })
    }

    lastIndex = match.index + match[0].length
  }

  // Capture any remaining text after the last display block
  const textAfter = content.slice(lastIndex).trim()
  if (textAfter) {
    blocks.push({ type: "text", content: textAfter })
  }

  // If no display blocks were found at all, return the whole thing as text
  if (blocks.length === 0) {
    blocks.push({ type: "text", content })
  }

  return { blocks }
}

// ============ RENDER COMPONENTS ============

const CARD_MAX_WIDTH = "max-w-lg"

/**
 * Markdown text renderer using react-markdown with Chidi's styles
 */
function MarkdownText({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-lg text-[var(--chidi-text-primary)] prose-strong:text-[var(--chidi-text-primary)] prose-strong:font-semibold">
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 text-sm">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 text-sm">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-sm">{children}</li>
          ),
          h1: ({ children }) => (
            <h1 className="text-lg font-semibold mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold mb-1">{children}</h3>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

interface HighlightBlockProps {
  data: HighlightData
}

function HighlightBlockComponent({ data }: HighlightBlockProps) {
  return (
    <div className={cn("space-y-3 w-full", CARD_MAX_WIDTH)}>
      <div className="bg-white border border-[var(--chidi-border-subtle)] rounded-xl overflow-hidden">
        {data.image && (
          <div className="w-full h-40 bg-[var(--chidi-surface)]">
            <img 
              src={data.image} 
              alt={data.productName}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="p-4">
          <div className="flex items-start gap-3">
            {!data.image && (
              <div className="w-12 h-12 rounded-xl bg-[var(--chidi-accent)]/5 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-6 h-6 text-[var(--chidi-accent)]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-[var(--chidi-text-primary)] text-base">
                {data.productName}
              </h4>
              <p className="text-sm text-[var(--chidi-text-muted)] mt-0.5">
                {data.metric}
              </p>
              <p className="text-2xl font-bold text-[var(--chidi-text-primary)] mt-2">
                {data.value}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {data.supportingText && data.supportingText.length > 0 && (
        <div className="space-y-2 px-1">
          {data.supportingText.map((text, idx) => (
            <p key={idx} className="text-sm text-[var(--chidi-text-secondary)] leading-relaxed">
              {text}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

interface ProductTableBlockProps {
  items: ProductItem[]
  headerText?: string
}

function ProductTableBlock({ items, headerText }: ProductTableBlockProps) {
  return (
    <div className={cn("space-y-3 w-full", CARD_MAX_WIDTH)}>
      {headerText && (
        <MarkdownText content={headerText} />
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

interface CategoriesBlockProps {
  categories: CategoryItem[]
  headerText?: string
}

function CategoriesBlock({ categories, headerText }: CategoriesBlockProps) {
  return (
    <div className={cn("space-y-4 w-full", CARD_MAX_WIDTH)}>
      {headerText && (
        <MarkdownText content={headerText} />
      )}
      
      <div className="border border-[var(--chidi-border-subtle)] rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full text-sm min-w-[350px]">
            <thead>
              <tr className="bg-[var(--chidi-surface)] border-b border-[var(--chidi-border-subtle)]">
                <th className="text-left py-2.5 px-3 font-medium text-[var(--chidi-text-muted)]">Category</th>
                <th className="text-right py-2.5 px-3 font-medium text-[var(--chidi-text-muted)]">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--chidi-border-subtle)]">
              {categories.map((cat, idx) => (
                <tr key={idx} className="hover:bg-[var(--chidi-surface)]/50">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--chidi-surface)] flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-[var(--chidi-text-muted)]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--chidi-text-primary)]">
                          {cat.category}
                        </p>
                        {cat.detail && (
                          <p className="text-xs text-[var(--chidi-text-muted)] truncate">
                            {cat.detail}
                          </p>
                        )}
                        {cat.count !== undefined && (
                          <p className="text-xs text-[var(--chidi-text-muted)]">
                            {cat.count} items
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    {cat.value ? (
                      <span className="font-semibold text-[var(--chidi-text-primary)]">
                        {cat.value}
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

interface RestockBlockProps {
  items: ProductItem[]
  headerText?: string
}

function RestockBlock({ items, headerText }: RestockBlockProps) {
  return (
    <div className={cn("space-y-2 w-full", CARD_MAX_WIDTH)}>
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
    <div className={cn("space-y-2 w-full", CARD_MAX_WIDTH)}>
      {headerText && (
        <MarkdownText content={headerText} />
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

// ============ MAIN COMPONENT ============

interface CopilotMessageContentProps {
  content: string
  role: "user" | "assistant" | "system"
  products?: DisplayProduct[]
  isStreaming?: boolean
}

/**
 * Blinking cursor component for streaming indicator
 */
function StreamingCursor() {
  return (
    <span className="inline-block w-2 h-4 bg-[var(--chidi-text-primary)] ml-0.5 animate-pulse" />
  )
}

/**
 * Parse content for streaming, handling incomplete display tags gracefully.
 * During streaming, incomplete tags are shown as plain text.
 */
function parseStreamingContent(content: string, products: DisplayProduct[], isStreaming: boolean): ParsedResponse {
  // If streaming, check for incomplete display tags
  if (isStreaming) {
    // Check if there's an unclosed <display tag
    const openTagMatch = content.match(/<display[^>]*>(?![\s\S]*<\/display>)/g)
    if (openTagMatch) {
      // There's an incomplete display tag - show everything as text for now
      return { blocks: [{ type: "text", content }] }
    }
  }
  
  // Otherwise use normal parsing
  return parseStructuredResponse(content, products)
}

export function CopilotMessageContent({ content, role, products = [], isStreaming = false }: CopilotMessageContentProps) {
  if (role === "user") {
    return (
      <p className="text-sm leading-relaxed whitespace-pre-wrap">
        {content}
      </p>
    )
  }
  
  const { blocks } = parseStreamingContent(content, products, isStreaming)
  
  return (
    <div className="space-y-4">
      {blocks.map((block, idx) => {
        const isLastBlock = idx === blocks.length - 1
        
        switch (block.type) {
          case "highlight":
            return (
              <HighlightBlockComponent 
                key={idx}
                data={block.data as HighlightData}
              />
            )
          
          case "product_table":
            return (
              <ProductTableBlock 
                key={idx}
                items={block.data as ProductItem[]}
                headerText={block.header}
              />
            )
          
          case "categories":
            return (
              <CategoriesBlock 
                key={idx}
                categories={block.data as CategoryItem[]}
                headerText={block.header}
              />
            )
          
          case "restock":
            return (
              <RestockBlock 
                key={idx}
                items={block.data as ProductItem[]}
                headerText={block.header}
              />
            )
          
          case "metrics":
            return (
              <MetricsBlock 
                key={idx}
                metrics={block.data as MetricItem[]}
                headerText={block.header}
              />
            )
          
          default:
            return (
              <div key={idx}>
                <MarkdownText content={block.content || ""} />
                {/* Show streaming cursor at the end of the last text block */}
                {isStreaming && isLastBlock && <StreamingCursor />}
              </div>
            )
        }
      })}
      {/* Show cursor if streaming and there are no blocks yet */}
      {isStreaming && blocks.length === 0 && <StreamingCursor />}
    </div>
  )
}
