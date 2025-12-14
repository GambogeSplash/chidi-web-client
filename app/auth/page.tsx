'use client'

import { useRouter } from 'next/navigation'
import { AuthScreen } from '@/components/auth/auth-screen'
import type { User } from '@/lib/api'

export default function AuthPage() {
  const router = useRouter()

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

  return <AuthScreen onAuthSuccess={handleAuthSuccess} />
}
