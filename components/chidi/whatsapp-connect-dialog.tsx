'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { WhatsAppIcon } from '@/components/ui/channel-icons'
import { whatsappAPI, type WhatsAppSetupStatus } from '@/lib/api/whatsapp'
import { useFacebookSDK } from '@/lib/hooks/use-facebook-sdk'

type SetupStep = 'initial' | 'launching' | 'confirm' | 'completing' | 'polling' | 'success' | 'error'

interface WhatsAppConnectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function WhatsAppConnectDialog({
  open,
  onOpenChange,
  onSuccess,
}: WhatsAppConnectDialogProps) {
  const [step, setStep] = useState<SetupStep>('initial')
  const [error, setError] = useState<string | null>(null)
  
  // Embedded Signup data from Meta
  const [wabaId, setWabaId] = useState<string | null>(null)
  const [phoneNumberId, setPhoneNumberId] = useState<string | null>(null)
  
  // User-provided data
  const [phoneNumber, setPhoneNumber] = useState('')
  const [displayName, setDisplayName] = useState('')
  
  // Setup status polling
  const [setupStatus, setSetupStatus] = useState<WhatsAppSetupStatus | null>(null)
  const [pollCount, setPollCount] = useState(0)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const { launchEmbeddedSignup, isLoading: sdkLoading, error: sdkError } = useFacebookSDK()

  const resetState = useCallback(() => {
    setStep('initial')
    setError(null)
    setWabaId(null)
    setPhoneNumberId(null)
    setPhoneNumber('')
    setDisplayName('')
    setSetupStatus(null)
    setPollCount(0)
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!open) {
      resetState()
    }
  }, [open, resetState])

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  const handleLaunchEmbeddedSignup = async () => {
    try {
      setStep('launching')
      setError(null)

      const config = await whatsappAPI.getProviderConfig()

      const result = await launchEmbeddedSignup({
        appId: config.meta_app_id,
        configId: config.embedded_signup_config_id,
      })

      setWabaId(result.waba_id)
      setPhoneNumberId(result.phone_number_id)
      setStep('confirm')
    } catch (err: any) {
      console.error('Embedded Signup failed:', err)
      setError(err.message || 'Failed to complete Meta authorization')
      setStep('error')
    }
  }

  const handleCompleteSetup = async () => {
    if (!wabaId || !phoneNumberId || !phoneNumber || !displayName) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setStep('completing')
      setError(null)

      const status = await whatsappAPI.completeSetup({
        waba_id: wabaId,
        phone_number: phoneNumber,
        meta_phone_number_id: phoneNumberId,
        display_name: displayName,
        ai_enabled: true,
        after_hours_only: false,
      })

      setSetupStatus(status)

      if (status.connected) {
        setStep('success')
        onSuccess?.()
      } else {
        setStep('polling')
        startPolling()
      }
    } catch (err: any) {
      console.error('Complete setup failed:', err)
      setError(err.message || 'Failed to complete WhatsApp setup')
      setStep('error')
    }
  }

  const startPolling = useCallback(() => {
    setPollCount(0)

    pollIntervalRef.current = setInterval(async () => {
      try {
        const status = await whatsappAPI.getSetupStatus()
        setSetupStatus(status)
        setPollCount((prev) => prev + 1)

        if (status.connected || status.sender_status === 'ONLINE') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          setStep('success')
          onSuccess?.()
        } else if (status.sender_status === 'FAILED' || status.error_message) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          setError(status.error_message || 'WhatsApp registration failed')
          setStep('error')
        }
      } catch (err: any) {
        console.error('Status poll failed:', err)
      }
    }, 4000)

    setTimeout(() => {
      if (pollIntervalRef.current && step === 'polling') {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
        setError('Setup is taking longer than expected. Please check back later.')
        setStep('error')
      }
    }, 180000)
  }, [onSuccess, step])

  const handleClose = () => {
    if (step === 'polling') {
      // Allow closing while polling - setup continues in background
    }
    onOpenChange(false)
  }

  const renderContent = () => {
    switch (step) {
      case 'initial':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-[var(--chidi-text-primary)]">Connect WhatsApp Business</DialogTitle>
              <DialogDescription className="text-[var(--chidi-text-secondary)]">
                Connect your WhatsApp Business account to start receiving and responding to customer messages.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-[#25D366]/10 flex items-center justify-center mb-4">
                  <WhatsAppIcon size={32} className="text-[#25D366]" />
                </div>
                <h3 className="text-base font-medium text-[var(--chidi-text-primary)] mb-2">
                  Meta Embedded Signup
                </h3>
                <p className="text-sm text-[var(--chidi-text-secondary)] max-w-sm mb-4">
                  You'll be redirected to Meta to authorize your WhatsApp Business account. 
                  This is a secure process that lets Chidi send and receive messages on your behalf.
                </p>
                <div className="bg-[var(--chidi-surface)] rounded-lg p-3 w-full text-left">
                  <p className="text-xs font-medium text-[var(--chidi-text-muted)] mb-2">What you'll need:</p>
                  <ul className="text-xs text-[var(--chidi-text-secondary)] space-y-1">
                    <li>• A Meta Business account</li>
                    <li>• A phone number for WhatsApp Business</li>
                    <li>• Your business display name</li>
                  </ul>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-[var(--chidi-border-subtle)] text-[var(--chidi-text-secondary)]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleLaunchEmbeddedSignup}
                className="bg-[#25D366] hover:bg-[#25D366]/90 text-white"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Continue with Meta
              </Button>
            </DialogFooter>
          </>
        )

      case 'launching':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-[var(--chidi-text-primary)]">Connecting to Meta...</DialogTitle>
            </DialogHeader>
            <div className="py-12 flex flex-col items-center">
              <Loader2 className="w-10 h-10 animate-spin text-[#25D366] mb-4" />
              <p className="text-sm text-[var(--chidi-text-secondary)]">
                Complete the authorization in the popup window
              </p>
            </div>
          </>
        )

      case 'confirm':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-[var(--chidi-text-primary)]">Confirm Your Details</DialogTitle>
              <DialogDescription className="text-[var(--chidi-text-secondary)]">
                Enter your WhatsApp Business phone number and display name.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800">
                  Meta authorization successful!
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-[var(--chidi-text-primary)]">
                  WhatsApp Phone Number
                </Label>
                <Input
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                  className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)]"
                />
                <p className="text-xs text-[var(--chidi-text-muted)]">
                  Enter your phone number with country code (e.g., +234 for Nigeria)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-[var(--chidi-text-primary)]">
                  Business Display Name
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Business Name"
                  className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)]"
                />
                <p className="text-xs text-[var(--chidi-text-muted)]">
                  This name will appear to customers in WhatsApp
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-[var(--chidi-border-subtle)] text-[var(--chidi-text-secondary)]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCompleteSetup}
                disabled={!phoneNumber || !displayName}
                className="bg-[#25D366] hover:bg-[#25D366]/90 text-white"
              >
                Complete Setup
              </Button>
            </DialogFooter>
          </>
        )

      case 'completing':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-[var(--chidi-text-primary)]">Setting Up WhatsApp...</DialogTitle>
            </DialogHeader>
            <div className="py-12 flex flex-col items-center">
              <Loader2 className="w-10 h-10 animate-spin text-[#25D366] mb-4" />
              <p className="text-sm text-[var(--chidi-text-secondary)]">
                Creating your WhatsApp Business connection...
              </p>
            </div>
          </>
        )

      case 'polling':
        const progress = Math.min(pollCount * 10, 90)
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-[var(--chidi-text-primary)]">Registering WhatsApp Sender...</DialogTitle>
              <DialogDescription className="text-[var(--chidi-text-secondary)]">
                This may take a minute. Please wait while we complete the registration.
              </DialogDescription>
            </DialogHeader>
            <div className="py-8 space-y-6">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-[#25D366]/10 flex items-center justify-center mb-4">
                  <Loader2 className="w-8 h-8 animate-spin text-[#25D366]" />
                </div>
                <p className="text-sm text-[var(--chidi-text-secondary)] mb-4">
                  Status: {setupStatus?.sender_status || 'CREATING'}
                </p>
                <Progress value={progress} className="w-full h-2" />
              </div>
              <div className="bg-[var(--chidi-surface)] rounded-lg p-3 text-center">
                <p className="text-xs text-[var(--chidi-text-muted)]">
                  Phone: {setupStatus?.phone_number || phoneNumber}
                </p>
                <p className="text-xs text-[var(--chidi-text-muted)]">
                  Display Name: {setupStatus?.display_name || displayName}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-[var(--chidi-border-subtle)] text-[var(--chidi-text-secondary)]"
              >
                Close (setup continues in background)
              </Button>
            </DialogFooter>
          </>
        )

      case 'success':
        return (
          <>
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--chidi-text-primary)] mb-2">
                WhatsApp Connected!
              </h3>
              <p className="text-sm text-[var(--chidi-text-secondary)] max-w-xs mb-4">
                Your WhatsApp Business number is ready to receive messages from customers.
              </p>
              <div className="bg-[var(--chidi-surface)] rounded-lg p-3 w-full mb-4">
                <p className="text-xs text-[var(--chidi-text-muted)] mb-1">Connected number</p>
                <p className="text-sm font-medium text-[var(--chidi-text-primary)]">
                  {setupStatus?.phone_number || phoneNumber}
                </p>
              </div>
              <div className="bg-[var(--chidi-surface)] rounded-lg p-3 w-full">
                <p className="text-xs text-[var(--chidi-text-muted)] mb-1">Next step</p>
                <p className="text-sm text-[var(--chidi-text-primary)]">
                  Make sure you have products in your inventory so Chidi can help customers with their questions.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleClose}
                className="w-full bg-[var(--chidi-accent)] hover:bg-[var(--chidi-accent)]/90 text-white"
              >
                Done
              </Button>
            </DialogFooter>
          </>
        )

      case 'error':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-[var(--chidi-text-primary)]">Connection Failed</DialogTitle>
            </DialogHeader>
            <div className="py-6">
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error || 'An unexpected error occurred'}</AlertDescription>
              </Alert>
              <p className="text-sm text-[var(--chidi-text-secondary)]">
                Please try again. If the problem persists, contact support.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-[var(--chidi-border-subtle)] text-[var(--chidi-text-secondary)]"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  resetState()
                  setStep('initial')
                }}
                className="bg-[#25D366] hover:bg-[#25D366]/90 text-white"
              >
                Try Again
              </Button>
            </DialogFooter>
          </>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-[var(--chidi-border-subtle)] sm:max-w-md">
        {renderContent()}
      </DialogContent>
    </Dialog>
  )
}
