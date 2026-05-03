"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DetailPanelProps {
  open: boolean
  onClose: () => void
  /** Top eyebrow text (small caps) — e.g. "Order · ORD-1042" */
  eyebrow?: string
  /** The big title — Inter semibold 20px (matches ty-page-title) */
  title: ReactNode
  /** Optional subtitle next to the title */
  subtitle?: ReactNode
  /** Right side of the header row (status pill, actions, etc.) */
  headerActions?: ReactNode
  /** Sticky bottom action bar */
  footer?: ReactNode
  children: ReactNode
  /** Width on lg+. Default 480px. Pass "lg" for 640px wide panel. */
  width?: "default" | "lg" | "xl"
}

/**
 * DetailPanel — right-side slide-in sheet. The canonical surface for
 * "drill into one item" — replaces centered modals which max out at ~720px
 * and feel like dialogs, not workspaces.
 *
 * Used by Orders + Inventory: clicking a row slides the detail panel in
 * from the right. The list stays visible underneath so the merchant can
 * navigate to the next item without losing context.
 *
 * On mobile (< lg) the panel becomes a full-screen sheet that slides up
 * from the bottom — same animation language as iOS sheets.
 *
 * Composition:
 *   <DetailPanel
 *     open={!!selectedOrder}
 *     onClose={() => setSelectedOrder(null)}
 *     eyebrow="Order · ORD-1042"
 *     title={selectedOrder.customer_name}
 *     subtitle="Pending payment · 22h ago"
 *     headerActions={<StatusPill status={...} />}
 *     footer={<div>...action buttons...</div>}
 *   >
 *     ...the body content...
 *   </DetailPanel>
 */
export function DetailPanel({
  open,
  onClose,
  eyebrow,
  title,
  subtitle,
  headerActions,
  footer,
  children,
  width = "default",
}: DetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Esc closes
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return
    const orig = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = orig
    }
  }, [open])

  if (!open) return null

  const widthClass =
    width === "xl" ? "lg:w-[720px]" : width === "lg" ? "lg:w-[640px]" : "lg:w-[480px]"

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[140]">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px] animate-[detailPanelFadeIn_180ms_ease-out]"
      />

      {/* Panel — slides up from bottom on mobile, slides in from right on desktop */}
      <div
        ref={panelRef}
        className={cn(
          "absolute bg-[var(--card)] border-[var(--chidi-border-default)] shadow-[-20px_0_60px_-20px_rgba(0,0,0,0.25)]",
          // Mobile: full-screen sheet rising from bottom (with safe top inset)
          "inset-x-0 bottom-0 top-12 rounded-t-2xl border-t animate-[detailPanelSlideUp_280ms_cubic-bezier(0.22,1,0.36,1)]",
          // Desktop: right-anchored panel
          "lg:inset-y-0 lg:right-0 lg:top-0 lg:bottom-0 lg:left-auto",
          "lg:rounded-none lg:border-t-0 lg:border-l",
          "lg:animate-[detailPanelSlideIn_280ms_cubic-bezier(0.22,1,0.36,1)]",
          widthClass,
          "flex flex-col",
        )}
      >
        {/* Header */}
        <header className="flex items-start gap-3 px-5 lg:px-6 pt-5 pb-4 border-b border-[var(--chidi-border-subtle)]">
          <div className="flex-1 min-w-0">
            {eyebrow && (
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold mb-1">
                {eyebrow}
              </p>
            )}
            <h2 className="ty-page-title text-[var(--chidi-text-primary)]">{title}</h2>
            {subtitle && (
              <p className="text-[13px] text-[var(--chidi-text-secondary)] mt-1 leading-snug">
                {subtitle}
              </p>
            )}
          </div>
          {headerActions && <div className="flex-shrink-0 mt-1">{headerActions}</div>}
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex-shrink-0 p-2 -mr-2 -mt-1 rounded-md text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 lg:px-6 py-5">{children}</div>

        {/* Footer (sticky action bar) */}
        {footer && (
          <footer className="px-5 lg:px-6 py-3 border-t border-[var(--chidi-border-subtle)] bg-[var(--card)]">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
