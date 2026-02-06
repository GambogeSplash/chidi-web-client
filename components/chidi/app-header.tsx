"use client"

import { Settings } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"

interface AppHeaderProps {
  showSettings?: boolean
}

export function AppHeader({ showSettings = true }: AppHeaderProps) {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const handleSettingsClick = () => {
    if (slug) {
      router.push(`/dashboard/${slug}/settings`)
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[var(--chidi-border-subtle)] safe-area-top">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--chidi-text-primary)]">
          chidi
        </h1>
        
        {showSettings && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSettingsClick}
            className="h-9 w-9 text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)]"
          >
            <Settings className="w-5 h-5" />
            <span className="sr-only">Settings</span>
          </Button>
        )}
      </div>
    </header>
  )
}
