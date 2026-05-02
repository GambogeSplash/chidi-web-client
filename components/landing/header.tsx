'use client'

import { useState } from 'react'
import { ChevronDown, Menu, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

/**
 * Sticky header for the landing page. Brand mark on the left, sparse nav, one
 * CTA on the right. On mobile collapses to a hamburger menu.
 *
 * The CTA points at the in-app `/auth?tab=signup` route since this app handles
 * authentication itself (the original waitlist linked to my.chidi.app).
 */
export function LandingHeader() {
  const [resourcesOpen, setResourcesOpen] = useState(false)
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

              <div
                className="relative"
                onMouseEnter={() => setResourcesOpen(true)}
                onMouseLeave={() => setResourcesOpen(false)}
              >
                <button
                  className="text-[var(--chidi-text-primary)] hover:text-[var(--chidi-text-primary)]/80 text-sm font-medium flex items-center gap-1 transition-colors"
                  aria-haspopup="true"
                  aria-expanded={resourcesOpen}
                >
                  Resources
                  <ChevronDown className="w-3 h-3" />
                </button>
                {resourcesOpen && (
                  <div className="absolute top-full left-0 pt-2 w-48 z-50">
                    <div className="bg-[var(--card)] rounded-lg shadow-lg border border-[var(--chidi-border-default)] py-2">
                      <a
                        href="/privacy"
                        className="block px-4 py-2 text-sm text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] transition-colors"
                      >
                        Privacy Policy
                      </a>
                      <a
                        href="/terms"
                        className="block px-4 py-2 text-sm text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] transition-colors"
                      >
                        Terms of Service
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/auth?tab=signin"
              className="text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] text-sm font-medium transition-colors"
            >
              Sign in
            </Link>
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

              <div>
                <div className="text-[var(--chidi-text-primary)] font-medium text-sm mb-2">
                  Resources
                </div>
                <div className="flex flex-col space-y-2 pl-4">
                  <a
                    href="/privacy"
                    className="text-[var(--chidi-text-secondary)] text-sm hover:text-[var(--chidi-text-primary)]"
                  >
                    Privacy Policy
                  </a>
                  <a
                    href="/terms"
                    className="text-[var(--chidi-text-secondary)] text-sm hover:text-[var(--chidi-text-primary)]"
                  >
                    Terms of Service
                  </a>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href="/auth?tab=signin"
                  className="w-full h-10 border border-[var(--chidi-border-default)] text-[var(--chidi-text-primary)] rounded-full font-medium text-sm inline-flex items-center justify-center"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth?tab=signup"
                  className="w-full h-10 btn-cta rounded-full font-medium text-sm inline-flex items-center justify-center"
                >
                  Try Chidi now
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
