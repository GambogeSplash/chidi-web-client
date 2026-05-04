"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { ChidiMark } from "./chidi-mark"
import { ArcFace } from "./arc-face"
import {
  LOADING_PHRASES_GENERAL,
  LOADING_PHRASES_INBOX,
  LOADING_PHRASES_INSIGHTS,
  LOADING_PHRASES_INVENTORY,
  LOADING_PHRASES_ORDERS,
} from "@/lib/chidi/voice"

type LoaderContext = "general" | "inbox" | "orders" | "inventory" | "insights"

interface ChidiLoaderProps {
  context?: LoaderContext
  size?: "sm" | "md" | "lg"
  /** Override the phrase set entirely. */
  phrases?: string[]
  /** When true, just shows the rotating text — no avatar. Used in line-spinners. */
  inline?: boolean
  className?: string
}

const PHRASES_BY_CONTEXT: Record<LoaderContext, string[]> = {
  general: LOADING_PHRASES_GENERAL,
  inbox: LOADING_PHRASES_INBOX,
  orders: LOADING_PHRASES_ORDERS,
  inventory: LOADING_PHRASES_INVENTORY,
  insights: LOADING_PHRASES_INSIGHTS,
}

const SIZES = {
  sm: { mark: 14, text: "text-xs", gap: "gap-2" },
  md: { mark: 18, text: "text-sm", gap: "gap-2.5" },
  lg: { mark: 24, text: "text-base", gap: "gap-3" },
} as const

/**
 * Branded loading state in Chidi's voice. Replaces the generic Loader2 spinner
 * across the product. The mark gently breathes, the phrase rotates every 2.5s.
 *
 * Use inline=true for tight spaces (sub-line spinner), default for full
 * loading panels.
 */
export function ChidiLoader({
  context = "general",
  size = "md",
  phrases,
  inline = false,
  className,
}: ChidiLoaderProps) {
  const list = phrases ?? PHRASES_BY_CONTEXT[context]
  const [index, setIndex] = useState(0)
  const indexRef = useRef(0)

  useEffect(() => {
    const interval = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % list.length
      setIndex(indexRef.current)
    }, 2500)
    return () => clearInterval(interval)
  }, [list.length])

  const dim = SIZES[size]

  if (inline) {
    return (
      <span className={cn("inline-flex items-center", dim.gap, dim.text, "text-[var(--chidi-text-muted)] font-chidi-voice", className)}>
        <ChidiMark size={dim.mark} variant="muted" className="chidi-loader-breathe" />
        <span>{list[index]}</span>
      </span>
    )
  }

  return (
    <div className={cn("flex flex-col items-center justify-center text-center", className)}>
      <div className="w-10 h-10 rounded-full bg-[var(--chidi-win-soft)] flex items-center justify-center mb-3 chidi-loader-breathe">
        <ArcFace size={20} className="text-[var(--chidi-win)]" />
      </div>
      <p className={cn("text-[var(--chidi-text-secondary)] font-chidi-voice", dim.text)}>
        {list[index]}
      </p>
    </div>
  )
}
