"use client"

import { toast } from "sonner"

/**
 * AI-action toast — the trust foundation. Every time Chidi acts on behalf of
 * the merchant (replies, drafts, takes an order), we surface it as a
 * non-blocking toast with "See" / "Undo" affordances.
 *
 * Rule: the merchant must always know what their AI just did.
 */

export interface ChidiAction {
  verb: string
  who: string
  preview?: string
  onSee?: () => void
  onUndo?: () => Promise<void> | void
}

const undoLabel = "Undo"
const seeLabel = "See"

export function chidiActed({ verb, who, preview, onSee, onUndo }: ChidiAction) {
  const id = toast(`Chidi ${verb} ${who}`, {
    description: preview,
    action: onSee
      ? {
          label: seeLabel,
          onClick: () => {
            onSee()
            toast.dismiss(id)
          },
        }
      : undefined,
    cancel: onUndo
      ? {
          label: undoLabel,
          onClick: async () => {
            try {
              await onUndo()
              toast.success(`Undone — ${verb} reverted`)
            } catch (e) {
              toast.error(`Couldn't undo. The reply already went through.`)
            }
          },
        }
      : undefined,
  })
  return id
}

export function chidiWin(message: string, opts?: { description?: string }) {
  toast.success(message, {
    description: opts?.description,
    style: {
      background: "var(--chidi-win-soft)",
      color: "var(--chidi-win-foreground)",
      border: "1px solid var(--chidi-win)",
      fontFamily: "var(--font-chidi-voice)",
    },
  })
}

export function chidiNeedsYou(message: string, onSee?: () => void) {
  toast.warning(message, {
    duration: 8000,
    action: onSee
      ? {
          label: "Take a look",
          onClick: onSee,
        }
      : undefined,
  })
}
