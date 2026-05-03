'use client'

import type { ReactNode } from 'react'
import { ChidiMark } from '@/components/chidi/chidi-mark'
import { GutterStrip } from './gutter-strip'
import { Reveal } from './reveal'
import SmartSimpleBrilliant from './smart-simple-brilliant'
import YourWorkInSync from './your-work-in-sync'
import EffortlessIntegration from './effortless-integration'
import NumbersThatSpeak from './numbers-that-speak'

function Badge({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="px-[14px] py-[6px] bg-[var(--card)] shadow-[0px_0px_0px_4px_rgba(55,50,47,0.05)] overflow-hidden rounded-[90px] flex justify-start items-center gap-[8px] border border-[var(--chidi-border-default)]">
      <div className="w-[14px] h-[14px] relative overflow-hidden flex items-center justify-center">
        {icon}
      </div>
      <div className="text-center flex justify-center flex-col text-[var(--chidi-text-primary)] text-[11px] font-medium uppercase tracking-[0.18em] leading-[1.4] font-sans">
        {text}
      </div>
    </div>
  )
}

/**
 * 2x2 bento grid showing the four main capabilities, each backed by a custom
 * SVG/HTML illustration. The eyebrow Badge uses the ChidiMark instead of any
 * cheap-AI sparkle iconography.
 *
 * Each tile is wrapped in <Reveal> so it fades + lifts as it enters the
 * viewport (staggered by 80ms so they cascade rather than appear all at once).
 */
export function BentoFeatures() {
  return (
    <div
      id="features"
      className="w-full border-b border-[var(--chidi-border-default)] flex flex-col justify-center items-center"
    >
      {/* Header */}
      <div className="self-stretch px-4 sm:px-6 md:px-8 lg:px-0 lg:max-w-[1060px] lg:w-[1060px] py-8 sm:py-12 md:py-16 border-b border-[var(--chidi-border-default)] flex justify-center items-center gap-6">
        <Reveal className="w-full max-w-[616px] px-4 sm:px-6 py-4 sm:py-5 overflow-hidden rounded-lg flex flex-col justify-start items-center gap-3 sm:gap-4">
          <Badge icon={<ChidiMark size={14} variant="default" />} text="Core features" />
          <h2 className="w-full max-w-[598.06px] text-center flex justify-center flex-col text-[var(--chidi-text-primary)] text-xl sm:text-2xl md:text-3xl lg:text-5xl font-semibold leading-tight md:leading-[60px] font-sans tracking-tight">
            Everything your business needs
          </h2>
          <p className="self-stretch text-center text-[var(--chidi-text-secondary)] text-sm font-normal leading-[1.55] font-sans">
            From conversations to conversions, Chidi handles it all
            <br />
            so you can focus on what matters most.
          </p>
        </Reveal>
      </div>

      {/* Grid */}
      <div className="self-stretch flex justify-center items-start">
        <GutterStrip count={200} />

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0 border-l border-r border-[var(--chidi-border-default)]">
          {/* Top Left */}
          <Reveal
            delay={0}
            className="border-b border-r-0 md:border-r border-[var(--chidi-border-default)] p-4 sm:p-6 md:p-8 lg:p-12 flex flex-col justify-start items-start gap-4 sm:gap-6"
          >
            <div className="flex flex-col gap-2">
              <h3 className="text-[var(--chidi-text-primary)] text-[18px] md:text-[20px] font-semibold leading-[1.3] tracking-[-0.005em] font-sans">
                Every customer, remembered
              </h3>
              <p className="text-[var(--chidi-text-secondary)] text-sm font-normal leading-[1.55] font-sans">
                Every chat, order, and detail lives in one timeline per customer. Pick up exactly
                where you left off, even months later.
              </p>
            </div>
            <div className="w-full h-[200px] sm:h-[250px] md:h-[300px] rounded-lg flex items-center justify-center overflow-hidden">
              <SmartSimpleBrilliant
                width="100%"
                height="100%"
                theme="light"
                className="scale-50 sm:scale-65 md:scale-75 lg:scale-90"
              />
            </div>
          </Reveal>

          {/* Top Right */}
          <Reveal
            delay={80}
            className="border-b border-[var(--chidi-border-default)] p-4 sm:p-6 md:p-8 lg:p-12 flex flex-col justify-start items-start gap-4 sm:gap-6"
          >
            <div className="flex flex-col gap-2">
              <h3 className="text-[var(--chidi-text-primary)] text-[18px] md:text-[20px] font-semibold leading-[1.3] tracking-[-0.005em] font-sans">
                Replies that feel human, at machine speed
              </h3>
              <p className="text-[var(--chidi-text-secondary)] text-sm font-normal leading-[1.55] font-sans">
                Chidi answers product questions, qualifies leads, and books orders the moment
                they come in, so customers don&apos;t wait and you don&apos;t lose sales to slow
                responses.
              </p>
            </div>
            <div className="w-full h-[200px] sm:h-[250px] md:h-[300px] rounded-lg flex overflow-hidden text-right items-center justify-center">
              <YourWorkInSync
                width="400"
                height="250"
                theme="light"
                className="scale-60 sm:scale-75 md:scale-90"
              />
            </div>
          </Reveal>

          {/* Bottom Left */}
          <Reveal
            delay={160}
            className="border-r-0 md:border-r border-[var(--chidi-border-default)] p-4 sm:p-6 md:p-8 lg:p-12 flex flex-col justify-start items-start gap-4 sm:gap-6 bg-transparent"
          >
            <div className="flex flex-col gap-2">
              <h3 className="text-[var(--chidi-text-primary)] text-[18px] md:text-[20px] font-semibold leading-[1.3] tracking-[-0.005em] font-sans">
                Built for every channel. Telegram first.
              </h3>
              <p className="text-[var(--chidi-text-secondary)] text-sm font-normal leading-[1.55] font-sans">
                Spin up your AI-powered Telegram channel today. WhatsApp Business and Instagram
                coming very soon, same Chidi, more reach. Your customers, inventory, and orders
                follow you across all of them.
              </p>
            </div>
            <div className="w-full h-[200px] sm:h-[250px] md:h-[300px] rounded-lg flex overflow-hidden justify-center items-center relative bg-transparent">
              <div className="w-full h-full flex items-center justify-center bg-transparent">
                <EffortlessIntegration width={400} height={250} className="max-w-full max-h-full" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[var(--background)] to-transparent pointer-events-none" />
            </div>
          </Reveal>

          {/* Bottom Right */}
          <Reveal
            delay={240}
            className="p-4 sm:p-6 md:p-8 lg:p-12 flex flex-col justify-start items-start gap-4 sm:gap-6"
          >
            <div className="flex flex-col gap-2">
              <h3 className="text-[var(--chidi-text-primary)] text-[18px] md:text-[20px] font-semibold leading-[1.3] tracking-[-0.005em] font-sans">
                Know what&apos;s working
              </h3>
              <p className="text-[var(--chidi-text-secondary)] text-sm font-normal leading-[1.55] font-sans">
                Sales, customers, products, and inventory, all tracked in real time as orders flow
                through Chidi. See what&apos;s selling, what&apos;s running low, and who&apos;s
                coming back.
              </p>
            </div>
            <div className="w-full h-[200px] sm:h-[250px] md:h-[300px] rounded-lg flex overflow-hidden items-center justify-center relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <NumbersThatSpeak
                  width="100%"
                  height="100%"
                  theme="light"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[var(--background)] to-transparent pointer-events-none" />
            </div>
          </Reveal>
        </div>

        <GutterStrip count={200} />
      </div>
    </div>
  )
}
