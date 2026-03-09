"use client"

import { Sparkles } from "lucide-react"
import { type MemoryItem } from "@/lib/api/memories"
import { formatRelativeTime } from "@/lib/api/analytics"
import { useAIObservations } from "@/lib/hooks/use-analytics"

export function AIObservations() {
  const { data, isLoading } = useAIObservations("semantic", 5)
  const memories = data?.memories ?? []

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-[var(--chidi-accent)]" />
          <h3 className="text-sm font-medium text-[var(--chidi-text-primary)]">
            Chidi's Observations
          </h3>
        </div>
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 w-full bg-gray-100 rounded mb-2" />
              <div className="h-3 w-24 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (memories.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-[var(--chidi-accent)]" />
        <h3 className="text-sm font-medium text-[var(--chidi-text-primary)]">
          Chidi's Observations
        </h3>
      </div>
      <div className="space-y-3">
        {memories.map((memory) => (
          <ObservationCard key={memory.id} memory={memory} />
        ))}
      </div>
    </div>
  )
}

interface ObservationCardProps {
  memory: MemoryItem
}

function ObservationCard({ memory }: ObservationCardProps) {
  const title = memory.summary || extractTitle(memory.content)
  const content = memory.summary ? memory.content : extractContent(memory.content)

  return (
    <div className="p-3 bg-[var(--chidi-surface)] rounded-lg">
      <div className="text-sm text-[var(--chidi-text-primary)] font-medium mb-1">
        {title}
      </div>
      {content && content !== title && (
        <div className="text-xs text-[var(--chidi-text-secondary)] line-clamp-2 mb-2">
          {content}
        </div>
      )}
      <div className="text-xs text-[var(--chidi-text-muted)]">
        {formatRelativeTime(memory.created_at)}
      </div>
    </div>
  )
}

function extractTitle(content: string): string {
  const lines = content.split('\n')
  const firstLine = lines[0]?.trim() || content
  return firstLine.length > 80 ? firstLine.slice(0, 80) + '...' : firstLine
}

function extractContent(content: string): string {
  const lines = content.split('\n')
  if (lines.length > 1) {
    return lines.slice(1).join(' ').trim()
  }
  return ''
}
