"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { 
  User, 
  Bell, 
  Shield, 
  LogOut, 
  Save, 
  Loader2, 
  AlertTriangle,
  Eye,
  EyeOff,
  Check,
  X
} from "lucide-react"
import { 
  settingsAPI, 
  type UserPreferences, 
  type AccountInfo, 
  type NotificationPreferences 
} from "@/lib/api/settings"
import { useRouter } from "next/navigation"

interface UserSettingsProps {
  onClose?: () => void
}

export function UserSettings({ onClose }: UserSettingsProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("account")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

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

  const handleSaveNotifications = async () => {
    setIsSaving(true)
    setError("")
    setSuccess("")
    
    try {
      const updated = await settingsAPI.updatePreferences({
        notifications: notificationForm
      })
      setPreferences(updated)
      setSuccess("Notification preferences saved")
      setTimeout(() => setSuccess(""), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to save preferences")
    } finally {
      setIsSaving(false)
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
      // Even if API fails, redirect to auth
      router.push("/auth")
    }
  }

  const handleLogoutAll = async () => {
    setIsLoggingOut(true)
    try {
      await settingsAPI.logoutAllSessions()
      router.push("/auth")
    } catch (err: any) {
      setError(err.message || "Failed to logout all sessions")
      setIsLoggingOut(false)
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Settings</h1>
          <p className="text-gray-400 text-sm">Manage your account and preferences</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-900/20 border border-green-800 text-green-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4" />
          {success}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800">
          <TabsTrigger value="account" className="data-[state=active]:bg-gray-700">
            <User className="w-4 h-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-gray-700">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-gray-700">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="logout" className="data-[state=active]:bg-gray-700">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
              <CardDescription className="text-gray-400">
                Update your personal details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20 bg-indigo-600">
                  <AvatarFallback className="text-2xl text-white bg-indigo-600">
                    {account ? getInitials(account.name) : "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-medium">{account?.name}</p>
                  <p className="text-gray-400 text-sm">{account?.email}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {account?.auth_provider === "email" ? "Email account" : `Signed in with ${account?.auth_provider}`}
                  </p>
                </div>
              </div>

              <Separator className="bg-gray-700" />

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">Full Name</Label>
                <Input
                  id="name"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                  className="bg-gray-900 border-gray-700 text-white"
                  placeholder="Enter your name"
                />
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <Input
                  id="email"
                  value={account?.email || ""}
                  disabled
                  className="bg-gray-900 border-gray-700 text-gray-500"
                />
                <p className="text-xs text-gray-500">Email cannot be changed</p>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleSaveAccount}
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription className="text-gray-400">
                Choose what updates you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Email Notifications</p>
                    <p className="text-gray-400 text-sm">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={notificationForm.email_notifications}
                    onCheckedChange={(checked) => 
                      setNotificationForm({ ...notificationForm, email_notifications: checked })
                    }
                  />
                </div>

                <Separator className="bg-gray-700" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Stock Alerts</p>
                    <p className="text-gray-400 text-sm">Get notified when products are low or out of stock</p>
                  </div>
                  <Switch
                    checked={notificationForm.stock_alerts}
                    onCheckedChange={(checked) => 
                      setNotificationForm({ ...notificationForm, stock_alerts: checked })
                    }
                  />
                </div>

                <Separator className="bg-gray-700" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Order Updates</p>
                    <p className="text-gray-400 text-sm">New orders and status changes</p>
                  </div>
                  <Switch
                    checked={notificationForm.order_updates}
                    onCheckedChange={(checked) => 
                      setNotificationForm({ ...notificationForm, order_updates: checked })
                    }
                  />
                </div>

                <Separator className="bg-gray-700" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Daily Summary</p>
                    <p className="text-gray-400 text-sm">Daily business performance summary</p>
                  </div>
                  <Switch
                    checked={notificationForm.daily_summary}
                    onCheckedChange={(checked) => 
                      setNotificationForm({ ...notificationForm, daily_summary: checked })
                    }
                  />
                </div>

                <Separator className="bg-gray-700" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Weekly Reports</p>
                    <p className="text-gray-400 text-sm">Comprehensive weekly business analytics</p>
                  </div>
                  <Switch
                    checked={notificationForm.weekly_reports}
                    onCheckedChange={(checked) => 
                      setNotificationForm({ ...notificationForm, weekly_reports: checked })
                    }
                  />
                </div>

                <Separator className="bg-gray-700" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Marketing Emails</p>
                    <p className="text-gray-400 text-sm">Product updates and promotional content</p>
                  </div>
                  <Switch
                    checked={notificationForm.marketing_emails}
                    onCheckedChange={(checked) => 
                      setNotificationForm({ ...notificationForm, marketing_emails: checked })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSaveNotifications}
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Change Password
              </CardTitle>
              <CardDescription className="text-gray-400">
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-gray-300">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="bg-gray-900 border-gray-700 text-white pr-10"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-gray-300">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="bg-gray-900 border-gray-700 text-white pr-10"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">Must be at least 6 characters</p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-300">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="bg-gray-900 border-gray-700 text-white"
                  placeholder="Confirm new password"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !passwordForm.currentPassword || !passwordForm.newPassword}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {isChangingPassword ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Shield className="w-4 h-4 mr-2" />
                  )}
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logout Tab */}
        <TabsContent value="logout" className="space-y-6">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <LogOut className="w-5 h-5" />
                Sign Out
              </CardTitle>
              <CardDescription className="text-gray-400">
                Sign out of your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-gray-900 rounded-lg">
                  <h4 className="text-white font-medium mb-2">Sign out of this device</h4>
                  <p className="text-gray-400 text-sm mb-4">
                    You will be signed out of CHIDI on this device only.
                  </p>
                  <Button 
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    variant="outline"
                    className="bg-transparent border-gray-600 text-white hover:bg-gray-700"
                  >
                    {isLoggingOut ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <LogOut className="w-4 h-4 mr-2" />
                    )}
                    Sign Out
                  </Button>
                </div>

                <Separator className="bg-gray-700" />

                <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
                  <h4 className="text-red-400 font-medium mb-2">Sign out of all devices</h4>
                  <p className="text-gray-400 text-sm mb-4">
                    You will be signed out of CHIDI on all devices. You will need to sign in again on each device.
                  </p>
                  <Button 
                    onClick={handleLogoutAll}
                    disabled={isLoggingOut}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isLoggingOut ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <LogOut className="w-4 h-4 mr-2" />
                    )}
                    Sign Out Everywhere
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
