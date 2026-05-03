'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { WifiOff, MessageSquare, Megaphone, Check } from 'lucide-react'
import { ChidiMark } from '@/components/chidi/chidi-mark'
import { Reveal } from './reveal'

interface CardData {
  title: string
  description: string
  /**
   * Each card now ships its own small product-preview vignette (not an emblem
   * on a color wash) so the right-hand panel actually shows the merchant what
   * the capability looks like in product, not in marketing.
   */
  preview: React.ReactNode
  backdrop: string
}

/**
 * "Built for your market" section: rotating sidebar of three competitive
 * advantages with a tinted preview panel that swaps in time with the active
 * card. Hover-to-pause behavior matches the hero carousel.
 */
export default function DocumentationSection() {
  const [activeCard, setActiveCard] = useState(0)
  const [animationKey, setAnimationKey] = useState(0)
  const [paused, setPaused] = useState(false)

  const cards: CardData[] = [
    {
      title: 'Works offline, syncs later',
      description:
        'Built for emerging markets with unreliable internet. Chidi works offline and syncs your conversations when you are back online.',
      preview: <OfflinePreview />,
      backdrop: 'from-[#C4956A]/30 to-[#E0DEDB]/40',
    },
    {
      title: 'If you can chat, you can run it',
      description:
        "No dashboards to learn, no integrations to configure, no setup wizards. Just talk to Chidi the way you'd talk to a smart shop assistant, and it does the rest.",
      preview: <ChatToRunPreview />,
      backdrop: 'from-[#5B8A72]/25 to-[#7AB89A]/25',
    },
    {
      title: 'Broadcast to customer segments',
      description:
        'Send targeted campaigns to specific customer groups. Promote new products, announce sales, or follow up with past buyers automatically.',
      preview: <BroadcastPreview />,
      backdrop: 'from-[#E8A33D]/25 to-[#C4956A]/25',
    },
  ]

  useEffect(() => {
    if (paused) return
    const interval = setInterval(() => {
      setActiveCard((prev) => (prev + 1) % cards.length)
      setAnimationKey((prev) => prev + 1)
    }, 5000)
    return () => clearInterval(interval)
  }, [cards.length, paused])

  const handleCardClick = (index: number) => {
    setActiveCard(index)
    setAnimationKey((prev) => prev + 1)
  }

  return (
    <div
      className="w-full border-b border-[var(--chidi-border-default)] flex flex-col justify-center items-center"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="self-stretch px-6 md:px-24 py-16 md:py-24 border-b border-[var(--chidi-border-default)] flex justify-center items-center gap-6">
        <Reveal className="w-full max-w-[586px] px-6 py-5 overflow-hidden rounded-lg flex flex-col justify-start items-center gap-4">
          <div className="px-[14px] py-[6px] bg-[var(--card)] shadow-[0px_0px_0px_4px_rgba(55,50,47,0.05)] overflow-hidden rounded-[90px] flex items-center gap-[8px] border border-[var(--chidi-border-default)]">
            <ChidiMark size={14} variant="default" />
            <span className="text-[var(--chidi-text-primary)] text-[11px] font-medium uppercase tracking-[0.18em] leading-[1.4] font-sans">
              Competitive advantages
            </span>
          </div>
          <h2 className="self-stretch text-center text-[var(--chidi-text-primary)] text-3xl md:text-5xl font-semibold leading-tight md:leading-[60px] font-sans tracking-tight">
            Built for your market
          </h2>
          <p className="self-stretch text-center text-[var(--chidi-text-secondary)] text-sm font-normal leading-[1.55] font-sans">
            Features designed specifically for social sellers in emerging markets.
          </p>
        </Reveal>
      </div>

      <div className="self-stretch px-4 md:px-9 overflow-hidden flex justify-start items-center">
        <div className="flex-1 py-12 md:py-16 flex flex-col md:flex-row justify-start items-center gap-6 md:gap-12">
          <div className="w-full md:w-auto md:max-w-[400px] flex flex-col justify-center items-center gap-4 order-2 md:order-1">
            {cards.map((card, index) => {
              const isActive = index === activeCard
              return (
                <button
                  type="button"
                  key={index}
                  onClick={() => handleCardClick(index)}
                  className={`w-full overflow-hidden flex flex-col justify-start items-start text-left transition-all duration-300 cursor-pointer rounded-md hover:scale-[1.005] ${
                    isActive
                      ? 'bg-[var(--card)] shadow-[0px_0px_0px_0.75px_var(--chidi-border-default)_inset]'
                      : 'border border-[var(--chidi-border-default)]'
                  }`}
                >
                  <div
                    className={`w-full h-0.5 bg-[var(--chidi-border-default)]/30 overflow-hidden ${isActive ? 'opacity-100' : 'opacity-0'}`}
                  >
                    <div
                      key={animationKey}
                      className="h-0.5 bg-[var(--chidi-text-primary)] animate-[progressBar_5s_linear_forwards] will-change-transform"
                    />
                  </div>
                  <div className="px-6 py-5 w-full flex flex-col gap-2">
                    <div className="self-stretch flex justify-center flex-col text-[var(--chidi-text-primary)] text-sm font-semibold leading-[1.4] tracking-[-0.005em] font-sans">
                      {card.title}
                    </div>
                    <div className="self-stretch text-[var(--chidi-text-secondary)] text-sm font-normal leading-[1.55] font-sans whitespace-pre-line">
                      {card.description}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="w-full md:w-auto rounded-lg flex flex-col justify-center items-center gap-2 order-1 md:order-2 md:px-0">
            <div className="w-full md:w-[580px] h-[300px] md:h-[420px] bg-[var(--card)] shadow-[0px_0px_0px_0.9px_rgba(0,0,0,0.08)] overflow-hidden rounded-lg flex flex-col justify-start items-start relative">
              {cards.map((card, idx) => (
                <div
                  key={idx}
                  className={`absolute inset-0 transition-all duration-500 ease-in-out flex items-center justify-center bg-gradient-to-br ${card.backdrop} ${
                    activeCard === idx
                      ? 'opacity-100 scale-100'
                      : 'opacity-0 scale-95 pointer-events-none'
                  }`}
                >
                  {card.preview}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* === Per-card preview vignettes ============================================
   Each preview is a small, opinionated UI scene that *shows* the capability
   instead of *naming* it. No external assets — composed from product photos
   already in /public and the existing token vocabulary. */

function OfflinePreview() {
  return (
    <div className="w-full h-full flex items-center justify-center p-6 sm:p-10">
      <div className="relative w-full max-w-[320px] rounded-2xl bg-[var(--card)] shadow-card border border-[var(--chidi-border-default)] overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--chidi-border-subtle)]">
          <div className="flex items-center gap-2">
            <ChidiMark size={14} variant="default" />
            <span className="text-[12px] font-semibold text-[var(--chidi-text-primary)] font-sans">
              Inbox
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--chidi-win-soft)] text-[var(--chidi-win-foreground)] text-[10px] font-medium font-sans">
            <WifiOff className="w-3 h-3" />
            Offline
          </span>
        </div>
        <div className="px-4 py-3 space-y-2.5">
          {[
            { name: 'Tunde', msg: 'Is the red Adidas in?', queued: true },
            { name: 'Aisha', msg: 'Sent transfer ₦12k 🙏', queued: true },
            { name: 'Kemi', msg: 'Pickup tomorrow okay?', queued: false },
          ].map((row) => (
            <div key={row.name} className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#E8A33D] to-[#C4956A] flex items-center justify-center text-white text-[11px] font-semibold">
                {row.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-[var(--chidi-text-primary)] font-sans truncate">
                  {row.name}
                </p>
                <p className="text-[10px] text-[var(--chidi-text-secondary)] font-sans truncate">
                  {row.msg}
                </p>
              </div>
              {row.queued && (
                <span className="text-[9px] uppercase tracking-[0.12em] text-[var(--chidi-text-muted)] font-sans">
                  Queued
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="px-4 py-2.5 border-t border-[var(--chidi-border-subtle)] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--chidi-win)] animate-pulse" />
          <span className="text-[10px] text-[var(--chidi-text-secondary)] font-sans">
            3 messages will sync the moment you reconnect
          </span>
        </div>
      </div>
    </div>
  )
}

function ChatToRunPreview() {
  return (
    <div className="w-full h-full flex items-center justify-center p-6 sm:p-10">
      <div className="relative w-full max-w-[340px] rounded-2xl bg-[var(--card)] shadow-card border border-[var(--chidi-border-default)] overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-[var(--chidi-border-subtle)]">
          <ChidiMark size={14} variant="default" />
          <span className="text-[12px] font-semibold text-[var(--chidi-text-primary)] font-sans">
            Ask Chidi
          </span>
        </div>
        <div className="px-4 py-4 space-y-2.5">
          <div className="flex justify-end">
            <div className="max-w-[80%] bg-[var(--chidi-text-primary)] text-[var(--background)] rounded-2xl rounded-tr-sm px-3 py-2">
              <p className="text-[11px] leading-snug font-sans">
                Add 12 wireless earbuds to inventory at ₦24k each
              </p>
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[88%] bg-[var(--chidi-surface)] rounded-2xl rounded-tl-sm px-3 py-2 border border-[var(--chidi-border-subtle)]">
              <div className="flex items-center gap-1.5 mb-1">
                <Check className="w-3 h-3 text-[var(--chidi-win)]" />
                <span className="text-[9px] uppercase tracking-[0.12em] text-[var(--chidi-win-foreground)] font-semibold font-sans">
                  Done
                </span>
              </div>
              <p className="text-[11px] leading-snug text-[var(--chidi-text-primary)] font-sans">
                Added 12 wireless earbuds at ₦24,000. Stock now 47.
              </p>
              <div className="mt-2 flex items-center gap-2 px-2 py-1.5 rounded-md bg-[var(--card)] border border-[var(--chidi-border-subtle)]">
                <div className="relative w-7 h-7 rounded-md overflow-hidden bg-[var(--chidi-surface)] flex-shrink-0">
                  <Image
                    src="/wireless-earbuds.png"
                    alt=""
                    fill
                    sizes="28px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-[var(--chidi-text-primary)] truncate font-sans">
                    Wireless earbuds
                  </p>
                  <p className="text-[9px] text-[var(--chidi-text-muted)] tabular-nums font-sans">
                    ₦24,000 · 47 in stock
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BroadcastPreview() {
  const items = [
    { src: '/blue-ankara-dress.png', label: 'Ankara dress', price: '₦18,000' },
    { src: '/casual-sneakers.png', label: 'Sneakers', price: '₦22,500' },
    { src: '/leather-handbag.png', label: 'Leather bag', price: '₦35,000' },
  ]
  return (
    <div className="w-full h-full flex items-center justify-center p-6 sm:p-10">
      <div className="relative w-full max-w-[360px] rounded-2xl bg-[var(--card)] shadow-card border border-[var(--chidi-border-default)] overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--chidi-border-subtle)]">
          <div className="flex items-center gap-2">
            <Megaphone className="w-3.5 h-3.5 text-[var(--chidi-text-primary)]" />
            <span className="text-[12px] font-semibold text-[var(--chidi-text-primary)] font-sans">
              Broadcast
            </span>
          </div>
          <span className="text-[10px] text-[var(--chidi-text-muted)] font-sans tabular-nums">
            247 customers
          </span>
        </div>
        <div className="px-4 pt-3 pb-2">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--chidi-text-muted)] font-sans">
            Segment
          </p>
          <p className="text-[12px] font-semibold text-[var(--chidi-text-primary)] mt-0.5 font-sans">
            Bought in last 30 days
          </p>
        </div>
        <div className="px-4 pb-3">
          <div className="grid grid-cols-3 gap-2">
            {items.map((it) => (
              <div
                key={it.label}
                className="rounded-md overflow-hidden bg-[var(--chidi-surface)] border border-[var(--chidi-border-subtle)]"
              >
                <div className="relative w-full aspect-square bg-[var(--card)]">
                  <Image
                    src={it.src}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
                <div className="px-1.5 py-1">
                  <p className="text-[9px] font-medium text-[var(--chidi-text-primary)] truncate font-sans">
                    {it.label}
                  </p>
                  <p className="text-[9px] text-[var(--chidi-text-muted)] tabular-nums font-sans">
                    {it.price}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="px-4 py-2.5 border-t border-[var(--chidi-border-subtle)] flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[10px] text-[var(--chidi-text-secondary)] font-sans">
            <MessageSquare className="w-3 h-3" />
            Sending in 12 minutes
          </span>
          <button
            type="button"
            className="px-2.5 py-1 rounded-full bg-[var(--chidi-text-primary)] text-[var(--background)] text-[10px] font-semibold font-sans"
          >
            Send now
          </button>
        </div>
      </div>
    </div>
  )
}
