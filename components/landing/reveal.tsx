'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Reveal — IntersectionObserver wrapper that fades + translates its children
 * into view the first time they enter the viewport. Single-shot (unobserves
 * after the first reveal) so users don't see the same animation twice if they
 * scroll back up.
 *
 * Respects `prefers-reduced-motion` by skipping the animation entirely
 * (children appear in their final state immediately).
 */
interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'section' | 'article' | 'aside' | 'header' | 'footer'
  /**
   * Distance in viewport to trigger early. Default '-10%' fires when the
   * element is 10% inside the bottom edge.
   */
  rootMargin?: string
}

export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = 'div',
  rootMargin = '0px 0px -10% 0px',
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (shown) return
    if (typeof window === 'undefined') return

    // Honor reduced motion — show immediately
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setShown(true)
      return
    }

    const node = ref.current
    if (!node) return

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true)
            obs.disconnect()
            return
          }
        }
      },
      { rootMargin, threshold: 0.05 },
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [rootMargin, shown])

  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={cn(
        'transition-all duration-[700ms] ease-out will-change-transform',
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
        className,
      )}
      style={{ transitionDelay: shown ? `${delay}ms` : '0ms' }}
    >
      {children}
    </Tag>
  )
}
