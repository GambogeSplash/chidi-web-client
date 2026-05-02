'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthScreen } from '@/components/auth/auth-screen'
import { ResetPassword } from '@/components/auth/reset-password'
import { authAPI, type User } from '@/lib/api'
import { Loader2 } from 'lucide-react'

function AuthPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showVerified, setShowVerified] = useState(false)
  const [isProcessingCallback, setIsProcessingCallback] = useState(false)
  const [resetPasswordToken, setResetPasswordToken] = useState<string | null>(null)
  const [resetPasswordError, setResetPasswordError] = useState("")
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Check for verified=true param (user already processed, just showing success)
      if (searchParams.get('verified') === 'true') {
        setShowVerified(true)
        return
      }

      // Check for tokens or errors in URL hash (Supabase's default behavior)
      if (typeof window !== 'undefined' && window.location.hash) {
        const hash = window.location.hash.substring(1)
        const params = new URLSearchParams(hash)
        
        // Check for errors first
        const error = params.get('error')
        const errorDescription = params.get('error_description')
        
        if (error) {
          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname)
          // Show user-friendly error message
          const friendlyError = errorDescription?.replace(/\+/g, ' ') || 'Authentication failed. Please try again.'
          setAuthError(friendlyError)
          return
        }

        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const type = params.get('type')

        // Handle password recovery callback
        if (accessToken && type === 'recovery') {
          setResetPasswordToken(accessToken)
          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname)
          return
        }

        // Handle auth callbacks (signup verification, magiclink, etc.)
        if (accessToken) {
          setIsProcessingCallback(true)

          try {
            // 1. Clear any existing session first
            authAPI.clearAllAuthData()

            // 2. Store the new tokens
            localStorage.setItem('chidi_auth_token', accessToken)
            if (refreshToken) {
              localStorage.setItem('chidi_refresh_token', refreshToken)
            }

            // 3. For magic link users, call backend to create/get user record
            if (type === 'magiclink') {
              // Decode the JWT to get user info
              const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]))
              const authProviderId = tokenPayload.sub
              const email = tokenPayload.email

              // Call backend to create/get user record
              const callbackResponse = await authAPI.processMagicLinkCallback({
                auth_provider_id: authProviderId,
                email,
                access_token: accessToken,
                refresh_token: refreshToken || ''
              })

              // Store the needs_name_update flag for onboarding
              if (callbackResponse.needs_name_update) {
                localStorage.setItem('chidi_needs_name_update', 'true')
              }
            }

            // 4. Clear the hash from URL
            window.history.replaceState(null, '', window.location.pathname)

            // 5. Fetch user data to determine redirect destination
            try {
              const user = await authAPI.getMe()

              // Redirect based on onboarding status
              if (user.businessSlug) {
                router.push(`/dashboard/${user.businessSlug}`)
              } else {
                router.push('/onboarding')
              }
            } catch (userError) {
              console.error('Failed to fetch user, redirecting to onboarding:', userError)
              router.push('/onboarding')
            }
          } catch (error) {
            console.error('Error processing auth callback:', error)
            setIsProcessingCallback(false)
            setAuthError('Failed to process authentication. Please try again.')
          }
        }
      }
    }

    handleAuthCallback()
  }, [searchParams, router])

  const handleAuthSuccess = (user: User, isNewUser?: boolean) => {
    // Check if user needs onboarding or can go to dashboard
    if (isNewUser || !user.businessName) {
      router.push('/onboarding')
    } else if (user.businessSlug) {
      router.push(`/dashboard/${user.businessSlug}`)
    } else {
      router.push('/onboarding')
    }
  }

  if (isProcessingCallback) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[var(--chidi-accent)] animate-spin mx-auto mb-4" />
          <p className="text-[var(--chidi-text-muted)]">Setting up your account...</p>
        </div>
      </div>
    )
  }

  // Show password reset form if we have a recovery token
  if (resetPasswordToken) {
    return (
      <ResetPassword
        accessToken={resetPasswordToken}
        onSuccess={() => {
          setResetPasswordToken(null)
          setShowVerified(false)
          // After successful password reset, show sign in with success message
          router.push('/auth?tab=signin')
        }}
        onError={(message) => {
          setResetPasswordError(message)
        }}
      />
    )
  }

  // Show auth error if one occurred (e.g., expired link)
  if (authError) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-[var(--chidi-danger)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[var(--chidi-danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--chidi-text-primary)] mb-2">
            Link Expired or Invalid
          </h1>
          <p className="text-[var(--chidi-text-secondary)] mb-8">
            {authError}
          </p>
          <button
            onClick={() => {
              setAuthError(null)
              router.push('/auth?tab=signin')
            }}
            className="w-full py-3 px-4 btn-cta font-medium rounded-xl transition-all duration-300"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    )
  }

  return <AuthScreen onAuthSuccess={handleAuthSuccess} showVerified={showVerified} />
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
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
