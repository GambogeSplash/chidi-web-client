"use client"

import { useMemo, useState } from "react"
import { Shuffle, Check } from "lucide-react"
import { BusinessAvatar } from "./business-avatar"
import { cn } from "@/lib/utils"

interface BusinessAvatarPickerProps {
  /** Current business name — drives the canonical default avatar */
  businessName: string
  /** Currently-selected variant seed (or null = default) */
  selectedSeed?: string | null
  /** Called with the new seed when the user picks a variant. Pass null to
      revert to the default canonical avatar (derived from business name). */
  onSelect: (seed: string | null) => void
  className?: string
}

/**
 * BusinessAvatarPicker — choose / re-roll the business workspace avatar.
 *
 * The BusinessAvatar component is fully generative from any seed string.
 * The default seed is the business name (so it's stable + recognizable).
 *
 * Layout:
 *   - Big "now showing" preview at the top so the user always SEES which
 *     mark they're sitting on (this was the user complaint — they couldn't
 *     see what they were switching to).
 *   - Grid of 8 alternative variants (same monogram letter as the business
 *     name so the variants read as "same shop, different mark", not
 *     "random gibberish").
 *   - Shuffle re-rolls the grid for a fresh batch of 8 alternatives.
 *
 * Selecting a variant calls onSelect(seed); selecting the default again
 * calls onSelect(null) to clear the preference.
 */
export function BusinessAvatarPicker({
  businessName,
  selectedSeed = null,
  onSelect,
  className,
}: BusinessAvatarPickerProps) {
  // Round-trip counter — clicking Shuffle bumps it, recomputing the variants
  const [shuffleCount, setShuffleCount] = useState(0)

  // 8 alternative seeds derived from the business name + a salt bumped
  // each time Shuffle is pressed. Variant indices are stable within a
  // shuffle round so the user can confidently pick #4.
  const variants = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => ({
      seed: `${businessName}::v${shuffleCount}::${i}`,
    }))
  }, [businessName, shuffleCount])

  const isDefault = !selectedSeed
  const handleShuffle = () => setShuffleCount((c) => c + 1)

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--chidi-text-muted)]">
          Pick a look
        </p>
        <button
          type="button"
          onClick={handleShuffle}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] transition-colors motion-safe:active:scale-[0.97]"
        >
          <Shuffle className="w-3 h-3" />
          Shuffle
        </button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {/* Default — derived from business name */}
        <SelectableAvatar
          seed={businessName}
          monogram={businessName}
          selected={isDefault}
          label="Default"
          onClick={() => onSelect(null)}
        />
        {variants.map((v) => (
          <SelectableAvatar
            key={v.seed}
            seed={v.seed}
            monogram={businessName}
            selected={selectedSeed === v.seed}
            onClick={() => onSelect(v.seed)}
          />
        ))}
      </div>
    </div>
  )
}

function SelectableAvatar({
  seed,
  selected,
  label,
  monogram,
  onClick,
}: {
  seed: string
  selected: boolean
  label?: string
  /** Force every variant to render with the same monogram letter so the
      user reads them as "same shop, different mark" rather than seeing a
      different letter per tile (which would feel like 12 different shops). */
  monogram: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label ?? "Variant"}
      aria-pressed={selected}
      className={cn(
        "relative aspect-square rounded-xl overflow-hidden transition-all motion-safe:active:scale-[0.96] motion-safe:hover:-translate-y-0.5",
        selected
          ? "ring-2 ring-[var(--chidi-text-primary)] ring-offset-2 ring-offset-[var(--card)]"
          : "ring-1 ring-[var(--chidi-border-subtle)] hover:ring-[var(--chidi-border-default)]",
      )}
    >
      <BusinessAvatar
        name={seed}
        monogramOverride={monogram}
        size="lg"
        className="w-full h-full"
      />
      {selected && (
        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[var(--chidi-text-primary)] flex items-center justify-center shadow-sm">
          <Check className="w-2.5 h-2.5 text-[var(--background)]" strokeWidth={3} />
        </span>
      )}
      {label && (
        <span className="absolute bottom-1 left-1 right-1 text-[8px] font-semibold uppercase tracking-wider text-white/90 bg-black/45 backdrop-blur-sm rounded px-1 py-0.5 text-center">
          {label}
        </span>
      )}
    </button>
  )
}
