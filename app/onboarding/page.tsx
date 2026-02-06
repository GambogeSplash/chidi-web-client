'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Onboarding } from '@/components/chidi/onboarding'
import { authAPI } from '@/lib/api'
import type { User } from '@/lib/api'
import { Loader2 } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!authAPI.isAuthenticated()) {
          router.push('/auth')
          return
        }

        const userData = await authAPI.getMe()
        setUser(userData)
      } catch (err: any) {
        setError(err.message || 'Failed to load user data')
        // If auth fails, redirect to login
        router.push('/auth')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleOnboardingComplete = async (onboardingData: any) => {
    try {
      // The onboarding component already calls the API, so we just need the slug
      const businessSlug = onboardingData.businessSlug

      // Redirect to slug-based dashboard with welcome banner
      if (businessSlug) {
        console.log('🏢 [ONBOARDING] Redirecting to dashboard with slug:', businessSlug)
        router.push(`/dashboard/${businessSlug}?welcome=true`)
      } else {
        console.log('⚠️ [ONBOARDING] No business slug found, redirecting to default dashboard')
        router.push('/dashboard?welcome=true')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[var(--chidi-accent)] animate-spin mx-auto mb-4" />
          <p className="text-[var(--chidi-text-muted)]">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--chidi-danger)] mb-4">{error}</p>
          <button 
            onClick={() => router.push('/auth')}
            className="text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] underline"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <Onboarding user={user} onComplete={handleOnboardingComplete} />
}
