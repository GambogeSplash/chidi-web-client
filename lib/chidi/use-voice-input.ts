"use client"

import { useEffect, useRef, useState, useCallback } from "react"

/**
 * Press-and-hold voice input for asking Chidi things by voice. Uses the
 * browser's built-in SpeechRecognition (free, on-device on most platforms).
 * Production should swap to Whisper for accuracy on Naija accents — the API
 * surface stays the same so this hook is the only thing that changes.
 */

type RecognitionInstance = {
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: any) => void) | null
  onerror: ((e: any) => void) | null
  onend: (() => void) | null
  continuous: boolean
  interimResults: boolean
  lang: string
}

declare global {
  interface Window {
    SpeechRecognition?: new () => RecognitionInstance
    webkitSpeechRecognition?: new () => RecognitionInstance
  }
}

export interface UseVoiceInputOptions {
  onTranscript?: (transcript: string) => void
  onComplete?: (transcript: string) => void
  lang?: string
}

export function useVoiceInput({ onTranscript, onComplete, lang = "en-NG" }: UseVoiceInputOptions = {}) {
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const recognitionRef = useRef<RecognitionInstance | null>(null)
  const finalTranscriptRef = useRef("")

  useEffect(() => {
    if (typeof window === "undefined") return
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setIsSupported(!!Recognition)
  }, [])

  const start = useCallback(() => {
    if (typeof window === "undefined") return
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) return

    finalTranscriptRef.current = ""
    setTranscript("")
    const recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = lang

    recognition.onresult = (event: any) => {
      let interim = ""
      let final = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) final += result[0].transcript
        else interim += result[0].transcript
      }
      finalTranscriptRef.current += final
      const combined = (finalTranscriptRef.current + interim).trim()
      setTranscript(combined)
      onTranscript?.(combined)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
      const finished = finalTranscriptRef.current.trim()
      if (finished) onComplete?.(finished)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [lang, onTranscript, onComplete])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort()
      } catch {
        // ignore — recognition may have already ended
      }
    }
  }, [])

  return { isSupported, isListening, transcript, start, stop }
}
