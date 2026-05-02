"use client"

import { useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { ChidiAvatar } from "./chidi-mark"
import type { MilestoneCard } from "@/lib/chidi/milestones"
import { markSeen } from "@/lib/chidi/milestones"
import { playWin } from "@/lib/chidi/sound"

interface MilestoneModalProps {
  milestone: MilestoneCard | null
  onClose: () => void
}

/**
 * The earned moment. Modal that appears when the merchant crosses a threshold
 * for the first time. Mark seen on close so it never fires again. Confetti
 * for bigDeal moments only — never crass.
 */
export function MilestoneModal({ milestone, onClose }: MilestoneModalProps) {
  useEffect(() => {
    if (!milestone) return
    // Sound on open if user has it enabled
    playWin()
  }, [milestone])

  if (!milestone) return null

  const handleClose = () => {
    markSeen(milestone.key)
    onClose()
  }

  return (
    <Dialog open={!!milestone} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md p-0 bg-transparent border-0 shadow-none overflow-visible">
        <DialogTitle className="sr-only">Milestone — {milestone.title}</DialogTitle>

        {/* Confetti container — only renders for bigDeal moments */}
        {milestone.bigDeal && <MilestoneConfetti />}

        <div className="chidi-paper bg-[var(--card)] rounded-2xl shadow-2xl overflow-hidden border border-[var(--chidi-win)]/20 chidi-brief-card">
          <div className="relative z-[2] p-7 sm:p-8">
            {/* Big serif number badge */}
            <div className="flex justify-center mb-5">
              <div
                className="w-20 h-20 rounded-full bg-[var(--chidi-win-soft)] border-2 border-[var(--chidi-win)]/30 flex items-center justify-center"
              >
                <span className="ty-display text-[var(--chidi-win)]" style={{ fontSize: "2rem" }}>
                  {milestone.flavor}
                </span>
              </div>
            </div>

            <p className="ty-meta text-center text-[var(--chidi-text-muted)] mb-2">
              Worth marking
            </p>
            <h2 className="ty-page-title text-[var(--chidi-text-primary)] text-center mb-3">
              {milestone.title}
            </h2>
            <p className="ty-body-voice text-[var(--chidi-text-secondary)] text-center leading-relaxed max-w-sm mx-auto">
              {milestone.body}
            </p>

            {/* Chidi signature */}
            <div className="mt-6 pt-5 border-t border-[var(--chidi-border-subtle)] flex items-center justify-center gap-2">
              <ChidiAvatar size="sm" tone="win" />
              <span className="text-xs text-[var(--chidi-text-muted)] font-chidi-voice">
                — Chidi
              </span>
            </div>

            <button
              onClick={handleClose}
              className="w-full mt-5 py-2.5 px-4 rounded-xl btn-cta font-chidi-voice text-sm"
            >
              Keep going
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Quiet confetti — 30 small dots in win color, falling. Pure CSS, no
 * library. Auto-cleans after the animation.
 */
function MilestoneConfetti() {
  const dots = Array.from({ length: 36 }, (_, i) => {
    const left = (i * 2.7 + 3) % 95
    const delay = (i % 9) * 0.08
    const size = 4 + (i % 3) * 2
    const tone = i % 4 === 0 ? "var(--chidi-success)" : "var(--chidi-win)"
    return { left, delay, size, tone }
  })
  return (
    <div className="absolute inset-x-0 -top-10 h-[140vh] z-[100] pointer-events-none overflow-hidden" aria-hidden>
      {dots.map((d, i) => (
        <span
          key={i}
          className="absolute rounded-full chidi-confetti-fall"
          style={{
            left: `${d.left}%`,
            top: 0,
            width: d.size,
            height: d.size,
            backgroundColor: d.tone,
            animationDelay: `${d.delay}s`,
            animationDuration: `${2.5 + (i % 5) * 0.3}s`,
          }}
        />
      ))}
    </div>
  )
}
