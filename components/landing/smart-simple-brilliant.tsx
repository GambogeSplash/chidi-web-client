'use client'

import type React from 'react'

interface SmartSimpleBrilliantProps {
  width?: number | string
  height?: number | string
  className?: string
  theme?: 'light' | 'dark'
}

/**
 * Bento illustration: two tilted "calendar cards" with colored event rows.
 * Used as the visual for the "Every customer, remembered" tile. Decorative
 * (role="img") and aria-labeled, but no interactivity.
 *
 * Ported as-is from the waitlist; only structural hardcodes were swapped to
 * tokens. The colored event rows (amber/sky/violet/etc) are intentional —
 * they read as "different categories" at a glance and don't conflict with
 * the brand palette since they're inside two card frames.
 */
const SmartSimpleBrilliant: React.FC<SmartSimpleBrilliantProps> = ({
  width = 482,
  height = 300,
  className = '',
  theme = 'light',
}) => {
  const themeVars =
    theme === 'light'
      ? ({
          '--ssb-surface': 'var(--card)',
          '--ssb-text': 'var(--chidi-text-primary)',
          '--ssb-border': 'var(--chidi-border-default)',
          '--ssb-inner-border': 'var(--chidi-border-default)',
          '--ssb-shadow': 'rgba(0,0,0,0.12)',
        } as React.CSSProperties)
      : ({
          '--ssb-surface': '#333937',
          '--ssb-text': '#f8f8f8',
          '--ssb-border': 'rgba(255,255,255,0.16)',
          '--ssb-inner-border': 'rgba(255,255,255,0.12)',
          '--ssb-shadow': 'rgba(0,0,0,0.28)',
        } as React.CSSProperties)

  return (
    <div
      className={className}
      style={
        {
          width,
          height,
          position: 'relative',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...themeVars,
        } as React.CSSProperties
      }
      role="img"
      aria-label="Two calendar cards with colored event rows"
    >
      <div
        style={{
          position: 'relative',
          width: '295.297px',
          height: '212.272px',
          transform: 'scale(1.2)',
        }}
      >
        {/* Left tilted card */}
        <div style={{ position: 'absolute', left: '123.248px', top: '0px', width: 0, height: 0 }}>
          <div style={{ transform: 'rotate(5deg)', transformOrigin: 'center' }}>
            <div
              style={{
                width: '155.25px',
                background: '#ffffff',
                borderRadius: '9px',
                padding: '6px',
                boxShadow:
                  '0px 0px 0px 1px rgba(0,0,0,0.08), 0px 2px 4px rgba(0,0,0,0.07)',
              }}
            >
              {/* Amber event */}
              <div
                style={{
                  width: '100%',
                  height: '51px',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  background: 'rgba(245,158,11,0.1)',
                  display: 'flex',
                }}
              >
                <div style={{ width: '2.25px', background: '#F59E0B' }} />
                <div style={{ padding: '4.5px', width: '100%' }}>
                  <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '9px', color: '#92400E' }}>
                      11:42
                    </span>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '9px', color: '#92400E' }}>
                      PM
                    </span>
                  </div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '9px', color: '#92400E' }}>
                    Tunde, returning
                  </div>
                </div>
              </div>

              {/* Sky event */}
              <div
                style={{
                  width: '100%',
                  height: '79.5px',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  background: 'rgba(14,165,233,0.1)',
                  marginTop: '3px',
                  display: 'flex',
                }}
              >
                <div style={{ width: '2.25px', background: '#0EA5E9' }} />
                <div style={{ padding: '4.5px', width: '100%' }}>
                  <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '9px', color: '#0C4A6E' }}>
                      Order
                    </span>
                  </div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '9px', color: '#0C4A6E' }}>
                    Red Adidas, size 42
                  </div>
                </div>
              </div>

              {/* Emerald event */}
              <div
                style={{
                  width: '100%',
                  height: '51px',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  background: 'rgba(16,185,129,0.1)',
                  marginTop: '3px',
                  display: 'flex',
                }}
              >
                <div style={{ width: '2.25px', background: '#10B981' }} />
                <div style={{ padding: '4.5px', width: '100%' }}>
                  <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '9px', color: '#064E3B' }}>
                      Paid
                    </span>
                  </div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '9px', color: '#064E3B' }}>
                    GTBank, confirmed
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right card */}
        <div style={{ position: 'absolute', left: '0px', top: '6.075px', width: '155.25px' }}>
          <div style={{ transform: 'rotate(-5deg)', transformOrigin: 'center' }}>
            <div
              style={{
                width: '155.25px',
                background: '#ffffff',
                borderRadius: '9px',
                padding: '6px',
                boxShadow:
                  '-8px 6px 11.3px rgba(0,0,0,0.12), 0px 0px 0px 1px rgba(0,0,0,0.08), 0px 2px 4px rgba(0,0,0,0.06)',
              }}
            >
              {/* Violet event */}
              <div
                style={{
                  width: '100%',
                  height: '51px',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  background: 'rgba(139,92,246,0.1)',
                  display: 'flex',
                }}
              >
                <div style={{ width: '2.25px', background: '#8B5CF6' }} />
                <div style={{ padding: '4.5px', width: '100%' }}>
                  <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '9px', color: '#581C87' }}>
                      Note
                    </span>
                  </div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '9px', color: '#581C87' }}>
                    Prefers DM after 6pm
                  </div>
                </div>
              </div>

              {/* Rose event */}
              <div
                style={{
                  width: '100%',
                  height: '51px',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  background: '#FFE4E6',
                  display: 'flex',
                  marginTop: '3px',
                }}
              >
                <div style={{ width: '2.25px', background: '#F43F5E' }} />
                <div style={{ padding: '4.5px', width: '100%' }}>
                  <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '9px', color: '#BE123C' }}>
                      Complaint
                    </span>
                  </div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '9px', color: '#BE123C' }}>
                    Resolved, refunded
                  </div>
                </div>
              </div>

              {/* Violet tall event */}
              <div
                style={{
                  width: '100%',
                  height: '79.5px',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  background: 'rgba(139,92,246,0.1)',
                  display: 'flex',
                  marginTop: '3px',
                }}
              >
                <div style={{ width: '2.25px', background: '#8B5CF6' }} />
                <div style={{ padding: '4.5px', width: '100%' }}>
                  <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '9px', color: '#581C87' }}>
                      Last seen
                    </span>
                  </div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '9px', color: '#581C87' }}>
                    3 days ago, browsing
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

export default SmartSimpleBrilliant
