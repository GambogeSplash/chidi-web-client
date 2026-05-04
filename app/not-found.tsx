import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, Compass } from 'lucide-react'
import { ArcFace } from '@/components/chidi/arc-face'
import { EmptyArt } from '@/components/chidi/empty-art'

export default function NotFound() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[var(--background)]">
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
          <EmptyArt
            variant="search"
            size={120}
            className="text-[var(--chidi-text-muted)] mx-auto mb-6"
          />

          <div className="flex justify-center mb-4">
            <ArcFace size={28} className="text-[var(--chidi-text-primary)]" />
          </div>

          <p className="ty-meta text-[var(--chidi-text-muted)] mb-2 tabular-nums">404</p>
          <h1 className="ty-page-title text-[var(--chidi-text-primary)] mb-3">
            Hmm — I can't find that page.
          </h1>
          <p className="ty-body-voice text-[var(--chidi-text-secondary)] mb-8 leading-relaxed">
            Either the link is wrong, or it moved while I wasn't looking. Let me get you back on the road.
          </p>

          <div className="flex items-center justify-center gap-2">
            <Button
              asChild
              className="btn-cta transition-all duration-300"
            >
              <Link href="/" className="inline-flex items-center gap-2">
                <Home className="w-4 h-4" />
                Take me home
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-[var(--chidi-border-default)]"
            >
              <Link href="/auth" className="inline-flex items-center gap-2">
                <Compass className="w-4 h-4" />
                Sign in
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
