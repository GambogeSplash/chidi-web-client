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
 * The picker shows the default + 11 seeded variants, plus a "Shuffle"
 * button that generates a fresh row of 12 alternatives.
 *
 * Selecting a variant calls onSelect(seed); selecting the default again
 * calls onSelect(null) to clear the preference.
 *
 * Usage in Settings → Profile (or onboarding step):
 *   <BusinessAvatarPicker
 *     businessName={businessName}
 *     selectedSeed={user.avatarSeed}
 *     onSelect={(seed) => updateUser({ avatarSeed: seed })}
 *   />
 */
export function BusinessAvatarPicker({
  businessName,
  selectedSeed = null,
  onSelect,
  className,
}: BusinessAvatarPickerProps) {
  // Round-trip counter — clicking Shuffle bumps it, recomputing the variants
  const [shuffleCount, setShuffleCount] = useState(0)

  // 11 alternative seeds derived from the business name + a salt bumped
  // each time Shuffle is pressed. Variant indices are stable within a
  // shuffle round so the user can confidently pick #4.
  const variants = useMemo(() => {
    return Array.from({ length: 11 }).map((_, i) => ({
      seed: `${businessName}::v${shuffleCount}::${i}`,
    }))
  }, [businessName, shuffleCount])

  const isDefault = !selectedSeed
  const handleShuffle = () => setShuffleCount((c) => c + 1)

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--chidi-text-muted)]">
          Pick your shop avatar
        </p>
        <button
          type="button"
          onClick={handleShuffle}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] transition-colors"
        >
          <Shuffle className="w-3 h-3" />
          Shuffle
        </button>
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-6 gap-2">
        {/* Default — derived from business name */}
        <SelectableAvatar
          seed={businessName}
          selected={isDefault}
          label="Default"
          onClick={() => onSelect(null)}
        />
        {variants.map((v) => (
          <SelectableAvatar
            key={v.seed}
            seed={v.seed}
            selected={selectedSeed === v.seed}
            onClick={() => onSelect(v.seed)}
          />
        ))}
      </div>

      <p className="text-[11px] text-[var(--chidi-text-muted)]">
        This shows in your sidebar, on receipts, and in customer chats.
      </p>
    </div>
  )
}

function SelectableAvatar({
  seed,
  selected,
  label,
  onClick,
}: {
  seed: string
  selected: boolean
  label?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label ?? seed}
      className={cn(
        "relative aspect-square rounded-xl overflow-hidden transition-all active:scale-[0.96]",
        selected
          ? "ring-2 ring-[var(--chidi-win)] ring-offset-2 ring-offset-[var(--card)]"
          : "ring-1 ring-[var(--chidi-border-subtle)] hover:ring-[var(--chidi-border-default)] hover:scale-[1.02]",
      )}
    >
      <BusinessAvatar name={seed} size="lg" className="w-full h-full" />
      {selected && (
        <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[var(--chidi-win)] flex items-center justify-center shadow-sm">
          <Check className="w-2.5 h-2.5 text-[var(--chidi-win-foreground)]" strokeWidth={3} />
        </span>
      )}
      {label && (
        <span className="absolute bottom-1 left-1 right-1 text-[8px] font-medium uppercase tracking-wider text-white/85 bg-black/40 backdrop-blur-sm rounded px-1 py-0.5 text-center">
          {label}
        </span>
      )}
    </button>
  )
}
