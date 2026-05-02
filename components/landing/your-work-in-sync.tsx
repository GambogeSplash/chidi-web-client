'use client'

import type React from 'react'

interface YourWorkInSyncProps {
  width?: number | string
  height?: number | string
  className?: string
  theme?: 'light' | 'dark'
}

/**
 * Chat-bubble illustration: simulates a quick exchange to back the
 * "Replies that feel human, at machine speed" tile. Decorative.
 *
 * Hardcoded message-bubble greys/darks reference the warm palette via
 * tokens; bubble accent gradients (amber/blue/green avatar circles) stay
 * literal because they identify distinct people.
 */
const YourWorkInSync: React.FC<YourWorkInSyncProps> = ({
  width = 482,
  height = 300,
  className = '',
  theme = 'light',
}) => {
  const themeVars =
    theme === 'light'
      ? ({
          '--yws-surface': 'var(--card)',
          '--yws-text-primary': 'var(--chidi-text-primary)',
          '--yws-bubble-light': '#e8e5e3',
          '--yws-bubble-dark': 'var(--chidi-text-primary)',
          '--yws-border': 'var(--chidi-border-default)',
        } as React.CSSProperties)
      : ({
          '--yws-surface': '#1f2937',
          '--yws-text-primary': '#f9fafb',
          '--yws-bubble-light': '#374151',
          '--yws-bubble-dark': '#111827',
          '--yws-border': 'rgba(255,255,255,0.12)',
        } as React.CSSProperties)

  const imgArrowUp =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round'%3E%3Cpath d='m5 12 7-7 7 7'/%3E%3Cpath d='M12 19V5'/%3E%3C/svg%3E"

  const lightBubbleBg = theme === 'light' ? '#e8e5e3' : 'var(--yws-bubble-light)'
  const lightBubbleText = theme === 'light' ? '#37322f' : '#f9fafb'
  const darkBubbleBg = theme === 'light' ? '#37322f' : 'var(--yws-bubble-dark)'

  return (
    <div
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
      aria-label="Chat conversation showing quick replies"
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '356px',
          height: '216px',
        }}
      >
        <div style={{ width: '356px', height: '216px', position: 'relative', transform: 'scale(1.1)' }}>
          {/* Customer message */}
          <div
            style={{
              position: 'absolute',
              left: '0px',
              top: '0px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              width: '356px',
              height: '36px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '44px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: '1px solid var(--yws-border)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>A</span>
            </div>
            <div
              style={{
                background: lightBubbleBg,
                borderRadius: '999px',
                padding: '0px 12px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  fontSize: '13px',
                  lineHeight: '16px',
                  letterSpacing: '-0.4px',
                  color: lightBubbleText,
                  whiteSpace: 'nowrap',
                }}
              >
                Do you do delivery to Yaba?
              </span>
            </div>
          </div>

          {/* Chidi reply */}
          <div
            style={{
              position: 'absolute',
              right: '0px',
              top: '60px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              justifyContent: 'flex-end',
            }}
          >
            <div
              style={{
                background: darkBubbleBg,
                borderRadius: '999px',
                padding: '0px 12px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  fontSize: '13px',
                  lineHeight: '16px',
                  letterSpacing: '-0.4px',
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                }}
              >
                Yes, ₦1,500 same day
              </span>
            </div>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '44px',
                background: 'linear-gradient(135deg, #E8A33D, #C97D5E)',
                border: '1px solid var(--yws-border)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>C</span>
            </div>
          </div>

          {/* Customer follow-up */}
          <div
            style={{
              position: 'absolute',
              left: '0px',
              top: '120px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              width: '210px',
              height: '36px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '44px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: '1px solid var(--yws-border)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>A</span>
            </div>
            <div
              style={{
                background: lightBubbleBg,
                borderRadius: '999px',
                padding: '0px 12px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  fontSize: '13px',
                  lineHeight: '16px',
                  letterSpacing: '-0.4px',
                  color: lightBubbleText,
                  whiteSpace: 'nowrap',
                }}
              >
                Send your account
              </span>
            </div>
          </div>

          {/* Compose */}
          <div
            style={{
              position: 'absolute',
              left: '146px',
              top: '180px',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              height: '36px',
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '0px 12px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.08), 0px 1px 2px -0.4px rgba(0,0,0,0.08)',
              }}
            >
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  fontSize: '14px',
                  lineHeight: '20px',
                  color: '#030712',
                  whiteSpace: 'nowrap',
                }}
              >
                Sent! Thank you 🙏
              </span>
            </div>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '44px',
                background: darkBubbleBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0px 1px 2px 0px rgba(0,0,0,0.08)',
                flexShrink: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgArrowUp}
                alt=""
                style={{ width: '20px', height: '20px', filter: 'brightness(0) invert(1)' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default YourWorkInSync
