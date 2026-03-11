'use client'

import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { UserSettings } from '@/components/settings'

export default function SettingsPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const section = searchParams.get('section')

  // Auth is handled by dashboard layout - we're guaranteed to be authenticated here

  const handleClose = () => {
    router.push(`/dashboard/${slug}`)
  }

  return (
    <div className="min-h-screen bg-[var(--chidi-surface)]">
      <UserSettings onClose={handleClose} scrollToSection={section} />
    </div>
  )
}
