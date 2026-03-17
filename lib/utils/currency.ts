/**
 * Currency utilities for multi-currency support.
 * 
 * Supports Nigerian Naira (NGN), Ghanaian Cedi (GHS), and Kenyan Shilling (KES)
 * for Chidi's target markets: Lagos, Accra, and Nairobi.
 */

export interface CurrencyInfo {
  code: string
  symbol: string
  name: string
  localeName: string
  locale: string
}

/**
 * Supported currencies for African markets
 */
export const CURRENCIES: Record<string, CurrencyInfo> = {
  NGN: {
    code: 'NGN',
    symbol: '₦',
    name: 'Nigerian Naira',
    localeName: 'Naira',
    locale: 'en-NG',
  },
  GHS: {
    code: 'GHS',
    symbol: 'GH₵',
    name: 'Ghanaian Cedi',
    localeName: 'Cedis',
    locale: 'en-GH',
  },
  KES: {
    code: 'KES',
    symbol: 'KSh',
    name: 'Kenyan Shilling',
    localeName: 'Shillings',
    locale: 'en-KE',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    localeName: 'Dollars',
    locale: 'en-US',
  },
}

export const DEFAULT_CURRENCY = 'NGN'

/**
 * Get currency information for a given currency code
 */
export function getCurrencyInfo(currencyCode: string): CurrencyInfo {
  return CURRENCIES[currencyCode?.toUpperCase()] || CURRENCIES[DEFAULT_CURRENCY]
}

/**
 * Get the symbol for a currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  return getCurrencyInfo(currencyCode).symbol
}

/**
 * Format a monetary amount with the appropriate currency symbol
 * 
 * @param amount - The monetary amount to format
 * @param currencyCode - ISO 4217 currency code (e.g., "NGN", "GHS", "KES")
 * @param options - Formatting options
 * @returns Formatted currency string (e.g., "₦1,200,000" or "GH₵1,200,000")
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = DEFAULT_CURRENCY,
  options: {
    compact?: boolean
    showDecimal?: boolean
  } = {}
): string {
  const { compact = false, showDecimal = false } = options
  const info = getCurrencyInfo(currencyCode)

  if (compact && Math.abs(amount) >= 1_000_000) {
    const value = amount / 1_000_000
    const formatted = value === Math.floor(value) 
      ? `${Math.floor(value)}M` 
      : `${value.toFixed(1).replace(/\.0$/, '')}M`
    return `${info.symbol}${formatted}`
  }
  
  if (compact && Math.abs(amount) >= 1_000) {
    const value = amount / 1_000
    const formatted = value === Math.floor(value) 
      ? `${Math.floor(value)}K` 
      : `${value.toFixed(1).replace(/\.0$/, '')}K`
    return `${info.symbol}${formatted}`
  }

  try {
    return new Intl.NumberFormat(info.locale, {
      style: 'currency',
      currency: info.code,
      minimumFractionDigits: showDecimal ? 2 : 0,
      maximumFractionDigits: showDecimal ? 2 : 0,
    }).format(amount)
  } catch {
    // Fallback for unsupported currencies in Intl
    const formatted = amount.toLocaleString(info.locale, {
      minimumFractionDigits: showDecimal ? 2 : 0,
      maximumFractionDigits: showDecimal ? 2 : 0,
    })
    return `${info.symbol}${formatted}`
  }
}

/**
 * Format a currency amount in compact notation
 */
export function formatCurrencyCompact(
  amount: number,
  currencyCode: string = DEFAULT_CURRENCY
): string {
  return formatCurrency(amount, currencyCode, { compact: true })
}

/**
 * Parse a currency string to number (removes currency symbols and commas)
 */
export function parseCurrency(priceString: string): number {
  // Remove all known currency symbols and whitespace
  const cleaned = priceString.replace(/[₦$GH₵KSh,\s]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Check if a currency code is supported
 */
export function isSupportedCurrency(currencyCode: string): boolean {
  return currencyCode?.toUpperCase() in CURRENCIES
}

/**
 * Get all supported currency options for select dropdowns
 */
export function getCurrencyOptions(): Array<{ value: string; label: string }> {
  return Object.values(CURRENCIES).map((currency) => ({
    value: currency.code,
    label: `${currency.symbol} ${currency.name}`,
  }))
}
