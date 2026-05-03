'use client'

import { useEffect, useRef, useState } from 'react'
import { ChidiMark } from '@/components/chidi/chidi-mark'
import { Reveal } from './reveal'

/**
 * Live demo — a phone-shaped frame that auto-types a real customer/Chidi
 * conversation. Embodies the product instead of describing it. The single
 * highest-leverage piece of interaction on the page: it's the only section
 * where the visitor sees Chidi do its job in real time.
 *
 * Behaviour:
 *  - Each turn types char-by-char (~28ms/char), pauses 1100ms, then plays the
 *    next turn. Loops indefinitely.
 *  - Pauses when offscreen (IntersectionObserver) so it doesn't burn CPU on
 *    pages it isn't visible on. Resumes from the same position.
 *  - Honors prefers-reduced-motion: shows the full conversation immediately
 *    without typing animation.
 *  - Gradient sun-up backdrop sets emotional tone (warm honey -> cream).
 */

interface Turn {
  side: 'customer' | 'chidi'
  text: string
  meta?: string
}

const SCRIPT: Turn[] = [
  {
    side: 'customer',
    text: 'Do you still have that red Adidas size 42?',
    meta: '11:42 PM',
  },
  {
    side: 'chidi',
    text: 'Yes, ₦18,000. Last pair. Want me to set it aside?',
    meta: '11:42 PM',
  },
  {
    side: 'customer',
    text: 'Yes please. I will pay tomorrow morning.',
    meta: '12:08 AM',
  },
  {
    side: 'chidi',
    text:
      'Locked. Bank: GTBank 0123456789, name "Bella Fashion". I will confirm when payment lands.',
    meta: '12:09 AM',
  },
  {
    side: 'customer',
    text: 'Just sent ₦18k 🙏',
    meta: '7:12 AM',
  },
  {
    side: 'chidi',
    text: 'Got it. Receipt sent. Pickup ready from 10am. ✓',
    meta: '7:12 AM',
  },
]

const CHAR_MS = 28
const PAUSE_MS = 1100
const FINAL_HOLD_MS = 4500

export function LiveDemo() {
  const [turnIdx, setTurnIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [visible, setVisible] = useState(false)
  const [reduced, setReduced] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const messagesScrollRef = useRef<HTMLDivElement>(null)

  // Detect prefers-reduced-motion once on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  // Pause when offscreen
  useEffect(() => {
    if (!containerRef.current) return
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => setVisible(e.isIntersecting)),
      { threshold: 0.25 },
    )
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // Drive the typing
  useEffect(() => {
    if (reduced) {
      // Skip animation, jump to final state
      setTurnIdx(SCRIPT.length - 1)
      setCharIdx(SCRIPT[SCRIPT.length - 1].text.length)
      return
    }
    if (!visible) return

    const currentTurn = SCRIPT[turnIdx]
    if (!currentTurn) return

    if (charIdx < currentTurn.text.length) {
      const t = setTimeout(() => setCharIdx((c) => c + 1), CHAR_MS)
      return () => clearTimeout(t)
    }

    const isLast = turnIdx >= SCRIPT.length - 1
    const t = setTimeout(
      () => {
        if (isLast) {
          // Loop
          setTurnIdx(0)
          setCharIdx(0)
        } else {
          setTurnIdx((i) => i + 1)
          setCharIdx(0)
        }
      },
      isLast ? FINAL_HOLD_MS : PAUSE_MS,
    )
    return () => clearTimeout(t)
  }, [turnIdx, charIdx, visible, reduced])

  // Keep latest message in view *inside the phone frame only*. Using
  // scrollIntoView() here was a bug: browsers walk to the nearest scrollable
  // ancestor, and with the page being the dominant scroller, every char of
  // typing yanked the whole window — visitors couldn't scroll past the demo.
  // Setting scrollTop on the inner overflow container keeps the chat pinned to
  // its latest line without ever touching the document scroll.
  useEffect(() => {
    const el = messagesScrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [turnIdx, charIdx])

  // Render the visible window of messages: completed turns + the in-progress turn
  const visibleTurns = SCRIPT.slice(0, turnIdx + 1).map((turn, i) => {
    if (i === turnIdx && !reduced) {
      return { ...turn, text: turn.text.slice(0, charIdx) }
    }
    return turn
  })

  return (
    <section
      id="live-demo"
      className="w-full border-b border-[var(--chidi-border-default)] flex flex-col items-center"
    >
      <div
        className="self-stretch px-6 md:px-12 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 lg:gap-16 items-center relative overflow-hidden"
        ref={containerRef}
      >
        {/* Soft warm gradient backdrop */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              'radial-gradient(ellipse at 30% 20%, rgba(245, 184, 86, 0.18) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(196, 149, 106, 0.12) 0%, transparent 55%)',
          }}
        />

        {/* Copy column */}
        <Reveal className="flex flex-col justify-center gap-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--chidi-text-muted)] font-sans">
            Watch Chidi work
          </p>
          <h2 className="text-[var(--chidi-text-primary)] text-3xl md:text-5xl font-semibold leading-tight md:leading-[60px] font-sans tracking-tight">
            Your customer asks. <br />
            Chidi handles it.
          </h2>
          <p className="text-[var(--chidi-text-secondary)] text-sm font-normal leading-[1.55] font-sans max-w-md">
            Real conversation, real time. Chidi answers questions, holds stock, sends bank details,
            confirms payment, and posts the receipt. You wake up to a closed sale.
          </p>
          <ul className="mt-2 space-y-2.5">
            {[
              { dot: 'bg-[var(--chidi-win)]', label: 'Inventory checked instantly' },
              { dot: 'bg-[#0088CC]', label: 'Order created from chat' },
              { dot: 'bg-[#25D366]', label: 'Payment matched on receipt' },
            ].map((b) => (
              <li
                key={b.label}
                className="flex items-center gap-2.5 text-sm text-[var(--chidi-text-primary)] font-sans"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`} />
                {b.label}
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Phone mockup */}
        <Reveal delay={120} className="flex justify-center lg:justify-end">
          <div className="relative">
            {/* Floating notification ping */}
            <div
              className="hidden lg:flex absolute -top-3 -right-3 z-20 items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[var(--chidi-win)] text-[var(--chidi-win-foreground)] text-[10px] font-semibold uppercase tracking-[0.12em] shadow-md animate-[liveDemoPing_2.6s_ease-in-out_infinite]"
              aria-hidden
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--chidi-win-foreground)] animate-pulse" />
              Live
            </div>

            <div
              className="relative w-[300px] sm:w-[320px] rounded-[44px] bg-[#1C1917] p-2 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.35),0_0_0_1px_rgba(0,0,0,0.05)]"
              role="img"
              aria-label="Live conversation between customer and Chidi"
            >
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 bg-[#1C1917] rounded-b-2xl z-10" />
              <div className="rounded-[36px] bg-[#ECE5DD] overflow-hidden h-[560px] flex flex-col">
                {/* WhatsApp header */}
                <div className="bg-[#075E54] text-white px-4 pt-8 pb-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#128C7E] flex items-center justify-center text-sm font-medium">
                    T
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">Tunde</div>
                    <div className="text-[10px] opacity-80">online</div>
                  </div>
                </div>

                {/* Messages */}
                <div
                  ref={messagesScrollRef}
                  className="flex-1 px-3 py-3 space-y-2 overflow-y-auto overscroll-contain"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 10% 20%, rgba(7,94,84,0.04) 0px, transparent 1px), radial-gradient(circle at 80% 70%, rgba(7,94,84,0.04) 0px, transparent 1px)',
                    backgroundSize: '40px 40px',
                  }}
                >
                  {visibleTurns.map((turn, i) => (
                    <Bubble key={i} turn={turn} typing={i === turnIdx && !reduced && charIdx < SCRIPT[turnIdx].text.length} />
                  ))}
                </div>

                {/* Input bar */}
                <div className="bg-white px-3 py-2 flex items-center gap-2 border-t border-black/5">
                  <div className="flex-1 bg-[#F0F0F0] rounded-full px-3 py-1.5 text-[11px] text-[#999] font-sans">
                    Type a message
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[#075E54] flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Bubble({ turn, typing }: { turn: Turn; typing: boolean }) {
  const isChidi = turn.side === 'chidi'
  return (
    <div className={`flex ${isChidi ? 'justify-end' : 'justify-start'}`}>
      <div
        className={
          isChidi
            ? 'max-w-[82%] bg-[#DCF8C6] rounded-lg rounded-tr-none px-3 py-2 shadow-sm border-l-2'
            : 'max-w-[82%] bg-white rounded-lg rounded-tl-none px-3 py-2 shadow-sm'
        }
        style={isChidi ? { borderLeftColor: 'var(--chidi-win)' } : undefined}
      >
        {isChidi && (
          <div className="flex items-center gap-1 mb-1">
            <ChidiMark size={10} variant="win" />
            <span
              className="text-[9px] uppercase tracking-[0.12em] font-medium font-sans"
              style={{ color: 'var(--chidi-win)' }}
            >
              Chidi
            </span>
          </div>
        )}
        <p className="text-[12px] text-[#1C1917] leading-[1.4] font-sans whitespace-pre-line">
          {turn.text}
          {typing && (
            <span
              aria-hidden
              className="inline-block w-[5px] h-[12px] ml-0.5 align-text-bottom bg-[#1C1917] animate-[liveDemoCaret_900ms_steps(2)_infinite]"
            />
          )}
        </p>
        {turn.meta && (
          <p className="text-[9px] text-[#999] mt-0.5 text-right font-sans">
            {turn.meta} {isChidi && '✓✓'}
          </p>
        )}
      </div>
    </div>
  )
}
