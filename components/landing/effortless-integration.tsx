'use client'

import type React from 'react'

interface EffortlessIntegrationProps {
  width?: number | string
  height?: number | string
  className?: string
}

/**
 * Concentric-rings illustration with channel logos orbiting a Chidi "C" hub.
 * Used as the visual for the "Built for every channel" tile.
 *
 * Channel mix updated for the merchant audience: WhatsApp, Telegram, Instagram,
 * Stripe, Paystack, Slack — the things our merchants actually plug in or care
 * about. Logos pulled from the simple-icons CDN.
 */
const EffortlessIntegration: React.FC<EffortlessIntegrationProps> = ({
  width = 482,
  height = 300,
  className = '',
}) => {
  const centerX = 250
  const centerY = 179

  const getPositionOnRing = (ringRadius: number, angle: number) => ({
    x: centerX + ringRadius * Math.cos(angle),
    y: centerY + ringRadius * Math.sin(angle),
  })

  const orbitNodes: Array<{
    name: string
    icon: string
    bg: string
    invert: boolean
    radius: number
    angle: number
  }> = [
    { name: 'WhatsApp', icon: 'whatsapp', bg: '#25D366', invert: true, radius: 80, angle: 0 },
    { name: 'Telegram', icon: 'telegram', bg: '#26A5E4', invert: true, radius: 80, angle: Math.PI },
    { name: 'Instagram', icon: 'instagram', bg: '#E4405F', invert: true, radius: 120, angle: -Math.PI / 4 },
    { name: 'Stripe', icon: 'stripe', bg: '#635BFF', invert: true, radius: 120, angle: (3 * Math.PI) / 4 },
    { name: 'Paystack', icon: 'paystack', bg: '#0BA4DB', invert: true, radius: 120, angle: (5 * Math.PI) / 4 },
    { name: 'Slack', icon: 'slack', bg: 'var(--card)', invert: false, radius: 160, angle: 0 },
  ]

  return (
    <div
      className={className}
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        maskImage:
          'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
        WebkitMaskImage:
          'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            'linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, transparent 20%, transparent 80%, rgba(255,255,255,0.1) 100%)',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />

      {/* Outer ring */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          border: '1px solid var(--chidi-border-default)',
          opacity: 0.8,
        }}
      />
      {/* Middle ring */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '240px',
          height: '240px',
          borderRadius: '50%',
          border: '1px solid var(--chidi-border-default)',
          opacity: 0.7,
        }}
      />
      {/* Inner ring */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          border: '1px solid var(--chidi-border-default)',
          opacity: 0.6,
        }}
      />

      <div
        style={{
          width: '500px',
          height: '358px',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          position: 'absolute',
        }}
      >
        {/* Central Chidi hub */}
        <div
          style={{
            width: '72px',
            height: '72px',
            left: `${centerX - 36}px`,
            top: `${centerY - 36}px`,
            position: 'absolute',
            background: 'var(--chidi-text-primary)',
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
            borderRadius: '99px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-instrument-serif)',
            fontWeight: 400,
            fontSize: '36px',
            color: 'var(--background)',
          }}
        >
          C
        </div>

        {orbitNodes.map((node) => {
          const pos = getPositionOnRing(node.radius, node.angle)
          return (
            <div
              key={node.name}
              style={{
                width: '32px',
                height: '32px',
                left: `${pos.x - 16}px`,
                top: `${pos.y - 16}px`,
                position: 'absolute',
                background: node.bg,
                boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={node.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/${node.icon}.svg`}
                alt={node.name}
                style={{
                  width: '18px',
                  height: '18px',
                  filter: node.invert ? 'brightness(0) invert(1)' : 'none',
                }}
              />
            </div>
          )
        })}

        {/* Connecting lines */}
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          <defs>
            <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--chidi-text-primary)" stopOpacity="0.1" />
              <stop offset="50%" stopColor="var(--chidi-text-primary)" stopOpacity="0.05" />
              <stop offset="100%" stopColor="var(--chidi-text-primary)" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          {orbitNodes.map((node) => {
            const pos = getPositionOnRing(node.radius, node.angle)
            return (
              <line
                key={`line-${node.name}`}
                x1={centerX}
                y1={centerY}
                x2={pos.x}
                y2={pos.y}
                stroke="url(#connectionGradient)"
                strokeWidth="1"
                opacity="0.18"
              />
            )
          })}
        </svg>
      </div>
    </div>
  )
}

export default EffortlessIntegration
