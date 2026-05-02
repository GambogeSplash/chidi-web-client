"use client"

import { useState, useRef } from "react"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { VoiceButton } from "./voice-button"
import { ChidiMark } from "./chidi-mark"
import { hapticSoft } from "@/lib/chidi/haptics"

interface QuickAddProps {
  /** Called with the parsed product. Quantity defaults to 1, name + price required. */
  onAdd: (input: { name: string; price: number; stock: number }) => Promise<void> | void
  /** Currency symbol — visual only, value is always raw number */
  currencySymbol?: string
}

/**
 * Skinny inline row at the top of the inventory grid that lets the merchant
 * type 5-10 products quickly without opening a modal each time.
 *
 * Three fields: name, price, stock. Enter to submit, then the row clears and
 * focus returns to name. Voice button parses speech like
 * "Red Adidas size 42 ₦18000 4 units".
 */
export function InventoryQuickAdd({ onAdd, currencySymbol = "₦" }: QuickAddProps) {
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [stock, setStock] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setName("")
    setPrice("")
    setStock("")
    nameRef.current?.focus()
  }

  const submit = async () => {
    const n = name.trim()
    const p = parseFloat(price)
    const s = parseInt(stock || "1", 10)
    if (!n || !Number.isFinite(p) || p <= 0) return
    setSubmitting(true)
    try {
      await onAdd({ name: n, price: p, stock: Number.isFinite(s) ? s : 1 })
      hapticSoft()
      reset()
    } finally {
      setSubmitting(false)
    }
  }

  // Parse a voice transcript like "Red Adidas size 42 ₦18000 4 units"
  const parseTranscript = (transcript: string) => {
    const t = transcript.trim()
    if (!t) return
    // Find the first number — assume it's the price
    const priceMatch = t.match(/(?:₦|naira|n)?\s*([0-9][0-9,]*)/i)
    const stockMatch = t.match(/([0-9]+)\s*(?:units?|pieces?|in stock|left)/i)
    let extractedName = t
    let extractedPrice = ""
    let extractedStock = "1"

    if (priceMatch) {
      extractedPrice = priceMatch[1].replace(/,/g, "")
      // Strip the price phrase from the name
      extractedName = t.replace(priceMatch[0], "").trim()
    }
    if (stockMatch) {
      extractedStock = stockMatch[1]
      extractedName = extractedName.replace(stockMatch[0], "").trim()
    }
    // Trim trailing "for"/"at"/"costs" / punctuation
    extractedName = extractedName.replace(/\s+(for|at|costs?|priced)\s*$/i, "").replace(/[,.\-]+$/, "").trim()

    if (extractedName) setName(extractedName)
    if (extractedPrice) setPrice(extractedPrice)
    if (extractedStock) setStock(extractedStock)
  }

  const canSubmit = name.trim().length > 0 && parseFloat(price) > 0 && !submitting

  return (
    <div className="bg-white border border-[var(--chidi-border-subtle)] rounded-xl p-3 flex items-stretch gap-2">
      {/* Chidi mark + label */}
      <div className="hidden sm:flex flex-col items-center justify-center px-2 text-[var(--chidi-text-muted)]">
        <ChidiMark size={16} variant="muted" />
        <span className="text-[9px] font-chidi-voice uppercase tracking-wider mt-1">Quick add</span>
      </div>

      {/* Inputs */}
      <Input
        ref={nameRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit() }}
        placeholder="Product name"
        className="flex-[3] h-10 bg-[var(--chidi-surface)] border-transparent focus:border-[var(--chidi-border-default)] text-sm font-chidi-voice"
      />
      <div className="relative flex-1 min-w-[80px]">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--chidi-text-muted)] tabular-nums pointer-events-none">
          {currencySymbol}
        </span>
        <Input
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
          onKeyDown={(e) => { if (e.key === "Enter") submit() }}
          placeholder="0"
          inputMode="decimal"
          className="h-10 pl-7 bg-[var(--chidi-surface)] border-transparent focus:border-[var(--chidi-border-default)] text-sm tabular-nums"
        />
      </div>
      <Input
        value={stock}
        onChange={(e) => setStock(e.target.value.replace(/[^0-9]/g, ""))}
        onKeyDown={(e) => { if (e.key === "Enter") submit() }}
        placeholder="Qty"
        inputMode="numeric"
        className="h-10 w-[70px] bg-[var(--chidi-surface)] border-transparent focus:border-[var(--chidi-border-default)] text-sm tabular-nums text-center"
      />

      {/* Voice + Add */}
      <VoiceButton
        size="md"
        onTranscript={parseTranscript}
        onCommit={parseTranscript}
        title="Hold to speak — try 'Red Adidas size 42 ₦18000 4 units'"
      />
      <Button
        onClick={submit}
        disabled={!canSubmit}
        className="btn-cta h-10 px-3"
        size="sm"
      >
        <Plus className="w-4 h-4 mr-1" />
        Add
      </Button>
    </div>
  )
}
