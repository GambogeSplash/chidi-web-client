"use client"

import { useState, useEffect } from 'react'
import { Brain, Lightbulb, History, Cog, Trash2, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { memoriesAPI, type MemoryItem, type MemoryType } from '@/lib/api/memories'
import { cn } from '@/lib/utils'

interface MemorySettingsProps {
  businessId: string
}

const MEMORY_TYPE_CONFIG: Record<MemoryType, { label: string; icon: typeof Brain; color: string }> = {
  episodic: {
    label: 'Episodic',
    icon: History,
    color: 'text-blue-600 bg-blue-50',
  },
  semantic: {
    label: 'Semantic',
    icon: Lightbulb,
    color: 'text-purple-600 bg-purple-50',
  },
  procedural: {
    label: 'Procedural',
    icon: Cog,
    color: 'text-green-600 bg-green-50',
  },
}

function getImportanceLabel(score: number): { label: string; color: string } {
  if (score >= 0.7) return { label: 'High', color: 'bg-red-100 text-red-700' }
  if (score >= 0.4) return { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' }
  return { label: 'Low', color: 'bg-gray-100 text-gray-600' }
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffDays > 0) return `${diffDays}d ago`
  if (diffHours > 0) return `${diffHours}h ago`
  if (diffMinutes > 0) return `${diffMinutes}m ago`
  return 'Just now'
}

export function MemorySettings({ businessId }: MemorySettingsProps) {
  const [activeTab, setActiveTab] = useState<'all' | MemoryType>('all')
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const limit = 20

  useEffect(() => {
    if (businessId) {
      loadMemories(true)
    }
  }, [businessId, activeTab])

  const loadMemories = async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true)
        setOffset(0)
      } else {
        setLoadingMore(true)
      }
      setError(null)

      const newOffset = reset ? 0 : offset
      const memoryType = activeTab === 'all' ? undefined : activeTab

      const response = await memoriesAPI.list({
        limit,
        offset: newOffset,
        memory_type: memoryType,
      })

      if (reset) {
        setMemories(response.memories)
      } else {
        setMemories(prev => [...prev, ...response.memories])
      }
      setTotal(response.total)
      setOffset(newOffset + response.memories.length)
    } catch (err) {
      console.error('Failed to load memories:', err)
      setError('Failed to load memories')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const handleDelete = async (memoryId: string) => {
    if (!confirm('Are you sure you want to delete this memory? This action cannot be undone.')) {
      return
    }

    try {
      setDeletingId(memoryId)
      await memoriesAPI.delete(memoryId)
      setMemories(prev => prev.filter(m => m.id !== memoryId))
      setTotal(prev => prev - 1)
    } catch (err) {
      console.error('Failed to delete memory:', err)
      setError('Failed to delete memory')
    } finally {
      setDeletingId(null)
    }
  }

  const handleLoadMore = () => {
    loadMemories(false)
  }

  const hasMore = memories.length < total

  if (loading) {
    return (
      <div className="space-y-3 py-2" aria-busy="true" aria-label="Loading memory">
        <div className="grid grid-cols-4 gap-1 p-1 bg-[var(--chidi-surface)] rounded-lg">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-7 chidi-skeleton" />
          ))}
        </div>
        <div className="space-y-2 mt-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-[var(--chidi-border-subtle)] rounded-lg p-3 flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-lg chidi-skeleton flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-3/4 chidi-skeleton" />
                <div className="h-3 w-full chidi-skeleton" />
                <div className="flex gap-2 mt-1">
                  <div className="h-3 w-12 chidi-skeleton" />
                  <div className="h-3 w-16 chidi-skeleton" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadMemories(true)}
            className="text-red-700 hover:text-red-800"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | MemoryType)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="text-xs">
            All ({total})
          </TabsTrigger>
          <TabsTrigger value="episodic" className="text-xs flex items-center gap-1">
            <History className="w-3 h-3" />
            Episodic
          </TabsTrigger>
          <TabsTrigger value="semantic" className="text-xs flex items-center gap-1">
            <Lightbulb className="w-3 h-3" />
            Semantic
          </TabsTrigger>
          <TabsTrigger value="procedural" className="text-xs flex items-center gap-1">
            <Cog className="w-3 h-3" />
            Procedural
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {memories.length === 0 ? (
            <EmptyState activeTab={activeTab} />
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {memories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  onDelete={handleDelete}
                  isDeleting={deletingId === memory.id}
                />
              ))}

              {hasMore && (
                <div className="pt-2 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="min-h-[44px] sm:min-h-0"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      `Load More (${memories.length} of ${total})`
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Memory Card Component
function MemoryCard({
  memory,
  onDelete,
  isDeleting,
}: {
  memory: MemoryItem
  onDelete: (id: string) => void
  isDeleting: boolean
}) {
  const typeConfig = MEMORY_TYPE_CONFIG[memory.memory_type]
  const importance = getImportanceLabel(memory.importance_score)
  const Icon = typeConfig.icon

  return (
    <div className="bg-white border border-[var(--chidi-border-subtle)] rounded-lg p-3 hover:border-[var(--chidi-border-default)] transition-colors">
      <div className="flex items-start gap-3">
        {/* Type Icon */}
        <div className={cn('p-2 rounded-lg flex-shrink-0', typeConfig.color)}>
          <Icon className="w-4 h-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {memory.summary ? (
                <>
                  <h4 className="font-medium text-sm text-[var(--chidi-text-primary)] line-clamp-1">
                    {memory.summary}
                  </h4>
                  <p className="text-xs text-[var(--chidi-text-muted)] mt-0.5 line-clamp-2">
                    {memory.content}
                  </p>
                </>
              ) : (
                <p className="text-sm text-[var(--chidi-text-primary)] line-clamp-2">
                  {memory.content}
                </p>
              )}
            </div>

            {/* Delete Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[var(--chidi-text-muted)] hover:text-red-600 flex-shrink-0"
              onClick={() => onDelete(memory.id)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>

          {/* Meta Info */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={cn('text-xs px-1.5 py-0.5 rounded', importance.color)}>
              {importance.label}
            </span>
            <span className="text-xs text-[var(--chidi-text-muted)]">
              {formatTimeAgo(memory.created_at)}
            </span>
            {memory.access_count > 0 && (
              <span className="text-xs text-[var(--chidi-text-muted)]">
                • Used {memory.access_count}x
              </span>
            )}
            {memory.source_type && (
              <span className="text-xs text-[var(--chidi-text-muted)]">
                • {memory.source_type}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Empty State Component
function EmptyState({ activeTab }: { activeTab: 'all' | MemoryType }) {
  const getMessage = () => {
    switch (activeTab) {
      case 'episodic':
        return 'No episodic memories yet.'
      case 'semantic':
        return 'No semantic memories yet.'
      case 'procedural':
        return 'No procedural memories yet.'
      default:
        return 'No memories yet. They build as you use Chidi.'
    }
  }

  return (
    <div className="text-center py-12 border border-dashed border-[var(--chidi-border-subtle)] rounded-lg">
      <Brain className="w-12 h-12 mx-auto text-[var(--chidi-text-muted)] mb-3" />
      <p className="text-sm text-[var(--chidi-text-muted)] max-w-xs mx-auto">
        {getMessage()}
      </p>
    </div>
  )
}
