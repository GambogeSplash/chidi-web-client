"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react"
import { ChidiMark } from "@/components/chidi/chidi-mark"
import { authAPI } from "@/lib/api"
import { isDevBypassActive, setDevBypassSession, buildDevBypassUser } from "@/lib/chidi/dev-bypass"
import { AuthShell } from "./auth-shell"
import { cn } from "@/lib/utils"

interface EmailVerificationPendingProps {
  email: string
  onBackToSignIn: () => void
}

const OTP_LENGTH = 6

/**
 * The OTP / "check your email" screen. Sits in the same two-pane shell as
 * sign-in / sign-up so the auth flow reads as one continuous experience.
 *
 * In dev-bypass mode, renders six segmented input boxes (any digits work).
 * In production, just shows the "check your email" message + resend.
 */
export function EmailVerificationPending({ email, onBackToSignIn }: EmailVerificationPendingProps) {
  const router = useRouter()
  const devMode = isDevBypassActive()
  const [digits, setDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(""))
  const [verifying, setVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState("")
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (devMode) inputsRef.current[0]?.focus()
  }, [devMode])

  const handleDigit = (idx: number, raw: string) => {
    const val = raw.replace(/\D/g, "").slice(0, 1)
    setDigits((prev) => {
      const next = [...prev]
      next[idx] = val
      return next
    })
    if (val && idx < OTP_LENGTH - 1) inputsRef.current[idx + 1]?.focus()
  }

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus()
    }
    if (e.key === "ArrowLeft" && idx > 0) inputsRef.current[idx - 1]?.focus()
    if (e.key === "ArrowRight" && idx < OTP_LENGTH - 1) inputsRef.current[idx + 1]?.focus()
    if (e.key === "Enter" && digits.every(Boolean)) handleDevVerify()
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH)
    if (!text) return
    e.preventDefault()
    const next = Array(OTP_LENGTH).fill("")
    for (let i = 0; i < text.length; i++) next[i] = text[i]
    setDigits(next)
    const lastFilled = Math.min(text.length, OTP_LENGTH) - 1
    inputsRef.current[lastFilled]?.focus()
  }

  const handleDevVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!digits.every(Boolean)) return
    setVerifying(true)
    setDevBypassSession(email)
    const user = buildDevBypassUser(email)
    setTimeout(() => {
      router.push(`/dashboard/${user.businessSlug}`)
    }, 350)
  }

  const handleResendVerification = async () => {
    setIsResending(true)
    setResendError("")
    setResendSuccess(false)
    try {
      await authAPI.resendVerification(email)
      setResendSuccess(true)
    } catch (error: any) {
      setResendError(error.message || "Failed to resend verification email. Please try again.")
    } finally {
      setIsResending(false)
    }
  }

  const desktopHeading = devMode ? "Enter your code." : "Check your email."
  const desktopSubheading = devMode
    ? `I sent a 6-digit code to ${email}.`
    : `We've sent a verification link to ${email}.`

  return (
    <AuthShell desktopHeading={desktopHeading} desktopSubheading={desktopSubheading} mobileBare>
      {/* Mobile heading row (the desktop heading lives in the shell) */}
      <div className="lg:hidden mb-6">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 bg-[var(--chidi-win-soft)] rounded-full flex items-center justify-center">
            <ChidiMark size={22} variant="win" />
          </div>
        </div>
        <h1 className="ty-page-title text-[var(--chidi-text-primary)] text-center">
          {desktopHeading}
        </h1>
        <p className="ty-body-voice text-[var(--chidi-text-secondary)] text-center mt-1">
          {desktopSubheading}
        </p>
      </div>

      {devMode ? (
        <form onSubmit={handleDevVerify} className="space-y-4">
          {/* Six segmented input boxes */}
          <div className="flex items-center justify-between gap-2">
            {digits.map((d, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputsRef.current[idx] = el
                }}
                value={d}
                onChange={(e) => handleDigit(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                inputMode="numeric"
                pattern="[0-9]"
                maxLength={1}
                aria-label={`Digit ${idx + 1}`}
                className={cn(
                  "h-14 flex-1 text-center text-2xl font-mono tabular-nums bg-white border rounded-xl outline-none transition-all",
                  d
                    ? "border-[var(--chidi-win)] text-[var(--chidi-text-primary)]"
                    : "border-[var(--chidi-border-default)] text-[var(--chidi-text-muted)] focus:border-[var(--chidi-win)] focus:ring-2 focus:ring-[var(--chidi-win)]/20",
                )}
              />
            ))}
          </div>
          <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice text-center">
            Dev mode. Any 6 digits will work.
          </p>

          <Button
            type="submit"
            disabled={!digits.every(Boolean) || verifying}
            className="w-full btn-cta h-12 font-medium rounded-xl"
          >
            {verifying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying…
              </>
            ) : (
              <>
                <ChidiMark size={14} className="mr-2" />
                Verify and continue
              </>
            )}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-[var(--chidi-text-muted)] mb-6 font-chidi-voice text-center lg:text-left">
          Click the link in the email to verify your account and continue.
        </p>
      )}

      {/* Resend feedback */}
      {resendSuccess && (
        <div className="flex items-center justify-center gap-2 text-sm text-[var(--chidi-success)] bg-[var(--chidi-success)]/5 px-4 py-3 rounded-lg mt-4 animate-in fade-in duration-300">
          <CheckCircle2 className="w-4 h-4" />
          <span>Sent. Check your inbox.</span>
        </div>
      )}
      {resendError && (
        <div className="text-sm text-[var(--chidi-danger)] bg-[var(--chidi-danger)]/5 px-4 py-3 rounded-lg border border-[var(--chidi-danger)]/20 mt-4">
          {resendError}
        </div>
      )}

      {/* Secondary actions */}
      <div className="space-y-2 mt-6">
        <Button
          onClick={handleResendVerification}
          variant="outline"
          className="w-full h-11 border-[var(--chidi-border-default)] text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)]"
          disabled={isResending}
        >
          {isResending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending…
            </>
          ) : (
            "Resend"
          )}
        </Button>

        <button
          onClick={onBackToSignIn}
          className="flex items-center justify-center gap-2 w-full py-2.5 text-xs text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] font-chidi-voice transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to sign in
        </button>
      </div>

      <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice text-center mt-6">
        Didn't get it? Check your spam folder, or hit Resend.
      </p>
    </AuthShell>
  )
}
