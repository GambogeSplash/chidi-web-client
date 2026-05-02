'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

// Legacy route. The dedicated WhatsApp page duplicated Inbox functionality in a
// divergent (dark) theme; we now route everything through the unified Inbox
// surface, filtered by channel.
export default function WhatsAppPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  useEffect(() => {
    router.replace(`/dashboard/${slug}?tab=inbox&channel=WHATSAPP`)
  }, [router, slug])

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-[var(--chidi-text-muted)] animate-spin" />
    </div>
  )
}
