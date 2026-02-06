'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { UserSettings } from '@/components/settings'
import { authAPI } from '@/lib/api'
import { Loader2 } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check authentication
    if (!authAPI.isAuthenticated()) {
      router.push('/auth')
      return
    }
    setIsLoading(false)
  }, [router])

  const handleClose = () => {
    router.push(`/dashboard/${slug}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--chidi-text-muted)]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--chidi-surface)]">
      <UserSettings onClose={handleClose} />
    </div>
  )
}
