'use client'

import Link from 'next/link'
import { Reveal } from './reveal'

/**
 * Final call-to-action with the diagonal-hatch backdrop. The CTA gets the
 * shimmer treatment and a hover-lift so it reads as the action you take.
 */
export default function CTASection() {
  return (
    <div
      id="cta"
      className="w-full relative overflow-hidden flex flex-col justify-center items-center gap-2"
    >
      <div className="self-stretch px-6 md:px-24 py-12 md:py-16 border-t border-b border-[var(--chidi-border-default)] flex justify-center items-center gap-6 relative z-10">
        {/* Diagonal hatch backdrop */}
        <div aria-hidden className="absolute inset-0 w-full h-full overflow-hidden">
          <div className="w-full h-full relative">
            {Array.from({ length: 60 }).map((_, i) => (
              <div
                key={i}
                className="absolute h-4 w-full rotate-[-45deg] origin-top-left outline outline-[0.5px] outline-[var(--chidi-border-subtle)] outline-offset-[-0.25px]"
                style={{
                  top: `${i * 16 - 120}px`,
                  left: '-100%',
                  width: '300%',
                }}
              />
            ))}
          </div>
        </div>

        <Reveal className="w-full max-w-[586px] px-6 py-5 md:py-8 overflow-hidden rounded-lg flex flex-col justify-start items-center gap-6 relative z-20">
          <div className="self-stretch flex flex-col justify-start items-center gap-3">
            <h2 className="self-stretch text-center text-[var(--chidi-text-primary)] text-3xl md:text-5xl font-semibold leading-tight md:leading-[56px] font-sans tracking-tight">
              Start running your business the smart way
            </h2>
            <p className="self-stretch text-center text-[var(--chidi-text-secondary)] text-base leading-7 font-sans font-medium">
              Join businesses simplifying their sales with Chidi.
              <br />
              No spreadsheets. No switching apps. No chaos.
            </p>
          </div>
          <div className="w-full max-w-[497px] flex flex-col justify-center items-center gap-12">
            <div className="flex justify-center items-center gap-4">
              <Link
                href="/auth?tab=signup"
                className="group h-11 px-12 py-[6px] relative btn-cta rounded-full flex justify-center items-center cursor-pointer overflow-hidden transition-transform hover:scale-[1.02]"
              >
                <span className="relative z-10 flex flex-col justify-center text-white text-[14px] font-medium leading-5 font-sans">
                  Try Chidi now
                </span>
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
