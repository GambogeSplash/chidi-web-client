'use client'

import { useState, useEffect } from 'react'
import { 
  Wifi, 
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
import { WhatsAppIcon } from '@/components/ui/channel-icons'
import { 
  whatsappAPI, 
  type WhatsAppStatus
} from '@/lib/api/whatsapp'

export function WhatsAppSettings() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConnectDialog, setShowConnectDialog] = useState(false)
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')

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

  const handleConnect = async () => {
    if (!phoneNumber) {
      setError('Please enter your WhatsApp number')
      return
    }

    try {
      setSaving(true)
      setError(null)
      
      await whatsappAPI.connect({
        twilio_phone_number: phoneNumber,
        ai_enabled: true,
        after_hours_only: false,
      })
      await loadStatus()
      setShowConnectDialog(false)
      setPhoneNumber('')
    } catch (err: any) {
      console.error('Failed to connect WhatsApp:', err)
      setError(err.response?.data?.detail || 'Failed to connect WhatsApp')
    } finally {
      setSaving(false)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--chidi-text-muted)]" />
      </div>
    )
  }

  // Not connected - compact connect row
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

        <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
          <DialogContent className="bg-white border-[var(--chidi-border-subtle)]">
            <DialogHeader>
              <DialogTitle className="text-[var(--chidi-text-primary)]">Connect WhatsApp</DialogTitle>
              <DialogDescription className="text-[var(--chidi-text-secondary)]">
                Enter your WhatsApp Business phone number to start receiving messages.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-[var(--chidi-text-primary)]">WhatsApp Number</Label>
                <Input
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                  className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)]"
                />
                <p className="text-xs text-[var(--chidi-text-muted)]">
                  Your Twilio WhatsApp-enabled phone number (with country code)
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
                disabled={saving || !phoneNumber}
                className="bg-green-600 hover:bg-green-700 text-white"
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

  // Connected state - compact layout
  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Connection status row */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-[#25D366]/10 border border-[#25D366]/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#25D366]/20 flex items-center justify-center">
            <WhatsAppIcon size={20} className="text-[#25D366]" />
          </div>
          <div>
            <p className="font-medium text-sm text-[var(--chidi-text-primary)]">WhatsApp</p>
            <p className="text-xs text-[var(--chidi-text-muted)]">{status.phone_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#25D366]" />
          <span className="text-xs font-medium text-[#25D366]">Connected</span>
        </div>
      </div>

      {/* AI Settings - compact toggles */}
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

      {/* Disconnect button */}
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
              This will disconnect your WhatsApp Business number from Chidi. 
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
