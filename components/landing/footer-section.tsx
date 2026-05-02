'use client'

import Image from 'next/image'
import Link from 'next/link'

/**
 * Footer with brand block, social icons, contact, and two link columns.
 * Auth links point to the in-app `/auth?tab=*` routes (not my.chidi.app) since
 * this app handles authentication itself.
 */
export default function FooterSection() {
  return (
    <div className="w-full pt-8 sm:pt-10 flex flex-col justify-start items-start">
      <div className="self-stretch h-auto flex flex-col md:flex-row justify-between items-stretch pr-0 pb-6 sm:pb-8 pt-0">
        <div className="h-auto p-4 sm:p-6 md:p-8 flex flex-col justify-start items-start gap-6 sm:gap-8">
          <div className="self-stretch flex justify-start items-center gap-3">
            <Image src="/logo.png" alt="Chidi" width={80} height={32} className="h-8 w-auto" />
          </div>
          <p className="text-[var(--chidi-text-primary)]/90 text-sm font-medium leading-[18px] font-sans">
            Run your entire business through chat
          </p>

          <div className="flex justify-start items-start gap-4">
            <a
              href="https://twitter.com/thechidiway"
              target="_blank"
              rel="noopener noreferrer"
              className="w-6 h-6 relative overflow-hidden hover:opacity-70 transition-opacity"
              aria-label="X / Twitter"
            >
              <div className="w-6 h-6 absolute flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                    fill="var(--chidi-text-primary)"
                  />
                </svg>
              </div>
            </a>

            <a
              href="https://instagram.com/thechidiway"
              target="_blank"
              rel="noopener noreferrer"
              className="w-6 h-6 relative overflow-hidden hover:opacity-70 transition-opacity"
              aria-label="Instagram"
            >
              <div className="w-6 h-6 absolute flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.073-1.689-.073-4.849 0-3.204.013-3.583.072-4.948.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
                    fill="var(--chidi-text-primary)"
                  />
                </svg>
              </div>
            </a>
          </div>

          <a
            href="mailto:hello@chidi.app"
            className="text-[var(--chidi-text-secondary)] text-sm font-normal hover:text-[var(--chidi-text-primary)] transition-colors"
          >
            hello@chidi.app
          </a>
        </div>

        <div className="self-stretch p-4 sm:p-6 md:p-8 flex flex-col sm:flex-row flex-wrap justify-start sm:justify-between items-start gap-6 md:gap-8">
          <div className="flex flex-col justify-start items-start gap-3 flex-1 min-w-[120px]">
            <div className="self-stretch text-[var(--chidi-text-muted)] text-sm font-medium leading-5 font-sans">
              Product
            </div>
            <div className="flex flex-col justify-end items-start gap-2">
              <a
                href="#features"
                className="text-[var(--chidi-text-primary)] text-sm font-normal leading-5 font-sans cursor-pointer hover:text-[var(--chidi-text-primary)]/70 transition-colors"
              >
                Features
              </a>
              <a
                href="#testimonials"
                className="text-[var(--chidi-text-primary)] text-sm font-normal leading-5 font-sans cursor-pointer hover:text-[var(--chidi-text-primary)]/70 transition-colors"
              >
                Stories
              </a>
              <Link
                href="/auth?tab=signup"
                className="text-[var(--chidi-text-primary)] text-sm font-normal leading-5 font-sans cursor-pointer hover:text-[var(--chidi-text-primary)]/70 transition-colors"
              >
                Try Chidi now
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-start items-start gap-3 flex-1 min-w-[120px]">
            <div className="text-[var(--chidi-text-muted)] text-sm font-medium leading-5 font-sans">
              Account
            </div>
            <div className="flex flex-col justify-center items-start gap-2">
              <Link
                href="/auth?tab=signin"
                className="text-[var(--chidi-text-primary)] text-sm font-normal leading-5 font-sans cursor-pointer hover:text-[var(--chidi-text-primary)]/70 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/auth?tab=signup"
                className="text-[var(--chidi-text-primary)] text-sm font-normal leading-5 font-sans cursor-pointer hover:text-[var(--chidi-text-primary)]/70 transition-colors"
              >
                Create account
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-start items-start gap-3 flex-1 min-w-[120px]">
            <div className="text-[var(--chidi-text-muted)] text-sm font-medium leading-5 font-sans">
              Resources
            </div>
            <div className="flex flex-col justify-center items-start gap-2">
              <a
                href="/privacy"
                className="text-[var(--chidi-text-primary)] text-sm font-normal leading-5 font-sans cursor-pointer hover:text-[var(--chidi-text-primary)]/70 transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="/terms"
                className="text-[var(--chidi-text-primary)] text-sm font-normal leading-5 font-sans cursor-pointer hover:text-[var(--chidi-text-primary)]/70 transition-colors"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom band with diagonal pattern + copyright */}
      <div className="self-stretch h-12 relative overflow-hidden border-t border-b border-[var(--chidi-border-default)]">
        <div aria-hidden className="absolute inset-0 w-full h-full overflow-hidden">
          <div className="w-full h-full relative">
            {Array.from({ length: 80 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-[300px] h-16 border border-[var(--chidi-border-subtle)]"
                style={{
                  left: `${i * 60 - 200}px`,
                  top: '-120px',
                  transform: 'rotate(-45deg)',
                  transformOrigin: 'top left',
                }}
              />
            ))}
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-[var(--chidi-text-muted)] text-xs font-normal tabular-nums">
            © {new Date().getFullYear()} Chidi. Built in Lagos.
          </p>
        </div>
      </div>
    </div>
  )
}
