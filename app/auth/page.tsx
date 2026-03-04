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

        // Handle password recovery callback
        if (accessToken && type === 'recovery') {
          console.log('🔑 [AUTH-PAGE] Password recovery callback detected')
          // Don't clear existing session - just show the reset password form
          setResetPasswordToken(accessToken)
          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname)
          return
        }

        // Accept verification callbacks (type can be 'signup', 'email', or 'magiclink')
        if (accessToken) {
          console.log('✅ [AUTH-PAGE] Auth callback detected, type:', type)
          setIsProcessingCallback(true)

          try {
            // 1. Clear any existing session first
            authAPI.clearAllAuthData()
            console.log('🧹 [AUTH-PAGE] Cleared old auth data')

            // 2. Store the new tokens temporarily
            localStorage.setItem('chidi_auth_token', accessToken)
            if (refreshToken) {
              localStorage.setItem('chidi_refresh_token', refreshToken)
            }
            console.log('💾 [AUTH-PAGE] Stored new tokens')

            // 3. For magic link users, we need to call the backend to create/get user
            if (type === 'magiclink') {
              console.log('🔗 [AUTH-PAGE] Processing magic link callback...')
              
              // Decode the JWT to get user info
              const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]))
              const authProviderId = tokenPayload.sub
              const email = tokenPayload.email
              
              console.log('🔍 [AUTH-PAGE] Magic link user:', { authProviderId, email })
              
              // Call backend to create/get user record
              const callbackResponse = await authAPI.processMagicLinkCallback({
                auth_provider_id: authProviderId,
                email,
                access_token: accessToken,
                refresh_token: refreshToken || ''
              })
              
              console.log('✅ [AUTH-PAGE] Magic link callback processed:', callbackResponse)
              
              // Store the needs_name_update flag for onboarding
              if (callbackResponse.needs_name_update) {
                localStorage.setItem('chidi_needs_name_update', 'true')
              }
            }

            // 4. Clear the hash from URL
            window.history.replaceState(null, '', window.location.pathname)

            // 5. Redirect to onboarding
            console.log('🚀 [AUTH-PAGE] Redirecting to onboarding...')
            router.push('/onboarding')
          } catch (error) {
            console.error('❌ [AUTH-PAGE] Error processing auth callback:', error)
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
