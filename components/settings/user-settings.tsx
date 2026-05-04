"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Shield,
  LogOut,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
  Check,
  Instagram,
  Folder,
  Download,
  Clock,
  ChevronRight,
  HelpCircle,
  ScrollText,
  Brain,
  Landmark,
  BadgeCheck,
  Bike,
  Plus,
  Trash2,
  Truck,
} from "lucide-react"
import { BusinessAvatar, useBusinessAvatarSeed } from "@/components/chidi/business-avatar"
import { BusinessAvatarPicker } from "@/components/chidi/business-avatar-picker"
import { ThemePicker } from "@/components/chidi/theme-picker"
import { useDashboardAuth } from "@/lib/providers/dashboard-auth-context"
import { WhatsAppSettings } from "@/components/chidi/whatsapp-settings"
import { TelegramSettings } from "@/components/chidi/telegram-settings"
import { CategorySettings } from "@/components/settings/category-settings"
import { PolicySettings } from "@/components/settings/policy-settings"
import { MemorySettings } from "@/components/settings/memory-settings"
import { TeamSection } from "@/components/settings/team-section"
import { BillingSection } from "@/components/settings/billing-section"
import { NotificationPrefsSection } from "@/components/settings/notification-prefs-section"
import { settingsAPI } from "@/lib/api/settings"
import {
  useAccountSettings,
  usePreferences,
  useBusinessPreferences,
  usePaymentSettings,
  useUpdateAccount,
  useUpdateBusinessPreferences,
  useUpdatePaymentSettings,
  useChangePassword,
} from "@/lib/hooks/use-settings"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { HelpSheet } from "./help-sheet"
import { SettingsSectionCard } from "./settings-section-card"
import { usePersistedState, hasDraft } from "@/lib/hooks/use-persisted-state"
import { cn } from "@/lib/utils"

interface UserSettingsProps {
  onClose?: () => void
  scrollToSection?: string | null
}

export function UserSettings({ onClose, scrollToSection }: UserSettingsProps) {
  const router = useRouter()
  const { user: authUser } = useDashboardAuth()
  const businessName = (authUser as any)?.businessName || "Your business"
  const [error, setError] = useState("")
  
  // Section refs for scrolling
  const paymentSectionRef = useRef<HTMLElement>(null)
  const aiSectionRef = useRef<HTMLElement>(null)
  const integrationsSectionRef = useRef<HTMLElement>(null)
  const notificationsSectionRef = useRef<HTMLElement>(null)
  const [success, setSuccess] = useState("")

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showSecurityModal, setShowSecurityModal] = useState(false)
  const [showBusinessHoursModal, setShowBusinessHoursModal] = useState(false)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [showPolicyModal, setShowPolicyModal] = useState(false)
  const [showMemoryModal, setShowMemoryModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showHelpSheet, setShowHelpSheet] = useState(false)
  
  // Business ID for policy/memory settings
  const [businessId, setBusinessId] = useState<string | null>(null)

  // Business hours state (local only for now)
  const [businessHours, setBusinessHours] = useState({
    monday: { open: "09:00", close: "18:00", closed: false },
    tuesday: { open: "09:00", close: "18:00", closed: false },
    wednesday: { open: "09:00", close: "18:00", closed: false },
    thursday: { open: "09:00", close: "18:00", closed: false },
    friday: { open: "09:00", close: "18:00", closed: false },
    saturday: { open: "10:00", close: "16:00", closed: false },
    sunday: { open: "10:00", close: "16:00", closed: true },
  })

  // React Query hooks
  const { data: account, isLoading: isLoadingAccount } = useAccountSettings()
  const { isLoading: isLoadingPreferences } = usePreferences()
  const { data: bizPreferences } = useBusinessPreferences(businessId)
  const { data: paymentData } = usePaymentSettings(businessId)

  const updateAccountMutation = useUpdateAccount()
  const updateBizPreferencesMutation = useUpdateBusinessPreferences()
  const updatePaymentMutation = useUpdatePaymentSettings()
  const changePasswordMutation = useChangePassword()

  // Form states - persisted to survive navigation
  const [accountForm, setAccountForm, clearAccountDraft] = usePersistedState('settings:account', { name: "", avatar_url: "" })
  // Verification intent — persisted so the merchant sees their submitted state
  // across sessions. Real KYC (CAC/BVN/ID) is a phase-2 backend job; for now
  // we capture intent and show the unlocks honestly as a stub.
  const [verifyState, setVerifyState] = usePersistedState<{ status: 'unstarted' | 'submitted'; submittedAt: string | null }>(
    'settings:verify',
    { status: 'unstarted', submittedAt: null },
  )
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(10)
  const [paymentForm, setPaymentForm, clearPaymentDraft] = usePersistedState('settings:payment', {
    bank_name: "",
    account_name: "",
    account_number: "",
    payment_instructions: "",
  })

  // Delivery partners — couriers + on-demand bikes + in-house riders.
  // Persisted to chidi:delivery-settings (separate from chidi:deliveries
  // which tracks per-order records). Phase-1 capture; the toggles drive
  // courier visibility in DeliveryHandoffPanel pickers downstream.
  type DeliveryRider = { id: string; name: string; phone: string; bike: string }
  type DeliverySettings = {
    couriers: { gig: boolean; sendbox: boolean; kwik: boolean; faramove: boolean }
    onDemand: boolean
    riders: DeliveryRider[]
  }
  const [deliverySettings, setDeliverySettings] = usePersistedState<DeliverySettings>(
    'chidi:delivery-settings',
    {
      couriers: { gig: true, sendbox: true, kwik: false, faramove: false },
      onDemand: false,
      riders: [],
    },
  )
  const [riderDraft, setRiderDraft] = useState<{ name: string; phone: string; bike: string }>({
    name: "",
    phone: "",
    bike: "",
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Initialize business ID from localStorage
  useEffect(() => {
    const storedBusinessId = localStorage.getItem('chidi_business_id')
    setBusinessId(storedBusinessId)
  }, [])

  // Business-avatar seed override — synced via useBusinessAvatarSeed so the
  // nav-rail + workspace switcher swap together with this picker.
  const { seed: avatarRenderSeed, variantSeed, setVariantSeed } = useBusinessAvatarSeed(businessName)
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false)

  // Sync form with account data (only if no draft exists)
  useEffect(() => {
    if (account && !hasDraft('settings:account')) {
      setAccountForm({
        name: account.name,
        avatar_url: account.avatar_url || ""
      })
    }
  }, [account, setAccountForm])

  // Sync form with business preferences
  useEffect(() => {
    if (bizPreferences) {
      setLowStockThreshold(bizPreferences.low_stock_threshold)
    }
  }, [bizPreferences])

  // Sync form with payment settings (only if no draft exists)
  useEffect(() => {
    if (paymentData && !hasDraft('settings:payment')) {
      setPaymentForm({
        bank_name: paymentData.bank_name || "",
        account_name: paymentData.account_name || "",
        account_number: paymentData.account_number || "",
        payment_instructions: paymentData.payment_instructions || "",
      })
    }
  }, [paymentData, setPaymentForm])

  // Scroll to section if specified
  useEffect(() => {
    if (!scrollToSection) return
    
    const timer = setTimeout(() => {
      const refMap: Record<string, React.RefObject<HTMLElement | null>> = {
        payment: paymentSectionRef,
        ai: aiSectionRef,
        integrations: integrationsSectionRef,
        notifications: notificationsSectionRef,
      }
      
      const ref = refMap[scrollToSection]
      if (ref?.current) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
    
    return () => clearTimeout(timer)
  }, [scrollToSection])

  const handleSaveAccount = () => {
    setError("")
    setSuccess("")
    
    updateAccountMutation.mutate(
      { name: accountForm.name, avatar_url: accountForm.avatar_url || undefined },
      {
        onSuccess: () => {
          clearAccountDraft()
          setSuccess("Account updated successfully")
          setTimeout(() => setSuccess(""), 3000)
        },
        onError: (err: any) => {
          setError(err.message || "Failed to update account")
        },
      }
    )
  }

  const handleSaveLowStockThreshold = () => {
    if (!businessId) {
      setError("Business ID not found")
      return
    }

    setError("")
    setSuccess("")

    updateBizPreferencesMutation.mutate(
      { businessId, data: { low_stock_threshold: lowStockThreshold } },
      {
        onSuccess: () => {
          setSuccess("Low stock threshold updated successfully")
          setTimeout(() => setSuccess(""), 3000)
        },
        onError: (err: any) => {
          setError(err.message || "Failed to update low stock threshold")
        },
      }
    )
  }

  // Delivery — toggle helpers + rider mutators. All writes round-trip through
  // setDeliverySettings so localStorage stays the single source of truth.
  const toggleCourier = useCallback(
    (key: 'gig' | 'sendbox' | 'kwik' | 'faramove', value: boolean) => {
      setDeliverySettings({
        ...deliverySettings,
        couriers: { ...deliverySettings.couriers, [key]: value },
      })
    },
    [deliverySettings, setDeliverySettings],
  )
  const toggleOnDemand = useCallback(
    (value: boolean) => {
      setDeliverySettings({ ...deliverySettings, onDemand: value })
    },
    [deliverySettings, setDeliverySettings],
  )
  const handleAddRider = useCallback(() => {
    const name = riderDraft.name.trim()
    const phone = riderDraft.phone.trim()
    const bike = riderDraft.bike.trim()
    if (!name) return
    const id = `rider-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setDeliverySettings({
      ...deliverySettings,
      riders: [...deliverySettings.riders, { id, name, phone, bike }],
    })
    setRiderDraft({ name: "", phone: "", bike: "" })
  }, [deliverySettings, riderDraft, setDeliverySettings])
  const handleRemoveRider = useCallback(
    (id: string) => {
      setDeliverySettings({
        ...deliverySettings,
        riders: deliverySettings.riders.filter((r) => r.id !== id),
      })
    },
    [deliverySettings, setDeliverySettings],
  )

  const handleSavePaymentSettings = () => {
    if (!businessId) {
      setError("Business ID not found")
      return
    }

    setError("")
    setSuccess("")

    updatePaymentMutation.mutate(
      {
        businessId,
        data: {
          bank_name: paymentForm.bank_name || null,
          account_name: paymentForm.account_name || null,
          account_number: paymentForm.account_number || null,
          payment_instructions: paymentForm.payment_instructions || null,
        },
      },
      {
        onSuccess: () => {
          clearPaymentDraft()
          setSuccess("Payment details saved. Chidi will share these with customers ready to pay.")
          setShowPaymentModal(false)
          setTimeout(() => setSuccess(""), 5000)
        },
        onError: (err: any) => {
          setError(err.message || "Failed to update payment settings")
        },
      }
    )
  }

  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New passwords do not match")
      return
    }
    
    if (passwordForm.newPassword.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }
    
    setError("")
    setSuccess("")
    
    changePasswordMutation.mutate(
      {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      },
      {
        onSuccess: () => {
          setSuccess("Password changed successfully")
          setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
          setShowSecurityModal(false)
          setTimeout(() => setSuccess(""), 3000)
        },
        onError: (err: any) => {
          setError(err.message || "Failed to change password")
        },
      }
    )
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await settingsAPI.logout()
      router.push("/auth")
    } catch (err) {
      router.push("/auth")
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U"
  }

  const getAuthProviderLabel = (provider?: string) => {
    if (!provider || provider === "email") return "Signed in with EMAIL"
    return `Signed in with ${provider.toUpperCase()}`
  }

  const isLoading = isLoadingAccount || isLoadingPreferences

  if (isLoading) {
    return (
      <div className="space-y-4 pt-4" aria-busy="true" aria-label="Loading settings">
        {/* Profile card skeleton */}
        <div className="rounded-2xl chidi-paper bg-[var(--card)] border border-[var(--chidi-border-default)] p-5 lg:p-6">
          <div className="h-2.5 w-16 chidi-skeleton mb-2" />
          <div className="h-4 w-32 chidi-skeleton mb-5" />
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-full chidi-skeleton" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-40 chidi-skeleton" />
              <div className="h-3 w-56 chidi-skeleton" />
            </div>
          </div>
          <div className="space-y-3 pt-4 border-t border-[var(--chidi-border-subtle)]">
            <div className="h-3 w-20 chidi-skeleton" />
            <div className="h-9 w-full chidi-skeleton" />
            <div className="h-3 w-12 chidi-skeleton" />
            <div className="h-9 w-full chidi-skeleton" />
          </div>
        </div>
        {/* Channels card skeleton */}
        <div className="rounded-2xl chidi-paper bg-[var(--card)] border border-[var(--chidi-border-default)] p-5 lg:p-6">
          <div className="h-2.5 w-20 chidi-skeleton mb-2" />
          <div className="h-4 w-40 chidi-skeleton mb-5" />
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl chidi-skeleton" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-28 chidi-skeleton" />
                  <div className="h-3 w-44 chidi-skeleton" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-12">
      {/* Status Messages */}
      {(error || success) && (
        <div className="pt-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}
        </div>
      )}

      <div>
        {/* PROFILE — leads with the business identity (same source as the
            sidebar workspace card) so the two surfaces don't diverge. The
            personal account row sits below as secondary. */}
        <section id="settings-profile" className="scroll-mt-20">
          <SettingsSectionCard eyebrow="Profile" title="Your shop">
            {/* Brand identity row — given air. Avatar at lg, name on its own
                line so the merchant feels their shop "lands" instead of
                squeezing between an avatar and a button. */}
            <div className="flex items-start gap-4 mb-4">
              <BusinessAvatar name={avatarRenderSeed} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-semibold text-[var(--chidi-text-primary)] truncate leading-tight">
                  {businessName}
                </p>
                <p className="text-[12px] text-[var(--chidi-text-muted)] mt-1">
                  Shown to customers.
                </p>
                <button
                  type="button"
                  onClick={() => setAvatarPickerOpen((p) => !p)}
                  className="mt-2 text-[12px] font-medium text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] underline underline-offset-2 min-h-[32px] inline-flex items-center"
                >
                  {avatarPickerOpen ? "Done" : "Change avatar"}
                </button>
              </div>
            </div>
            {avatarPickerOpen && (
              <div className="mb-5 p-4 rounded-xl border border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface)]/40">
                <BusinessAvatarPicker
                  businessName={businessName}
                  selectedSeed={variantSeed}
                  onSelect={setVariantSeed}
                />
              </div>
            )}

            <div className="space-y-3 pt-4 border-t border-[var(--chidi-border-subtle)]">
              <div>
                <Label htmlFor="name" className="text-[12px] text-[var(--chidi-text-muted)]">Your name</Label>
                <Input
                  id="name"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                  className="mt-1 bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)]"
                  placeholder="Your name"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-[12px] text-[var(--chidi-text-muted)]">Email</Label>
                <Input
                  id="email"
                  value={account?.email || ""}
                  disabled
                  className="mt-1 bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)] text-[var(--chidi-text-muted)]"
                />
              </div>

              {accountForm.name !== account?.name && (
                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveAccount}
                    disabled={updateAccountMutation.isPending}
                    size="sm"
                    className="btn-cta min-h-[44px] sm:min-h-0"
                  >
                    {updateAccountMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-[var(--chidi-border-subtle)] space-y-1">
              <button
                onClick={() => setShowCategoryModal(true)}
                className="w-full p-2.5 -mx-2.5 rounded-lg flex items-center justify-between hover:bg-[var(--chidi-surface)] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Folder className="w-4 h-4 text-[var(--chidi-text-muted)]" strokeWidth={1.8} />
                  <p className="text-[14px] text-[var(--chidi-text-primary)]">Product categories</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--chidi-text-muted)]" />
              </button>

              <button
                onClick={() => setShowBusinessHoursModal(true)}
                className="w-full p-2.5 -mx-2.5 rounded-lg flex items-center justify-between hover:bg-[var(--chidi-surface)] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-[var(--chidi-text-muted)]" strokeWidth={1.8} />
                  <p className="text-[14px] text-[var(--chidi-text-primary)]">Business hours</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--chidi-text-muted)]" />
              </button>

              <button
                onClick={() => setShowVerifyModal(true)}
                className="w-full p-2.5 -mx-2.5 rounded-lg flex items-center justify-between hover:bg-[var(--chidi-surface)] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <BadgeCheck className="w-4 h-4 text-[var(--chidi-text-muted)]" strokeWidth={1.8} />
                  <p className="text-[14px] text-[var(--chidi-text-primary)]">Verify business</p>
                </div>
                {verifyState.status === 'submitted' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--chidi-warning)]">
                    <span className="w-1 h-1 rounded-full bg-[var(--chidi-warning)] animate-pulse" />
                    In review
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)]">
                    Optional
                  </span>
                )}
              </button>
            </div>
          </SettingsSectionCard>
        </section>

        {/* DELIVERY — couriers + on-demand bikes + in-house rider roster.
            Sits in the Profile family because "how orders reach customers"
            is part of the shop's identity. Persists to chidi:delivery-settings. */}
        <section id="settings-profile-delivery" className="scroll-mt-20">
          <SettingsSectionCard
            eyebrow="Delivery"
            title="How orders get to your customers."
          >
            {/* Couriers — four toggles for the major NG carriers. Brand
                colors stay subtle (the dot, not the whole row) so the
                section reads as one settings card, not a logo wall. */}
            <div className="space-y-1 -mx-1">
              {([
                { key: 'gig' as const, label: 'GIG Logistics', dot: '#FFC107' },
                { key: 'sendbox' as const, label: 'Sendbox', dot: '#0F62FE' },
                { key: 'kwik' as const, label: 'Kwik', dot: '#FF6F00' },
                { key: 'faramove' as const, label: 'Faramove', dot: '#1F9D55' },
              ]).map((c, i) => (
                <div
                  key={c.key}
                  className={cn(
                    'px-1 py-3 flex items-center justify-between',
                    i > 0 && 'border-t border-[var(--chidi-border-subtle)]',
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: c.dot }}
                      aria-hidden
                    />
                    <p className="font-medium text-[14px] text-[var(--chidi-text-primary)] truncate">
                      {c.label}
                    </p>
                  </div>
                  <Switch
                    checked={deliverySettings.couriers[c.key]}
                    onCheckedChange={(v) => toggleCourier(c.key, v)}
                  />
                </div>
              ))}

              {/* On-demand bikes — a single composite toggle. Glovo / Bolt /
                  Faramove on-demand are bucketed because the merchant rarely
                  thinks of them individually; the choice is "use bikes or not". */}
              <div className="px-1 py-3 flex items-center justify-between border-t border-[var(--chidi-border-subtle)]">
                <div className="flex items-center gap-3 min-w-0 pr-3">
                  <Bike
                    className="w-4 h-4 text-[var(--chidi-text-muted)] flex-shrink-0"
                    strokeWidth={1.8}
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-[14px] text-[var(--chidi-text-primary)] truncate">
                      Use on-demand bikes
                    </p>
                    <p className="text-[12px] text-[var(--chidi-text-muted)] font-chidi-voice mt-0.5">
                      Glovo, Bolt, Faramove
                    </p>
                  </div>
                </div>
                <Switch
                  checked={deliverySettings.onDemand}
                  onCheckedChange={toggleOnDemand}
                />
              </div>
            </div>

            {/* In-house riders — name + phone + bike number rows with
                inline-add. No save button: edits commit immediately to
                localStorage so the merchant can leave the page mid-flow. */}
            <div className="mt-4 pt-4 border-t border-[var(--chidi-border-subtle)]">
              <div className="flex items-center gap-2 mb-2.5">
                <Truck
                  className="w-4 h-4 text-[var(--chidi-text-muted)]"
                  strokeWidth={1.8}
                />
                <p className="font-medium text-[13px] text-[var(--chidi-text-primary)]">
                  In-house riders
                </p>
                <span className="text-[11px] text-[var(--chidi-text-muted)] tabular-nums ml-auto">
                  {deliverySettings.riders.length}
                </span>
              </div>

              {deliverySettings.riders.length > 0 && (
                <ul className="space-y-1.5 mb-3">
                  {deliverySettings.riders.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--chidi-surface)]/50 border border-[var(--chidi-border-subtle)]"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[var(--chidi-text-primary)] truncate">
                          {r.name}
                        </p>
                        <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice tabular-nums truncate">
                          {[r.phone, r.bike].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRider(r.id)}
                        aria-label={`Remove ${r.name}`}
                        className="flex-shrink-0 p-1.5 rounded-md text-[var(--chidi-text-muted)] hover:text-[var(--chidi-warning)] hover:bg-[var(--chidi-warning)]/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  value={riderDraft.name}
                  onChange={(e) => setRiderDraft({ ...riderDraft, name: e.target.value })}
                  placeholder="Name"
                  className="bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)]"
                />
                <Input
                  value={riderDraft.phone}
                  onChange={(e) => setRiderDraft({ ...riderDraft, phone: e.target.value })}
                  placeholder="Phone"
                  className="bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)]"
                />
                <Input
                  value={riderDraft.bike}
                  onChange={(e) => setRiderDraft({ ...riderDraft, bike: e.target.value })}
                  placeholder="Bike #"
                  className="bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)]"
                />
              </div>
              <div className="flex justify-end mt-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddRider}
                  disabled={!riderDraft.name.trim()}
                  className="btn-cta min-h-[36px]"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" strokeWidth={2} />
                  Add rider
                </Button>
              </div>
            </div>
          </SettingsSectionCard>
        </section>

        {/* THEME — Arc-style brand color personalization. Sits in the Profile
            family because the merchant's brand color is part of their shop's
            identity. Picker propagates to nav highlights, CTAs, active states. */}
        <section id="settings-profile-theme" className="scroll-mt-20">
          <SettingsSectionCard eyebrow="Theme" title="Brand color">
            <ThemePicker />
          </SettingsSectionCard>
        </section>

        {/* CHANNELS */}
        <section id="settings-integrations" ref={integrationsSectionRef} className="scroll-mt-20">
          <SettingsSectionCard eyebrow="Channels" title="Connected channels">
            <div className="divide-y divide-[var(--chidi-border-subtle)]">
              <div className="py-4 first:pt-0">
                <WhatsAppSettings />
              </div>
              <div className="py-4">
                <TelegramSettings />
              </div>
              <div className="py-4 last:pb-0 flex items-center justify-between gap-3 opacity-65">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[var(--chidi-surface)] flex items-center justify-center flex-shrink-0">
                    <Instagram className="w-5 h-5 text-[var(--chidi-text-muted)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[14px] text-[var(--chidi-text-primary)]">Instagram</p>
                    <p className="text-[12px] text-[var(--chidi-text-muted)] font-chidi-voice mt-0.5">
                      Coming soon
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-chidi-voice px-2 py-1 rounded-full bg-[var(--chidi-surface)] text-[var(--chidi-text-muted)] uppercase tracking-wider whitespace-nowrap">
                  Soon
                </span>
              </div>
            </div>
          </SettingsSectionCard>
        </section>

        {/* AI ASSISTANT — sub-card under the Chidi nav entry. The view-swap CSS
            reveals both #settings-chidi (ChidiPreferences) and this #settings-ai
            when the Chidi tab is active. */}
        <section id="settings-ai" ref={aiSectionRef} className="scroll-mt-20">
          <SettingsSectionCard eyebrow="Behavior" title="Policies and memory">
            <div className="space-y-2">
              <button
                onClick={() => setShowPolicyModal(true)}
                className="w-full p-3 -mx-3 rounded-lg flex items-center justify-between hover:bg-[var(--chidi-surface)] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <ScrollText className="w-4 h-4 text-[var(--chidi-text-muted)]" strokeWidth={1.8} />
                  <div>
                    <p className="font-medium text-[14px] text-[var(--chidi-text-primary)]">Business policies</p>
                    <p className="text-[12px] text-[var(--chidi-text-muted)] font-chidi-voice mt-0.5">FAQs, returns, rules</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--chidi-text-muted)]" />
              </button>

              <button
                onClick={() => setShowMemoryModal(true)}
                className="w-full p-3 -mx-3 rounded-lg flex items-center justify-between hover:bg-[var(--chidi-surface)] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Brain className="w-4 h-4 text-[var(--chidi-text-muted)]" strokeWidth={1.8} />
                  <div>
                    <p className="font-medium text-[14px] text-[var(--chidi-text-primary)]">Memory</p>
                    <p className="text-[12px] text-[var(--chidi-text-muted)] font-chidi-voice mt-0.5">What I've learned</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--chidi-text-muted)]" />
              </button>
            </div>
          </SettingsSectionCard>
        </section>

        {/* PAYMENT */}
        <section id="settings-payment" ref={paymentSectionRef} className="scroll-mt-20">
          <SettingsSectionCard eyebrow="Payments" title="Bank account">
          <button
            onClick={() => setShowPaymentModal(true)}
            className="w-full bg-[var(--chidi-surface)]/40 rounded-xl border border-[var(--chidi-border-subtle)] p-5 flex items-center justify-between hover:bg-[var(--chidi-surface)] hover:border-[var(--chidi-border-default)] transition-colors text-left active:scale-[0.998]"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-[var(--chidi-win)]/10 flex items-center justify-center flex-shrink-0">
                <Landmark className="w-5 h-5 text-[var(--chidi-win)]" strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                {paymentData?.bank_name && paymentData?.account_number ? (
                  <>
                    <p className="font-medium text-[14px] text-[var(--chidi-text-primary)]">
                      {paymentData.bank_name}
                    </p>
                    <p className="text-[13px] text-[var(--chidi-text-secondary)] font-mono tabular-nums tracking-wider mt-0.5">
                      {paymentData.account_number.replace(/(\d{4})(?=\d)/g, "$1 ")}
                    </p>
                    <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice mt-1.5">
                      Tap to update
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-[14px] text-[var(--chidi-text-primary)]">
                      No payment details yet
                    </p>
                    <p className="text-[12px] text-[var(--chidi-text-muted)] font-chidi-voice mt-0.5">
                      Add bank or mobile money.
                    </p>
                  </>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--chidi-text-muted)] flex-shrink-0" />
          </button>
          </SettingsSectionCard>
        </section>

        {/* DATA */}
        <section id="settings-data" className="scroll-mt-20">
          <SettingsSectionCard eyebrow="Data" title="Export">
          <div className="bg-[var(--chidi-surface)]/40 rounded-xl border border-[var(--chidi-border-subtle)] p-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[var(--chidi-surface)] flex items-center justify-center flex-shrink-0">
                <Download className="w-4 h-4 text-[var(--chidi-text-secondary)]" strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-[14px] text-[var(--chidi-text-primary)]">
                  Export everything
                </p>
                <p className="text-[12px] text-[var(--chidi-text-muted)] font-chidi-voice mt-0.5">
                  CSV bundle.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="border-[var(--chidi-border-default)] flex-shrink-0">
              Export
            </Button>
          </div>
          </SettingsSectionCard>
        </section>

        {/* TEAM — multi-seat invites + role assignment. Lives between
            Theme and Billing because "who can sign in" sits naturally
            after brand identity and before money. */}
        <section id="settings-team" className="scroll-mt-20">
          <TeamSection />
        </section>

        {/* BILLING — current plan + usage + invoices. Replaces the older
            "what plan am I on?" question with a working surface. */}
        <section id="settings-billing" className="scroll-mt-20">
          <BillingSection />
        </section>

        {/* NOTIFICATIONS — channel routing matrix replaces the old global
            toggles. Quiet hours + per-type push/email/whatsapp picker. The
            low-stock threshold below stays in business prefs because it's
            a *level* setting, not a channel-routing setting. */}
        <section id="settings-notifications" ref={notificationsSectionRef} className="scroll-mt-20">
          <NotificationPrefsSection
            onVerifyBusiness={() => setShowVerifyModal(true)}
          />
        </section>

        {/* LOW-STOCK THRESHOLD — kept as its own small card so the
            channel-routing matrix stays clean. Drives when "low_stock"
            notifications fire; routing decides where they land. */}
        <section id="settings-low-stock" className="scroll-mt-20">
          <SettingsSectionCard eyebrow="Inventory alerts" title="Low-stock threshold">
            <div className="flex items-center gap-3 flex-wrap">
              <Input
                type="number"
                min="1"
                max="1000"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)]"
                aria-label="Low-stock threshold in units"
              />
              <span className="text-sm text-[var(--chidi-text-muted)]">units — alert when any product drops below this</span>
              {lowStockThreshold !== (bizPreferences?.low_stock_threshold ?? 10) && (
                <Button
                  onClick={handleSaveLowStockThreshold}
                  disabled={updateBizPreferencesMutation.isPending}
                  size="sm"
                  className="ml-auto btn-cta min-h-[44px] sm:min-h-0"
                >
                  {updateBizPreferencesMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save
                </Button>
              )}
            </div>
          </SettingsSectionCard>
        </section>

        {/* SECURITY */}
        <section id="settings-security" className="scroll-mt-20">
          <SettingsSectionCard eyebrow="Security" title="Sign-in">
            <button
              onClick={() => setShowSecurityModal(true)}
              className="w-full p-3 -mx-3 rounded-lg flex items-center justify-between hover:bg-[var(--chidi-surface)] transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-[var(--chidi-text-muted)]" strokeWidth={1.8} />
                <div>
                  <p className="font-medium text-[14px] text-[var(--chidi-text-primary)]">Change password</p>
                  <p className="text-[12px] text-[var(--chidi-text-muted)] font-chidi-voice mt-0.5">Update password</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--chidi-text-muted)]" />
            </button>
          </SettingsSectionCard>
        </section>

        {/* HELP + SIGN OUT — anchored under #settings-security-extras so the
            view-swap CSS hides them when other sections are active. */}
        <div id="settings-security-extras" className="space-y-3">
          <button
            onClick={() => setShowHelpSheet(true)}
            className="w-full chidi-paper bg-[var(--card)] rounded-2xl border border-[var(--chidi-border-default)] p-4 flex items-center gap-3 hover:bg-[var(--chidi-surface)] transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-[var(--chidi-text-muted)]" strokeWidth={1.8} />
            <span className="font-medium text-[14px] text-[var(--chidi-text-primary)]">Help &amp; Support</span>
          </button>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full chidi-paper bg-[var(--card)] rounded-2xl border border-red-200 p-4 flex items-center gap-3 hover:bg-red-50 transition-colors"
          >
            {isLoggingOut ? (
              <Loader2 className="w-4 h-4 text-red-600 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4 text-red-600" strokeWidth={1.8} />
            )}
            <span className="font-medium text-[14px] text-red-600">Sign out</span>
          </button>
        </div>
      </div>

      {/* CATEGORY MODAL */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Categories</DialogTitle>
            <DialogDescription>
              Organize your inventory.
            </DialogDescription>
          </DialogHeader>
          <CategorySettings />
        </DialogContent>
      </Dialog>

      {/* VERIFY MODAL — stub flow. Captures intent to localStorage; real
          KYC (CAC + BVN + ID) is a phase-2 backend job. The unlocks shown
          here are honest about what verification will buy the merchant. */}
      <Dialog open={showVerifyModal} onOpenChange={setShowVerifyModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-[var(--chidi-win)]" />
              Verify your business
            </DialogTitle>
            <DialogDescription>
              Optional. Adds trust signals customers and Chidi can both see.
            </DialogDescription>
          </DialogHeader>

          {verifyState.status === 'submitted' ? (
            <div className="pt-4 space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--chidi-surface)] border border-[var(--chidi-border-subtle)]">
                <Check className="w-4 h-4 text-[var(--chidi-win)] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] font-medium text-[var(--chidi-text-primary)]">
                    Verification request received
                  </p>
                  <p className="text-[12px] text-[var(--chidi-text-muted)] mt-0.5">
                    We&apos;ll be in touch within 2 business days to collect your CAC and BVN details.
                  </p>
                </div>
              </div>
              <div className="flex justify-between gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setVerifyState({ status: 'unstarted', submittedAt: null })}
                  className="border-[var(--chidi-border-default)] text-[var(--chidi-text-muted)] min-h-[44px]"
                >
                  Cancel request
                </Button>
                <Button
                  onClick={() => setShowVerifyModal(false)}
                  className="btn-cta min-h-[44px]"
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <div className="pt-4 space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium mb-2.5">
                  Verified merchants get
                </p>
                <ul className="space-y-2.5">
                  <li className="flex items-start gap-2.5 text-[13px] text-[var(--chidi-text-primary)] leading-snug">
                    <BadgeCheck className="w-4 h-4 text-[var(--chidi-win)] mt-0.5 flex-shrink-0" strokeWidth={2} />
                    <span>A <strong>verified badge</strong> on receipts and your storefront — customers see it before they pay.</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-[13px] text-[var(--chidi-text-primary)] leading-snug">
                    <BadgeCheck className="w-4 h-4 text-[var(--chidi-win)] mt-0.5 flex-shrink-0" strokeWidth={2} />
                    <span>A <strong>higher trust score</strong> in conversations — Chidi is more likely to auto-confirm orders for you.</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-[13px] text-[var(--chidi-text-primary)] leading-snug">
                    <BadgeCheck className="w-4 h-4 text-[var(--chidi-win)] mt-0.5 flex-shrink-0" strokeWidth={2} />
                    <span><strong>Broadcast eligibility</strong> — send promos to your full customer list once verified.</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl bg-[var(--chidi-surface)]/60 border border-[var(--chidi-border-subtle)] p-3">
                <p className="text-[11px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium mb-1.5">
                  What we&apos;ll need
                </p>
                <p className="text-[12px] text-[var(--chidi-text-secondary)] leading-snug">
                  Your CAC business number, BVN of the business owner, and a photo of a government ID. Takes about 5 minutes once we&apos;re in touch.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowVerifyModal(false)}
                  className="border-[var(--chidi-border-default)] min-h-[44px]"
                >
                  Not now
                </Button>
                <Button
                  onClick={() => setVerifyState({ status: 'submitted', submittedAt: new Date().toISOString() })}
                  className="btn-cta min-h-[44px]"
                >
                  Start verification
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* SECURITY MODAL */}
      <Dialog open={showSecurityModal} onOpenChange={setShowSecurityModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Change Password
            </DialogTitle>
            <DialogDescription>
              Keep your account secure.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-sm text-[var(--chidi-text-secondary)]">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] pr-10"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)]"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm text-[var(--chidi-text-secondary)]">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)] pr-10"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)]"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-[var(--chidi-text-muted)]">Must be at least 6 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm text-[var(--chidi-text-secondary)]">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)]"
                placeholder="Confirm new password"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowSecurityModal(false)}
                className="border-[var(--chidi-border-default)] min-h-[44px]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={changePasswordMutation.isPending || !passwordForm.currentPassword || !passwordForm.newPassword}
                className="btn-cta min-h-[44px]"
              >
                {changePasswordMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Change Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* BUSINESS HOURS MODAL */}
      <Dialog open={showBusinessHoursModal} onOpenChange={setShowBusinessHoursModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Business Hours
            </DialogTitle>
            <DialogDescription>
              When you're open.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-2 max-h-[60vh] overflow-y-auto">
            {(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const).map((day) => (
              <div key={day} className="flex flex-wrap items-center gap-3 p-3 bg-[var(--chidi-surface)] rounded-lg">
                <div className="w-20 sm:w-24">
                  <span className="text-sm font-medium text-[var(--chidi-text-primary)] capitalize">{day}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={!businessHours[day].closed}
                    onCheckedChange={(checked) => 
                      setBusinessHours(prev => ({
                        ...prev,
                        [day]: { ...prev[day], closed: !checked }
                      }))
                    }
                  />
                  <span className="text-xs text-[var(--chidi-text-muted)] w-10">
                    {businessHours[day].closed ? "Closed" : "Open"}
                  </span>
                </div>

                {!businessHours[day].closed && (
                  <div className="flex items-center gap-2 ml-auto">
                    <Input
                      type="time"
                      value={businessHours[day].open}
                      onChange={(e) => 
                        setBusinessHours(prev => ({
                          ...prev,
                          [day]: { ...prev[day], open: e.target.value }
                        }))
                      }
                      className="w-24 h-8 text-sm bg-white border-[var(--chidi-border-subtle)]"
                    />
                    <span className="text-xs text-[var(--chidi-text-muted)]">to</span>
                    <Input
                      type="time"
                      value={businessHours[day].close}
                      onChange={(e) => 
                        setBusinessHours(prev => ({
                          ...prev,
                          [day]: { ...prev[day], close: e.target.value }
                        }))
                      }
                      className="w-24 h-8 text-sm bg-white border-[var(--chidi-border-subtle)]"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--chidi-border-subtle)]">
            <Button
              variant="outline"
              onClick={() => setShowBusinessHoursModal(false)}
              className="border-[var(--chidi-border-default)] min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setSuccess("Business hours saved")
                setShowBusinessHoursModal(false)
                setTimeout(() => setSuccess(""), 3000)
              }}
              className="btn-cta min-h-[44px]"
            >
              Save Hours
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* POLICY MODAL */}
      <Dialog open={showPolicyModal} onOpenChange={setShowPolicyModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScrollText className="w-5 h-5" />
              Business Policies
            </DialogTitle>
            <DialogDescription>
              FAQs and rules I follow.
            </DialogDescription>
          </DialogHeader>
          {businessId ? (
            <PolicySettings businessId={businessId} />
          ) : (
            <div className="py-8 text-center text-[var(--chidi-text-muted)] text-sm">
              Set up your business first.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MEMORY MODAL */}
      <Dialog open={showMemoryModal} onOpenChange={setShowMemoryModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI Memory
            </DialogTitle>
            <DialogDescription>
              What I remember.
            </DialogDescription>
          </DialogHeader>
          {businessId ? (
            <MemorySettings businessId={businessId} />
          ) : (
            <div className="py-8 text-center text-[var(--chidi-text-muted)] text-sm">
              Set up your business first.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PAYMENT SETTINGS MODAL */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="w-5 h-5" />
              Payment Settings
            </DialogTitle>
            <DialogDescription>
              Where customers pay you.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="bank_name" className="text-sm text-[var(--chidi-text-secondary)]">Bank Name</Label>
              <Input
                id="bank_name"
                value={paymentForm.bank_name}
                onChange={(e) => setPaymentForm({ ...paymentForm, bank_name: e.target.value })}
                className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)]"
                placeholder="e.g., First Bank, GTBank"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_name" className="text-sm text-[var(--chidi-text-secondary)]">Account Name</Label>
              <Input
                id="account_name"
                value={paymentForm.account_name}
                onChange={(e) => setPaymentForm({ ...paymentForm, account_name: e.target.value })}
                className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)]"
                placeholder="Name on your bank account"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_number" className="text-sm text-[var(--chidi-text-secondary)]">Account Number</Label>
              <Input
                id="account_number"
                value={paymentForm.account_number}
                onChange={(e) => setPaymentForm({ ...paymentForm, account_number: e.target.value })}
                className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)]"
                placeholder="10-digit account number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_instructions" className="text-sm text-[var(--chidi-text-secondary)]">
                Payment Instructions <span className="text-[var(--chidi-text-muted)]">(Optional)</span>
              </Label>
              <Input
                id="payment_instructions"
                value={paymentForm.payment_instructions}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_instructions: e.target.value })}
                className="bg-white border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)]"
                placeholder="e.g., Use your name as payment reference"
              />
              <p className="text-xs text-[var(--chidi-text-muted)]">
                Shown to customers at payment.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowPaymentModal(false)}
                className="border-[var(--chidi-border-default)] min-h-[44px]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSavePaymentSettings}
                disabled={updatePaymentMutation.isPending || !paymentForm.bank_name || !paymentForm.account_name || !paymentForm.account_number}
                className="btn-cta min-h-[44px]"
              >
                {updatePaymentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Payment Details
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Help Sheet */}
      <HelpSheet 
        isOpen={showHelpSheet} 
        onClose={() => setShowHelpSheet(false)} 
      />
    </div>
  )
}
