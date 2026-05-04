"use client"

import { useEffect, useMemo, useState } from "react"
import { ArcFace } from "./arc-face"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  applyBoosts,
  clearBoost,
  countActive,
  getBoosts,
  setBoost,
  subscribe,
  type BoostRecord,
} from "@/lib/chidi/boosts"

interface BoostsPanelProps {
  customerId: string
  customerName?: string | null
  /** Optional active order id — used for the order-ref toggle preview. */
  orderRef?: string | null
  /**
   * Render a child trigger instead of the default Sparkles button. Use
   * `asChild` semantics: the child becomes the popover trigger.
   */
  trigger?: React.ReactNode
  /** Called any time the active count changes — lets the parent re-render the chip. */
  onActiveChange?: (count: number) => void
}

/**
 * BoostsPanel — the per-customer template editor.
 *
 * Triggered from the chat input toolbar via a Sparkles button. Inside, the
 * merchant edits three free-text wrappers (signature / autoPrepend /
 * autoAppend) and a single toggle (alwaysIncludeOrderRef). Every change
 * persists on blur — there's no submit button. A live preview at the
 * bottom shows what the next message will look like once boosts wrap it.
 */
export function BoostsPanel({
  customerId,
  customerName,
  orderRef,
  trigger,
  onActiveChange,
}: BoostsPanelProps) {
  const [open, setOpen] = useState(false)
  const [record, setRecord] = useState<BoostRecord | null>(() =>
    getBoosts(customerId),
  )

  // Local working copy so the textareas stay editable without thrashing
  // localStorage on every keystroke. Persisted on blur.
  const [signature, setSignature] = useState(record?.signature ?? "")
  const [autoPrepend, setAutoPrepend] = useState(record?.autoPrepend ?? "")
  const [autoAppend, setAutoAppend] = useState(record?.autoAppend ?? "")
  const [includeOrderRef, setIncludeOrderRef] = useState<boolean>(
    !!record?.alwaysIncludeOrderRef,
  )

  // Sync to store changes from elsewhere (other tabs, programmatic clears).
  useEffect(() => {
    const off = subscribe(() => {
      const fresh = getBoosts(customerId)
      setRecord(fresh)
      setSignature(fresh?.signature ?? "")
      setAutoPrepend(fresh?.autoPrepend ?? "")
      setAutoAppend(fresh?.autoAppend ?? "")
      setIncludeOrderRef(!!fresh?.alwaysIncludeOrderRef)
    })
    return off
  }, [customerId])

  // Reset working copy when the customer changes (chat switched).
  useEffect(() => {
    const fresh = getBoosts(customerId)
    setRecord(fresh)
    setSignature(fresh?.signature ?? "")
    setAutoPrepend(fresh?.autoPrepend ?? "")
    setAutoAppend(fresh?.autoAppend ?? "")
    setIncludeOrderRef(!!fresh?.alwaysIncludeOrderRef)
  }, [customerId])

  const activeCount = countActive(record)
  useEffect(() => {
    onActiveChange?.(activeCount)
  }, [activeCount, onActiveChange])

  const firstName = useMemo(() => {
    return (customerName ?? "").trim().split(/\s+/)[0] ?? ""
  }, [customerName])

  const previewSample = useMemo(() => {
    const draft = "Yes, that's available — let me know your address."
    // Build a transient record from the working copy so the preview
    // updates as the merchant types, not just on blur.
    const transient: BoostRecord = {
      signature: signature || undefined,
      autoPrepend: autoPrepend || undefined,
      autoAppend: autoAppend || undefined,
      alwaysIncludeOrderRef: includeOrderRef,
      updatedAt: new Date().toISOString(),
    }
    if (countActive(transient) === 0) return draft
    // Use a tiny inline applier mirroring applyBoosts but reading the
    // transient record so we don't have to round-trip through storage.
    const fill = (s: string | undefined) =>
      (s ?? "").replace(/\{first_name\}/gi, firstName).trim()
    const orderLine =
      transient.alwaysIncludeOrderRef && orderRef
        ? `Re: order #${orderRef.slice(-6).toUpperCase()}`
        : ""
    const body = orderLine ? `${draft}\n${orderLine}` : draft
    return [
      fill(transient.autoPrepend),
      body,
      fill(transient.autoAppend),
      fill(transient.signature),
    ]
      .filter((s) => s.length > 0)
      .join("\n\n")
  }, [signature, autoPrepend, autoAppend, includeOrderRef, firstName, orderRef])

  const persist = (
    patch: Partial<Pick<BoostRecord, "signature" | "autoPrepend" | "autoAppend" | "alwaysIncludeOrderRef">>,
  ) => {
    const next = setBoost(customerId, patch)
    setRecord(next)
  }

  const handleClearAll = () => {
    clearBoost(customerId)
    setRecord(null)
    setSignature("")
    setAutoPrepend("")
    setAutoAppend("")
    setIncludeOrderRef(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            aria-label={
              activeCount > 0
                ? `${activeCount} boosts active for this customer`
                : "Open boosts for this customer"
            }
            className={cn(
              "relative inline-flex items-center justify-center h-9 w-9 rounded-md transition-colors",
              "text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)]",
              activeCount > 0 && "text-[var(--chidi-win)]",
            )}
          >
            <ArcFace size={16} className="text-current" />
            {activeCount > 0 && (
              <span
                aria-hidden
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--chidi-win)] ring-2 ring-white"
              />
            )}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[340px] p-0 bg-white border-[var(--chidi-border-subtle)] shadow-lg"
      >
        <div className="px-4 pt-3.5 pb-2 border-b border-[var(--chidi-border-subtle)]">
          <div className="flex items-center gap-2">
            <ArcFace size={14} className="text-[var(--chidi-win)]" />
            <p className="text-[13px] font-medium text-[var(--chidi-text-primary)]">
              Boosts for {firstName || "this customer"}
            </p>
          </div>
          <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice mt-0.5">
            Auto-wrap every reply to {firstName || "them"} with your house style.
          </p>
        </div>

        <div className="px-4 py-3 space-y-3">
          <Field label="Auto-prepend" hint="Goes above your reply.">
            <Textarea
              value={autoPrepend}
              onChange={(e) => setAutoPrepend(e.target.value)}
              onBlur={() => persist({ autoPrepend })}
              placeholder="Hi {first_name},"
              rows={2}
              className="resize-none text-[13px] font-chidi-voice bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)] focus-visible:ring-[var(--chidi-win)]/30"
            />
          </Field>

          <Field label="Auto-append" hint="Goes below your reply.">
            <Textarea
              value={autoAppend}
              onChange={(e) => setAutoAppend(e.target.value)}
              onBlur={() => persist({ autoAppend })}
              placeholder="Have a great day!"
              rows={2}
              className="resize-none text-[13px] font-chidi-voice bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)] focus-visible:ring-[var(--chidi-win)]/30"
            />
          </Field>

          <Field label="Signature" hint="Last line of every reply.">
            <Textarea
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              onBlur={() => persist({ signature })}
              placeholder="— Demo's Shop"
              rows={1}
              className="resize-none text-[13px] font-chidi-voice bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)] focus-visible:ring-[var(--chidi-win)]/30"
            />
          </Field>

          <label className="flex items-center justify-between gap-3 pt-1 cursor-pointer">
            <span className="flex-1 min-w-0">
              <span className="block text-[12px] font-medium text-[var(--chidi-text-primary)]">
                Always include order ref
              </span>
              <span className="block text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice leading-snug">
                When there's an active order, append the order number.
              </span>
            </span>
            <Switch
              checked={includeOrderRef}
              onCheckedChange={(v) => {
                setIncludeOrderRef(v)
                persist({ alwaysIncludeOrderRef: v })
              }}
            />
          </label>
        </div>

        <div className="px-4 pb-3">
          <p className="text-[10px] uppercase tracking-wide text-[var(--chidi-text-muted)] font-chidi-voice mb-1.5">
            Preview
          </p>
          <div
            className={cn(
              "rounded-md px-2.5 py-2 text-[13px] leading-snug whitespace-pre-wrap",
              "bg-[var(--chidi-channel-whatsapp-bubble)] text-[var(--chidi-channel-whatsapp-bubble-text)]",
              "max-h-32 overflow-y-auto",
            )}
          >
            {previewSample}
          </div>
        </div>

        <div className="px-4 py-2 border-t border-[var(--chidi-border-subtle)] flex items-center justify-between">
          <span className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice">
            {activeCount > 0
              ? `${activeCount} boost${activeCount === 1 ? "" : "s"} active`
              : "No boosts yet"}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            disabled={activeCount === 0}
            className="h-7 px-2 text-[11px] text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] font-chidi-voice"
          >
            Clear all boosts
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-medium text-[var(--chidi-text-secondary)] uppercase tracking-wide">
          {label}
        </span>
        {hint && (
          <span className="text-[10px] text-[var(--chidi-text-muted)] font-chidi-voice">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

// Re-export applyBoosts so callers that already import BoostsPanel can grab
// the wrapping helper without a second import line.
export { applyBoosts }
