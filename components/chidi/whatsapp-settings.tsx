'use client'

import { useState, useEffect } from 'react'
import { 
  Bot, 
  Clock, 
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  ChevronRight,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { WhatsAppIcon } from '@/components/ui/channel-icons'
import { Skeleton } from '@/components/ui/skeleton'
import {
  whatsappAPI,
  type WhatsAppStatus
} from '@/lib/api/whatsapp'
import { WhatsAppConnectDialog } from './whatsapp-connect-dialog'

export function WhatsAppSettings() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConnectDialog, setShowConnectDialog] = useState(false)
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)

  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await whatsappAPI.getStatus()
      setStatus(data)
    } catch (err) {
      console.error('Failed to load WhatsApp status:', err)
      setError('Failed to load WhatsApp status')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      setSaving(true)
      setError(null)
      await whatsappAPI.disconnect()
      await loadStatus()
      setShowDisconnectDialog(false)
    } catch (err: any) {
      console.error('Failed to disconnect WhatsApp:', err)
      setError(err.response?.data?.detail || 'Failed to disconnect WhatsApp')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleAI = async (enabled: boolean) => {
    try {
      setSaving(true)
      setError(null)
      await whatsappAPI.updateSettings({ ai_enabled: enabled })
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
      await whatsappAPI.updateSettings({ after_hours_only: enabled })
      setStatus(prev => prev ? { ...prev, after_hours_only: enabled } : null)
    } catch (err: any) {
      console.error('Failed to update after-hours setting:', err)
      setError(err.response?.data?.detail || 'Failed to update setting')
    } finally {
      setSaving(false)
    }
  }

  const handleConnectionSuccess = () => {
    loadStatus()
  }

  if (loading) {
    return (
      <div className="w-full" aria-busy>
        <Skeleton className="h-[60px] w-full rounded-lg" />
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
            <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center">
              <WhatsAppIcon size={20} className="text-[#25D366]" />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm text-[var(--chidi-text-primary)]">WhatsApp</p>
              <p className="text-xs text-[var(--chidi-text-muted)]">Not connected</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#25D366] bg-[#25D366]/10 px-2 py-1 rounded">
              Connect
            </span>
            <ChevronRight className="w-4 h-4 text-[var(--chidi-text-muted)]" />
          </div>
        </button>

        <WhatsAppConnectDialog
          open={showConnectDialog}
          onOpenChange={setShowConnectDialog}
          onSuccess={handleConnectionSuccess}
        />
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

      <div className="flex items-center justify-between p-3 rounded-lg bg-[#25D366]/10 border border-[#25D366]/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#25D366]/20 flex items-center justify-center">
            <WhatsAppIcon size={20} className="text-[#25D366]" />
          </div>
          <div>
            <p className="font-medium text-sm text-[var(--chidi-text-primary)]">WhatsApp</p>
            <p className="text-xs text-[var(--chidi-text-muted)]">{status.channel_identifier}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#25D366]" />
          <span className="text-xs font-medium text-[#25D366]">Connected</span>
        </div>
      </div>

      <div className="space-y-0 divide-y divide-[var(--chidi-border-subtle)] border border-[var(--chidi-border-subtle)] rounded-lg">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[var(--chidi-text-muted)]" />
            <span className="text-sm text-[var(--chidi-text-primary)]">AI Responses</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3.5 h-3.5 text-[var(--chidi-text-muted)] cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">When enabled, Chidi automatically replies to customer messages. When disabled, messages appear in your inbox for manual reply.</p>
              </TooltipContent>
            </Tooltip>
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
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3.5 h-3.5 text-[var(--chidi-text-muted)] cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">AI only responds outside your set business hours. During business hours, messages go to your inbox.</p>
              </TooltipContent>
            </Tooltip>
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
        Disconnect WhatsApp
      </Button>

      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent className="bg-white border-[var(--chidi-border-subtle)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--chidi-text-primary)]">Disconnect WhatsApp?</DialogTitle>
            <DialogDescription className="text-[var(--chidi-text-secondary)]">
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
