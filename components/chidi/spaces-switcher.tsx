"use client"

/**
 * SpacesSwitcher — multi-business workspace switcher.
 *
 * Two surface modes:
 *   - desktop: a Popover anchored to the workspace card in the nav rail
 *   - mobile:  the SAME content rendered inside a bottom Sheet, opened by
 *              the AppHeader's identity block
 *
 * The trigger is the merchant's CHOICE (the consumers below decide where to
 * put it). This module just exports two small primitives:
 *
 *   <SpacesSwitcherList />   — the body (rows + footer actions)
 *   <AddSpaceForm />         — the new-shop form, used by both surfaces
 *
 * Both desktop and mobile dispatch chidi:space-switched + chidi:accent-changed
 * via the helpers in lib/chidi/spaces.ts. Click-outside / Esc / focus trap is
 * handled by the underlying Popover + Sheet primitives.
 */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Plus, Settings as SettingsIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { BusinessAvatar } from "./business-avatar"
import {
  addSpace,
  getActiveSpaceId,
  listSpaces,
  setActiveSpaceId,
  SPACE_ACCENTS,
  subscribe,
  type Space,
} from "@/lib/chidi/spaces"

interface SpacesSwitcherListProps {
  /** Called after a successful switch so the consumer can close its container. */
  onSwitched?: () => void
  /** Called when the user wants to dismiss (e.g. Escape, footer cancel). */
  onDismiss?: () => void
}

/**
 * The rows + footer body. Renders identically inside a Popover (desktop)
 * or a Sheet (mobile). All real state lives in lib/chidi/spaces.ts.
 */
export function SpacesSwitcherList({ onSwitched, onDismiss }: SpacesSwitcherListProps) {
  const router = useRouter()
  const [spaces, setSpaces] = useState<Space[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    setSpaces(listSpaces())
    setActiveId(getActiveSpaceId())
    return subscribe((next) => {
      setSpaces(next)
    })
  }, [])

  const handleSwitch = (space: Space) => {
    if (space.id === activeId) {
      onSwitched?.()
      return
    }
    setActiveSpaceId(space.id)
    setActiveId(space.id)
    router.push(`/dashboard/${space.slug}`)
    onSwitched?.()
  }

  const handleAdded = (space: Space) => {
    setAddOpen(false)
    setActiveSpaceId(space.id)
    setActiveId(space.id)
    router.push(`/dashboard/${space.slug}`)
    onSwitched?.()
  }

  const activeSlug = spaces.find((s) => s.id === activeId)?.slug

  return (
    <div className="flex flex-col">
      {/* Header — small label so the surface reads as "switcher" not "menu" */}
      <div className="px-2 pt-1.5 pb-1 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-medium">
          Your shops
        </p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Close switcher"
            className="lg:hidden p-1 -mr-1 rounded text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <ul className="flex flex-col gap-0.5 max-h-[280px] overflow-y-auto pr-1">
        {spaces.map((space, i) => {
          const isActive = space.id === activeId
          const shortcut = i < 9 ? `${i + 1}` : null
          return (
            <li key={space.id}>
              <button
                onClick={() => handleSwitch(space)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "group relative w-full flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-md text-left transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-win)]/40",
                  isActive
                    ? "bg-[var(--chidi-surface)] text-[var(--chidi-text-primary)]"
                    : "text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-surface)]/70 hover:text-[var(--chidi-text-primary)]",
                )}
                style={
                  isActive
                    ? { boxShadow: `inset 3px 0 0 0 ${space.color}` }
                    : undefined
                }
              >
                <BusinessAvatar name={space.avatarSeed} size="xs" />
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-chidi-voice font-medium truncate leading-tight">
                    {space.name}
                  </span>
                  <span className="block text-[10px] text-[var(--chidi-text-muted)] truncate font-mono mt-0.5">
                    chidi.app/{space.slug}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: space.color }}
                  title={space.color}
                />
                {isActive ? (
                  <Check className="w-3.5 h-3.5 text-[var(--chidi-win)] flex-shrink-0" strokeWidth={2.4} />
                ) : shortcut ? (
                  <kbd className="hidden sm:inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded bg-[var(--chidi-surface)] border border-[var(--chidi-border-default)] text-[9px] font-medium tabular-nums text-[var(--chidi-text-muted)] font-sans">
                    ⌘{shortcut}
                  </kbd>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="h-px bg-[var(--chidi-border-subtle)] my-1.5" />

      {/* Footer — add + settings */}
      <div className="flex flex-col gap-0.5">
        <Sheet open={addOpen} onOpenChange={setAddOpen}>
          <SheetTrigger asChild>
            <button
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-[var(--chidi-surface)]/70 transition-colors text-left text-[13px] font-chidi-voice text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)]"
            >
              <Plus className="w-3.5 h-3.5 text-[var(--chidi-text-muted)]" strokeWidth={1.8} />
              <span className="flex-1">Add a new shop</span>
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md p-0 bg-[var(--card)]">
            <SheetHeader className="px-5 pt-5 pb-3 border-b border-[var(--chidi-border-subtle)]">
              <SheetTitle className="font-chidi-voice text-[var(--chidi-text-primary)]">
                New shop
              </SheetTitle>
              <p className="text-[12px] text-[var(--chidi-text-muted)] font-chidi-voice">
                Spaces are independent — separate customers, orders, inbox.
              </p>
            </SheetHeader>
            <div className="px-5 py-4">
              <AddSpaceForm onCreated={handleAdded} onCancel={() => setAddOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        {activeSlug && (
          <button
            onClick={() => {
              router.push(`/dashboard/${activeSlug}/settings`)
              onSwitched?.()
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-[var(--chidi-surface)]/70 transition-colors text-left text-[13px] font-chidi-voice text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)]"
          >
            <SettingsIcon className="w-3.5 h-3.5 text-[var(--chidi-text-muted)]" strokeWidth={1.8} />
            <span className="flex-1">Workspace settings</span>
          </button>
        )}
      </div>
    </div>
  )
}

interface AddSpaceFormProps {
  onCreated: (space: Space) => void
  onCancel: () => void
}

export function AddSpaceForm({ onCreated, onCancel }: AddSpaceFormProps) {
  const [name, setName] = useState("")
  const [color, setColor] = useState<string>(SPACE_ACCENTS[0].value)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const space = addSpace({ name, color })
    onCreated(space)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="space-name" className="text-[11px] font-medium text-[var(--chidi-text-secondary)] font-chidi-voice">
          Shop name
        </label>
        <Input
          id="space-name"
          autoFocus
          placeholder="Bola Beauty Hub"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-[var(--chidi-surface)] border-[var(--chidi-border-default)] font-chidi-voice"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-medium text-[var(--chidi-text-secondary)] font-chidi-voice">
          Accent
        </label>
        <div className="flex items-center gap-2">
          {SPACE_ACCENTS.map((accent) => {
            const isSelected = accent.value === color
            return (
              <button
                key={accent.id}
                type="button"
                onClick={() => setColor(accent.value)}
                aria-label={accent.label}
                aria-pressed={isSelected}
                className={cn(
                  "relative w-8 h-8 rounded-full transition-transform active:scale-[0.92]",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--chidi-win)]/40",
                  isSelected && "ring-2 ring-offset-2 ring-[var(--chidi-text-primary)]",
                )}
                style={{ backgroundColor: accent.value }}
              >
                {isSelected && (
                  <Check className="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]" strokeWidth={3} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!name.trim()}
          className="bg-[var(--chidi-text-primary)] text-[var(--chidi-bg-primary)] hover:opacity-90"
        >
          Create shop
        </Button>
      </div>
    </form>
  )
}
