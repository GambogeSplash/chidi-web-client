"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { Check, ArrowRight } from "lucide-react"
import { useConnections } from "@/lib/hooks/use-messaging"
import { usePaymentSettings } from "@/lib/hooks/use-settings"
import { usePolicies } from "@/lib/hooks/use-policies"
import { useDashboardAuth } from "@/lib/providers/dashboard-auth-context"
import { cn } from "@/lib/utils"

interface SetupStatusProps {
  /** Optional callback to switch settings sections from the chip */
  onJumpToSection?: (sectionId: string) => void
}

/**
 * Setup Status hero — sits at the top of Settings.
 *
 * Shows a circular progress ring + the count + clickable chips for the steps
 * that are still incomplete. Once everything is set up, it collapses to a
 * single "All set up" line so it doesn't take real estate forever.
 *
 * Pulls live signals from the same hooks the rest of the app uses (channels,
 * payment, policies, business name) — no fabricated state.
 */
export function SetupStatus({ onJumpToSection }: SetupStatusProps) {
  const router = useRouter()
  const { user } = useDashboardAuth()
  const businessId = (user as any)?.businessId ?? null

  const { data: connections } = useConnections()
  const { data: paymentSettings } = usePaymentSettings(businessId)
  const { data: policies } = usePolicies(businessId)

  const items = useMemo(() => {
    const businessName = (user as any)?.businessName
    const hasChannels = (connections?.total ?? 0) > 0
    const hasPayment = !!(paymentSettings?.bank_name || paymentSettings?.account_number)
    const hasPolicies = (policies?.length ?? 0) > 0
    const hasBusinessName = !!businessName

    return [
      {
        id: "integrations",
        label: "Connect a channel",
        sub: "WhatsApp or Telegram, so customers can reach you",
        done: hasChannels,
      },
      {
        id: "profile",
        label: "Add business details",
        sub: "Name, address, hours — used on receipts and replies",
        done: hasBusinessName,
      },
      {
        id: "payment",
        label: "Set payment details",
        sub: "Bank or mobile money, shared when customers commit",
        done: hasPayment,
      },
      {
        id: "ai",
        label: "Add business policies",
        sub: "Returns, delivery, hours — Chidi uses these in replies",
        done: hasPolicies,
      },
    ]
  }, [user, connections, paymentSettings, policies])

  const total = items.length
  const done = items.filter((i) => i.done).length
  const pct = (done / total) * 100
  const allDone = done === total
  const incomplete = items.filter((i) => !i.done)

  const handleJump = (id: string) => {
    if (onJumpToSection) {
      onJumpToSection(id)
      return
    }
    router.push(`?section=${id}`)
  }

  if (allDone) {
    return (
      <div className="rounded-xl chidi-paper bg-[var(--card)] border border-[var(--chidi-border-default)] px-5 py-3 mb-6 flex items-center gap-3 chidi-brief-card">
        <span className="w-7 h-7 rounded-full bg-[var(--chidi-win)]/15 text-[var(--chidi-win)] flex items-center justify-center flex-shrink-0">
          <Check className="w-4 h-4" strokeWidth={2.4} />
        </span>
        <p className="text-[13px] font-chidi-voice text-[var(--chidi-text-secondary)]">
          <span className="text-[var(--chidi-text-primary)] font-medium">All set up.</span>{" "}
          Settings are tuned. Tweak anything below.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl chidi-paper bg-[var(--card)] border border-[var(--chidi-border-default)] p-5 lg:p-6 mb-6 chidi-brief-card">
      <div className="flex items-start gap-4">
        {/* Progress ring */}
        <div className="flex-shrink-0">
          <ProgressRing percent={pct} done={done} total={total} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium mb-1.5">Setup</p>
          <h2 className="text-[15px] font-semibold text-[var(--chidi-text-primary)] mb-1">
            {done === 0
              ? "Let's get you set up."
              : `${done} of ${total} done.`}
          </h2>
          <p className="text-[13px] text-[var(--chidi-text-secondary)] mb-4 leading-snug">
            Each step takes a minute.
          </p>

          {/* Incomplete chips */}
          <div className="flex flex-wrap gap-2">
            {incomplete.map((item) => (
              <button
                key={item.id}
                onClick={() => handleJump(item.id)}
                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--chidi-border-default)] bg-[var(--chidi-surface)] hover:bg-white text-[12px] font-chidi-voice text-[var(--chidi-text-primary)] transition-colors active:scale-[0.98]"
                title={item.sub}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--chidi-warning)]" />
                <span>{item.label}</span>
                <ArrowRight className="w-3 h-3 text-[var(--chidi-text-muted)] group-hover:text-[var(--chidi-text-primary)] group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>

          {/* Completed line — quietly listed below */}
          {done > 0 && (
            <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice mt-3">
              <span className="text-[var(--chidi-success,#5BAD5C)]">✓</span> {done} done:{" "}
              {items
                .filter((i) => i.done)
                .map((i) => i.label.toLowerCase())
                .join(", ")}
              .
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

interface ProgressRingProps {
  percent: number
  done: number
  total: number
}

function ProgressRing({ percent, done, total }: ProgressRingProps) {
  const size = 56
  const stroke = 5
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = (Math.min(100, Math.max(0, percent)) / 100) * c

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--chidi-border-subtle)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--chidi-win)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ transition: "stroke-dasharray 600ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[15px] font-semibold tabular-nums leading-none text-[var(--chidi-text-primary)]">
          {done}
        </span>
        <span className="text-[8px] text-[var(--chidi-text-muted)] tabular-nums tracking-wider">
          / {total}
        </span>
      </div>
    </div>
  )
}
