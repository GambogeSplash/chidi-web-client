"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Package,
  CreditCard,
  FileText,
  MessageCircle,
  Check,
  ChevronRight,
  ChevronDown,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useFirstTimeHint } from "@/lib/hooks/use-first-time-hint"
import { useConnections } from "@/lib/hooks/use-messaging"
import { usePaymentSettings } from "@/lib/hooks/use-settings"
import { usePolicies } from "@/lib/hooks/use-policies"
import type { TabId } from "@/components/chidi/bottom-navigation"
import type { DisplayProduct } from "@/lib/types/product"

interface SetupChecklistProps {
  businessId: string | null
  businessSlug?: string
  products: DisplayProduct[]
  setActiveTab: (tab: TabId) => void
  onAddProduct: () => void
}

interface ChecklistItem {
  id: string
  title: string
  icon: React.ElementType
  isComplete: boolean
  action: () => void
}

export function SetupChecklist({
  businessId,
  businessSlug,
  products,
  setActiveTab,
  onAddProduct,
}: SetupChecklistProps) {
  const router = useRouter()
  const { shouldShow, dismiss } = useFirstTimeHint("setup_checklist")
  const [isExpanded, setIsExpanded] = useState(false)

  const { data: connections } = useConnections()
  const { data: paymentSettings } = usePaymentSettings(businessId)
  const { data: policies } = usePolicies(businessId)

  const hasProducts = products.length > 0
  const hasConnections = (connections?.total ?? 0) > 0
  const hasPaymentSettings = !!(
    paymentSettings?.bank_name || paymentSettings?.account_number
  )
  const hasPolicies = (policies?.length ?? 0) > 0

  const items: ChecklistItem[] = [
    {
      id: "products",
      title: "Add products",
      icon: Package,
      isComplete: hasProducts,
      action: () => {
        setActiveTab("inventory")
        onAddProduct()
      },
    },
    {
      id: "channel",
      title: "Connect channel",
      icon: MessageCircle,
      isComplete: hasConnections,
      action: () => {
        setActiveTab("inbox")
      },
    },
    {
      id: "payment",
      title: "Payment details",
      icon: CreditCard,
      isComplete: hasPaymentSettings,
      action: () => {
        router.push(`/dashboard/${businessSlug}/settings?section=payment`)
      },
    },
    {
      id: "policies",
      title: "Business policies",
      icon: FileText,
      isComplete: hasPolicies,
      action: () => {
        router.push(`/dashboard/${businessSlug}/settings?section=ai`)
      },
    },
  ]

  const completedCount = items.filter((item) => item.isComplete).length
  const allComplete = completedCount === items.length
  const nextIncomplete = items.find((item) => !item.isComplete)

  if (!shouldShow || allComplete) {
    return null
  }

  return (
    <div className="mx-4 mb-3">
      <div className="bg-[var(--chidi-surface)] rounded-xl border border-[var(--chidi-border-subtle)] overflow-hidden">
        {/* Compact header - always visible */}
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Progress dots */}
          <div className="flex items-center gap-1">
            {items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  item.isComplete
                    ? "bg-green-500"
                    : "bg-[var(--chidi-border-default)]"
                )}
              />
            ))}
          </div>

          {/* Next action button */}
          {nextIncomplete && (
            <button
              onClick={nextIncomplete.action}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--chidi-accent)] hover:underline"
            >
              <nextIncomplete.icon className="w-3 h-3" />
              {nextIncomplete.title}
            </button>
          )}

          <div className="flex-1" />

          {/* Expand/collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-[var(--chidi-border-subtle)] transition-colors"
          >
            <ChevronDown
              className={cn(
                "w-4 h-4 text-[var(--chidi-text-muted)] transition-transform",
                isExpanded && "rotate-180"
              )}
            />
          </button>

          {/* Dismiss */}
          <button
            onClick={dismiss}
            className="p-1 rounded hover:bg-[var(--chidi-border-subtle)] transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-[var(--chidi-text-muted)]" />
          </button>
        </div>

        {/* Expanded checklist */}
        {isExpanded && (
          <div className="px-3 pb-3 pt-1 border-t border-[var(--chidi-border-subtle)]">
            <div className="grid grid-cols-2 gap-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={item.action}
                  disabled={item.isComplete}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors",
                    item.isComplete
                      ? "text-[var(--chidi-text-muted)]"
                      : "text-[var(--chidi-text-primary)] hover:bg-white"
                  )}
                >
                  {item.isComplete ? (
                    <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  ) : (
                    <item.icon className="w-3.5 h-3.5 text-[var(--chidi-text-muted)] flex-shrink-0" />
                  )}
                  <span className={item.isComplete ? "line-through" : ""}>
                    {item.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
