"use client"

import { useMemo } from "react"
import { Check } from "lucide-react"
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
 * BusinessAvatarPicker — choose the business workspace avatar.
 *
 * Four tiles total: 1 default (derived from business name) + 3 alternative
 * variants. Same monogram letter on every tile so the merchant reads them as
 * "same shop, different mark", not four random shops. Picking the default
 * again calls onSelect(null) to clear the stored preference.
 *
 * Why only 4: more options = more decision fatigue. Three alternates is enough
 * for "I don't like the default → here's a small ranked menu of options".
 */
export function BusinessAvatarPicker({
  businessName,
  selectedSeed = null,
  onSelect,
  className,
}: BusinessAvatarPickerProps) {
  // Three stable alternate seeds derived from the business name. Same name
  // always produces the same three alternates — no shuffle, no surprise.
  const variants = useMemo(() => {
    return Array.from({ length: 3 }).map((_, i) => ({
      seed: `${businessName}::look::${i + 1}`,
    }))
  }, [businessName])

  const isDefault = !selectedSeed

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--chidi-text-muted)]">
        Pick a look
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
      different letter per tile (which would feel like 4 different shops). */
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
        className="w-full h-full rounded-xl"
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
