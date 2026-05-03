'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

/**
 * Sticky header for the landing page. Brand mark on the left, three anchor
 * links (Features, Stories, FAQ), and a single primary CTA on the right.
 *
 * Why no "Sign in" or "Resources" in the header:
 *  - "Sign in" used to live next to "Try Chidi now" but they pointed at the
 *    same /auth screen and read as a duplicate ask. The footer carries the
 *    Sign-in link instead, in the Account column.
 *  - "Resources" (Privacy / Terms) belongs in the footer, not the top nav.
 *    Most visitors don't need it; surfacing it stole real estate from the
 *    three anchor jumps that actually help people scan the page.
 */
export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="w-full border-b border-[var(--chidi-border-subtle)] bg-[var(--background)]/85 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-[1060px] mx-auto px-4 sm:px-6">
        <nav className="flex items-center justify-between py-3 sm:py-4">
          <div className="flex items-center space-x-4 sm:space-x-8">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.png"
                alt="Chidi"
                width={80}
                height={32}
                className="h-8 w-auto"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <a
                href="#features"
                className="text-[var(--chidi-text-primary)] hover:text-[var(--chidi-text-primary)]/80 text-sm font-medium transition-colors"
              >
                Features
              </a>

              <a
                href="#testimonials"
                className="text-[var(--chidi-text-primary)] hover:text-[var(--chidi-text-primary)]/80 text-sm font-medium transition-colors"
              >
                Stories
              </a>

              <a
                href="#faq"
                className="text-[var(--chidi-text-primary)] hover:text-[var(--chidi-text-primary)]/80 text-sm font-medium transition-colors"
              >
                FAQ
              </a>
            </div>
          </div>

          {/* Desktop CTA — single primary action only */}
          <div className="hidden md:flex items-center">
            <Link
              href="/auth?tab=signup"
              className="h-9 px-4 sm:px-6 btn-cta rounded-full font-medium text-sm inline-flex items-center justify-center transition-all hover:scale-[1.02]"
            >
              Try Chidi now
            </Link>
          </div>

          {/* Mobile menu trigger */}
          <button
            className="md:hidden p-2 text-[var(--chidi-text-primary)]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>

        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-[var(--chidi-border-default)] mt-2 pt-4">
            <div className="flex flex-col space-y-4">
              <a href="#features" className="text-[var(--chidi-text-primary)] font-medium text-sm">
                Features
              </a>
              <a href="#testimonials" className="text-[var(--chidi-text-primary)] font-medium text-sm">
                Stories
              </a>
              <a href="#faq" className="text-[var(--chidi-text-primary)] font-medium text-sm">
                FAQ
              </a>

              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href="/auth?tab=signup"
                  className="w-full h-10 btn-cta rounded-full font-medium text-sm inline-flex items-center justify-center"
                >
                  Try Chidi now
                </Link>
                <Link
                  href="/auth?tab=signin"
                  className="w-full text-center text-[var(--chidi-text-secondary)] text-sm font-medium pt-1"
                >
                  Already with us? Sign in
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
