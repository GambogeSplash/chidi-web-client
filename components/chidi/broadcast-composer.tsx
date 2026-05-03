"use client"

/**
 * BroadcastComposer — Dialog-based modal that lets the merchant send a
 * one-shot message to a segment of customers across one or both channels.
 *
 * Channel-agnostic by design (Chidi started on Telegram and added WhatsApp;
 * both are first-class). The "Both" option doesn't duplicate-send to
 * everyone — it means "send via WhatsApp where I have it, Telegram where I
 * don't, and both where the customer is on both."
 *
 * Persistence: localStorage outbox via lib/chidi/broadcasts.ts. No real
 * sending — backend doesn't exist for this surface yet. The Recent
 * broadcasts strip on the customers page reads from the same store.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { Image as ImageIcon, X as XIcon, Send, Calendar as CalendarIcon, Megaphone } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { WhatsAppIcon, TelegramIcon } from "@/components/ui/channel-icons"
import { CustomerCharacter } from "./customer-character"
import { ChidiMark } from "./chidi-mark"
import { cn } from "@/lib/utils"
import { queueBroadcast } from "@/lib/chidi/broadcasts"
import type { ChannelKey, Segment } from "@/lib/chidi/segments"
import type { CustomerSummary } from "@/lib/types/analytics"

interface BroadcastComposerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  segment: Segment
  audience: CustomerSummary[]
  /** Fired after queueBroadcast() persists — lets the page refresh the recent strip. */
  onQueued?: () => void
}

type ChannelTarget = "WHATSAPP" | "TELEGRAM" | "BOTH"

const TARGETS: { value: ChannelTarget; label: string }[] = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "TELEGRAM", label: "Telegram" },
  { value: "BOTH", label: "Both" },
]

export function BroadcastComposer({
  open,
  onOpenChange,
  segment,
  audience,
  onQueued,
}: BroadcastComposerProps) {
  const [target, setTarget] = useState<ChannelTarget>("BOTH")
  const [message, setMessage] = useState<string>("")
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now")
  const [scheduleDate, setScheduleDate] = useState<string>(() => defaultIsoDate())
  const [scheduleTime, setScheduleTime] = useState<string>("09:00")
  const [attachment, setAttachment] = useState<{ dataUrl: string; name: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset state on open so a fresh compose doesn't inherit the previous draft.
  useEffect(() => {
    if (open) {
      setTarget("BOTH")
      setScheduleMode("now")
      setScheduleDate(defaultIsoDate())
      setScheduleTime("09:00")
      setAttachment(null)
      setSubmitting(false)
      // Keep `message` so the merchant doesn't lose what they typed if they
      // briefly close the modal — only blank it on successful queue.
    }
  }, [open])

  // Sample customer for the live merge-tag preview. Picks the first audience
  // member with a name; falls back to a neutral placeholder.
  const sample = useMemo(
    () => audience.find((c) => !!c?.name) ?? null,
    [audience],
  )
  const sampleFirstName = useMemo(() => {
    const raw = sample?.name?.trim() || "there"
    return raw.split(/\s+/)[0] || "there"
  }, [sample])

  const previewMessage = useMemo(
    () => message.replace(/\{first_name\}/gi, sampleFirstName),
    [message, sampleFirstName],
  )

  const audienceCount = audience.length
  const tooBig = audienceCount === 0
  const messageReady = message.trim().length >= 4
  const canSend = !submitting && !tooBig && messageReady

  const handleAttachment = (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Only image attachments for now.")
      return
    }
    if (file.size > 1_500_000) {
      toast.error("Image too large", { description: "Keep attachments under 1.5MB." })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : ""
      if (url) setAttachment({ dataUrl: url, name: file.name })
    }
    reader.readAsDataURL(file)
  }

  const handleSend = () => {
    if (!canSend) return
    setSubmitting(true)
    const channelTargets: ChannelKey[] =
      target === "BOTH" ? ["WHATSAPP", "TELEGRAM"] : [target]
    let scheduledFor: Date | null = null
    if (scheduleMode === "later" && scheduleDate && scheduleTime) {
      const dt = new Date(`${scheduleDate}T${scheduleTime}:00`)
      if (Number.isFinite(dt.getTime())) scheduledFor = dt
    }
    try {
      queueBroadcast({
        segmentId: segment.id,
        segmentLabel: segment.label,
        channelTargets,
        message: message.trim(),
        attachmentDataUrl: attachment?.dataUrl,
        attachmentName: attachment?.name,
        scheduledFor,
        audienceCount,
      })
      const label = scheduledFor && scheduledFor.getTime() > Date.now() + 30_000
        ? `Broadcast scheduled for ${audienceCount} ${audienceCount === 1 ? "customer" : "customers"}`
        : `Broadcast queued for ${audienceCount} ${audienceCount === 1 ? "customer" : "customers"}`
      toast.success(label, {
        description: `Going to ${segment.label} on ${describeTargets(channelTargets)}.`,
      })
      setMessage("")
      onQueued?.()
      onOpenChange(false)
    } catch (e) {
      toast.error("Couldn't queue that.", {
        description: "Try again. We don't have a connection for this yet.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Avatar stack — first 5 + count for the rest. Uses the same
  // CustomerCharacter primitive the inbox/customers table uses.
  const stack = audience.slice(0, 5)
  const overflow = Math.max(0, audienceCount - stack.length)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-xl flex flex-col gap-0 p-0 overflow-hidden",
          "max-h-[92vh] sm:max-h-[88vh]",
        )}
      >
        {/* Header — Chidi-voiced, eyebrow + bold title */}
        <header className="px-5 sm:px-6 pt-5 pb-4 border-b border-[var(--chidi-border-subtle)]">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-[var(--chidi-win-soft)] flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-[var(--chidi-win)]" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold mb-0.5">
                New broadcast
              </p>
              <DialogTitle className="text-[17px] font-semibold text-[var(--chidi-text-primary)] leading-snug">
                Send a message to {segment.label}.
              </DialogTitle>
              <DialogDescription className="text-[12px] text-[var(--chidi-text-secondary)] mt-1 font-chidi-voice leading-snug">
                {segment.hint}.
              </DialogDescription>
            </div>
          </div>
        </header>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
          {/* Audience preview */}
          <section
            className="flex items-center gap-3 rounded-xl border border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface)]/50 px-3 py-2.5"
            aria-label="Audience preview"
          >
            <div className="flex -space-x-2">
              {stack.length === 0 && (
                <div
                  className="w-7 h-7 rounded-full bg-[var(--chidi-surface)] border-2 border-[var(--card)]"
                  aria-hidden
                />
              )}
              {stack.map((c, i) => (
                <CustomerCharacter
                  key={`${c.phone}-${i}`}
                  name={c.name}
                  fallbackId={c.phone}
                  size="sm"
                  className="ring-2 ring-[var(--card)] rounded-full"
                />
              ))}
              {overflow > 0 && (
                <span className="w-8 h-8 rounded-full bg-[var(--card)] border-2 border-[var(--card)] flex items-center justify-center text-[10px] font-semibold tabular-nums text-[var(--chidi-text-secondary)] shadow-sm">
                  +{overflow}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[var(--chidi-text-primary)] leading-snug">
                Sending to {audienceCount.toLocaleString()} {audienceCount === 1 ? "customer" : "customers"}
              </p>
              <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice">
                in {segment.label}
              </p>
            </div>
          </section>

          {/* Channel target picker */}
          <Field
            label="Channel"
            description="Pick where this goes. Customers on only one channel still get reached."
          >
            <div className="grid grid-cols-3 gap-1.5">
              {TARGETS.map((opt) => {
                const active = target === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTarget(opt.value)}
                    aria-pressed={active}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border text-[12.5px] font-medium transition-all motion-safe:duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-win)]/40",
                      active
                        ? "border-[var(--chidi-text-primary)] bg-[var(--chidi-surface)] text-[var(--chidi-text-primary)] shadow-sm"
                        : "border-[var(--chidi-border-subtle)] text-[var(--chidi-text-secondary)] hover:border-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)]",
                    )}
                  >
                    <ChannelGlyph target={opt.value} active={active} />
                    <span>{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </Field>

          {/* Message composer */}
          <Field
            label="Message"
            description="Use {first_name} to greet by first name."
          >
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder={`Hi {first_name}! Quick heads-up — restocked the Ankara fabric you asked about.`}
              className="w-full bg-[var(--chidi-surface)]/60 border border-[var(--chidi-border-subtle)] rounded-md px-3 py-2.5 text-[13px] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:outline-none focus:border-[var(--chidi-text-primary)] transition-colors resize-none leading-snug font-chidi-voice"
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-[var(--chidi-text-muted)] tabular-nums">
                {message.length} / 1024
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] transition-colors"
              >
                <ImageIcon className="w-3.5 h-3.5" strokeWidth={1.8} />
                {attachment ? "Replace image" : "Add image"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleAttachment(e.target.files?.[0] ?? null)}
                className="sr-only"
              />
            </div>

            {attachment && (
              <div className="mt-3 flex items-center gap-3 p-2 rounded-lg border border-[var(--chidi-border-subtle)] bg-[var(--card)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachment.dataUrl}
                  alt="Attachment preview"
                  className="w-12 h-12 rounded-md object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[var(--chidi-text-primary)] truncate">
                    {attachment.name}
                  </p>
                  <p className="text-[10px] text-[var(--chidi-text-muted)]">
                    Sends with the message
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  aria-label="Remove image"
                  className="p-1.5 rounded-md text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] transition-colors"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </Field>

          {/* Live preview */}
          <section
            aria-label="Message preview"
            className="rounded-xl border border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface)]/40 p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <ChidiMark size={12} variant="muted" />
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold">
                Preview · {sample?.name ?? "Sample customer"}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--card)] border border-[var(--chidi-border-subtle)] p-3 space-y-2">
              {attachment && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={attachment.dataUrl}
                  alt="Preview attachment"
                  className="w-full max-h-40 object-cover rounded-md"
                />
              )}
              <p className="text-[13px] text-[var(--chidi-text-primary)] font-chidi-voice whitespace-pre-wrap leading-snug">
                {previewMessage.trim() || (
                  <span className="text-[var(--chidi-text-muted)] italic">Your message will appear here.</span>
                )}
              </p>
            </div>
          </section>

          {/* Schedule */}
          <Field label="When">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setScheduleMode("now")}
                aria-pressed={scheduleMode === "now"}
                className={cn(
                  "flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border text-[12.5px] font-medium transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-win)]/40",
                  scheduleMode === "now"
                    ? "border-[var(--chidi-text-primary)] bg-[var(--chidi-surface)] text-[var(--chidi-text-primary)] shadow-sm"
                    : "border-[var(--chidi-border-subtle)] text-[var(--chidi-text-secondary)] hover:border-[var(--chidi-text-muted)]",
                )}
              >
                <Send className="w-3.5 h-3.5" strokeWidth={1.8} />
                Send now
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode("later")}
                aria-pressed={scheduleMode === "later"}
                className={cn(
                  "flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border text-[12.5px] font-medium transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-win)]/40",
                  scheduleMode === "later"
                    ? "border-[var(--chidi-text-primary)] bg-[var(--chidi-surface)] text-[var(--chidi-text-primary)] shadow-sm"
                    : "border-[var(--chidi-border-subtle)] text-[var(--chidi-text-secondary)] hover:border-[var(--chidi-text-muted)]",
                )}
              >
                <CalendarIcon className="w-3.5 h-3.5" strokeWidth={1.8} />
                Schedule
              </button>
            </div>
            {scheduleMode === "later" && (
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={defaultIsoDate()}
                  className="bg-[var(--chidi-surface)]/60 border border-[var(--chidi-border-subtle)] rounded-md px-3 py-2 text-[12.5px] text-[var(--chidi-text-primary)] focus:outline-none focus:border-[var(--chidi-text-primary)] transition-colors"
                />
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="bg-[var(--chidi-surface)]/60 border border-[var(--chidi-border-subtle)] rounded-md px-3 py-2 text-[12.5px] text-[var(--chidi-text-primary)] focus:outline-none focus:border-[var(--chidi-text-primary)] transition-colors"
                />
              </div>
            )}
          </Field>
        </div>

        {/* Footer */}
        <footer className="px-5 sm:px-6 py-3 border-t border-[var(--chidi-border-subtle)] flex items-center justify-between gap-3 bg-[var(--card)]">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-[13px] font-medium text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] px-3 py-2 rounded-md hover:bg-[var(--chidi-surface)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className={cn(
              "inline-flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-md transition-colors",
              "bg-[var(--chidi-text-primary)] text-[var(--background)] hover:bg-[var(--chidi-text-primary)]/90",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            <Send className="w-3.5 h-3.5" strokeWidth={2.2} />
            {scheduleMode === "later" ? "Schedule broadcast" : "Send broadcast"}
          </button>
        </footer>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Helpers ----------------------------------------------------------

function defaultIsoDate(): string {
  const d = new Date()
  // YYYY-MM-DD in local time
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function describeTargets(targets: ChannelKey[]): string {
  if (targets.length === 2) return "WhatsApp + Telegram"
  if (targets[0] === "TELEGRAM") return "Telegram"
  return "WhatsApp"
}

function ChannelGlyph({ target, active }: { target: ChannelTarget; active: boolean }) {
  const tone = active ? "text-[var(--chidi-text-primary)]" : "text-[var(--chidi-text-muted)]"
  if (target === "WHATSAPP") return <WhatsAppIcon size={14} className={tone} />
  if (target === "TELEGRAM") return <TelegramIcon size={14} className={tone} />
  // Both — render a small pair
  return (
    <span className="inline-flex items-center gap-0.5">
      <WhatsAppIcon size={12} className={tone} />
      <TelegramIcon size={12} className={tone} />
    </span>
  )
}

function Field({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold">
          {label}
        </label>
        {description && (
          <span className="text-[10.5px] text-[var(--chidi-text-muted)] font-chidi-voice">
            {description}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}
