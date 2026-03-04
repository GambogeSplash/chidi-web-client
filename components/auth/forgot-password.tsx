"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, KeyRound, ArrowLeft, CheckCircle2 } from "lucide-react"
import { authAPI } from "@/lib/api"
import { cn } from "@/lib/utils"

interface ForgotPasswordProps {
  onBackToSignIn: () => void
}

export function ForgotPassword({ onBackToSignIn }: ForgotPasswordProps) {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email.trim()) {
      setError("Please enter your email address")
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address")
      return
    }

    setIsLoading(true)

    try {
      await authAPI.forgotPassword(email.trim())
      setIsSuccess(true)
    } catch (error: any) {
      console.error("Failed to send password reset:", error)
      // For security, show success even on error (don't reveal if email exists)
      setIsSuccess(true)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-[var(--chidi-success)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-[var(--chidi-success)]" />
            </div>

            <h1 className="text-2xl font-bold text-[var(--chidi-text-primary)] mb-2">
              Check your email
            </h1>

            <p className="text-[var(--chidi-text-secondary)] mb-2">
              If an account exists for
            </p>

            <p className="text-[var(--chidi-text-primary)] font-medium mb-6">
              {email}
            </p>

            <p className="text-sm text-[var(--chidi-text-muted)] mb-8">
              You'll receive a link to reset your password. The link will expire in 1 hour.
            </p>

            <Button
              onClick={onBackToSignIn}
              className="w-full bg-[var(--chidi-accent)] hover:bg-[var(--chidi-accent)]/90 text-[var(--chidi-accent-foreground)] h-12 font-medium transition-all duration-200 rounded-xl"
            >
              Back to sign in
            </Button>

            <div className="mt-8 pt-6 border-t border-[var(--chidi-border-default)]">
              <p className="text-xs text-[var(--chidi-text-muted)]">
                Didn't receive the email? Check your spam folder or{" "}
                <button
                  onClick={() => setIsSuccess(false)}
                  className="text-[var(--chidi-accent)] hover:underline"
                >
                  try again
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="animate-in fade-in duration-500">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[var(--chidi-accent)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <KeyRound className="w-8 h-8 text-[var(--chidi-accent)]" />
            </div>

            <h1 className="text-2xl font-bold text-[var(--chidi-text-primary)] mb-2">
              Forgot your password?
            </h1>

            <p className="text-[var(--chidi-text-secondary)] text-sm">
              No worries! Enter your email and we'll send you a reset link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[var(--chidi-text-primary)] text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError("")
                }}
                className={cn(
                  "bg-white border-[var(--chidi-border-default)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)] h-12",
                  error && "border-[var(--chidi-danger)] focus:ring-[var(--chidi-danger)]/20 focus:border-[var(--chidi-danger)]"
                )}
              />
              {error && (
                <p className="text-xs text-[var(--chidi-danger)] mt-1">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-[var(--chidi-accent)] hover:bg-[var(--chidi-accent)]/90 text-[var(--chidi-accent-foreground)] h-12 font-medium transition-all duration-200 rounded-xl"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending reset link...
                </>
              ) : (
                'Send reset link'
              )}
            </Button>
          </form>

          <button
            onClick={onBackToSignIn}
            className="flex items-center justify-center gap-2 w-full py-3 mt-4 text-sm text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  )
}
