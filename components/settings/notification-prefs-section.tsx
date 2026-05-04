"use client"

import { useEffect, useState } from "react"
import { Bell, Mail, MessageCircle, Moon } from "lucide-react"
import { SettingsSectionCard } from "./settings-section-card"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import {
  defaultMatrixFor,
  getPrefs,
  ROUTED_TYPES,
  setChannel,
  setQuietHours,
  subscribe,
  TYPE_LABELS,
  type NotificationPrefsStore,
  type NotifChannel,
} from "@/lib/chidi/notification-prefs"
import { cn } from "@/lib/utils"

const CHANNEL_META: { key: NotifChannel; label: string; icon: typeof Bell }[] =
  [
    { key: "push", label: "Push", icon: Bell },
    { key: "email", label: "Email", icon: Mail },
    { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  ]

interface NotificationPrefsSectionProps {
  /** Optional callback to navigate the user to the verify-business modal/section. */
  onVerifyBusiness?: () => void
}

export function NotificationPrefsSection({
  onVerifyBusiness,
}: NotificationPrefsSectionProps) {
  const [store, setStore] = useState<NotificationPrefsStore>(() => getPrefs())

  useEffect(() => {
    const off = subscribe(setStore)
    return off
  }, [])

  return (
    <SettingsSectionCard
      eyebrow="Notifications"
      title="Where each alert lands"
      description="Pick which channel handles each kind of notification."
    >
      {/* Quiet hours — full row above the matrix. */}
      <div className="rounded-xl border border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface)]/40 p-3 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Moon
              className="w-4 h-4 text-[var(--chidi-text-muted)] flex-shrink-0"
              strokeWidth={1.8}
            />
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-[var(--chidi-text-primary)]">
                Quiet hours
              </p>
              <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice mt-0.5">
                No alerts on any channel during these hours.
              </p>
            </div>
          </div>
          <Switch
            checked={store.quietHours.enabled}
            onCheckedChange={(v) => setQuietHours({ enabled: v })}
            aria-label="Enable quiet hours"
          />
        </div>
        {store.quietHours.enabled && (
          <div className="mt-3 pt-3 border-t border-[var(--chidi-border-subtle)] flex items-center gap-2 flex-wrap">
            <Input
              type="time"
              value={store.quietHours.start}
              onChange={(e) => setQuietHours({ start: e.target.value })}
              aria-label="Quiet hours start"
              className="w-28 h-8 text-[13px] bg-white border-[var(--chidi-border-subtle)]"
            />
            <span className="text-[12px] text-[var(--chidi-text-muted)]">
              to
            </span>
            <Input
              type="time"
              value={store.quietHours.end}
              onChange={(e) => setQuietHours({ end: e.target.value })}
              aria-label="Quiet hours end"
              className="w-28 h-8 text-[13px] bg-white border-[var(--chidi-border-subtle)]"
            />
          </div>
        )}
      </div>

      {/* Matrix — rows are notification types, columns are channels. On
          mobile the column headers stay readable thanks to compact icons +
          short labels. The header row uses tabular spacing so toggles align. */}
      <div className="rounded-xl border border-[var(--chidi-border-subtle)] overflow-hidden">
        {/* Header row */}
        <div
          role="row"
          className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 sm:gap-4 px-3 py-2 bg-[var(--chidi-surface)]/50 text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium"
        >
          <div role="columnheader">Notification</div>
          {CHANNEL_META.map((c) => {
            const Icon = c.icon
            return (
              <div
                role="columnheader"
                key={c.key}
                className="w-12 sm:w-16 text-center flex flex-col items-center gap-0.5"
                title={c.label}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden />
                <span className="hidden sm:inline">{c.label}</span>
              </div>
            )
          })}
        </div>

        {/* Body rows */}
        {ROUTED_TYPES.map((type, i) => {
          const matrix = store.prefs[type] ?? defaultMatrixFor(type)
          return (
            <div
              key={type}
              role="row"
              className={cn(
                "grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 sm:gap-4 px-3 py-2.5",
                i > 0 && "border-t border-[var(--chidi-border-subtle)]",
              )}
            >
              <div className="min-w-0 pr-2">
                <p className="text-[13px] text-[var(--chidi-text-primary)] truncate">
                  {TYPE_LABELS[type]}
                </p>
              </div>
              {CHANNEL_META.map((c) => (
                <div
                  key={c.key}
                  role="cell"
                  className="w-12 sm:w-16 flex justify-center"
                >
                  <Switch
                    checked={matrix[c.key]}
                    onCheckedChange={(v) => setChannel(type, c.key, v)}
                    aria-label={`${TYPE_LABELS[type]} on ${c.label}`}
                  />
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <div className="mt-3 px-1 text-[11px] text-[var(--chidi-text-muted)] leading-snug">
        WhatsApp delivery requires a verified Business profile.{" "}
        {onVerifyBusiness ? (
          <button
            type="button"
            onClick={onVerifyBusiness}
            className="underline underline-offset-2 text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)]"
          >
            Verify Business
          </button>
        ) : (
          <span className="text-[var(--chidi-text-secondary)]">
            Verify your business in Profile.
          </span>
        )}
      </div>
    </SettingsSectionCard>
  )
}
