'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthScreen } from '@/components/auth/auth-screen'
import { authAPI, type User } from '@/lib/api'
import { Loader2 } from 'lucide-react'

function AuthPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showVerified, setShowVerified] = useState(false)
  const [isProcessingCallback, setIsProcessingCallback] = useState(false)

  useEffect(() => {
    // Check for Supabase email verification callback
    // Supabase redirects with tokens in URL hash after email verification
    const handleVerificationCallback = async () => {
      // Check for verified=true param (user already processed, just showing success)
      if (searchParams.get('verified') === 'true') {
        console.log('✅ [AUTH-PAGE] Email verified via query param')
        setShowVerified(true)
        return
      }

      // Check for tokens in URL hash (Supabase's default behavior)
      if (typeof window !== 'undefined' && window.location.hash) {
        const hash = window.location.hash.substring(1)
        const params = new URLSearchParams(hash)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const type = params.get('type')

        console.log('🔍 [AUTH-PAGE] Hash params:', { 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken, 
          type 
        })

        // Accept verification callbacks (type can be 'signup', 'email', or 'magiclink')
        if (accessToken) {
          console.log('✅ [AUTH-PAGE] Email verification callback detected, type:', type)
          setIsProcessingCallback(true)

          try {
            // 1. Clear any existing session first
            authAPI.clearAllAuthData()
            console.log('🧹 [AUTH-PAGE] Cleared old auth data')

            // 2. Store the new tokens
            localStorage.setItem('chidi_auth_token', accessToken)
            if (refreshToken) {
              localStorage.setItem('chidi_refresh_token', refreshToken)
            }
            console.log('💾 [AUTH-PAGE] Stored new tokens')

            // 3. Clear the hash from URL
            window.history.replaceState(null, '', window.location.pathname)

            // 4. Redirect to onboarding (newly verified users need to complete onboarding)
            console.log('🚀 [AUTH-PAGE] Redirecting to onboarding...')
            router.push('/onboarding')
          } catch (error) {
            console.error('❌ [AUTH-PAGE] Error processing verification callback:', error)
            setIsProcessingCallback(false)
          }
        }
      }
    }

    handleVerificationCallback()
  }, [searchParams, router])

  const handleAuthSuccess = (user: User, isNewUser?: boolean) => {
    console.log('✅ [AUTH-PAGE] Authentication successful:', {
      userId: user.id,
      email: user.email,
      isNewUser,
      hasBusinessName: !!user.businessName
    })
    
    console.log('🔍 [AUTH-PAGE] Debug - user.businessName:', user.businessName)
    console.log('🔍 [AUTH-PAGE] Debug - isNewUser:', isNewUser)
    console.log('🔍 [AUTH-PAGE] Debug - !user.businessName:', !user.businessName)
    console.log('🔍 [AUTH-PAGE] Debug - condition result:', isNewUser || !user.businessName)
    
    // Check if user needs onboarding
    if (isNewUser || !user.businessName) {
      console.log('📝 [AUTH-PAGE] Redirecting to onboarding')
      console.log('🔍 [AUTH-PAGE] About to call router.push("/onboarding")')
      router.push('/onboarding')
      console.log('🔍 [AUTH-PAGE] router.push("/onboarding") called')
    } else {
      console.log('🏠 [AUTH-PAGE] Redirecting to home (will route to dashboard)')
      router.push('/')
    }
  }

  if (isProcessingCallback) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[var(--chidi-accent)] animate-spin mx-auto mb-4" />
          <p className="text-[var(--chidi-text-muted)]">Verifying your email...</p>
        </div>
      </div>
    )
  }

  return <AuthScreen onAuthSuccess={handleAuthSuccess} showVerified={showVerified} />
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[var(--chidi-accent)] animate-spin mx-auto mb-4" />
          <p className="text-[var(--chidi-text-muted)]">Loading...</p>
        </div>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  )
}
