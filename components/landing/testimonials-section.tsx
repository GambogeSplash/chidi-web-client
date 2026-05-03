'use client'

import { useEffect, useState } from 'react'
import { Quote } from 'lucide-react'
import { Reveal } from './reveal'

interface Testimonial {
  quote: string
  name: string
  company: string
  image: string
  stat: string
}

/**
 * Auto-rotating quote section. Pauses on hover. Photos use the same Pexels
 * set as the original hand-built landing for visual continuity.
 *
 * Each card carries a small "result" stat under the byline so the praise has
 * a quantitative anchor, not just sentiment.
 */
const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "I used to lose customers because I couldn't reply at night. Chidi never sleeps, and now I close sales while I'm asleep.",
    name: 'Adaeze O.',
    company: "Bella's Fashion · Lagos",
    image:
      'https://images.pexels.com/photos/15227424/pexels-photo-15227424.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&fit=crop',
    stat: '+34% sales in 2 months',
  },
  {
    quote:
      'My WhatsApp is my shop. Chidi makes it feel like I have a staff of three answering at the same time.',
    name: 'Kwame B.',
    company: 'KB Sneakers · Accra',
    image:
      'https://images.pexels.com/photos/5648107/pexels-photo-5648107.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&fit=crop',
    stat: 'Avg reply time, 12 seconds',
  },
  {
    quote:
      'It noticed I was underpricing my best product. I raised it 12% and got zero complaints. Just more orders.',
    name: 'Wanjiru M.',
    company: 'Threads & Things · Nairobi',
    image:
      'https://images.pexels.com/photos/5466267/pexels-photo-5466267.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&fit=crop',
    stat: '+12% margin on hero SKU',
  },
]

export default function TestimonialsSection() {
  const [active, setActive] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const interval = setInterval(() => {
      setTransitioning(true)
      setTimeout(() => {
        setActive((prev) => (prev + 1) % TESTIMONIALS.length)
        setTimeout(() => setTransitioning(false), 100)
      }, 300)
    }, 9000)
    return () => clearInterval(interval)
  }, [paused])

  const goTo = (index: number) => {
    setTransitioning(true)
    setTimeout(() => {
      setActive(index)
      setTimeout(() => setTransitioning(false), 100)
    }, 300)
  }

  const t = TESTIMONIALS[active]

  return (
    <div
      id="testimonials"
      className="w-full border-b border-[var(--chidi-border-default)] flex flex-col justify-center items-center"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="self-stretch px-2 overflow-hidden flex justify-start items-center bg-background border-t-0 border-l-0 border-r-0 border-b border-[var(--chidi-border-default)]">
        <div className="flex-1 py-16 md:py-24 flex flex-col md:flex-row justify-center items-end gap-6">
          <div className="self-stretch px-3 md:px-12 justify-center items-start gap-4 flex flex-col md:flex-row">
            <Reveal
              className="w-48 h-48 md:w-48 md:h-48 rounded-lg overflow-hidden flex items-center justify-center transition-all duration-700 ease-in-out flex-shrink-0 ring-1 ring-[var(--chidi-border-default)]"
            >
              <div
                className="relative w-full h-full"
                style={{
                  opacity: transitioning ? 0.6 : 1,
                  transform: transitioning ? 'scale(0.95)' : 'scale(1)',
                  transition: 'opacity 0.7s ease-in-out, transform 0.7s ease-in-out',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={t.image}
                  alt={t.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </Reveal>

            <div className="flex-1 px-6 py-6 overflow-hidden flex flex-col justify-start items-start gap-6 pb-0 pt-0">
              <Quote className="w-6 h-6 text-[var(--chidi-win)]" />
              {/*
                Quote typography matches the canonical landing section-title
                style (`text-3xl md:text-5xl font-semibold ... font-sans
                tracking-tight`) used by Bento, Live demo, Documentation, and
                CTA — so the page reads as one voice instead of switching
                fonts mid-scroll. Container height is set to fit the longest
                quote at the new scale.
              */}
              <blockquote
                className="self-stretch justify-start flex flex-col text-[var(--chidi-text-primary)] text-3xl md:text-5xl font-semibold leading-tight md:leading-[60px] font-sans tracking-tight min-h-[180px] md:min-h-[260px] overflow-hidden transition-all duration-700 ease-in-out"
                style={{
                  filter: transitioning ? 'blur(4px)' : 'blur(0px)',
                  transition: 'filter 0.7s ease-in-out',
                }}
              >
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div
                className="self-stretch flex flex-col justify-start items-start gap-0.5 transition-all duration-700 ease-in-out"
                style={{
                  filter: transitioning ? 'blur(4px)' : 'blur(0px)',
                  transition: 'filter 0.7s ease-in-out',
                }}
              >
                <div className="self-stretch text-[var(--chidi-text-primary)] text-sm font-semibold leading-[1.4] font-sans">
                  {t.name}
                </div>
                <div className="self-stretch text-[var(--chidi-text-secondary)] text-sm font-normal leading-[1.4] font-sans">
                  {t.company}
                </div>
                <div className="mt-2 inline-flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--chidi-win)]" />
                  <span className="text-[11px] text-[var(--chidi-text-secondary)] font-medium uppercase tracking-[0.12em] tabular-nums font-sans">
                    {t.stat}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pr-6 justify-start items-start gap-[14px] flex">
            <button
              onClick={() => goTo((active - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
              className="w-9 h-9 shadow-card overflow-hidden rounded-full border border-[var(--chidi-border-default)] flex justify-center items-center hover:bg-[var(--chidi-surface)] transition-colors hover:scale-[1.02]"
              aria-label="Previous testimonial"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M15 18L9 12L15 6"
                  stroke="var(--chidi-text-primary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              onClick={() => goTo((active + 1) % TESTIMONIALS.length)}
              className="w-9 h-9 shadow-card overflow-hidden rounded-full border border-[var(--chidi-border-default)] flex justify-center items-center hover:bg-[var(--chidi-surface)] transition-colors hover:scale-[1.02]"
              aria-label="Next testimonial"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M9 18L15 12L9 6"
                  stroke="var(--chidi-text-primary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
