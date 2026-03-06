'use client'

import { useState, useEffect } from 'react'
import { 
  Bot, 
  Clock, 
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TelegramIcon } from '@/components/ui/channel-icons'
import { 
  messagingAPI, 
  type ConnectionStatusResponse
} from '@/lib/api/messaging'

export function TelegramSettings() {
  const [status, setStatus] = useState<ConnectionStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConnectDialog, setShowConnectDialog] = useState(false)
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const [botToken, setBotToken] = useState('')

  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await messagingAPI.getConnectionStatus('TELEGRAM')
      setStatus(data)
    } catch (err) {
      console.error('Failed to load Telegram status:', err)
      setStatus({ connected: false, channel_type: 'TELEGRAM' })
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    if (!botToken) {
      setError('Please enter your Telegram bot token')
      return
    }

    try {
      setSaving(true)
      setError(null)
      
      await messagingAPI.connectTelegram(botToken)
      await loadStatus()
      setShowConnectDialog(false)
      setBotToken('')
    } catch (err: any) {
      console.error('Failed to connect Telegram:', err)
      setError(err.response?.data?.detail || 'Failed to connect Telegram')
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      setSaving(true)
      setError(null)
      await messagingAPI.disconnectChannel('TELEGRAM')
      await loadStatus()
      setShowDisconnectDialog(false)
    } catch (err: any) {
      console.error('Failed to disconnect Telegram:', err)
      setError(err.response?.data?.detail || 'Failed to disconnect Telegram')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleAI = async (enabled: boolean) => {
    try {
      setSaving(true)
      setError(null)
      await messagingAPI.updateChannelSettings('TELEGRAM', { ai_enabled: enabled })
      setStatus(prev => prev ? { ...prev, ai_enabled: enabled } : null)
    } catch (err: any) {
      console.error('Failed to update AI setting:', err)
      setError(err.response?.data?.detail || 'Failed to update setting')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleAfterHours = async (enabled: boolean) => {
    try {
      setSaving(true)
      setError(null)
      await messagingAPI.updateChannelSettings('TELEGRAM', { after_hours_only: enabled })
      setStatus(prev => prev ? { ...prev, after_hours_only: enabled } : null)
    } catch (err: any) {
      console.error('Failed to update after-hours setting:', err)
      setError(err.response?.data?.detail || 'Failed to update setting')
    } finally {
      setSaving(false)
    }
  }

  const getBotName = () => {
    const metadata = status?.platform_metadata as { bot_username?: string } | undefined
    return metadata?.bot_username ? `@${metadata.bot_username}` : status?.channel_identifier
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--chidi-text-muted)]" />
      </div>
    )
  }

  if (!status?.connected) {
    return (
      <>
        {error && (
          <Alert variant="destructive" className="mb-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <button
          onClick={() => setShowConnectDialog(true)}
          className="w-full flex items-center justify-between p-3 rounded-lg border border-[var(--chidi-border-subtle)] hover:bg-[var(--chidi-surface)] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0088CC]/10 flex items-center justify-center">
              <TelegramIcon size={20} className="text-[#0088CC]" />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm text-[var(--chidi-text-primary)]">Telegram</p>
              <p className="text-xs text-[var(--chidi-text-muted)]">Not connected</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#0088CC] bg-[#0088CC]/10 px-2 py-1 rounded">
              Connect
            </span>
            <ChevronRight className="w-4 h-4 text-[var(--chidi-text-muted)]" />
          </div>
        </button>

        <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
          <DialogContent className="bg-white border-[var(--chidi-border-subtle)]">
            <DialogHeader>
              <DialogTitle className="text-[var(--chidi-text-primary)]">Connect Telegram</DialogTitle>
              <DialogDescription className="text-[var(--chidi-text-secondary)]">
                Enter your Telegram bot token to start receiving messages.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="botToken" className="text-[var(--chidi-text-primary)]">Bot Token</Label>
                <Input
                  id="botToken"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] font-mono text-sm"
                />
                <p className="text-xs text-[var(--chidi-text-muted)]">
                  Get this from @BotFather on Telegram
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowConnectDialog(false)}
                className="border-[var(--chidi-border-subtle)] text-[var(--chidi-text-secondary)]"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConnect}
                disabled={saving || !botToken}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Connect
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between p-3 rounded-lg bg-[#0088CC]/10 border border-[#0088CC]/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#0088CC]/20 flex items-center justify-center">
            <TelegramIcon size={20} className="text-[#0088CC]" />
          </div>
          <div>
            <p className="font-medium text-sm text-[var(--chidi-text-primary)]">Telegram</p>
            <p className="text-xs text-[var(--chidi-text-muted)]">{getBotName()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#0088CC]" />
          <span className="text-xs font-medium text-[#0088CC]">Connected</span>
        </div>
      </div>

      <div className="space-y-0 divide-y divide-[var(--chidi-border-subtle)] border border-[var(--chidi-border-subtle)] rounded-lg">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[var(--chidi-text-muted)]" />
            <span className="text-sm text-[var(--chidi-text-primary)]">AI Responses</span>
          </div>
          <Switch
            checked={status.ai_enabled ?? true}
            onCheckedChange={handleToggleAI}
            disabled={saving}
          />
        </div>
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--chidi-text-muted)]" />
            <span className="text-sm text-[var(--chidi-text-primary)]">After-Hours Only</span>
          </div>
          <Switch
            checked={status.after_hours_only ?? false}
            onCheckedChange={handleToggleAfterHours}
            disabled={saving || !status.ai_enabled}
          />
        </div>
      </div>

      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => setShowDisconnectDialog(true)}
        className="text-[var(--chidi-danger)] hover:text-[var(--chidi-danger)] hover:bg-[var(--chidi-danger)]/5 w-full justify-start"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Disconnect Telegram
      </Button>

      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent className="bg-white border-[var(--chidi-border-subtle)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--chidi-text-primary)]">Disconnect Telegram?</DialogTitle>
            <DialogDescription className="text-[var(--chidi-text-secondary)]">
              This will disconnect your Telegram bot from Chidi. 
              All conversation history will be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDisconnectDialog(false)}
              className="border-[var(--chidi-border-subtle)] text-[var(--chidi-text-secondary)]"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDisconnect}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
