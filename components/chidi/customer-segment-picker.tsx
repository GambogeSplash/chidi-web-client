"use client"

/**
 * CustomerSegmentPicker — horizontally-scrollable chip strip for swapping the
 * active segment on the customers page. Each chip carries its count badge and
 * a tiny overflow trigger ("…") that fires the parent's onBroadcast callback
 * for "Broadcast to this segment".
 *
 * Pure controlled component — owns no state, just emits intent. The parent
 * persists the active id to the URL so deep-links land on the right slice.
 */

import { useRef } from "react"
import { MoreHorizontal, Send } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { Segment, SegmentId } from "@/lib/chidi/segments"

interface CustomerSegmentPickerProps {
  segments: Segment[]
  active: SegmentId
  onChange: (id: SegmentId) => void
  /**
   * Called with the segment when the merchant picks "Broadcast to this
   * segment" from the overflow. The picker doesn't open the composer
   * itself — the page does, so the page can pass the right audience.
   */
  onBroadcast?: (segment: Segment) => void
  className?: string
}

export function CustomerSegmentPicker({
  segments,
  active,
  onChange,
  onBroadcast,
  className,
}: CustomerSegmentPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={scrollRef}
      className={cn(
        "flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1",
        className,
      )}
      role="tablist"
      aria-label="Customer segments"
    >
      {segments.map((seg) => {
        const isActive = seg.id === active
        const isChannel = seg.id.startsWith("channel-")
        return (
          <div
            key={seg.id}
            className={cn(
              "group inline-flex items-stretch rounded-full border transition-colors flex-shrink-0",
              isActive
                ? "border-[var(--chidi-text-primary)] bg-[var(--chidi-text-primary)] text-[var(--background)]"
                : "border-[var(--chidi-border-default)] bg-[var(--card)] text-[var(--chidi-text-secondary)] hover:border-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)]",
            )}
          >
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(seg.id)}
              title={seg.hint}
              className={cn(
                "inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 text-[12px] font-medium font-chidi-voice rounded-l-full",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-win)]/40",
                isChannel && !isActive && "italic",
              )}
            >
              <span className="leading-none">{seg.label}</span>
              <span
                className={cn(
                  "tabular-nums text-[10px] px-1.5 py-0.5 rounded-full",
                  isActive
                    ? "bg-[var(--background)]/15 text-[var(--background)]"
                    : "bg-[var(--chidi-surface)] text-[var(--chidi-text-muted)]",
                )}
              >
                {seg.count}
              </span>
            </button>
            {onBroadcast && seg.count > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`More for ${seg.label}`}
                    className={cn(
                      "inline-flex items-center justify-center pr-2 pl-1 rounded-r-full border-l",
                      isActive
                        ? "border-[var(--background)]/20 hover:bg-[var(--background)]/10"
                        : "border-[var(--chidi-border-subtle)] hover:bg-[var(--chidi-surface)]",
                    )}
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[var(--card)]">
                  <DropdownMenuItem
                    onSelect={() => onBroadcast(seg)}
                    className="text-[13px] font-chidi-voice cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 mr-2" strokeWidth={1.8} />
                    Broadcast to this segment
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )
      })}
    </div>
  )
}
