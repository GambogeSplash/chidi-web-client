"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

/**
 * Keyboard shortcuts overlay — opens with `?` from anywhere in the dashboard.
 * Discoverability for power users; passive but high-craft.
 *
 * Listens at `document` level so any focused surface can trigger it. Suppresses
 * the trigger when the user is typing in an input / textarea / contenteditable
 * (we don't want `?` to open the overlay while writing a customer reply).
 *
 * Pressing Escape, clicking the backdrop, or hitting `?` again closes it.
 */

interface Shortcut {
  keys: string[]
  label: string
}

interface ShortcutGroup {
  title: string
  items: Shortcut[]
}

const GROUPS: ShortcutGroup[] = [
  {
    title: "Navigate",
    items: [
      { keys: ["G", "I"], label: "Inbox" },
      { keys: ["G", "O"], label: "Orders" },
      { keys: ["G", "V"], label: "Inventory" },
      { keys: ["G", "S"], label: "Insights" },
      { keys: ["G", "C"], label: "Ask Chidi" },
      { keys: ["G", "P"], label: "Playbook" },
      { keys: [","], label: "Settings" },
    ],
  },
  {
    title: "Spaces",
    items: [
      { keys: ["⌘", "1"], label: "Switch to shop 1" },
      { keys: ["⌘", "2"], label: "Switch to shop 2" },
      { keys: ["⌘", "3"], label: "Switch to shop 3" },
      { keys: ["⌘", "9"], label: "Switch to shop 9" },
    ],
  },
  {
    title: "Actions",
    items: [
      { keys: ["⌘", "K"], label: "Open command palette" },
      { keys: ["⌘", "/"], label: "Search conversations" },
      { keys: ["⌘", "."], label: "Peek (Little Chidi)" },
      { keys: ["⌘", "⇧", "C"], label: "Call Chidi (voice)" },
      { keys: ["⌘", "N"], label: "New note (in Notes panel)" },
      { keys: ["N"], label: "New product" },
      { keys: ["R"], label: "Reply with AI suggestion" },
      { keys: ["E"], label: "Mark conversation resolved" },
      { keys: ["S"], label: "Snooze conversation 24h" },
    ],
  },
  {
    title: "View",
    items: [
      { keys: ["?"], label: "Show this overlay" },
      { keys: ["["], label: "Collapse sidebar" },
      { keys: ["]"], label: "Expand sidebar" },
      { keys: ["Esc"], label: "Close any open modal / panel" },
    ],
  },
]

export function ShortcutsOverlay() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Suppress while typing
      const target = e.target as HTMLElement | null
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)

      if (e.key === "?" && !isTyping && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setOpen((p) => !p)
        return
      }
      if (e.key === "Escape" && open) {
        setOpen(false)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-overlay-title"
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 animate-[chidiTabSwapIn_240ms_cubic-bezier(0.22,1,0.36,1)]"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close shortcuts overlay"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* Card */}
      <div className="relative w-full max-w-2xl rounded-2xl chidi-paper bg-[var(--card)] border border-[var(--chidi-border-default)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--chidi-border-subtle)]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--chidi-text-muted)] font-medium">
              Power users
            </p>
            <h2 id="shortcuts-overlay-title" className="ty-page-title text-[var(--chidi-text-primary)] mt-1">
              Keyboard shortcuts
            </h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="p-2 -mr-2 rounded-md text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-6">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold mb-3">
                {group.title}
              </p>
              <ul className="space-y-2.5">
                {group.items.map((s, i) => (
                  <li
                    key={s.label}
                    className="flex items-center justify-between gap-3 chidi-list-in"
                    style={{ animationDelay: `${i * 28}ms` }}
                  >
                    <span className="text-[13px] text-[var(--chidi-text-primary)]">{s.label}</span>
                    <span className="flex items-center gap-1 flex-shrink-0">
                      {s.keys.map((k, ki) => (
                        <span
                          key={ki}
                          className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-md bg-[var(--chidi-surface)] border border-[var(--chidi-border-default)] text-[11px] font-medium tabular-nums text-[var(--chidi-text-secondary)] font-sans"
                        >
                          {k}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="px-6 py-3 border-t border-[var(--chidi-border-subtle)] flex items-center justify-between gap-3">
          <p className="text-[11px] text-[var(--chidi-text-muted)]">
            Press <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-[var(--chidi-surface)]">?</span> any time to open this. Esc to close.
          </p>
          <p className="text-[11px] text-[var(--chidi-text-muted)] font-sans">
            Built for keyboards. Built for shops that move fast.
          </p>
        </div>
      </div>
    </div>
  )
}
