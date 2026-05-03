"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, KeyRound, Eye, EyeOff, Check, X, CheckCircle2 } from "lucide-react"
import { authAPI } from "@/lib/api"
import { cn } from "@/lib/utils"

interface ResetPasswordProps {
  accessToken: string
  onSuccess: () => void
  onError: (message: string) => void
}

function PasswordRequirements({ password = "" }: { password: string }) {
  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)

  const requirements = [
    { label: "At least 8 characters", met: hasMinLength },
    { label: "One uppercase letter", met: hasUppercase },
    { label: "One number", met: hasNumber },
  ]

  return (
    <div className="space-y-1.5 mt-2">
      {requirements.map((req, index) => (
        <div key={index} className="flex items-center gap-2 text-xs transition-colors duration-200">
          {req.met ? (
            <Check className="w-3.5 h-3.5 text-[var(--chidi-success)]" />
          ) : (
            <X className="w-3.5 h-3.5 text-[var(--chidi-text-muted)]" />
          )}
          <span className={req.met ? "text-[var(--chidi-success)]" : "text-[var(--chidi-text-muted)]"}>
            {req.label}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ResetPassword({ accessToken, onSuccess, onError }: ResetPasswordProps) {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")

  const validatePassword = (pwd: string): string | null => {
    if (!pwd) return "Password is required"
    if (pwd.length < 8) return "Password must be at least 8 characters"
    if (!/[A-Z]/.test(pwd)) return "Password needs an uppercase letter"
    if (!/[0-9]/.test(pwd)) return "Password needs a number"
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)

    try {
      await authAPI.resetPassword(accessToken, password)
      setIsSuccess(true)
    } catch (error: any) {
      console.error("Failed to reset password:", error)
      const errorMessage = error.message || "Failed to reset password. The link may have expired."
      setError(errorMessage)
      onError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-[var(--chidi-success)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-[var(--chidi-success)]" />
            </div>

            <h1 className="text-2xl font-bold text-[var(--chidi-text-primary)] mb-2">
              Password updated!
            </h1>

            <p className="text-[var(--chidi-text-secondary)] mb-8">
              Password reset. Sign in to continue.
            </p>

            <Button
              onClick={onSuccess}
              className="w-full btn-cta h-12 font-medium transition-all duration-300 rounded-xl"
            >
              Sign in
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="animate-in fade-in duration-500">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[var(--chidi-accent)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <KeyRound className="w-8 h-8 text-[var(--chidi-accent)]" />
            </div>

            <h1 className="text-2xl font-bold text-[var(--chidi-text-primary)] mb-2">
              Set new password
            </h1>

            <p className="text-[var(--chidi-text-secondary)] text-sm">
              Pick a strong password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[var(--chidi-text-primary)] text-sm font-medium">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError("")
                  }}
                  className={cn(
                    "bg-white border-[var(--chidi-border-default)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)] h-12 pr-12",
                    error && "border-[var(--chidi-danger)] focus:ring-[var(--chidi-danger)]/20 focus:border-[var(--chidi-danger)]"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <PasswordRequirements password={password} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-[var(--chidi-text-primary)] text-sm font-medium">
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setError("")
                  }}
                  className={cn(
                    "bg-white border-[var(--chidi-border-default)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)] h-12 pr-12",
                    error && error.includes("match") && "border-[var(--chidi-danger)] focus:ring-[var(--chidi-danger)]/20 focus:border-[var(--chidi-danger)]"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-[var(--chidi-danger)] mt-1">Passwords do not match</p>
              )}
            </div>

            {error && (
              <div className="text-sm text-[var(--chidi-danger)] bg-[var(--chidi-danger)]/5 px-3 py-2 rounded-lg border border-[var(--chidi-danger)]/20">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full btn-cta h-12 font-medium transition-all duration-300 rounded-xl"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating password...
                </>
              ) : (
                'Update password'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
