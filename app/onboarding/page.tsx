'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Onboarding } from '@/components/chidi/onboarding'
import { ChidiLoader } from '@/components/chidi/chidi-loader'
import { authAPI } from '@/lib/api'
import type { User } from '@/lib/api'
import { EmailVerificationPending } from '@/components/auth/email-verification-pending'

export default function OnboardingPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!authAPI.isAuthenticated()) {
          router.push('/auth')
          return
        }

        const userData = await authAPI.getMe()
        
        // Check if email is verified
        if (userData.email_verified === false) {
          setNeedsVerification(true)
          setUser(userData)
          setIsLoading(false)
          return
        }
        
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
        router.push(`/dashboard/${businessSlug}?welcome=true`)
      } else {
        router.push('/dashboard?welcome=true')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-[var(--background)] flex items-center justify-center p-4">
        <ChidiLoader context="general" size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
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

  // Show verification pending screen if email not verified
  if (needsVerification && user) {
    return (
      <EmailVerificationPending
        email={user.email}
        onBackToSignIn={() => {
          authAPI.clearAllAuthData()
          router.push('/auth?tab=signin')
        }}
      />
    )
  }

  if (!user) {
    return null
  }

  return <Onboarding user={user} onComplete={handleOnboardingComplete} />
}
