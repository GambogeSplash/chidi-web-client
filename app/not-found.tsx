import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[var(--background)]">
      {/* Subtle background */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(-45deg, #F7F5F3, #F0EEEB, #F5F0E8, #F7F5F3)',
            backgroundSize: '400% 400%',
          }}
        />
        <div 
          className="absolute inset-0 opacity-[0.2]"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(55, 50, 47, 0.3) 1px, transparent 1px)`,
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

          {/* 404 indicator */}
          <div className="mb-4">
            <span className="text-6xl font-bold text-[var(--chidi-text-muted)]">404</span>
          </div>

          {/* Message */}
          <h1 className="text-xl font-semibold text-[var(--chidi-text-primary)] mb-2">
            Page not found
          </h1>
          <p className="text-[var(--chidi-text-secondary)] mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>

          {/* CTA */}
          <Button 
            asChild
            className="btn-cta transition-all duration-300"
          >
            <Link href="/" className="inline-flex items-center gap-2">
              <Home className="w-4 h-4" />
              Back to home
            </Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
