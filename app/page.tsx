'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI } from '@/lib/api'
import { Loader2 } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      console.log('🏠 [HOME] Starting authentication check and routing...')
      
      try {
        const isAuth = authAPI.isAuthenticated()
        console.log('🔐 [HOME] Authentication status:', isAuth)
        
        if (!isAuth) {
          console.log('🚪 [HOME] No authentication found, redirecting to /auth')
          router.push('/auth')
          return
        }

        console.log('👤 [HOME] Getting user data to determine routing...')
        const user = await authAPI.getMe()
        
        // Check if user needs onboarding
        if (!user.businessName) {
          console.log('📝 [HOME] User needs onboarding, redirecting to /onboarding')
          router.push('/onboarding')
        } else {
          console.log('📊 [HOME] User setup complete, redirecting to /dashboard')
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('❌ [HOME] Auth check failed:', error)
        console.log('🚪 [HOME] Redirecting to /auth due to error')
        router.push('/auth')
      }
    }

    checkAuthAndRedirect()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Redirecting...</p>
      </div>
    </div>
  )
}
