'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { authAPI, type User } from '@/lib/api'
import { Loader2 } from 'lucide-react'
import { AuthContext } from '@/lib/providers/dashboard-auth-context'

function AuthLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--chidi-accent)]" />
        <p className="text-[var(--chidi-text-secondary)] text-sm">Loading...</p>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    let mounted = true

    const checkAuth = async () => {
      try {
        // Quick check if token exists
        if (!authAPI.isAuthenticated()) {
          if (mounted) {
            router.replace('/auth')
          }
          return
        }

        // Verify token is valid by fetching user data
        const userData = await authAPI.getMe()
        
        if (!mounted) return

        setUser(userData)

        // Check if user needs onboarding
        if (!userData.businessName) {
          router.replace('/onboarding')
          return
        }

        // Extract slug from current path and validate
        const pathParts = pathname.split('/')
        const slugIndex = pathParts.indexOf('dashboard') + 1
        const currentSlug = pathParts[slugIndex]

        if (currentSlug && userData.businessSlug && currentSlug !== userData.businessSlug) {
          router.replace(`/dashboard/${userData.businessSlug}`)
          return
        }

        setAuthChecked(true)
      } catch (error) {
        console.error('Auth check failed:', error)
        if (mounted) {
          authAPI.clearAllAuthData()
          router.replace('/auth')
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    checkAuth()

    return () => {
      mounted = false
    }
  }, [router, pathname])

  // Show loading skeleton until auth check completes
  if (isLoading || !authChecked) {
    return <AuthLoadingSkeleton />
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}
