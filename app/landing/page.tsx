'use client'

import { LandingHeader } from '@/components/landing/header'
import { HeroCarousel } from '@/components/landing/hero-carousel'
import { BentoFeatures } from '@/components/landing/bento-features'
import { LiveDemo } from '@/components/landing/live-demo'
import DocumentationSection from '@/components/landing/documentation-section'
import TestimonialsSection from '@/components/landing/testimonials-section'
import FAQSection from '@/components/landing/faq-section'
import CTASection from '@/components/landing/cta-section'
import FooterSection from '@/components/landing/footer-section'

/**
 * /landing — public marketing page. Lives in its own route so it stays
 * isolated from the auth-protected app: no session check, no redirect, no
 * dashboard chrome bleed.
 *
 * /  is the auth-router (signed-in -> dashboard, signed-out -> /landing).
 *
 * Composition: the chrome (header, vertical gutter lines, 1060px container) is
 * preserved from the original Proteensheykh waitlist; each named section is
 * its own client component under components/landing/ so they can be iterated
 * on individually without touching the page composition.
 *
 * Design rationale (post-2026-05-03 craft pass):
 *  - Stripe / Mono rhythm — every section now uses py-16 md:py-24 so the page
 *    breathes on the same beat, no `py-12 next to py-40` accidents.
 *  - Linear restraint on type — one canonical section-title style
 *    (`text-3xl md:text-5xl font-semibold leading-tight md:leading-[60px]
 *    font-sans tracking-tight`) lives in every section header and the
 *    testimonial quote. Hero h1 keeps the serif display style as the only
 *    intentional exception.
 *  - Paystack-native voice — testimonial photos, stats, and product photos
 *    (Ankara, sneakers, leather bag, earbuds in /public) ship in real
 *    product-preview vignettes inside the Documentation section, so a Lagos
 *    merchant sees their own catalogue, not stock illustration.
 *  - Original warm-paper DNA preserved — gutter strips, hatch backdrops,
 *    serif hero, ChidiMark badges, --chidi-* tokens, no new dependencies.
 */
export default function LandingPage() {
  return (
    <>
      <LandingHeader />

      <div className="w-full min-h-screen relative bg-[var(--background)] overflow-x-hidden flex flex-col justify-start items-center">
        <div className="relative flex flex-col justify-start items-center w-full">
          {/* 1060px container with vertical gutter lines (signature chrome) */}
          <div className="w-full max-w-none px-4 sm:px-6 md:px-8 lg:px-0 lg:max-w-[1060px] lg:w-[1060px] relative flex flex-col justify-start items-start min-h-screen">
            <div
              aria-hidden
              className="w-[1px] h-full absolute left-4 sm:left-6 md:left-8 lg:left-0 top-0 bg-[var(--chidi-border-default)] shadow-[1px_0px_0px_var(--background)] z-0"
            />
            <div
              aria-hidden
              className="w-[1px] h-full absolute right-4 sm:right-6 md:right-8 lg:right-0 top-0 bg-[var(--chidi-border-default)] shadow-[1px_0px_0px_var(--background)] z-0"
            />

            <HeroCarousel />

            <BentoFeatures />

            <LiveDemo />

            <DocumentationSection />

            <TestimonialsSection />

            <FAQSection />

            <CTASection />

            <FooterSection />
          </div>
        </div>
      </div>
    </>
  )
}
