'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { GutterStrip } from './gutter-strip'

/**
 * Hero + 3-card auto-rotating carousel. Replaces the waitlist's emoji
 * placeholders with real photographic tiles (Pexels) so the section feels
 * inhabited rather than mocked-up.
 *
 * Carousel timing: 5 seconds per card, pauses on hover, restarts on leave.
 * Each card has a horizontal progress bar that telegraphs time remaining.
 *
 * The hero CTA gets `btn-cta` (existing shimmer) and a sliding sheen overlay.
 *
 * The mask-group-pattern.svg behind the hero parallaxes at ~0.3x scroll speed
 * for a subtle living feel without distracting from the headline.
 */

interface CardData {
  title: string
  description: string
  image: string
  alt: string
  tint: string
}

const CARDS: CardData[] = [
  {
    title: 'Smart conversations',
    description: 'Your AI shop assistant answers customer questions instantly, around the clock.',
    image:
      'https://images.pexels.com/photos/4549408/pexels-photo-4549408.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
    alt: 'A woman replying to messages on her phone',
    tint: 'from-[#37322F]/55 via-[#37322F]/25 to-transparent',
  },
  {
    title: 'Orders & payments',
    description: "Turn chats into trackable orders. Know who paid and who hasn't.",
    image:
      'https://images.pexels.com/photos/8302335/pexels-photo-8302335.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
    alt: 'A merchant packaging an order',
    tint: 'from-[#5B8A72]/45 via-[#5B8A72]/15 to-transparent',
  },
  {
    title: 'Inventory & insights',
    description: 'Track products, sizes, stock levels. See what is selling in real time.',
    image:
      'https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
    alt: 'A small business dashboard',
    tint: 'from-[#C4956A]/45 via-[#C4956A]/15 to-transparent',
  },
]

function FeatureCard({
  title,
  description,
  isActive,
  animationKey,
  onClick,
}: {
  title: string
  description: string
  isActive: boolean
  animationKey: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full md:flex-1 self-stretch overflow-hidden flex flex-col justify-start items-start text-left cursor-pointer transition-all duration-300 hover:scale-[1.005] ${
        isActive
          ? 'bg-[var(--card)] shadow-[0px_0px_0px_0.75px_var(--chidi-border-default)_inset]'
          : 'border-l-0 border-r-0 md:border border-[var(--chidi-border-default)]/80 hover:bg-[var(--chidi-surface)]/40'
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
      <div className="px-6 py-5 flex flex-col gap-2">
        <div className="self-stretch flex justify-center flex-col text-[var(--chidi-text-primary)] text-sm font-semibold leading-6 font-sans">
          {title}
        </div>
        <div className="self-stretch text-[var(--chidi-text-secondary)] text-[13px] font-normal leading-[22px] font-sans">
          {description}
        </div>
      </div>
    </button>
  )
}

export function HeroCarousel() {
  const [activeCard, setActiveCard] = useState(0)
  const [animationKey, setAnimationKey] = useState(0)
  const [paused, setPaused] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-rotate, pause on hover.
  useEffect(() => {
    if (paused) return
    const interval = setInterval(() => {
      setActiveCard((prev) => (prev + 1) % CARDS.length)
      setAnimationKey((prev) => prev + 1)
    }, 5000)
    return () => clearInterval(interval)
  }, [paused])

  // Hero parallax — translate the mask-group SVG at 0.3x scroll speed, but only
  // while the hero is visible. Honors reduced motion.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setScrollY(window.scrollY))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  const handleCardClick = (index: number) => {
    setActiveCard(index)
    setAnimationKey((prev) => prev + 1)
  }

  return (
    <div
      ref={containerRef}
      className="self-stretch pt-[9px] overflow-hidden border-b border-[var(--chidi-border-subtle)] flex flex-col justify-center items-center gap-4 sm:gap-6 md:gap-8 lg:gap-[66px] relative z-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="pt-16 sm:pt-20 md:pt-24 lg:pt-[160px] pb-8 sm:pb-12 md:pb-16 flex flex-col justify-start items-center px-2 sm:px-4 md:px-8 lg:px-0 w-full">
        <div className="w-full max-w-[937px] flex flex-col justify-center items-center gap-3 sm:gap-4 md:gap-5 lg:gap-6">
          <div className="self-stretch rounded-[3px] flex flex-col justify-center items-center gap-4 sm:gap-5 md:gap-6 lg:gap-8">
            <h1 className="w-full max-w-[748.71px] text-center text-[var(--chidi-text-primary)] text-4xl sm:text-5xl md:text-6xl lg:text-[80px] font-normal leading-[1.1] sm:leading-[1.15] md:leading-[1.2] lg:leading-24 font-serif px-2 sm:px-4 md:px-0">
              Run your entire business
              <br />
              through chat
            </h1>
            <p className="w-full max-w-[506.08px] text-center text-[var(--chidi-text-primary)]/80 text-sm sm:text-base md:text-lg leading-[1.5] sm:leading-[1.55] md:leading-[1.6] lg:leading-7 font-sans px-2 sm:px-4 md:px-0 font-normal">
              Manage customers, track orders and inventory, and sell on autopilot through your
              Telegram self-service channel. No spreadsheets. No switching apps. No chaos.
            </p>
          </div>
        </div>

        <div className="w-full max-w-[497px] flex flex-col justify-center items-center gap-4 sm:gap-5 md:gap-6 relative z-10 mt-6 sm:mt-8 md:mt-10 lg:mt-12">
          <div className="backdrop-blur-[8.25px] flex justify-start items-center gap-4">
            <Link
              href="/auth?tab=signup"
              className="group relative h-10 sm:h-11 md:h-12 px-6 sm:px-8 md:px-10 lg:px-12 py-2 btn-cta rounded-full flex justify-center items-center overflow-hidden transition-transform hover:scale-[1.02]"
            >
              <span className="relative z-10 flex flex-col justify-center text-white text-sm sm:text-base md:text-[15px] font-medium leading-5 font-sans">
                Try Chidi now
              </span>
              <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
              />
            </Link>
          </div>
          <p className="text-center text-[var(--chidi-text-secondary)]/80 text-xs sm:text-sm font-medium leading-5 font-sans">
            Launching with Telegram. WhatsApp and Instagram coming very soon.
          </p>
        </div>

        {/* Parallax mask pattern */}
        <div
          className="absolute top-[232px] sm:top-[248px] md:top-[264px] lg:top-[280px] left-1/2 transform -translate-x-1/2 z-0 pointer-events-none will-change-transform"
          style={{ transform: `translate(-50%, ${scrollY * 0.3}px)` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing-assets/mask-group-pattern.svg"
            alt=""
            className="w-[936px] sm:w-[1404px] md:w-[2106px] lg:w-[2808px] h-auto opacity-30 sm:opacity-40 md:opacity-50 mix-blend-multiply"
            style={{ filter: 'hue-rotate(15deg) saturate(0.7) brightness(1.2)' }}
          />
        </div>

        {/* Product preview tiles — real images, gradient overlay, fade transitions */}
        <div className="w-full max-w-[960px] pt-2 sm:pt-4 pb-6 sm:pb-8 md:pb-10 px-2 sm:px-4 md:px-6 lg:px-11 flex flex-col justify-center items-center gap-2 relative z-[5] my-8 sm:my-12 md:my-16 lg:my-16 mb-0 lg:pb-0">
          <div className="w-full max-w-[960px] h-[200px] sm:h-[280px] md:h-[450px] lg:h-[695.55px] bg-[var(--card)] shadow-[0px_0px_0px_0.9px_rgba(0,0,0,0.08)] overflow-hidden rounded-[6px] sm:rounded-[8px] lg:rounded-[9.06px] flex flex-col justify-start items-start">
            <div className="self-stretch flex-1 flex justify-start items-start">
              <div className="w-full h-full flex items-center justify-center">
                <div className="relative w-full h-full overflow-hidden">
                  {CARDS.map((card, idx) => (
                    <div
                      key={card.title}
                      className={`absolute inset-0 transition-all duration-500 ease-in-out ${
                        activeCard === idx
                          ? 'opacity-100 scale-100 blur-0'
                          : 'opacity-0 scale-95 blur-sm'
                      }`}
                    >
                      <div className="relative w-full h-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={card.image}
                          alt={card.alt}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading={idx === 0 ? 'eager' : 'lazy'}
                        />
                        <div
                          className={`absolute inset-0 bg-gradient-to-tr ${card.tint} mix-blend-multiply`}
                        />
                        {/* Brand-tinted readable label */}
                        <div className="absolute bottom-6 left-6 right-6 sm:bottom-10 sm:left-10 sm:right-10">
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--card)]/90 backdrop-blur-sm shadow-card">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--chidi-win)]" />
                            <span className="text-[11px] uppercase tracking-wider text-[var(--chidi-text-secondary)] font-chidi-voice">
                              {card.title}
                            </span>
                          </div>
                          <p className="hidden sm:block mt-3 text-base sm:text-lg text-white font-serif drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] max-w-[28rem]">
                            {card.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3-card carousel selector */}
        <div className="self-stretch border-t border-b border-[var(--chidi-border-default)] flex justify-center items-start">
          <GutterStrip />
          <div className="flex-1 px-0 sm:px-2 md:px-0 flex flex-col md:flex-row justify-center items-stretch gap-0">
            {CARDS.map((card, i) => (
              <FeatureCard
                key={card.title}
                title={card.title}
                description={card.description}
                isActive={activeCard === i}
                animationKey={activeCard === i ? animationKey : 0}
                onClick={() => handleCardClick(i)}
              />
            ))}
          </div>
          <GutterStrip />
        </div>
      </div>
    </div>
  )
}
