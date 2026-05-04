"use client"

/**
 * CopilotAttachments — chip rail + uploader for the Ask-Chidi input.
 *
 * Renders ABOVE the input bar. Each chip:
 *   - image attachments → 48×48 thumbnail
 *   - PDF / CSV         → file glyph + label
 *   - filename · size · X-to-remove
 *
 * The paperclip button + hidden file input live in `CopilotAttachButton`,
 * also exported here so copilot-view.tsx can drop it into the input chrome
 * without owning any of the file-picker plumbing itself.
 *
 * Drag-and-drop is wired by the host (we just expose the helpers from
 * lib/chidi/copilot-attachments.ts) so it can attach drop handlers at the
 * outer form / input wrapper level.
 */

import { useRef } from "react"
import { Paperclip, X, FileText, FileSpreadsheet } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  ACCEPT_ATTR,
  formatBytes,
  type CopilotAttachment,
} from "@/lib/chidi/copilot-attachments"

// =========================================================================
// AttachmentChips — the row of chips above the input
// =========================================================================

interface AttachmentChipsProps {
  attachments: CopilotAttachment[]
  onRemove: (id: string) => void
  className?: string
}

export function AttachmentChips({
  attachments,
  onRemove,
  className,
}: AttachmentChipsProps) {
  if (attachments.length === 0) return null
  return (
    <ul
      className={cn(
        "flex flex-wrap items-center gap-2 mb-2",
        className,
      )}
      aria-label="Attachments"
    >
      {attachments.map((att) => (
        <li
          key={att.id}
          className={cn(
            "group inline-flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-lg",
            "bg-white border border-[var(--chidi-border-subtle)]",
            "text-[12px] font-chidi-voice text-[var(--chidi-text-primary)]",
            "shadow-[0_1px_3px_-1px_rgba(0,0,0,0.05)]",
            "motion-safe:animate-[chidiAttachIn_220ms_ease-out]",
          )}
        >
          {att.kind === "image" ? (
            // Next/Image won't accept arbitrary data URLs, so use a plain <img>.
            // 48×48, rounded corners. eslint-disable for the @next/next/no-img-element rule.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={att.dataUrl}
              alt={att.name}
              className="w-12 h-12 rounded-md object-cover flex-shrink-0"
            />
          ) : (
            <span
              className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0",
                "bg-[var(--chidi-surface)] text-[var(--chidi-text-secondary)]",
              )}
              aria-hidden
            >
              {att.kind === "pdf" ? (
                <FileText className="w-4 h-4" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
            </span>
          )}

          <span className="flex flex-col leading-tight min-w-0 max-w-[160px]">
            <span className="truncate text-[var(--chidi-text-primary)] font-medium">
              {att.name}
            </span>
            <span className="text-[10px] text-[var(--chidi-text-muted)] tabular-nums">
              {formatBytes(att.size)}
            </span>
          </span>

          <button
            type="button"
            onClick={() => onRemove(att.id)}
            aria-label={`Remove ${att.name}`}
            title="Remove"
            className={cn(
              "flex-shrink-0 ml-1 p-1 rounded-md",
              "text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)]",
              "hover:bg-[var(--chidi-surface)] transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-text-primary)]/40",
            )}
          >
            <X className="w-3 h-3" strokeWidth={2.5} />
          </button>
        </li>
      ))}
      <style jsx>{`
        @keyframes chidiAttachIn {
          from {
            opacity: 0;
            transform: translateY(2px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          li {
            animation: none !important;
          }
        }
      `}</style>
    </ul>
  )
}

// =========================================================================
// CopilotAttachButton — paperclip glyph + hidden <input type="file">
// =========================================================================

interface CopilotAttachButtonProps {
  onFiles: (files: FileList) => void
  disabled?: boolean
  /** Visual size — matches the surrounding glyph buttons in the input bar. */
  size?: "sm" | "md"
  className?: string
}

export function CopilotAttachButton({
  onFiles,
  disabled,
  size = "md",
  className,
}: CopilotAttachButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    if (disabled) return
    inputRef.current?.click()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFiles(files)
    }
    // Reset so picking the same file again still fires onChange.
    e.target.value = ""
  }

  const dim = size === "sm" ? "h-8 w-8" : "h-9 w-9"
  const icon = size === "sm" ? "w-4 h-4" : "w-[18px] h-[18px]"

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label="Attach a file"
        title="Attach a file"
        className={cn(
          dim,
          "inline-flex items-center justify-center rounded-lg",
          "text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)]",
          "hover:bg-[var(--chidi-surface)] transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-text-primary)]/40",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          className,
        )}
      >
        <Paperclip className={icon} strokeWidth={2} />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        onChange={handleChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
    </>
  )
}
