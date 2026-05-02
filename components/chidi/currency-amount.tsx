"use client"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CURRENCIES, formatCurrency } from "@/lib/utils/currency"

interface CurrencyAmountProps {
  amount: number
  currency?: string
  compact?: boolean
  className?: string
  showDualHover?: boolean
}

// Simple, deliberately-rough indicative rates so a Lagos merchant can think in
// USD/GHS/KES at a glance. Real rates need a backend FX feed; until then these
// give the right *cognitive* pattern.
const INDICATIVE_RATES_PER_USD: Record<string, number> = {
  NGN: 1550,
  GHS: 12.7,
  KES: 129,
  USD: 1,
}

function convertVia(amount: number, fromCurrency: string, toCurrency: string): number {
  const fromRate = INDICATIVE_RATES_PER_USD[fromCurrency.toUpperCase()] || 1
  const toRate = INDICATIVE_RATES_PER_USD[toCurrency.toUpperCase()] || 1
  const inUsd = amount / fromRate
  return inUsd * toRate
}

export function CurrencyAmount({
  amount,
  currency = "NGN",
  compact = false,
  className,
  showDualHover = true,
}: CurrencyAmountProps) {
  const formatted = formatCurrency(amount, currency, { compact })

  if (!showDualHover || !Number.isFinite(amount)) {
    return <span className={className}>{formatted}</span>
  }

  const others = Object.keys(CURRENCIES)
    .filter((c) => c !== currency.toUpperCase())
    .map((c) => ({
      code: c,
      converted: formatCurrency(convertVia(amount, currency, c), c, { compact: true }),
    }))

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`${className ?? ""} cursor-help underline-offset-4 decoration-dotted hover:decoration-solid decoration-[var(--chidi-border-default)]`}>
            {formatted}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-[var(--card)] border border-[var(--chidi-border-default)] text-[var(--chidi-text-primary)] shadow-card-hover font-chidi-voice"
        >
          <div className="text-[11px] uppercase tracking-wide text-[var(--chidi-text-muted)] mb-1">
            Indicative
          </div>
          <div className="space-y-0.5 text-sm">
            {others.map((o) => (
              <div key={o.code} className="flex items-center justify-between gap-3 tabular-nums">
                <span className="text-[var(--chidi-text-muted)]">{o.code}</span>
                <span>{o.converted}</span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
