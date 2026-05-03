"use client"

import { ReactNode } from "react"
import Image from "next/image"
import { AuthLeftTheatre } from "./auth-left-theatre"

interface AuthShellProps {
  /** Right-pane heading shown above the form on desktop */
  desktopHeading?: string
  /** Right-pane sub line shown under the heading on desktop */
  desktopSubheading?: string
  /** The form content */
  children: ReactNode
  /** When true, hides the mobile-only logo + tagline header (used for screens
      with their own header like the verification mail icon) */
  mobileBare?: boolean
}

/**
 * Shared two-pane shell for every auth surface. AuthScreen + EmailVerificationPending
 * + ResetPassword + ForgotPassword all wrap in this so they read as one flow.
 *
 * Left pane (desktop only): brand mark, value-prop, trust line. Always identical.
 * Right pane: whatever form is being shown.
 */
export function AuthShell({
  desktopHeading,
  desktopSubheading,
  children,
  mobileBare = false,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[var(--background)] lg:grid lg:grid-cols-[1.1fr_1fr] xl:grid-cols-[1fr_1fr]">
      {/* Desktop value-prop pane */}
      <aside className="hidden lg:flex flex-col justify-between bg-[var(--chidi-surface)] chidi-paper p-12 xl:p-16 relative overflow-hidden">
        <div className="relative z-[2] flex items-center gap-2">
          <Image src="/logo.png" alt="Chidi" width={36} height={36} className="rounded" />
          <span className="text-base font-serif text-[var(--chidi-text-primary)] tracking-tight">chidi</span>
        </div>

        <div className="relative z-[2] flex-1 flex flex-col justify-center max-w-md w-full">
          <p className="ty-meta mb-3">What Chidi does, live</p>
          <h1 className="text-2xl xl:text-3xl font-serif text-[var(--chidi-text-primary)] tracking-tight leading-tight mb-6">
            Your assistant for selling on Telegram &amp; WhatsApp.
          </h1>
          <AuthLeftTheatre />
        </div>

        <div className="relative z-[2]">
          <p className="text-xs text-[var(--chidi-text-muted)] font-chidi-voice">
            Trusted by businesses across Lagos, Accra, and Nairobi.
          </p>
        </div>
      </aside>

      {/* Right pane: form area */}
      <div className="flex items-center justify-center p-4 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile-only logo + tagline header */}
          {!mobileBare && (
            <div className="text-center mb-8 lg:hidden animate-in fade-in duration-500">
              <Image
                src="/logo.png"
                alt="Chidi"
                width={120}
                height={120}
                className="mx-auto mb-3"
                priority
              />
              <p className="text-base font-serif text-[var(--chidi-text-primary)] tracking-tight">
                Your AI business assistant for WhatsApp & Telegram
              </p>
            </div>
          )}

          {/* Desktop heading */}
          {desktopHeading && (
            <div className="hidden lg:block mb-8">
              <h2 className="ty-page-title text-[var(--chidi-text-primary)]">{desktopHeading}</h2>
              {desktopSubheading && (
                <p className="ty-body-voice text-[var(--chidi-text-secondary)] mt-1">{desktopSubheading}</p>
              )}
            </div>
          )}

          {children}
        </div>
      </div>
    </div>
  )
}
