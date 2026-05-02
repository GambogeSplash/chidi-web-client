"use client"

import { cn } from "@/lib/utils"

interface EmptyArtProps {
  variant: "inbox" | "orders" | "inventory" | "insights" | "copilot" | "search"
  className?: string
  size?: number
}

/**
 * Hand-drawn-feeling SVG illustrations for empty states. Inline so they
 * inherit text color. Each one is a small visual metaphor for the surface,
 * drawn in line-only with the win color as a single accent.
 *
 * They're deliberately NOT cute mascots — they're warm-paper iconography.
 */
export function EmptyArt({ variant, className, size = 96 }: EmptyArtProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("flex-shrink-0", className)}
      aria-hidden
    >
      {variant === "inbox" && <InboxArt />}
      {variant === "orders" && <OrdersArt />}
      {variant === "inventory" && <InventoryArt />}
      {variant === "insights" && <InsightsArt />}
      {variant === "copilot" && <CopilotArt />}
      {variant === "search" && <SearchArt />}
    </svg>
  )
}

const STROKE = "currentColor"
const ACCENT = "var(--chidi-win)"

// A phone with a paper-plane lifting off — quiet inbox
function InboxArt() {
  return (
    <g>
      <rect x="32" y="20" width="44" height="76" rx="6" stroke={STROKE} strokeWidth="1.5" opacity="0.5" />
      <line x1="40" y1="32" x2="68" y2="32" stroke={STROKE} strokeWidth="1.2" opacity="0.4" />
      <line x1="40" y1="40" x2="62" y2="40" stroke={STROKE} strokeWidth="1.2" opacity="0.4" />
      <rect x="38" y="48" width="32" height="14" rx="3" stroke={STROKE} strokeWidth="1.2" opacity="0.4" />
      <rect x="38" y="66" width="20" height="10" rx="3" stroke={STROKE} strokeWidth="1.2" opacity="0.4" />
      {/* Paper plane lifting off — SMIL animation works reliably on <g> */}
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; 6 -10; 0 0"
          keyTimes="0; 0.4; 1"
          dur="3.6s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
        />
        <path
          d="M88 52 L106 44 L96 60 L92 56 L88 52 Z"
          stroke={ACCENT}
          strokeWidth="1.6"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M92 56 L96 60" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" />
      </g>
      <circle cx="60" cy="100" r="2" fill={STROKE} opacity="0.3" />
    </g>
  )
}

// A receipt unfurling from a printer slot
function OrdersArt() {
  return (
    <g>
      {/* Printer body */}
      <rect x="22" y="28" width="76" height="22" rx="4" stroke={STROKE} strokeWidth="1.5" opacity="0.5" />
      <line x1="32" y1="38" x2="42" y2="38" stroke={STROKE} strokeWidth="1.2" opacity="0.4" />
      <circle cx="86" cy="38" r="2" stroke={STROKE} strokeWidth="1.2" opacity="0.4" />
      {/* Receipt curling out — SMIL scale animation */}
      <g transform="translate(0 0)">
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; 0 -3; 0 0"
          keyTimes="0; 0.5; 1"
          dur="3.5s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
        />
        <path
          d="M36 50 L36 96 L60 96 L60 102 L72 96 L84 96 L84 50"
          stroke={STROKE}
          strokeWidth="1.5"
          strokeLinejoin="round"
          opacity="0.6"
        />
        <line x1="42" y1="60" x2="78" y2="60" stroke={STROKE} strokeWidth="1.2" opacity="0.4" />
        <line x1="42" y1="68" x2="74" y2="68" stroke={STROKE} strokeWidth="1.2" opacity="0.4" />
        <line x1="42" y1="76" x2="78" y2="76" stroke={STROKE} strokeWidth="1.2" opacity="0.4" />
        <line x1="42" y1="84" x2="68" y2="84" stroke={STROKE} strokeWidth="1.2" opacity="0.4" />
        <circle cx="78" cy="84" r="5" stroke={ACCENT} strokeWidth="1.5" />
        <path d="M75 84 L77 86 L81 82" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </g>
  )
}

// A stack of wrapped boxes / parcels
function InventoryArt() {
  return (
    <g>
      <rect x="22" y="58" width="34" height="34" rx="3" stroke={STROKE} strokeWidth="1.5" opacity="0.5" />
      <line x1="22" y1="74" x2="56" y2="74" stroke={STROKE} strokeWidth="1.2" opacity="0.4" />
      <line x1="39" y1="58" x2="39" y2="92" stroke={STROKE} strokeWidth="1.2" opacity="0.4" />
      <rect x="60" y="48" width="38" height="44" rx="3" stroke={STROKE} strokeWidth="1.5" opacity="0.5" />
      <line x1="60" y1="66" x2="98" y2="66" stroke={STROKE} strokeWidth="1.2" opacity="0.4" />
      <line x1="79" y1="48" x2="79" y2="92" stroke={STROKE} strokeWidth="1.2" opacity="0.4" />
      {/* Featured top box — gentle float (SMIL) */}
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; 0 -3; 0 0"
          keyTimes="0; 0.5; 1"
          dur="4s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
        />
        <rect x="36" y="28" width="30" height="30" rx="3" stroke={ACCENT} strokeWidth="1.6" />
        <line x1="36" y1="42" x2="66" y2="42" stroke={ACCENT} strokeWidth="1.4" />
        <line x1="51" y1="28" x2="51" y2="58" stroke={ACCENT} strokeWidth="1.4" />
      </g>
    </g>
  )
}

// A bar chart growing
function InsightsArt() {
  return (
    <g>
      <line x1="22" y1="96" x2="98" y2="96" stroke={STROKE} strokeWidth="1.5" opacity="0.5" />
      <line x1="22" y1="22" x2="22" y2="96" stroke={STROKE} strokeWidth="1.5" opacity="0.5" />
      <rect x="32" y="72" width="12" height="22" stroke={STROKE} strokeWidth="1.4" opacity="0.5" />
      <rect x="50" y="58" width="12" height="36" stroke={STROKE} strokeWidth="1.4" opacity="0.5" />
      {/* Tallest bar grows — SMIL animation on the rect */}
      <rect x="68" y="40" width="12" height="54" stroke={ACCENT} strokeWidth="1.6" fill="none">
        <animate
          attributeName="height"
          values="54; 60; 54"
          keyTimes="0; 0.5; 1"
          dur="3s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
        />
        <animate
          attributeName="y"
          values="40; 34; 40"
          keyTimes="0; 0.5; 1"
          dur="3s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
        />
      </rect>
      {/* Trend arrow drifts up-right */}
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; 2 -3; 0 0"
          keyTimes="0; 0.5; 1"
          dur="3s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
        />
        <path d="M86 40 L98 28" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M93 28 L98 28 L98 33" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </g>
  )
}

// A speech bubble with a chidi-mark inside
function CopilotArt() {
  return (
    <g>
      <path
        d="M22 32 Q22 22 32 22 L88 22 Q98 22 98 32 L98 70 Q98 80 88 80 L60 80 L48 94 L48 80 L32 80 Q22 80 22 70 Z"
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.5"
      />
      {/* Chidi mark inside bubble — gentle opacity pulse (SMIL) */}
      <g>
        <animate
          attributeName="opacity"
          values="1; 0.65; 1"
          keyTimes="0; 0.5; 1"
          dur="3s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
        />
        <path
          d="M70 38 C66 34 60 32 55 32 C46 32 38 40 38 50 C38 60 46 68 55 68 C60 68 66 66 70 62"
          stroke={ACCENT}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M64 42 C62 40 60 39 57 39 C53 39 50 43 50 47 C50 51 53 55 57 55 C60 55 62 54 64 52"
          stroke={ACCENT}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />
      </g>
    </g>
  )
}

// A magnifying glass over paper
function SearchArt() {
  return (
    <g>
      <rect x="22" y="28" width="48" height="60" rx="4" stroke={STROKE} strokeWidth="1.5" opacity="0.4" />
      <line x1="30" y1="42" x2="58" y2="42" stroke={STROKE} strokeWidth="1.2" opacity="0.3" />
      <line x1="30" y1="50" x2="52" y2="50" stroke={STROKE} strokeWidth="1.2" opacity="0.3" />
      <line x1="30" y1="58" x2="58" y2="58" stroke={STROKE} strokeWidth="1.2" opacity="0.3" />
      {/* Magnifier sweeps left-right (SMIL) */}
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; -3 1; 0 0"
          keyTimes="0; 0.5; 1"
          dur="3.5s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
        />
        <circle cx="74" cy="64" r="14" stroke={ACCENT} strokeWidth="2" />
        <line x1="84" y1="74" x2="96" y2="86" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
      </g>
    </g>
  )
}
