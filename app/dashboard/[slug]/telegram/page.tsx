'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

// Parallel to /dashboard/{slug}/whatsapp — both channels are first-class.
// The unified Channels surface is the Inbox, filtered by channel, so deep
// links to either channel route both land in the same place with the right
// filter applied.
export default function TelegramPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  useEffect(() => {
    router.replace(`/dashboard/${slug}?tab=inbox&channel=TELEGRAM`)
  }, [router, slug])

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-[var(--chidi-text-muted)] animate-spin" />
    </div>
  )
}
