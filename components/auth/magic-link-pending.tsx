"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Link2, ArrowLeft, CheckCircle2 } from "lucide-react"
import { authAPI } from "@/lib/api"

interface MagicLinkPendingProps {
  email: string
  onBackToSignIn: () => void
}

export function MagicLinkPending({ email, onBackToSignIn }: MagicLinkPendingProps) {
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState("")

  const handleResendMagicLink = async () => {
    setIsResending(true)
    setResendError("")
    setResendSuccess(false)

    try {
      await authAPI.sendMagicLink(email)
      setResendSuccess(true)
    } catch (error: any) {
      console.error("Failed to resend magic link:", error)
      setResendError(error.message || "Failed to resend magic link. Please try again.")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center animate-in fade-in duration-500">
          <div className="w-16 h-16 bg-[var(--chidi-accent)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Link2 className="w-8 h-8 text-[var(--chidi-accent)]" />
          </div>

          <h1 className="text-2xl font-bold text-[var(--chidi-text-primary)] mb-2">
            Check your email
          </h1>

          <p className="text-[var(--chidi-text-secondary)] mb-2">
            We've sent a magic link to
          </p>

          <p className="text-[var(--chidi-text-primary)] font-medium mb-6">
            {email}
          </p>

          <p className="text-sm text-[var(--chidi-text-muted)] mb-8">
            Click the link in the email to sign in instantly — no password needed.
          </p>

          {resendSuccess && (
            <div className="flex items-center justify-center gap-2 text-sm text-[var(--chidi-success)] bg-[var(--chidi-success)]/5 px-4 py-3 rounded-lg mb-4 animate-in fade-in duration-300">
              <CheckCircle2 className="w-4 h-4" />
              <span>Magic link sent! Please check your inbox.</span>
            </div>
          )}

          {resendError && (
            <div className="text-sm text-[var(--chidi-danger)] bg-[var(--chidi-danger)]/5 px-4 py-3 rounded-lg border border-[var(--chidi-danger)]/20 mb-4">
              {resendError}
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleResendMagicLink}
              variant="outline"
              className="w-full h-12 border-[var(--chidi-border-default)] text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)]"
              disabled={isResending}
            >
              {isResending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Resend magic link"
              )}
            </Button>

            <button
              onClick={onBackToSignIn}
              className="flex items-center justify-center gap-2 w-full py-3 text-sm text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--chidi-border-default)]">
            <p className="text-xs text-[var(--chidi-text-muted)]">
              Didn't receive the email? Check your spam folder or try resending.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
