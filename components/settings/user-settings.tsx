"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { 
  User, 
  Bell, 
  Shield, 
  LogOut, 
  Loader2, 
  AlertTriangle,
  Eye,
  EyeOff,
  Check,
  ArrowLeft,
  Plug,
  Instagram,
  Folder,
  Download,
  Clock,
  ChevronRight,
  HelpCircle,
  Settings2,
  Bot,
  ScrollText,
  Brain
} from "lucide-react"
import { WhatsAppSettings } from "@/components/chidi/whatsapp-settings"
import { TelegramSettings } from "@/components/chidi/telegram-settings"
import { CategorySettings } from "@/components/settings/category-settings"
import { PolicySettings } from "@/components/settings/policy-settings"
import { MemorySettings } from "@/components/settings/memory-settings"
import { 
  settingsAPI, 
  type UserPreferences, 
  type AccountInfo, 
  type NotificationPreferences,
  type BusinessPreferences 
} from "@/lib/api/settings"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface UserSettingsProps {
  onClose?: () => void
}

export function UserSettings({ onClose }: UserSettingsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showSecurityModal, setShowSecurityModal] = useState(false)
  const [showBusinessHoursModal, setShowBusinessHoursModal] = useState(false)
  const [showPolicyModal, setShowPolicyModal] = useState(false)
  const [showMemoryModal, setShowMemoryModal] = useState(false)
  
  // Business ID for policy/memory settings (stored in state to avoid hydration issues)
  const [businessId, setBusinessId] = useState<string | null>(null)

  // Business hours state
  // TODO: Persist business hours to backend
  // - Add business_hours field to Business model in schema.prisma
  // - Create API endpoint: GET/PUT /api/settings/business-hours
  // - Load saved hours on component mount
  // - Save hours when user clicks "Save Hours"
  const [businessHours, setBusinessHours] = useState({
    monday: { open: "09:00", close: "18:00", closed: false },
    tuesday: { open: "09:00", close: "18:00", closed: false },
    wednesday: { open: "09:00", close: "18:00", closed: false },
    thursday: { open: "09:00", close: "18:00", closed: false },
    friday: { open: "09:00", close: "18:00", closed: false },
    saturday: { open: "10:00", close: "16:00", closed: false },
    sunday: { open: "10:00", close: "16:00", closed: true },
  })

  // Account state
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [accountForm, setAccountForm] = useState({
    name: "",
    avatar_url: ""
  })

  // Preferences state
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [notificationForm, setNotificationForm] = useState<NotificationPreferences>({
    email_notifications: true,
    push_notifications: true,
    stock_alerts: true,
    order_updates: true,
    weekly_reports: false,
    daily_summary: false,
    marketing_emails: false
  })

  // Business preferences state
  const [businessPreferences, setBusinessPreferences] = useState<BusinessPreferences | null>(null)
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(10)
  const [isSavingThreshold, setIsSavingThreshold] = useState(false)

  // Password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Logout state
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Load initial data
  useEffect(() => {
    // Get business ID from localStorage (client-side only)
    const storedBusinessId = localStorage.getItem('chidi_business_id')
    setBusinessId(storedBusinessId)
    
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    setError("")
    
    try {
      const [accountData, prefsData] = await Promise.all([
        settingsAPI.getAccount(),
        settingsAPI.getPreferences()
      ])
      
      setAccount(accountData)
      setAccountForm({
        name: accountData.name,
        avatar_url: accountData.avatar_url || ""
      })
      
      setPreferences(prefsData)
      setNotificationForm(prefsData.notifications)

      // Load business preferences if we have a business ID
      // Get business ID from localStorage or account data
      const storedBusinessId = typeof window !== 'undefined' 
        ? localStorage.getItem('chidi_business_id') 
        : null
      
      if (storedBusinessId) {
        try {
          const bizPrefs = await settingsAPI.getBusinessPreferences(storedBusinessId)
          setBusinessPreferences(bizPrefs)
          setLowStockThreshold(bizPrefs.low_stock_threshold)
        } catch (bizErr) {
          console.warn('Could not load business preferences:', bizErr)
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load settings")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveAccount = async () => {
    setIsSaving(true)
    setError("")
    setSuccess("")
    
    try {
      const updated = await settingsAPI.updateAccount({
        name: accountForm.name,
        avatar_url: accountForm.avatar_url || undefined
      })
      setAccount(updated)
      setSuccess("Account updated successfully")
      setTimeout(() => setSuccess(""), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to update account")
    } finally {
      setIsSaving(false)
    }
  }

  const handleNotificationChange = async (key: keyof NotificationPreferences, value: boolean) => {
    const newForm = { ...notificationForm, [key]: value }
    setNotificationForm(newForm)
    
    try {
      await settingsAPI.updatePreferences({ notifications: newForm })
    } catch (err: any) {
      // Revert on error
      setNotificationForm(notificationForm)
      setError(err.message || "Failed to save preference")
    }
  }

  const handleSaveLowStockThreshold = async () => {
    const storedBusinessId = typeof window !== 'undefined' 
      ? localStorage.getItem('chidi_business_id') 
      : null
    
    if (!storedBusinessId) {
      setError("Business ID not found")
      return
    }

    setIsSavingThreshold(true)
    setError("")
    setSuccess("")

    try {
      const updated = await settingsAPI.updateBusinessPreferences(storedBusinessId, {
        low_stock_threshold: lowStockThreshold
      })
      setBusinessPreferences(updated)
      setSuccess("Low stock threshold updated successfully")
      setTimeout(() => setSuccess(""), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to update low stock threshold")
    } finally {
      setIsSavingThreshold(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New passwords do not match")
      return
    }
    
    if (passwordForm.newPassword.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }
    
    setIsChangingPassword(true)
    setError("")
    setSuccess("")
    
    try {
      await settingsAPI.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      )
      setSuccess("Password changed successfully")
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
      setShowSecurityModal(false)
      setTimeout(() => setSuccess(""), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to change password")
    } finally {
      setIsChangingPassword(false)
    }
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--chidi-text-muted)]" />
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto pb-12">
      {/* Header */}
      <div className="sticky top-0 bg-[var(--chidi-surface)] z-10 px-6 py-4 border-b border-[var(--chidi-border-subtle)]">
        <div className="flex items-center gap-4">
          {onClose && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="h-9 w-9 text-[var(--chidi-text-secondary)]"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-semibold text-[var(--chidi-text-primary)]">Settings</h1>
            <p className="text-sm text-[var(--chidi-text-muted)]">Manage your account and preferences</p>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {(error || success) && (
        <div className="px-6 pt-4">
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

      <div className="px-6 space-y-1">
        {/* ═══════════════════════════════════════════════════════════════
            PROFILE SECTION
        ═══════════════════════════════════════════════════════════════ */}
        <section className="py-6">
          <div className="flex items-start gap-2 mb-4">
            <User className="w-4 h-4 mt-0.5 text-[var(--chidi-text-muted)]" />
            <span className="text-xs font-medium text-[var(--chidi-text-muted)] uppercase tracking-wider">Profile</span>
          </div>
          
          {/* User Card */}
          <div className="bg-white rounded-xl border border-[var(--chidi-border-subtle)] p-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-12 h-12 bg-[var(--chidi-accent)]">
                <AvatarFallback className="text-lg text-[var(--chidi-accent-foreground)] bg-[var(--chidi-accent)]">
                  {account ? getInitials(account.name) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--chidi-text-primary)] truncate">{account?.name}</p>
                <p className="text-sm text-[var(--chidi-text-muted)] truncate">{account?.email}</p>
                <p className="text-xs text-[var(--chidi-text-muted)]">
                  {getAuthProviderLabel(account?.auth_provider)}
                </p>
              </div>
            </div>

            <Separator className="my-4 bg-[var(--chidi-border-subtle)]" />

            {/* Name Input */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm text-[var(--chidi-text-secondary)]">Full Name</Label>
              <Input
                id="name"
                value={accountForm.name}
                onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                className="bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)]"
                placeholder="Enter your name"
              />
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2 mt-4">
              <Label htmlFor="email" className="text-sm text-[var(--chidi-text-secondary)]">Email</Label>
              <Input
                id="email"
                value={account?.email || ""}
                disabled
                className="bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)] text-[var(--chidi-text-muted)]"
              />
              <p className="text-xs text-[var(--chidi-text-muted)]">Email cannot be changed</p>
            </div>

            {accountForm.name !== account?.name && (
              <div className="flex justify-end mt-4">
                <Button 
                  onClick={handleSaveAccount}
                  disabled={isSaving}
                  size="sm"
                  className="bg-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)] hover:bg-[var(--chidi-accent)]/90"
                >
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save
                </Button>
              </div>
            )}
          </div>

          {/* Categories Row */}
          <button
            onClick={() => setShowCategoryModal(true)}
            className="w-full mt-3 bg-white rounded-xl border border-[var(--chidi-border-subtle)] p-4 flex items-center justify-between hover:bg-[var(--chidi-surface)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <Folder className="w-5 h-5 text-[var(--chidi-text-muted)]" />
              <div className="text-left">
                <p className="font-medium text-sm text-[var(--chidi-text-primary)]">Product Categories</p>
                <p className="text-xs text-[var(--chidi-text-muted)]">Manage your inventory categories</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--chidi-text-muted)]" />
          </button>

          {/* Business Hours Row */}
          <button
            onClick={() => setShowBusinessHoursModal(true)}
            className="w-full mt-3 bg-white rounded-xl border border-[var(--chidi-border-subtle)] p-4 flex items-center justify-between hover:bg-[var(--chidi-surface)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[var(--chidi-text-muted)]" />
              <div className="text-left">
                <p className="font-medium text-sm text-[var(--chidi-text-primary)]">Business Hours</p>
                <p className="text-xs text-[var(--chidi-text-muted)]">Set when you're available</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--chidi-text-muted)]" />
          </button>
        </section>

        <Separator className="bg-[var(--chidi-border-subtle)]" />

        {/* ═══════════════════════════════════════════════════════════════
            INTEGRATIONS SECTION
        ═══════════════════════════════════════════════════════════════ */}
        <section className="py-6">
          <div className="flex items-start gap-2 mb-4">
            <Plug className="w-4 h-4 mt-0.5 text-[var(--chidi-text-muted)]" />
            <span className="text-xs font-medium text-[var(--chidi-text-muted)] uppercase tracking-wider">Integrations</span>
          </div>

          <div className="bg-white rounded-xl border border-[var(--chidi-border-subtle)] divide-y divide-[var(--chidi-border-subtle)]">
            {/* WhatsApp */}
            <div className="p-4">
              <WhatsAppSettings />
            </div>

            {/* Telegram */}
            <div className="p-4">
              <TelegramSettings />
            </div>
            
            {/* Instagram - Coming Soon */}
            <div className="p-4 flex items-center justify-between opacity-60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
                  <Instagram className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-sm text-[var(--chidi-text-primary)]">Instagram</p>
                  <p className="text-xs text-[var(--chidi-text-muted)]">Not connected</p>
                </div>
              </div>
              <span className="text-xs font-medium text-[var(--chidi-text-muted)] bg-[var(--chidi-surface)] px-2 py-1 rounded">
                Coming Soon
              </span>
            </div>
          </div>
        </section>

        <Separator className="bg-[var(--chidi-border-subtle)]" />

        {/* ═══════════════════════════════════════════════════════════════
            AI ASSISTANT SECTION
        ═══════════════════════════════════════════════════════════════ */}
        <section className="py-6">
          <div className="flex items-start gap-2 mb-4">
            <Bot className="w-4 h-4 mt-0.5 text-[var(--chidi-text-muted)]" />
            <span className="text-xs font-medium text-[var(--chidi-text-muted)] uppercase tracking-wider">AI Assistant</span>
          </div>

          <div className="bg-white rounded-xl border border-[var(--chidi-border-subtle)] divide-y divide-[var(--chidi-border-subtle)]">
            {/* Business Policies */}
            <button
              onClick={() => setShowPolicyModal(true)}
              className="w-full p-4 flex items-center justify-between hover:bg-[var(--chidi-surface)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <ScrollText className="w-5 h-5 text-[var(--chidi-text-muted)]" />
                <div className="text-left">
                  <p className="font-medium text-sm text-[var(--chidi-text-primary)]">Business Policies</p>
                  <p className="text-xs text-[var(--chidi-text-muted)]">FAQs and rules your AI follows</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--chidi-text-muted)]" />
            </button>

            {/* AI Memory */}
            <button
              onClick={() => setShowMemoryModal(true)}
              className="w-full p-4 flex items-center justify-between hover:bg-[var(--chidi-surface)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-[var(--chidi-text-muted)]" />
                <div className="text-left">
                  <p className="font-medium text-sm text-[var(--chidi-text-primary)]">AI Memory</p>
                  <p className="text-xs text-[var(--chidi-text-muted)]">View what your AI remembers</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--chidi-text-muted)]" />
            </button>
          </div>
        </section>

        <Separator className="bg-[var(--chidi-border-subtle)]" />

        {/* ═══════════════════════════════════════════════════════════════
            DATA MANAGEMENT SECTION
        ═══════════════════════════════════════════════════════════════ */}
        <section className="py-6">
          <div className="flex items-start gap-2 mb-4">
            <Download className="w-4 h-4 mt-0.5 text-[var(--chidi-text-muted)]" />
            <span className="text-xs font-medium text-[var(--chidi-text-muted)] uppercase tracking-wider">Data Management</span>
          </div>

          <div className="bg-white rounded-xl border border-[var(--chidi-border-subtle)] p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-[var(--chidi-text-primary)]">Export Data</p>
              <p className="text-xs text-[var(--chidi-text-muted)]">Backup your business information</p>
            </div>
            <Button variant="outline" size="sm" className="border-[var(--chidi-border-default)]">
              Export
            </Button>
          </div>
        </section>

        <Separator className="bg-[var(--chidi-border-subtle)]" />

        {/* ═══════════════════════════════════════════════════════════════
            NOTIFICATIONS SECTION
        ═══════════════════════════════════════════════════════════════ */}
        <section className="py-6">
          <div className="flex items-start gap-2 mb-4">
            <Bell className="w-4 h-4 mt-0.5 text-[var(--chidi-text-muted)]" />
            <span className="text-xs font-medium text-[var(--chidi-text-muted)] uppercase tracking-wider">Notifications</span>
          </div>

          <div className="bg-white rounded-xl border border-[var(--chidi-border-subtle)] divide-y divide-[var(--chidi-border-subtle)]">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-[var(--chidi-text-primary)]">Stock Alerts</p>
                <p className="text-xs text-[var(--chidi-text-muted)]">Get notified when items are low</p>
              </div>
              <Switch
                checked={notificationForm.stock_alerts}
                onCheckedChange={(checked) => handleNotificationChange('stock_alerts', checked)}
              />
            </div>

            {/* Low Stock Threshold Setting */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-sm text-[var(--chidi-text-primary)]">Low Stock Threshold</p>
                  <p className="text-xs text-[var(--chidi-text-muted)]">Alert when product stock falls to this level</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)] text-[var(--chidi-text-primary)]"
                />
                <span className="text-sm text-[var(--chidi-text-muted)]">units</span>
                {lowStockThreshold !== (businessPreferences?.low_stock_threshold ?? 10) && (
                  <Button 
                    onClick={handleSaveLowStockThreshold}
                    disabled={isSavingThreshold}
                    size="sm"
                    className="ml-auto bg-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)] hover:bg-[var(--chidi-accent)]/90"
                  >
                    {isSavingThreshold && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save
                  </Button>
                )}
              </div>
              <p className="text-xs text-[var(--chidi-text-muted)] mt-2">
                This is the default threshold for new products. You can set individual thresholds per product.
              </p>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-[var(--chidi-text-primary)]">New Messages</p>
                <p className="text-xs text-[var(--chidi-text-muted)]">Customer inquiries and orders</p>
              </div>
              <Switch
                checked={notificationForm.order_updates}
                onCheckedChange={(checked) => handleNotificationChange('order_updates', checked)}
              />
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-[var(--chidi-text-primary)]">Daily Summary</p>
                <p className="text-xs text-[var(--chidi-text-muted)]">Daily business performance</p>
              </div>
              <Switch
                checked={notificationForm.daily_summary}
                onCheckedChange={(checked) => handleNotificationChange('daily_summary', checked)}
              />
            </div>
          </div>
        </section>

        <Separator className="bg-[var(--chidi-border-subtle)]" />

        {/* ═══════════════════════════════════════════════════════════════
            SECURITY SECTION
        ═══════════════════════════════════════════════════════════════ */}
        <section className="py-6">
          <div className="flex items-start gap-2 mb-4">
            <Shield className="w-4 h-4 mt-0.5 text-[var(--chidi-text-muted)]" />
            <span className="text-xs font-medium text-[var(--chidi-text-muted)] uppercase tracking-wider">Security</span>
          </div>

          <button
            onClick={() => setShowSecurityModal(true)}
            className="w-full bg-white rounded-xl border border-[var(--chidi-border-subtle)] p-4 flex items-center justify-between hover:bg-[var(--chidi-surface)] transition-colors"
          >
            <div className="text-left">
              <p className="font-medium text-sm text-[var(--chidi-text-primary)]">Change Password</p>
              <p className="text-xs text-[var(--chidi-text-muted)]">Update your account password</p>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--chidi-text-muted)]" />
          </button>
        </section>

        <Separator className="bg-[var(--chidi-border-subtle)]" />

        {/* ═══════════════════════════════════════════════════════════════
            HELP & SIGN OUT SECTION
        ═══════════════════════════════════════════════════════════════ */}
        <section className="py-6 space-y-3">
          <button
            className="w-full bg-white rounded-xl border border-[var(--chidi-border-subtle)] p-4 flex items-center gap-3 hover:bg-[var(--chidi-surface)] transition-colors"
          >
            <HelpCircle className="w-5 h-5 text-[var(--chidi-text-muted)]" />
            <span className="font-medium text-sm text-[var(--chidi-text-primary)]">Help & Support</span>
          </button>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full bg-white rounded-xl border border-red-200 p-4 flex items-center gap-3 hover:bg-red-50 transition-colors"
          >
            {isLoggingOut ? (
              <Loader2 className="w-5 h-5 text-red-600 animate-spin" />
            ) : (
              <LogOut className="w-5 h-5 text-red-600" />
            )}
            <span className="font-medium text-sm text-red-600">Sign Out</span>
          </button>
        </section>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          CATEGORY MODAL
      ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Categories</DialogTitle>
            <DialogDescription>
              Manage your inventory categories for better organization
            </DialogDescription>
          </DialogHeader>
          <CategorySettings />
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
          SECURITY MODAL
      ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={showSecurityModal} onOpenChange={setShowSecurityModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Change Password
            </DialogTitle>
            <DialogDescription>
              Update your password to keep your account secure
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            {/* Current Password */}
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

            {/* New Password */}
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

            {/* Confirm Password */}
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
                className="border-[var(--chidi-border-default)]"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleChangePassword}
                disabled={isChangingPassword || !passwordForm.currentPassword || !passwordForm.newPassword}
                className="bg-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)] hover:bg-[var(--chidi-accent)]/90"
              >
                {isChangingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Change Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
          BUSINESS HOURS MODAL
      ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={showBusinessHoursModal} onOpenChange={setShowBusinessHoursModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Business Hours
            </DialogTitle>
            <DialogDescription>
              Set your operating hours to let customers know when you're available
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-2 max-h-[60vh] overflow-y-auto">
            {(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const).map((day) => (
              <div key={day} className="flex items-center gap-3 p-3 bg-[var(--chidi-surface)] rounded-lg">
                <div className="w-24">
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
              className="border-[var(--chidi-border-default)]"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                // TODO: Save business hours to backend
                setSuccess("Business hours saved")
                setShowBusinessHoursModal(false)
                setTimeout(() => setSuccess(""), 3000)
              }}
              className="bg-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)] hover:bg-[var(--chidi-accent)]/90"
            >
              Save Hours
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
          POLICY MODAL
      ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={showPolicyModal} onOpenChange={setShowPolicyModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScrollText className="w-5 h-5" />
              Business Policies
            </DialogTitle>
            <DialogDescription>
              Manage FAQs and business rules your AI assistant follows
            </DialogDescription>
          </DialogHeader>
          {businessId ? (
            <PolicySettings businessId={businessId} />
          ) : (
            <div className="py-8 text-center text-[var(--chidi-text-muted)]">
              No business selected. Please set up your business first.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
          MEMORY MODAL
      ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={showMemoryModal} onOpenChange={setShowMemoryModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI Memory
            </DialogTitle>
            <DialogDescription>
              Browse and manage what your AI assistant remembers about your business
            </DialogDescription>
          </DialogHeader>
          {businessId ? (
            <MemorySettings businessId={businessId} />
          ) : (
            <div className="py-8 text-center text-[var(--chidi-text-muted)]">
              No business selected. Please set up your business first.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
