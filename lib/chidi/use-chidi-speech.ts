"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// =============================================================================
// useChidiSpeech — minimal wrapper around the browser's Web Speech Synthesis
// API. Zero dependencies, no API key, works in every modern browser.
//
// We pick the most "Nigerian-English" voice we can find on the device:
//   1. en-NG (Nigerian English) — rare, only on a handful of Android builds
//   2. en-ZA (South African) — closest to NG cadence on most desktops
//   3. en-GB (British) — the default fallback most TTS engines do well
//   4. any en-* voice
//   5. system default
//
// Phase-2 upgrade path: swap the utterance for an ElevenLabs streaming-audio
// fetch + an HTMLAudioElement, then re-use the same `speak/cancel/onEnd`
// surface. The downstream consumers (mouth, waveform) already key off the
// `state` flag and the `boundary` pulse — they don't care what plays the bytes.
// Skipped for now: needs an API key + a backend proxy + a paid plan.
// =============================================================================

export type ChidiSpeechState = "idle" | "speaking"

interface SpeakOptions {
  /** Called when the utterance ends (naturally or via cancel). */
  onEnd?: () => void
  /** Override the default rate/pitch for one call. */
  rate?: number
  pitch?: number
}

export interface UseChidiSpeech {
  /** Current speech state. */
  state: ChidiSpeechState
  /** True if the browser exposes speechSynthesis. */
  supported: boolean
  /** Speak a string. Cancels any in-flight utterance first. */
  speak: (text: string, opts?: SpeakOptions) => void
  /** Cancel the current utterance. */
  cancel: () => void
  /**
   * Increments every time a word/sentence boundary fires. Useful as an
   * amplitude pulse for mouth + waveform animation. Wraps at MAX_SAFE_INTEGER.
   */
  boundary: number
}

/** Pick the best available voice — Nigerian first, English fallbacks after. */
function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null
  const byLang = (lang: string) =>
    voices.find((v) => v.lang?.toLowerCase().startsWith(lang.toLowerCase()))

  return (
    byLang("en-NG") ||
    byLang("en-ZA") ||
    byLang("en-GH") ||
    byLang("en-KE") ||
    byLang("en-GB") ||
    byLang("en-AU") ||
    byLang("en") ||
    voices[0] ||
    null
  )
}

export function useChidiSpeech(): UseChidiSpeech {
  const [state, setState] = useState<ChidiSpeechState>("idle")
  const [boundary, setBoundary] = useState(0)
  const [supported, setSupported] = useState(false)

  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)
  const onEndRef = useRef<(() => void) | null>(null)

  // ---- Init: feature-detect + populate voice ref ---------------------------
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false)
      return
    }
    setSupported(true)

    const refreshVoices = () => {
      voiceRef.current = pickVoice(window.speechSynthesis.getVoices())
    }
    refreshVoices()
    // Chrome loads voices async — listen for them
    window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoices)
    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", refreshVoices)
      // Stop any leftover utterance on unmount
      try { window.speechSynthesis.cancel() } catch {}
    }
  }, [])

  const cancel = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return
    try { window.speechSynthesis.cancel() } catch {}
    utterRef.current = null
    onEndRef.current = null
    setState("idle")
  }, [])

  const speak = useCallback((text: string, opts?: SpeakOptions) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      // Not supported — fire onEnd immediately so callers still advance.
      opts?.onEnd?.()
      return
    }

    // Cancel anything in flight
    try { window.speechSynthesis.cancel() } catch {}

    const u = new SpeechSynthesisUtterance(text)
    if (voiceRef.current) u.voice = voiceRef.current
    u.lang = voiceRef.current?.lang || "en-GB"
    u.rate = opts?.rate ?? 0.95
    u.pitch = opts?.pitch ?? 1.0
    u.volume = 1.0

    onEndRef.current = opts?.onEnd ?? null
    utterRef.current = u

    u.onstart = () => {
      setState("speaking")
      // Kick a boundary so the mouth opens immediately on word 1
      setBoundary((n) => (n + 1) % Number.MAX_SAFE_INTEGER)
    }
    u.onboundary = () => {
      setBoundary((n) => (n + 1) % Number.MAX_SAFE_INTEGER)
    }
    u.onend = () => {
      setState("idle")
      const cb = onEndRef.current
      onEndRef.current = null
      utterRef.current = null
      cb?.()
    }
    u.onerror = () => {
      setState("idle")
      const cb = onEndRef.current
      onEndRef.current = null
      utterRef.current = null
      cb?.()
    }

    try {
      window.speechSynthesis.speak(u)
    } catch {
      // Some browsers throw if called too early — fall back to onEnd
      opts?.onEnd?.()
    }
  }, [])

  return { state, supported, speak, cancel, boundary }
}
