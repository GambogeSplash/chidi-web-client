'use client'

import { useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { ChidiAvatar } from '@/components/chidi/chidi-mark'
import { errorOwnership, errorRecovery } from '@/lib/chidi/voice'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  // Pick a Chidi-voice line — different ones each time so it doesn't feel canned.
  const ownership = useMemo(() => errorOwnership(), [])

  return (
    <div className="min-h-screen relative overflow-hidden bg-[var(--background)]">
      {/* Subtle warm-paper background */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(-45deg, #F7F5F3, #F0EEEB, #F5F0E8, #F7F5F3)',
            backgroundSize: '400% 400%',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(55, 50, 47, 0.3) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-6">
            <ChidiAvatar size="lg" tone="default" />
          </div>

          <p className="ty-meta text-[var(--chidi-text-muted)] mb-3">Hiccup</p>
          <h1 className="ty-page-title text-[var(--chidi-text-primary)] mb-3">
            {ownership}
          </h1>
          <p className="ty-body-voice text-[var(--chidi-text-secondary)] mb-8 leading-relaxed">
            {errorRecovery()}
          </p>

          <div className="flex items-center justify-center gap-2">
            <Button
              onClick={reset}
              className="btn-cta transition-all duration-300"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try again
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/')}
              className="border-[var(--chidi-border-default)]"
            >
              Take me home
            </Button>
          </div>

          {error.digest && (
            <p className="text-[10px] text-[var(--chidi-text-muted)] font-chidi-voice mt-8 tabular-nums">
              ref · {error.digest}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
