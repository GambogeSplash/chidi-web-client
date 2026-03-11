import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-[var(--chidi-accent)] animate-spin mx-auto mb-4" />
        <p className="text-[var(--chidi-text-muted)] text-sm">Loading...</p>
      </div>
    </div>
  )
}
