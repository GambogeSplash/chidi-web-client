"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  CheckCircle2,
  Loader2,
  Search,
  RefreshCw,
  MessageCircle,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  ExternalLink,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  type ChannelConversation,
  type ConversationStatus,
  type ChannelType,
  getChannelInfo,
  formatCustomerId,
} from "@/lib/api/messaging"
import {
  useConnections,
  useConversations,
  useConnectTelegram,
  useResolveConversation,
  messagingKeys,
} from "@/lib/hooks/use-messaging"
import { toast } from "sonner"
import { Clock, X as XIcon } from "lucide-react"
import { ChannelChat } from "./channel-chat"
import { WhatsAppConnectDialog } from "./whatsapp-connect-dialog"
import { WhatsAppIcon, TelegramIcon } from "@/components/ui/channel-icons"
import { cn } from "@/lib/utils"
import { buildVoiceContext, emptyInboxMood } from "@/lib/chidi/voice"
import { CustomerCharacter } from "./customer-character"
import { EmptyArt } from "./empty-art"
import { EmptyState } from "./empty-state"
import { PullToRefresh } from "./pull-to-refresh"
import {
  Popover as SnoozePopover,
  PopoverContent as SnoozePopoverContent,
  PopoverTrigger as SnoozePopoverTrigger,
} from "@/components/ui/popover"
import {
  SNOOZE_PRESETS,
  formatSnoozeUntil,
  getActiveSnoozes,
  snoozeConversation,
  subscribe as subscribeSnoozes,
  sweepExpired,
  unsnoozeConversation,
  type SnoozePresetId,
  type SnoozeStore,
} from "@/lib/chidi/snoozed"
import { addNotification } from "@/lib/chidi/notifications"

interface InboxViewProps {
  onViewCustomerOrders?: (customerName: string) => void
  onOpenOrder?: (orderId: string) => void
  onAskChidiAboutCustomer?: (customerName: string) => void
}

export function InboxView({ onViewCustomerOrders, onOpenOrder, onAskChidiAboutCustomer }: InboxViewProps = {}) {
  const queryClient = useQueryClient()
  const [selectedConversation, setSelectedConversation] = useState<ChannelConversation | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [channelFilter, setChannelFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  // Multi-select: cmd/ctrl-click a row to add it to the selection set;
  // bulk-action toolbar appears when count > 0. Selection clears on filter
  // change so it never leaks into the wrong context.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  // Snoozed conversations — local-only; subscribed below. Kept here so the
  // status filter chip + per-row badge can read it without an extra query.
  const [snoozes, setSnoozes] = useState<SnoozeStore>({})
  const [snoozePickerOpen, setSnoozePickerOpen] = useState(false)

  // Connection dialog state
  const [showChannelPicker, setShowChannelPicker] = useState(false)
  const [showWhatsAppConnectDialog, setShowWhatsAppConnectDialog] = useState(false)
  const [showTelegramConnectDialog, setShowTelegramConnectDialog] = useState(false)
  const [botToken, setBotToken] = useState('')
  const [connectError, setConnectError] = useState<string | null>(null)
  const [connectionSuccess, setConnectionSuccess] = useState(false)

  // React Query hooks. "SNOOZED" is a UI-only pseudo status — never sent
  // upstream because the snooze store lives in localStorage. Always fetch the
  // real set and filter client-side.
  const { data: connections, isLoading: checkingConnection } = useConnections()
  const status =
    statusFilter !== "all" && statusFilter !== "SNOOZED"
      ? (statusFilter as ConversationStatus)
      : undefined
  const channel = channelFilter !== "all" ? channelFilter as ChannelType : undefined
  
  const hasAnyConnection = connections && connections.total > 0
  
  const {
    data: conversationsData,
    isLoading: loadingConversations,
    isRefetching,
    isError: conversationsError,
  } = useConversations(status, channel)
  
  const connectTelegram = useConnectTelegram()
  const resolveConversation = useResolveConversation()

  // Snooze: subscribe to the local store + sweep expired snoozes every 30s.
  // When a snooze expires we (a) refetch the conversation list (the thread
  // reappears at the top by recency) and (b) dispatch
  // `chidi:snooze-returned`. The notifications producer listens for that and
  // writes a "back in your {channel} inbox" notification — single source of
  // truth so we never double-fire.
  useEffect(() => {
    setSnoozes(getActiveSnoozes())
    const unsub = subscribeSnoozes(setSnoozes)

    const tick = () => {
      const expired = sweepExpired()
      if (!expired.length) return
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(status, channel) })
      for (const e of expired) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("chidi:snooze-returned", {
              detail: {
                conversationId: e.conversationId,
                customerName: e.customerName,
                channel: e.channel,
              },
            }),
          )
        }
      }
    }

    tick()
    let id: ReturnType<typeof setInterval> | null = null
    const start = () => {
      if (id != null) return
      id = setInterval(tick, 30_000)
    }
    const stop = () => {
      if (id == null) return
      clearInterval(id)
      id = null
    }
    if (typeof document !== "undefined" && document.visibilityState === "visible") start()
    const onVis = () => {
      if (typeof document === "undefined") return
      if (document.visibilityState === "visible") {
        tick()
        start()
      } else {
        stop()
      }
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVis)
    }
    return () => {
      stop()
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVis)
      }
      unsub()
    }
  }, [queryClient, status, channel])

  // Bulk action handlers — fan out to per-conversation mutations.
  const handleBulkResolve = async () => {
    const ids = Array.from(selectedIds)
    if (!ids.length) return
    const count = ids.length
    try {
      await Promise.all(ids.map((id) => resolveConversation.mutateAsync({ conversationId: id, returnToAi: true })))
      toast.success(`${count} ${count === 1 ? "conversation" : "conversations"} resolved`, {
        description: "Handed back to Chidi.",
      })
      setSelectedIds(new Set())
    } catch (err) {
      toast.error("Couldn't resolve some conversations", { description: "Try again or pick smaller batches." })
    }
  }

  const applyBulkSnooze = (until: Date, label: string) => {
    const ids = Array.from(selectedIds)
    if (!ids.length) return
    const conversationsById = new Map(conversations.map((c) => [c.id, c] as const))
    for (const id of ids) {
      const conv = conversationsById.get(id)
      snoozeConversation(id, until, {
        label,
        channel: conv?.channel_type,
        customerName: conv?.customer_name ?? undefined,
      })
    }
    const count = ids.length
    toast(`${count} ${count === 1 ? "conversation" : "conversations"} snoozed`, {
      description: `I'll quiet ${count === 1 ? "it" : "them"} until ${formatSnoozeUntil(until)}.`,
      action: {
        label: "Undo",
        onClick: () => {
          for (const id of ids) unsnoozeConversation(id)
          toast("Snooze undone")
        },
      },
    })
    addNotification("chidi_action_taken", {
      title: `Snoozed ${count} ${count === 1 ? "thread" : "threads"} until ${formatSnoozeUntil(until)}`,
    })
    setSelectedIds(new Set())
    setSnoozePickerOpen(false)
  }

  const handleSnoozePreset = (presetId: SnoozePresetId) => {
    if (presetId === "custom") {
      const raw = typeof window !== "undefined" ? window.prompt("Snooze for how many hours?", "8") : null
      const hours = raw ? Number(raw) : NaN
      if (!isFinite(hours) || hours <= 0) return
      applyBulkSnooze(new Date(Date.now() + hours * 3_600_000), `${hours}h`)
      return
    }
    const preset = SNOOZE_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    const until = preset.resolve()
    if (!until) return
    applyBulkSnooze(until, preset.label)
  }

  const clearSelection = () => setSelectedIds(new Set())

  const conversations = conversationsData?.conversations ?? []
  const needsHumanCount = conversationsData?.needs_human_count ?? 0

  // Available channels configuration
  const availableChannels: { type: ChannelType; name: string; icon: React.ReactNode; color: string; description: string }[] = [
    { type: 'WHATSAPP', name: 'WhatsApp', icon: <WhatsAppIcon size={24} className="text-[#25D366]" />, color: '#25D366', description: 'Connect via Twilio' },
    { type: 'TELEGRAM', name: 'Telegram', icon: <TelegramIcon size={24} className="text-[#0088CC]" />, color: '#0088CC', description: 'Connect your bot' },
  ]

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(status, channel) })
  }

  const handleSelectChannel = (channelType: ChannelType) => {
    setShowChannelPicker(false)
    if (channelType === 'WHATSAPP') {
      setShowWhatsAppConnectDialog(true)
    } else if (channelType === 'TELEGRAM') {
      setShowTelegramConnectDialog(true)
      setConnectError(null)
    }
  }

  const handleTelegramConnect = async () => {
    if (!botToken) {
      setConnectError('Please enter your Telegram bot token')
      return
    }

    setConnectError(null)

    connectTelegram.mutate(botToken, {
      onSuccess: () => {
        setConnectionSuccess(true)
        setBotToken('')
      },
      onError: (err: any) => {
        setConnectError(err.response?.data?.detail || 'Failed to connect Telegram')
      },
    })
  }

  const handleCloseTelegramConnectDialog = () => {
    setShowTelegramConnectDialog(false)
    setConnectError(null)
    setConnectionSuccess(false)
    setBotToken('')
  }

  const handleWhatsAppConnectionSuccess = () => {
    queryClient.invalidateQueries({ queryKey: messagingKeys.connections() })
  }

  const handleConversationClick = (conversation: ChannelConversation) => {
    setSelectedConversation(conversation)
  }

  const handleBackToList = () => {
    setSelectedConversation(null)
    queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(status, channel) })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString()
  }

  const showingSnoozed = statusFilter === "SNOOZED"
  const snoozedCount = useMemo(
    () => conversations.filter((c) => snoozes[c.id]).length,
    [conversations, snoozes],
  )

  const filteredConversations = conversations.filter(conv => {
    // Snoozed view shows ONLY snoozed; default view hides snoozed conversations
    // so they don't compete for attention with live work.
    const snoozed = !!snoozes[conv.id]
    if (showingSnoozed) {
      if (!snoozed) return false
    } else if (snoozed) {
      return false
    }
    if (!searchQuery) return true
    const customerId = formatCustomerId(conv.customer_id, conv.channel_type).toLowerCase()
    const name = (conv.customer_name || "").toLowerCase()
    const query = searchQuery.toLowerCase()
    return customerId.includes(query) || name.includes(query)
  })

  // Sort: NEEDS_HUMAN pinned to top (Front pattern), then by recency.
  // Resolved threads sink so they don't compete with live work.
  const sortedConversations = useMemo(
    () =>
      [...filteredConversations].sort((a, b) => {
        const aNeeds = a.status === "NEEDS_HUMAN" ? 0 : a.status === "RESOLVED" ? 2 : 1
        const bNeeds = b.status === "NEEDS_HUMAN" ? 0 : b.status === "RESOLVED" ? 2 : 1
        if (aNeeds !== bNeeds) return aNeeds - bNeeds
        return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
      }),
    [filteredConversations],
  )

  const hasMultipleChannels = (connections?.connections.length ?? 0) > 1

  const isConnecting = connectTelegram.isPending
  const loading = loadingConversations && conversations.length === 0

  // Show content-shaped skeleton while checking connection. Reads as the page
  // about-to-arrive instead of an indefinite spinner.
  if (checkingConnection) {
    return (
      <div className="flex-1 flex flex-col bg-[var(--background)]">
        <div className="px-4 lg:px-6 pt-4 lg:pt-5 pb-3 border-b border-[var(--chidi-border-subtle)]">
          <div className="h-5 w-24 chidi-skeleton" />
        </div>
        <div className="flex-1 px-4 lg:px-6 py-3 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full chidi-skeleton flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-32 chidi-skeleton" />
                <div className="h-3 w-3/4 chidi-skeleton" />
              </div>
              <div className="h-3 w-12 chidi-skeleton flex-shrink-0 mt-1" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Show connect channel state if no connections
  if (!hasAnyConnection) {
    return (
      <div className="flex-1 flex flex-col bg-[var(--background)]">
        {/* Header section */}
        <div className="px-4 lg:px-6 pt-4 lg:pt-5 pb-3 border-b border-[var(--chidi-border-subtle)]">
          <h1 className="ty-page-title text-[var(--chidi-text-primary)]">Inbox</h1>
        </div>

        {/* Connect Channel state — uses the standardized EmptyState
            (EmptyArt illustration + ty-page-title + ty-body-voice + btn-cta)
            so it matches Inventory / Orders empty states across the app. */}
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            art="inbox"
            title="Let's plug in your customers."
            description="Connect WhatsApp or Telegram to start receiving messages."
            action={
              <div className="flex flex-col items-center gap-3">
                <Button
                  onClick={() => setShowChannelPicker(true)}
                  className="btn-cta gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  Connect a channel
                </Button>
                <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice">
                  You can change channels later in Settings.
                </p>
              </div>
            }
          />
        </div>

        {/* Channel Picker Dialog — page-style header (eyebrow + serif title)
            matching the rest of the modals. Each channel is a tactile card
            with its branded color band on the left as a visual anchor. */}
        <Dialog open={showChannelPicker} onOpenChange={setShowChannelPicker}>
          <DialogContent className="bg-white border-[var(--chidi-border-default)] sm:max-w-lg p-0 rounded-2xl overflow-hidden">
            <div className="px-6 lg:px-7 pt-6 pb-4 border-b border-[var(--chidi-border-subtle)]">
              <DialogTitle asChild>
                <h2 className="ty-page-title text-[var(--chidi-text-primary)]">
                  Connect a channel
                </h2>
              </DialogTitle>
              <DialogDescription asChild>
                <p className="text-[13px] text-[var(--chidi-text-secondary)] font-chidi-voice mt-1.5">
                  Pick where your customers reach you. You can add more later.
                </p>
              </DialogDescription>
            </div>

            <div className="px-6 lg:px-7 py-5 space-y-2">
              {availableChannels.map((channelOption) => (
                <button
                  key={channelOption.type}
                  onClick={() => handleSelectChannel(channelOption.type)}
                  className="group w-full flex items-center gap-4 p-4 rounded-xl border border-[var(--chidi-border-default)] hover:bg-[var(--chidi-surface)]/50 transition-all text-left active:scale-[0.99]"
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${channelOption.color}15` }}
                  >
                    {channelOption.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[14px] text-[var(--chidi-text-primary)]">
                      {channelOption.name}
                    </div>
                    <div className="text-[12px] text-[var(--chidi-text-muted)] font-chidi-voice mt-0.5">
                      {channelOption.description}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--chidi-text-muted)] group-hover:text-[var(--chidi-text-primary)] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>
              ))}
            </div>

            <div className="px-6 lg:px-7 py-3 border-t border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface)]/30">
              <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice text-center">
                Connecting takes about 2 minutes. No card on file.
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {/* WhatsApp Connect Dialog - uses Embedded Signup */}
        <WhatsAppConnectDialog
          open={showWhatsAppConnectDialog}
          onOpenChange={setShowWhatsAppConnectDialog}
          onSuccess={handleWhatsAppConnectionSuccess}
        />

        {/* Telegram Connect Dialog */}
        <Dialog open={showTelegramConnectDialog} onOpenChange={handleCloseTelegramConnectDialog}>
          <DialogContent className="bg-white border-[var(--chidi-border-subtle)]">
            {connectionSuccess ? (
              <>
                <div className="flex flex-col items-center text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--chidi-text-primary)] mb-2">
                    Telegram Connected!
                  </h3>
                  <p className="text-sm text-[var(--chidi-text-secondary)] max-w-xs mb-4">
                    Your bot is ready to receive messages. Share your bot link with customers to start conversations.
                  </p>
                  <div className="bg-[var(--chidi-surface)] rounded-lg p-3 w-full mb-4">
                    <p className="text-xs text-[var(--chidi-text-muted)] mb-1">Next step</p>
                    <p className="text-sm text-[var(--chidi-text-primary)]">
                      Make sure you have products in your inventory so Chidi can help customers with their questions.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleCloseTelegramConnectDialog}
                    className="btn-cta w-full"
                  >
                    Done
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="text-[var(--chidi-text-primary)]">
                    Connect Telegram
                  </DialogTitle>
                  <DialogDescription className="text-[var(--chidi-text-secondary)]">
                    Enter your Telegram bot token to start receiving messages.
                  </DialogDescription>
                </DialogHeader>
                
                {connectError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{connectError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="botToken" className="text-[var(--chidi-text-primary)]">Bot Token</Label>
                    <Input
                      id="botToken"
                      value={botToken}
                      onChange={(e) => setBotToken(e.target.value)}
                      placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                      className="bg-white border-[var(--chidi-border-default)] text-[var(--chidi-text-primary)] h-11 font-mono text-sm"
                    />
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-1 text-xs text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-secondary)] transition-colors group">
                        <HelpCircle className="w-3 h-3" />
                        <span>How to get your bot token</span>
                        <ChevronDown className="w-3 h-3 transition-transform group-data-[state=open]:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <ol className="text-xs text-[var(--chidi-text-secondary)] space-y-1.5 mt-2 pl-4 list-decimal">
                          <li>Open Telegram and search for <strong>@BotFather</strong></li>
                          <li>Send <code className="bg-[var(--chidi-surface)] px-1 py-0.5 rounded">/newbot</code> and follow the prompts to name your bot</li>
                          <li>BotFather will reply with a token like <code className="bg-[var(--chidi-surface)] px-1 py-0.5 rounded">123456789:ABC...</code></li>
                          <li>Copy that token and paste it here</li>
                        </ol>
                        <a 
                          href="https://t.me/BotFather" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[var(--chidi-accent)] hover:underline mt-2"
                        >
                          Open BotFather
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={handleCloseTelegramConnectDialog}
                    className="border-[var(--chidi-border-default)] text-[var(--chidi-text-secondary)]"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleTelegramConnect}
                    disabled={isConnecting || !botToken}
                    className="btn-cta"
                  >
                    {isConnecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Connect
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Show chat view if conversation is selected
  if (selectedConversation) {
    return (
      <ChannelChat
        conversation={selectedConversation}
        onBack={handleBackToList}
        onConversationUpdate={(updated) => {
          setSelectedConversation(updated)
        }}
        onViewCustomerOrders={onViewCustomerOrders}
        onOpenOrder={onOpenOrder}
        onAskChidiAboutCustomer={onAskChidiAboutCustomer}
      />
    )
  }

  // Get connected channel types for tabs
  const connectedChannels = connections?.connections.map(c => c.channel_type) || []

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)]">
      {/* Header — noun title + inline meta. No conversational subtitle. */}
      <div className="px-4 lg:px-6 pt-4 lg:pt-5 pb-3 border-b border-[var(--chidi-border-subtle)]">
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="min-w-0 flex items-baseline gap-3">
            <h1 className="ty-page-title text-[var(--chidi-text-primary)]">Inbox</h1>
            <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice tabular-nums">
              {conversations.length} {conversations.length === 1 ? "conversation" : "conversations"}
              {needsHumanCount > 0 && (
                <span className="text-[var(--chidi-warning)]"> · {needsHumanCount} need you</span>
              )}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={loading || isRefetching}
            className="h-9 w-9 text-[var(--chidi-text-secondary)] flex-shrink-0"
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw className={cn("w-4 h-4", isRefetching && "animate-spin")} />
          </Button>
        </div>

        {/* Channel filter tabs */}
        {connectedChannels.length > 1 && (
          <Tabs value={channelFilter} onValueChange={setChannelFilter} className="mb-3">
            <TabsList className="h-8 bg-[var(--chidi-surface)] p-0.5">
              <TabsTrigger value="all" className="h-7 text-xs px-3 data-[state=active]:bg-white">
                All
              </TabsTrigger>
              {connectedChannels.map(channelType => {
                const info = getChannelInfo(channelType)
                return (
                  <TabsTrigger 
                    key={channelType} 
                    value={channelType} 
                    className="h-7 text-xs px-3 data-[state=active]:bg-white"
                  >
                    {info.icon} {info.name}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>
        )}

        {/* Search and filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--chidi-text-muted)]" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)]"
            />
          </div>
          {/* Snoozed chip — sits next to the status dropdown so the count is
              always visible and one tap toggles the snoozed-only view. */}
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === "SNOOZED" ? "all" : "SNOOZED")}
            aria-pressed={statusFilter === "SNOOZED"}
            className={cn(
              "h-9 inline-flex items-center gap-1.5 px-3 rounded-md border text-[12px] font-medium transition-colors",
              statusFilter === "SNOOZED"
                ? "bg-[var(--chidi-text-primary)] text-white border-[var(--chidi-text-primary)]"
                : "bg-[var(--chidi-surface)] text-[var(--chidi-text-secondary)] border-[var(--chidi-border-subtle)] hover:text-[var(--chidi-text-primary)]",
            )}
            title="Snoozed conversations"
          >
            <Clock className="w-3.5 h-3.5" />
            Snoozed
            {snoozedCount > 0 && (
              <span
                className={cn(
                  "ml-0.5 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] tabular-nums font-semibold",
                  statusFilter === "SNOOZED"
                    ? "bg-white/25 text-white"
                    : "bg-[var(--chidi-text-primary)]/10 text-[var(--chidi-text-primary)]",
                )}
              >
                {snoozedCount}
              </span>
            )}
          </button>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px] h-9 bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent className="bg-white border-[var(--chidi-border-default)]">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="NEEDS_HUMAN">Needs attention</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="SNOOZED">Snoozed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Conversation List — wrapped in pull-to-refresh on mobile */}
      <PullToRefresh
        onRefresh={async () => {
          await queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(status, channel) })
        }}
        disabled={typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches}
      >
      <div className="flex-1 overflow-auto">
        {conversationsError && !loading ? (
          <div className="mx-4 lg:mx-6 mt-4 rounded-lg border border-[var(--chidi-warning)]/30 bg-[var(--chidi-warning)]/8 p-3 flex items-center justify-between gap-3">
            <p className="text-[13px] text-[var(--chidi-text-primary)] font-chidi-voice">
              Couldn't load conversations.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="h-8 px-3 text-[12px] font-chidi-voice text-[var(--chidi-text-primary)] hover:bg-white"
            >
              Try again
            </Button>
          </div>
        ) : null}
        {loading ? (
          <ul className="divide-y divide-[var(--chidi-border-subtle)]" aria-label="Loading conversations">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="px-4 lg:px-6 py-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full chidi-skeleton flex-shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 w-32 chidi-skeleton" />
                    <div className="h-3 w-3/4 chidi-skeleton" />
                  </div>
                  <div className="h-3 w-12 chidi-skeleton flex-shrink-0 mt-1" />
                </div>
              </li>
            ))}
          </ul>
        ) : sortedConversations.length === 0 ? (
          searchQuery ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 lg:px-6">
              <EmptyArt variant="search" size={120} className="text-[var(--chidi-text-muted)] mb-5" />
              <h3 className="ty-page-title text-[var(--chidi-text-primary)] mb-2">
                Nothing matched that.
              </h3>
              <p className="ty-body-voice text-[var(--chidi-text-secondary)] text-center max-w-sm">
                Try a different name, number, or filter.
              </p>
            </div>
          ) : (
            <InboxQuietState
              channelCount={connections?.connections.length ?? 0}
              voiceLine={emptyInboxMood(buildVoiceContext())}
            />
          )
        ) : (
          <>
            {/* Bulk-actions toolbar — sticky, slides in when count > 0 */}
            {selectedIds.size > 0 && (
              <div className="sticky top-0 z-20 bg-[var(--chidi-win)]/10 border-b border-[var(--chidi-win)]/30 px-4 lg:px-6 py-2 flex items-center justify-between gap-3 chidi-list-in">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold tabular-nums text-[var(--chidi-text-primary)]">
                    {selectedIds.size} selected
                  </span>
                  <button
                    onClick={clearSelection}
                    className="text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] p-0.5 rounded"
                    aria-label="Clear selection"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleBulkResolve}
                    disabled={resolveConversation.isPending}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[var(--chidi-text-primary)] hover:bg-[var(--card)] transition-colors disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Resolve
                  </button>
                  <SnoozePopover open={snoozePickerOpen} onOpenChange={setSnoozePickerOpen}>
                    <SnoozePopoverTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setSnoozePickerOpen(true)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[var(--chidi-text-secondary)] hover:bg-[var(--card)] transition-colors"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Snooze
                      </button>
                    </SnoozePopoverTrigger>
                    <SnoozePopoverContent
                      align="end"
                      sideOffset={6}
                      className="w-60 p-1 bg-white border-[var(--chidi-border-default)] shadow-lg rounded-xl"
                    >
                      <p className="px-2.5 pt-2 pb-1.5 text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium">
                        Quiet for
                      </p>
                      <ul className="space-y-0.5">
                        {SNOOZE_PRESETS.map((p) => {
                          const u = p.id !== "custom" ? p.resolve() : null
                          return (
                            <li key={p.id}>
                              <button
                                type="button"
                                onClick={() => handleSnoozePreset(p.id)}
                                className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-[12.5px] text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] text-left"
                              >
                                <span>{p.label}</span>
                                {u && (
                                  <span className="text-[10px] tabular-nums text-[var(--chidi-text-muted)]">
                                    {formatSnoozeUntil(u)}
                                  </span>
                                )}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </SnoozePopoverContent>
                  </SnoozePopover>
                </div>
              </div>
            )}
          <ul className="divide-y divide-[var(--chidi-border-subtle)]">
            {sortedConversations.map((conversation, idx) => {
              const isNeedsHuman = conversation.status === "NEEDS_HUMAN"
              const isResolved = conversation.status === "RESOLVED"
              const isUnread = conversation.unread_count > 0
              const snoozeEntry = snoozes[conversation.id]
              const channelInfo = conversation.channel_type
                ? getChannelInfo(conversation.channel_type)
                : null
              const displayName =
                conversation.customer_name ||
                formatCustomerId(conversation.customer_id, conversation.channel_type)
              const peek = conversation.last_message_preview ||
                (conversation.last_intent && conversation.last_intent !== "UNKNOWN"
                  ? conversation.last_intent.replace(/_/g, " ").toLowerCase()
                  : "")

              const isSelected = selectedIds.has(conversation.id)
              const inSelectMode = selectedIds.size > 0
              return (
                <li
                  key={conversation.id}
                  className="chidi-list-in"
                  style={{ animationDelay: `${Math.min(idx, 12) * 28}ms` }}
                >
                  <button
                    onClick={(e) => {
                      // Cmd/Ctrl-click → toggle selection. Plain click while in
                      // select mode also toggles (faster than always holding cmd).
                      if (e.metaKey || e.ctrlKey || inSelectMode) {
                        e.preventDefault()
                        setSelectedIds((s) => {
                          const next = new Set(s)
                          if (next.has(conversation.id)) next.delete(conversation.id)
                          else next.add(conversation.id)
                          return next
                        })
                        return
                      }
                      handleConversationClick(conversation)
                    }}
                    className={cn(
                      "w-full px-4 lg:px-6 py-3 text-left transition-colors group",
                      isNeedsHuman && !isSelected
                        ? "bg-[var(--chidi-warning)]/5 hover:bg-[var(--chidi-warning)]/10"
                        : "hover:bg-[var(--chidi-surface)]/60",
                      isSelected && "bg-[var(--chidi-win)]/10 hover:bg-[var(--chidi-win)]/15",
                      isResolved && "opacity-70",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Selection checkbox — visible on hover OR always when in select mode */}
                      <button
                        type="button"
                        aria-label={isSelected ? "Deselect conversation" : "Select conversation"}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedIds((s) => {
                            const next = new Set(s)
                            if (next.has(conversation.id)) next.delete(conversation.id)
                            else next.add(conversation.id)
                            return next
                          })
                        }}
                        className={cn(
                          "flex-shrink-0 mt-1 w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
                          isSelected
                            ? "bg-[var(--chidi-win)] border-[var(--chidi-win)]"
                            : "border-[var(--chidi-border-default)] hover:border-[var(--chidi-text-muted)]",
                          inSelectMode || isSelected
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-60",
                        )}
                      >
                        {isSelected && (
                          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3.5-3.5a1 1 0 011.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z" />
                          </svg>
                        )}
                      </button>
                      <div className="relative flex-shrink-0">
                        <CustomerCharacter
                          name={conversation.customer_name}
                          fallbackId={conversation.customer_id}
                          size="md"
                        />
                        {hasMultipleChannels && channelInfo && (
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--background)] flex items-center justify-center"
                            style={{ backgroundColor: channelInfo.color }}
                            title={channelInfo.name}
                            aria-label={channelInfo.name}
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 mb-0.5">
                          <span
                            className={cn(
                              "text-sm truncate",
                              isUnread
                                ? "font-semibold text-[var(--chidi-text-primary)]"
                                : "text-[var(--chidi-text-secondary)]",
                            )}
                          >
                            {displayName}
                          </span>
                          <span className="text-[11px] text-[var(--chidi-text-muted)] tabular-nums flex-shrink-0">
                            {formatTime(conversation.last_activity)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={cn(
                              "text-[13px] truncate min-w-0 font-chidi-voice",
                              isUnread
                                ? "text-[var(--chidi-text-secondary)]"
                                : "text-[var(--chidi-text-muted)]",
                            )}
                          >
                            {peek || (isResolved ? "Resolved" : "No messages yet")}
                          </p>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {snoozeEntry ? (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--chidi-text-primary)]/8 text-[var(--chidi-text-secondary)] font-medium font-chidi-voice whitespace-nowrap"
                                title={`Quiet until ${formatSnoozeUntil(snoozeEntry.until)}`}
                              >
                                <Clock className="w-2.5 h-2.5" />
                                {formatSnoozeUntil(snoozeEntry.until)}
                              </span>
                            ) : isNeedsHuman ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--chidi-warning)]/15 text-[var(--chidi-warning)] font-medium font-chidi-voice whitespace-nowrap">
                                Needs you
                              </span>
                            ) : isUnread ? (
                              <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--chidi-success)] text-white text-[10px] font-medium flex items-center justify-center tabular-nums">
                                {conversation.unread_count}
                              </span>
                            ) : !isResolved ? (
                              <span
                                className="relative flex w-1.5 h-1.5"
                                title="Chidi handling"
                                aria-label="Chidi handling"
                              >
                                <span className="absolute inset-0 rounded-full bg-[var(--chidi-success)] chidi-live-dot opacity-50" />
                                <span className="relative w-1.5 h-1.5 rounded-full bg-[var(--chidi-success)]" />
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
          </>
        )}
      </div>
      </PullToRefresh>
    </div>
  )
}

interface InboxQuietStateProps {
  channelCount: number
  voiceLine: string
}

/**
 * Empty inbox after channels are connected. WhatsApp + Apple Messages both
 * use one warm sentence here, no fake content. We add a tiny live status
 * line ("Listening on N channels") so the merchant knows the wire is hot.
 */
function InboxQuietState({ channelCount, voiceLine }: InboxQuietStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
      <EmptyArt variant="inbox" size={104} className="text-[var(--chidi-text-muted)] mb-5" />
      <h3 className="ty-page-title text-[var(--chidi-text-primary)] mb-2">All quiet.</h3>
      <p className="ty-body-voice text-[var(--chidi-text-secondary)] max-w-sm mb-5">
        {voiceLine}
      </p>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--chidi-surface)] border border-[var(--chidi-border-subtle)]">
        <span className="relative flex w-1.5 h-1.5">
          <span className="absolute inset-0 rounded-full bg-[var(--chidi-success)] chidi-live-dot opacity-50" />
          <span className="relative w-1.5 h-1.5 rounded-full bg-[var(--chidi-success)]" />
        </span>
        <span className="text-[11px] text-[var(--chidi-text-secondary)] font-chidi-voice tabular-nums">
          Listening on {channelCount} {channelCount === 1 ? "channel" : "channels"}
        </span>
      </div>
    </div>
  )
}
