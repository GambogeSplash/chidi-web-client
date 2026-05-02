"use client"

import { useState } from "react"
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
 */
export function VoiceButton({
  onTranscript,
  onCommit,
  className,
  size = "md",
  title = "Hold to speak",
}: VoiceButtonProps) {
  const [pressing, setPressing] = useState(false)
  const { isSupported, isListening, start, stop } = useVoiceInput({
    onTranscript,
    onComplete: (final) => {
      setPressing(false)
      onCommit?.(final)
    },
  })

  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        title="Voice input isn't supported in this browser"
        className={cn(
          "flex items-center justify-center rounded-full bg-[var(--chidi-surface)] text-[var(--chidi-text-muted)] opacity-40 cursor-not-allowed",
          size === "md" ? "h-9 w-9" : "h-7 w-7",
          className,
        )}
      >
        <MicOff className={size === "md" ? "w-4 h-4" : "w-3.5 h-3.5"} />
      </button>
    )
  }

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setPressing(true)
    start()
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
      <Mic className={cn(size === "md" ? "w-4 h-4" : "w-3.5 h-3.5", "relative z-[1]")} />
    </button>
  )
}
