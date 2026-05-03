'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'

interface NumbersThatSpeakProps {
  width?: number | string
  height?: number | string
  className?: string
  theme?: 'light' | 'dark'
}

/**
 * Stacked dashboard cards showing "Invoiced Revenue" with a bar chart.
 * Used as the visual for the "Know what's working" tile.
 *
 * Improvement over the waitlist version: the headline number animates from
 * 0 to its target value the first time it scrolls into view (1.2s ease-out)
 * and the bars grow up from the baseline staggered by 60ms each.
 */
const NumbersThatSpeak: React.FC<NumbersThatSpeakProps> = ({
  width = 482,
  height = 300,
  className = '',
  theme = 'light',
}) => {
  const themeVars: CSSProperties =
    theme === 'light'
      ? ({
          '--nts-surface': 'var(--card)',
          '--nts-text-primary': 'var(--chidi-text-primary)',
          '--nts-text-secondary': 'var(--chidi-text-secondary)',
          '--nts-text-muted': 'var(--chidi-text-muted)',
          '--nts-border': 'var(--chidi-border-default)',
        } as CSSProperties)
      : ({
          '--nts-surface': 'var(--card)',
          '--nts-text-primary': 'var(--chidi-text-primary)',
          '--nts-text-secondary': 'var(--chidi-text-secondary)',
          '--nts-text-muted': 'var(--chidi-text-muted)',
          '--nts-border': 'var(--chidi-border-default)',
        } as CSSProperties)

  const TARGET = 317731
  const heightsTarget = [83, 108, 58, 89, 83, 89, 83, 95, 108, 76, 89]

  const ref = useRef<HTMLDivElement | null>(null)
  const [shown, setShown] = useState(false)
  const [counter, setCounter] = useState(0)

  // Trigger when scrolled into view
  useEffect(() => {
    if (typeof window === 'undefined') return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setShown(true)
      setCounter(TARGET)
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
      { threshold: 0.3 },
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [])

  // Animate counter once shown
  useEffect(() => {
    if (!shown) return
    let raf = 0
    const start = performance.now()
    const duration = 1200
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setCounter(Math.round(TARGET * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [shown])

  return (
    <div
      ref={ref}
      className={className}
      style={
        {
          width,
          height,
          position: 'relative',
          background: 'transparent',
          ...themeVars,
        } as React.CSSProperties
      }
      role="img"
      aria-label="Financial dashboard showing invoiced revenue chart"
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          top: 'calc(50% + 23.703px)',
        }}
      >
        {/* Back layer card */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            top: 'calc(50% - 19.427px)',
            width: '270px',
            height: '199.565px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '270px',
              height: '199.565px',
              background: 'var(--nts-surface)',
              borderRadius: '4.696px',
              boxShadow:
                '0px 0px 0px 0.587px var(--nts-border), 0px 1.174px 2.348px -0.587px rgba(47,48,55,0.06), 0px 1.761px 3.522px -0.88px rgba(47,48,55,0.06)',
              overflow: 'hidden',
            }}
          />
        </div>

        {/* Middle layer card */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            top: 'calc(50% + 12.573px)',
            width: '330px',
            height: '243.913px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '330px',
              height: '243.913px',
              background: 'var(--nts-surface)',
              borderRadius: '5.739px',
              boxShadow:
                '0px 0px 0px 0.717px var(--nts-border), 0px 1.435px 2.87px -0.717px rgba(47,48,55,0.06), 0px 2.152px 4.304px -1.076px rgba(47,48,55,0.06)',
              overflow: 'hidden',
            }}
          />
        </div>

        {/* Front layer with full content */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            top: 'calc(50% + 33.573px)',
            width: '360px',
            height: '266.087px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '360px',
              height: '266.087px',
              background: 'var(--nts-surface)',
              borderRadius: '6.261px',
              boxShadow:
                '0px 0px 0px 0.783px var(--nts-border), 0px 1.565px 3.13px -0.783px rgba(47,48,55,0.06), 0px 2.348px 4.696px -1.174px rgba(47,48,55,0.06)',
              overflow: 'hidden',
              padding: '18.783px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ marginBottom: '18.783px' }}>
              <div
                style={{
                  fontFamily: 'var(--font-inter)',
                  fontWeight: 600,
                  fontSize: '10.174px',
                  lineHeight: '18.783px',
                  color: 'var(--nts-text-secondary)',
                }}
              >
                Invoiced revenue
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-instrument-serif)',
                  fontWeight: 400,
                  fontSize: '24px',
                  lineHeight: '1.05',
                  letterSpacing: '-0.02em',
                  color: 'var(--nts-text-primary)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                ₦{counter.toLocaleString('en-NG')}
              </div>
            </div>

            <div style={{ flex: 1, position: 'relative' }}>
              <div style={{ display: 'flex', height: '100%' }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    paddingRight: '8px',
                    height: 'calc(100% - 20px)',
                  }}
                >
                  {['500k', '300k', '200k', '100k', '0'].map((label) => (
                    <div
                      key={label}
                      style={{
                        fontFamily: 'var(--font-inter)',
                        fontWeight: 500,
                        fontSize: '7.826px',
                        color: 'var(--nts-text-muted)',
                        textAlign: 'right',
                      }}
                    >
                      {label}
                    </div>
                  ))}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                    }}
                  >
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        style={{
                          height: '1px',
                          backgroundColor: 'var(--chidi-border-subtle)',
                          width: '100%',
                        }}
                      />
                    ))}

                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        top: 0,
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'space-between',
                        padding: '0 10px',
                      }}
                    >
                      {heightsTarget.map((h, idx) => (
                        <div
                          key={idx}
                          style={{
                            width: '12px',
                            height: shown ? `${h}px` : '0px',
                            backgroundColor: 'var(--chidi-text-primary)',
                            borderRadius: '2px',
                            transition: 'height 700ms cubic-bezier(0.22, 1, 0.36, 1)',
                            transitionDelay: shown ? `${idx * 60}ms` : '0ms',
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: '4px',
                      fontFamily: 'var(--font-inter)',
                      fontWeight: 500,
                      fontSize: '7.826px',
                      color: 'var(--nts-text-muted)',
                    }}
                  >
                    <span>Aug 2025</span>
                    <span>Aug 2026</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NumbersThatSpeak
