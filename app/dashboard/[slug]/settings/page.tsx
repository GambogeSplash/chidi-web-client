'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import {
  User,
  Plug,
  Bot,
  CreditCard,
  Bell,
  Shield,
  Download,
  type LucideIcon,
} from 'lucide-react'
import { UserSettings } from '@/components/settings'
import { SetupStatus } from '@/components/settings/setup-status'
import { AppHeader } from '@/components/chidi/app-header'
import { NavRail } from '@/components/chidi/nav-rail'
import { ChidiMark } from '@/components/chidi/chidi-mark'
import { ChidiPreferences } from '@/components/chidi/chidi-preferences'
import { useDashboardAuth } from '@/lib/providers/dashboard-auth-context'
import { useRailCollapsed } from '@/lib/chidi/use-rail-collapsed'
import { cn } from '@/lib/utils'

interface SettingsSection {
  id: string
  label: string
  icon: LucideIcon | "chidi-mark"
}

// The sections rendered inside UserSettings, exposed via id anchors. The
// nav drives the visible content. Adding a section means adding an entry
// here + an `id="settings-{key}"` on the section element.
// "Chidi" merges the personality controls (tone, sound, quiet hours) with
// the AI behavior controls (policies, memory). They were two sections doing
// overlapping work — collapsed into one mental model: how Chidi behaves.
const SECTIONS: SettingsSection[] = [
  { id: 'chidi',          label: 'Chidi',          icon: 'chidi-mark' },
  { id: 'profile',        label: 'Profile',        icon: User },
  { id: 'integrations',   label: 'Channels',       icon: Plug },
  { id: 'payment',        label: 'Payments',       icon: CreditCard },
  { id: 'notifications',  label: 'Notifications',  icon: Bell },
  { id: 'security',       label: 'Security',       icon: Shield },
  { id: 'data',           label: 'Data',           icon: Download },
]

export default function SettingsPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { user: _user } = useDashboardAuth()
  const slug = params.slug as string
  const section = searchParams.get('section')

  const [activeId, setActiveId] = useState<string>('chidi')
  const railCollapsed = useRailCollapsed()

  const handleClose = () => {
    router.push(`/dashboard/${slug}`)
  }

  // Section is the URL ?section=... query param if provided. The active
  // section drives both the nav highlight AND the visible content (view swap,
  // not long scroll).
  useEffect(() => {
    if (section && SECTIONS.some((s) => s.id === section)) {
      setActiveId(section)
    }
  }, [section])

  const switchSection = (id: string) => {
    setActiveId(id)
    // Scroll to top so the user lands at the start of the new content
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col min-h-screen bg-[var(--background)] transition-[padding] duration-200",
        railCollapsed ? "lg:pl-[64px]" : "lg:pl-[224px]",
      )}
    >
      {/* Desktop rail */}
      <NavRail
        activeTab="inbox"
        onTabChange={(tab) => router.push(`/dashboard/${slug}?tab=${tab}`)}
      />

      {/* Mobile header */}
      <div className="lg:hidden">
        <AppHeader showSettings={false} />
      </div>

      {/* Page header — single source */}
      <div className="border-b border-[var(--chidi-border-subtle)] bg-[var(--background)]">
        <div className="max-w-6xl mx-auto w-full px-4 lg:px-8 py-4 lg:py-5">
          <h1 className="ty-page-title text-[var(--chidi-text-primary)]">Settings</h1>{/* All surface titles share the same ty-page-title (1.375rem serif) */}
        </div>
      </div>

      {/* Two-pane layout: sticky section nav (left) + content (right) */}
      <div className="max-w-6xl mx-auto w-full px-4 lg:px-8 py-6 flex gap-8">
        {/* Section nav — sticky on lg+, horizontal scroll chips on mobile */}
        <nav
          aria-label="Settings sections"
          className="hidden lg:block w-52 flex-shrink-0"
        >
          <ul className="sticky top-6 space-y-0.5">
            {SECTIONS.map((s) => {
              const isActive = activeId === s.id
              const isChidi = s.icon === 'chidi-mark'
              const Icon = isChidi ? null : (s.icon as LucideIcon)
              return (
                <li key={s.id}>
                  <button
                    onClick={() => switchSection(s.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-chidi-voice transition-colors text-left',
                      isActive
                        ? 'bg-[var(--chidi-surface)] text-[var(--chidi-text-primary)] font-medium'
                        : 'text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-surface)]/60 hover:text-[var(--chidi-text-primary)]',
                    )}
                  >
                    {isChidi ? (
                      <ChidiMark
                        size={16}
                        className={cn('flex-shrink-0', isActive && 'text-[var(--chidi-win)]')}
                      />
                    ) : Icon ? (
                      <Icon
                        className={cn('w-4 h-4 flex-shrink-0', isActive && 'text-[var(--chidi-win)]')}
                        strokeWidth={isActive ? 2.2 : 1.8}
                      />
                    ) : null}
                    <span className="flex-1 truncate">{s.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Mobile section chips */}
        <nav
          aria-label="Settings sections"
          className="lg:hidden flex items-center gap-2 overflow-x-auto -mx-4 px-4 pb-3 fixed top-14 left-0 right-0 z-10 bg-[var(--background)] border-b border-[var(--chidi-border-subtle)] pt-3"
        >
          {SECTIONS.map((s) => {
            const isActive = activeId === s.id
            return (
              <button
                key={s.id}
                onClick={() => switchSection(s.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-chidi-voice flex-shrink-0',
                  isActive
                    ? 'bg-[var(--chidi-text-primary)] text-[var(--chidi-bg-primary)]'
                    : 'bg-[var(--chidi-surface)] text-[var(--chidi-text-secondary)] border border-[var(--chidi-border-subtle)]',
                )}
              >
                {s.label}
              </button>
            )
          })}
        </nav>

        {/* Content column — view-swap: only the active section renders.
            The data-settings-active attribute drives a CSS rule in globals.css
            that hides every other settings-section. Linear / Mac System
            Settings pattern: nav is the navigation; content is the destination,
            not a scroll target. */}
        <div
          className="flex-1 min-w-0 lg:pt-0 pt-12"
          data-settings-active={activeId}
        >
          {/* Chidi section — personality controls (tone, sound, quiet hours)
              + AI behavior (policies, memory) all under one mental model.
              SetupStatus lives INSIDE this section so it only appears on the
              Chidi tab (not as a footer on every settings page). */}
          <section id="settings-chidi">
            <SetupStatus onJumpToSection={switchSection} />
            <ChidiPreferences />
          </section>

          {/* Existing deep settings. Each <section id="settings-..."> is its
              own paper card via SettingsSectionCard and is shown/hidden by the
              CSS rule keyed off the parent's data-settings-active. */}
          <UserSettings onClose={handleClose} scrollToSection={section} />
        </div>
      </div>
    </div>
  )
}
