"use client"

import { useEffect, useState } from "react"
import { Mic, MicOff } from "lucide-react"
import { useVoiceInput } from "@/lib/chidi/use-voice-input"
import { cn } from "@/lib/utils"

interface VoiceButtonProps {
  onTranscript: (text: string) => void
  onCommit?: (text: string) => void
  className?: string
  size?: "sm" | "md"
  title?: string
}

/**
 * Press-and-hold voice button. Pushes interim transcript to onTranscript live,
 * fires onCommit on final. Disabled with a tooltip on unsupported browsers.
 *
 * Permission denied path: detected via the Permissions API where supported.
 * When the OS / browser blocks the mic, the button stays visible but switches
 * to a clearly-disabled "permission denied" state with helper text on hover
 * and a prompt that points to OS / browser settings.
 */
export function VoiceButton({
  onTranscript,
  onCommit,
  className,
  size = "md",
  title = "Hold to speak",
}: VoiceButtonProps) {
  const [pressing, setPressing] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const { isSupported, isListening, start, stop } = useVoiceInput({
    onTranscript,
    onComplete: (final) => {
      setPressing(false)
      onCommit?.(final)
    },
  })

  // Watch the browser's mic permission so we can render a clearer denied
  // state. Uses Permissions API where available (Chromium, recent Safari).
  // Silently no-ops elsewhere — start() will then throw at use-time and the
  // catch below flips us into the denied state.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("permissions" in navigator)) return
    let cancelled = false
    let status: PermissionStatus | null = null
    const handler = () => {
      if (status) setPermissionDenied(status.state === "denied")
    }
    ;(navigator.permissions as any)
      .query({ name: "microphone" as PermissionName })
      .then((s: PermissionStatus) => {
        if (cancelled) return
        status = s
        setPermissionDenied(s.state === "denied")
        s.addEventListener("change", handler)
      })
      .catch(() => {
        // Some browsers don't list "microphone" as a queryable permission
        // (older Safari, Firefox). Silently fall through — start() will
        // catch the live denial.
      })
    return () => {
      cancelled = true
      if (status) status.removeEventListener("change", handler)
    }
  }, [])

  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        title="Voice input isn't supported in this browser"
        className={cn(
          "flex items-center justify-center rounded-full bg-[var(--chidi-surface)] text-[var(--chidi-text-muted)] opacity-40 cursor-not-allowed",
          size === "md" ? "h-12 w-12" : "h-9 w-9",
          className,
        )}
      >
        <MicOff className={size === "md" ? "w-5 h-5" : "w-4 h-4"} />
      </button>
    )
  }

  if (permissionDenied) {
    return (
      <button
        type="button"
        disabled
        aria-label="Mic permission denied — enable in your browser settings"
        title="Mic blocked. Enable it in your browser site settings, then refresh."
        className={cn(
          "flex items-center justify-center rounded-full bg-[var(--chidi-danger)]/10 text-[var(--chidi-danger)] cursor-not-allowed",
          size === "md" ? "h-12 w-12" : "h-9 w-9",
          className,
        )}
      >
        <MicOff className={size === "md" ? "w-5 h-5" : "w-4 h-4"} />
      </button>
    )
  }

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setPressing(true)
    try {
      start()
    } catch (err: any) {
      // Runtime denial path (Firefox / Safari without queryable permission).
      setPressing(false)
      const msg = String(err?.message || err?.name || "").toLowerCase()
      if (msg.includes("not-allowed") || msg.includes("denied") || msg.includes("permission")) {
        setPermissionDenied(true)
      }
    }
  }
  const handleEnd = () => {
    if (pressing) {
      stop()
      setPressing(false)
    }
  }

  return (
    <button
      type="button"
      title={title}
      aria-label="Hold to speak to Chidi"
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      className={cn(
        "relative flex items-center justify-center rounded-full transition-all duration-200 select-none",
        size === "md" ? "h-9 w-9" : "h-7 w-7",
        isListening
          ? "bg-[var(--chidi-win)] text-[var(--chidi-win-foreground)] scale-110 shadow-lg"
          : "bg-[var(--chidi-surface)] text-[var(--chidi-text-secondary)] hover:bg-white hover:text-[var(--chidi-text-primary)]",
        className,
      )}
    >
      {isListening && (
        <span className="absolute inset-0 rounded-full chidi-live-dot" style={{ boxShadow: "0 0 0 0 var(--chidi-win)" }} />
      )}
      <Mic className={cn(size === "md" ? "w-5 h-5" : "w-4 h-4", "relative z-[1]")} />
    </button>
  )
}
