'use client'

import { useEffect, useState } from 'react'
import { Zap, BarChart3 } from 'lucide-react'
import { ChidiMark } from '@/components/chidi/chidi-mark'
import { Reveal } from './reveal'

interface CardData {
  title: string
  description: string
  // Each card swaps the visual to the right — a small emblem + tinted backdrop.
  emblem: React.ReactNode
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
      emblem: <Zap className="w-10 h-10 text-[var(--chidi-text-primary)]" />,
      backdrop: 'from-[#C4956A]/30 to-[#E0DEDB]/40',
    },
    {
      title: 'If you can chat, you can run it',
      description:
        "No dashboards to learn, no integrations to configure, no setup wizards. Just talk to Chidi the way you'd talk to a smart shop assistant, and it does the rest.",
      emblem: <ChidiMark size={44} variant="default" />,
      backdrop: 'from-[#5B8A72]/25 to-[#7AB89A]/25',
    },
    {
      title: 'Broadcast to customer segments',
      description:
        'Send targeted campaigns to specific customer groups. Promote new products, announce sales, or follow up with past buyers automatically.',
      emblem: <BarChart3 className="w-10 h-10 text-[var(--chidi-text-primary)]" />,
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
      <div className="self-stretch px-6 md:px-24 py-12 md:py-16 border-b border-[var(--chidi-border-default)] flex justify-center items-center gap-6">
        <Reveal className="w-full max-w-[586px] px-6 py-5 overflow-hidden rounded-lg flex flex-col justify-start items-center gap-4">
          <div className="px-[14px] py-[6px] bg-[var(--card)] shadow-[0px_0px_0px_4px_rgba(55,50,47,0.05)] overflow-hidden rounded-[90px] flex items-center gap-[8px] border border-[var(--chidi-border-default)]">
            <ChidiMark size={14} variant="default" />
            <span className="text-[var(--chidi-text-primary)] text-xs font-medium leading-3 font-sans">
              Competitive advantages
            </span>
          </div>
          <h2 className="self-stretch text-center text-[var(--chidi-text-primary)] text-3xl md:text-5xl font-semibold leading-tight md:leading-[60px] font-sans tracking-tight">
            Built for your market
          </h2>
          <p className="self-stretch text-center text-[var(--chidi-text-secondary)] text-base font-normal leading-7 font-sans">
            Features designed specifically for social sellers in emerging markets.
          </p>
        </Reveal>
      </div>

      <div className="self-stretch px-4 md:px-9 overflow-hidden flex justify-start items-center">
        <div className="flex-1 py-8 md:py-11 flex flex-col md:flex-row justify-start items-center gap-6 md:gap-12">
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
                    <div className="self-stretch flex justify-center flex-col text-[var(--chidi-text-primary)] text-sm font-semibold leading-6 font-sans">
                      {card.title}
                    </div>
                    <div className="self-stretch text-[var(--chidi-text-secondary)] text-[13px] font-normal leading-[22px] font-sans whitespace-pre-line">
                      {card.description}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="w-full md:w-auto rounded-lg flex flex-col justify-center items-center gap-2 order-1 md:order-2 md:px-0">
            <div className="w-full md:w-[580px] h-[250px] md:h-[420px] bg-[var(--card)] shadow-[0px_0px_0px_0.9px_rgba(0,0,0,0.08)] overflow-hidden rounded-lg flex flex-col justify-start items-start relative">
              {cards.map((card, idx) => (
                <div
                  key={idx}
                  className={`absolute inset-0 transition-all duration-500 ease-in-out flex items-center justify-center bg-gradient-to-br ${card.backdrop} ${
                    activeCard === idx
                      ? 'opacity-100 scale-100'
                      : 'opacity-0 scale-95 pointer-events-none'
                  }`}
                >
                  <div className="flex flex-col items-center gap-4 max-w-xs px-8 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-[var(--card)] shadow-card flex items-center justify-center">
                      {card.emblem}
                    </div>
                    <p className="text-[var(--chidi-text-primary)] font-serif text-xl leading-tight">
                      {card.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
