'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

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

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#fafafa]">
      {/* Subtle background */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(-45deg, #fafafa, #f5f5f0, #faf8f5, #f8f8f8)',
            backgroundSize: '400% 400%',
          }}
        />
        <div 
          className="absolute inset-0 opacity-[0.3]"
          style={{
            backgroundImage: `radial-gradient(circle, #d4d4d4 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Content */}
      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-8">
        <div className="text-center max-w-md">
          {/* Logo */}
          <div className="mb-8">
            <Image
              src="/logo.png"
              alt="Chidi"
              width={80}
              height={80}
              className="mx-auto opacity-60"
              priority
            />
          </div>

          {/* Error indicator */}
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-[var(--chidi-danger)]/10 flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
          </div>

          {/* Message */}
          <h1 className="text-xl font-semibold text-[var(--chidi-text-primary)] mb-2">
            Something went wrong
          </h1>
          <p className="text-[var(--chidi-text-secondary)] mb-8">
            An unexpected error occurred. Please try again.
          </p>

          {/* CTA */}
          <Button 
            onClick={reset}
            className="bg-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)] hover:bg-[var(--chidi-accent)]/90"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Button>
        </div>
      </main>
    </div>
  )
}
