'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { authAPI } from '@/lib/api'

/**
 * / — auth-router only. The marketing page lives at /landing.
 *
 *   Supabase auth callback (#access_token in hash) → /auth (preserves hash)
 *   Signed-in, has business slug                    → /dashboard/{slug}
 *   Signed-in, no business yet                      → /onboarding
 *   Signed-out                                       → /landing
 *
 * Splitting the marketing page into its own route lets us iterate on the
 * landing in isolation without auth-redirect getting in the way during dev,
 * and keeps the auth-router cheap and focused.
 */
export default function HomePage() {
  const router = useRouter()
  const [error, setError] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash
      const params = new URLSearchParams(hash.substring(1))
      if (params.has('access_token') || params.has('error')) {
        router.replace('/auth' + hash)
        return
      }
    }

    const route = async () => {
      try {
        if (!authAPI.isAuthenticated()) {
          router.replace('/landing')
          return
        }

        const user = await authAPI.getMe()
        if (!user.businessName) {
          router.replace('/onboarding')
        } else if (user.businessSlug) {
          router.replace(`/dashboard/${user.businessSlug}`)
        } else {
          router.replace('/onboarding')
        }
      } catch (err) {
        console.error('Auth check failed:', err)
        // On failure, fall back to the public landing rather than spinning forever
        setError(true)
        router.replace('/landing')
      }
    }

    route()
  }, [router])

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-[var(--chidi-accent)] animate-spin mx-auto mb-4" />
        <p className="text-[var(--chidi-text-muted)]">
          {error ? 'Redirecting…' : 'Loading…'}
        </p>
      </div>
    </div>
  )
}
