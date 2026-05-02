"use client"

import { useEffect, useRef, useState, KeyboardEvent } from "react"
import { cn } from "@/lib/utils"

interface EditableCellProps {
  value: string | number
  onCommit: (next: string) => Promise<void> | void
  /** Visual prefix (e.g. currency symbol). Editable area excludes it. */
  prefix?: string
  /** Visual suffix (e.g. " units"). Editable area excludes it. */
  suffix?: string
  /** "decimal" for prices, "numeric" for whole stock counts */
  inputMode?: "decimal" | "numeric"
  className?: string
  align?: "left" | "right"
  /** Tooltip on hover when not yet editing */
  hint?: string
}

/**
 * Inline editable cell. Click to edit, Enter or blur to commit, Escape to
 * cancel. Used in the inventory list view for price + stock so the merchant
 * doesn't have to open a modal to change a number.
 */
export function EditableCell({
  value,
  onCommit,
  prefix,
  suffix,
  inputMode = "numeric",
  className,
  align = "right",
  hint,
}: EditableCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  useEffect(() => {
    if (!editing) setDraft(String(value))
  }, [value, editing])

  const start = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditing(true)
  }

  const cancel = () => {
    setDraft(String(value))
    setEditing(false)
  }

  const commit = async () => {
    if (draft === String(value)) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onCommit(draft)
      setEditing(false)
    } catch {
      // Roll back on error
      setDraft(String(value))
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      commit()
    } else if (e.key === "Escape") {
      e.preventDefault()
      cancel()
    }
  }

  if (editing) {
    return (
      <span className={cn("inline-flex items-center", className)}>
        {prefix && <span className="text-[var(--chidi-text-muted)] tabular-nums mr-0.5">{prefix}</span>}
        <input
          ref={inputRef}
          inputMode={inputMode}
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(inputMode === "numeric" ? /[^0-9]/g : /[^0-9.]/g, ""))}
          onKeyDown={handleKey}
          onBlur={commit}
          onClick={(e) => e.stopPropagation()}
          disabled={saving}
          className={cn(
            "bg-white border border-[var(--chidi-win)] rounded px-1.5 py-0.5 text-sm tabular-nums outline-none w-full max-w-[80px]",
            align === "right" && "text-right",
          )}
        />
        {suffix && <span className="text-[var(--chidi-text-muted)] tabular-nums ml-0.5">{suffix}</span>}
      </span>
    )
  }

  return (
    <button
      onClick={start}
      title={hint ?? "Click to edit"}
      className={cn(
        "inline-flex items-baseline tabular-nums px-1 -mx-1 rounded hover:bg-[var(--chidi-win-soft)] hover:ring-1 hover:ring-[var(--chidi-win)]/30 transition-colors cursor-text active:scale-[0.97]",
        className,
      )}
    >
      {prefix && <span className="text-[var(--chidi-text-muted)] mr-0.5">{prefix}</span>}
      <span>{value}</span>
      {suffix && <span className="text-[var(--chidi-text-muted)] ml-0.5">{suffix}</span>}
    </button>
  )
}
