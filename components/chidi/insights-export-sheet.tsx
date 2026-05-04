"use client"

/**
 * InsightsExportSheet — right-side drawer for exporting the current Insights
 * view. Two tabs:
 *
 *   Download now   → button: "Download CSV" (instant blob download)
 *   Schedule email → form: email + frequency picker + time picker + Save
 *
 * The current schedule (if any) is shown above the form with a "Cancel
 * schedule" link. Footer carries a single honest line: "Real email delivery
 * requires backend wiring. For now, schedules are saved locally."
 *
 * No new deps. Uses the radix-based Sheet primitive already in the repo.
 * Token-only colors. Honors prefers-reduced-motion via the existing sheet
 * animation classes.
 */

import { useEffect, useState } from "react"
import { Download, Mail, Trash2, Calendar, Clock } from "lucide-react"
import { toast } from "sonner"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import {
  cancelInsightsSchedule,
  describeNextSend,
  downloadInsightsCSV,
  getInsightsSchedule,
  scheduleInsightsEmail,
  type InsightsExportPayload,
  type InsightsSchedule,
  type ScheduleFrequency,
} from "@/lib/chidi/insights-export"

// ============================================================================
// Public API
// ============================================================================

export interface InsightsExportSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Lazy payload — called only when the user actually triggers a download,
   * so we don't pay the snapshot cost on every render of the parent view.
   */
  buildPayload: () => InsightsExportPayload
}

type Tab = "download" | "schedule"

const FREQUENCY_OPTIONS: Array<{ id: ScheduleFrequency; label: string }> = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
]

export function InsightsExportSheet({
  open,
  onOpenChange,
  buildPayload,
}: InsightsExportSheetProps) {
  const [tab, setTab] = useState<Tab>("download")

  // Schedule state — hydrated from localStorage on mount and on every open
  // so a fresh sheet shows the current schedule even if it changed since the
  // last open.
  const [schedule, setSchedule] = useState<InsightsSchedule | null>(null)
  useEffect(() => {
    if (!open) return
    setSchedule(getInsightsSchedule())
  }, [open])

  // Form state. Start from the existing schedule if present so editing
  // doesn't blank the field.
  const [email, setEmail] = useState("")
  const [frequency, setFrequency] = useState<ScheduleFrequency>("weekly")
  const [time, setTime] = useState("09:00")
  useEffect(() => {
    if (!open) return
    const existing = getInsightsSchedule()
    if (existing) {
      setEmail(existing.email)
      setFrequency(existing.frequency)
      setTime(existing.time)
    }
  }, [open])

  // ---------- handlers ------------------------------------------------------

  const handleDownload = () => {
    try {
      downloadInsightsCSV(buildPayload())
      toast.success("Exported insights as CSV")
    } catch (err) {
      console.error("[insights-export] download failed", err)
      toast.error("Couldn't build the CSV — try again")
    }
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes("@")) {
      toast.error("Enter a valid email")
      return
    }
    const saved = scheduleInsightsEmail({ email, frequency, time })
    setSchedule(saved)
    toast.success(describeNextSend(saved))
  }

  const handleCancel = () => {
    cancelInsightsSchedule()
    setSchedule(null)
    toast("Schedule cancelled")
  }

  // ---------- render --------------------------------------------------------

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 bg-[var(--background)] flex flex-col"
      >
        <SheetHeader className="border-b border-[var(--chidi-border-default)] px-5 py-4">
          <SheetTitle className="text-[15px] font-semibold text-[var(--chidi-text-primary)]">
            Export this view
          </SheetTitle>
          <SheetDescription className="text-[12px] text-[var(--chidi-text-muted)]">
            Download a CSV snapshot or set a recurring email digest.
          </SheetDescription>
        </SheetHeader>

        {/* Tab bar */}
        <div className="px-5 pt-4">
          <div className="inline-flex w-full items-center rounded-md border border-[var(--chidi-border-default)] bg-[var(--card)] p-0.5">
            {(
              [
                { id: "download", label: "Download now", Icon: Download },
                { id: "schedule", label: "Schedule email", Icon: Mail },
              ] as const
            ).map((opt) => {
              const Icon = opt.Icon
              return (
                <button
                  key={opt.id}
                  onClick={() => setTab(opt.id)}
                  className={cn(
                    "flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium transition-colors",
                    tab === opt.id
                      ? "bg-[var(--chidi-text-primary)] text-[var(--background)]"
                      : "text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)]",
                  )}
                  aria-pressed={tab === opt.id}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {tab === "download" ? (
            <DownloadTab onDownload={handleDownload} />
          ) : (
            <ScheduleTab
              email={email}
              setEmail={setEmail}
              frequency={frequency}
              setFrequency={setFrequency}
              time={time}
              setTime={setTime}
              schedule={schedule}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          )}
        </div>

        {/* Footer note — single honest line. */}
        <div className="border-t border-[var(--chidi-border-default)] px-5 py-3 bg-[var(--chidi-surface)]/40">
          <p className="text-[10.5px] text-[var(--chidi-text-muted)] leading-snug">
            Real email delivery requires backend wiring. For now, schedules
            are saved locally.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ============================================================================
// Tab — Download now
// ============================================================================

function DownloadTab({ onDownload }: { onDownload: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[12.5px] text-[var(--chidi-text-secondary)] leading-relaxed">
          A multi-section CSV with KPIs, daily revenue, channel mix,
          bestsellers, customers and the cohort breakdown. Opens cleanly in
          Excel, Numbers or Sheets.
        </p>
      </div>
      <button
        onClick={onDownload}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[var(--chidi-text-primary)] text-[var(--background)] text-[13px] font-semibold hover:opacity-90 transition-opacity"
      >
        <Download className="w-4 h-4" strokeWidth={2.2} />
        Download CSV
      </button>
      <ul className="mt-2 space-y-1.5 text-[11.5px] text-[var(--chidi-text-muted)]">
        <li>• File is generated in-browser — nothing is sent to a server.</li>
        <li>• Currency totals stay in NGN to match the dashboard.</li>
        <li>
          • Sections are separated by `# Section name` rows so you can pivot
          quickly.
        </li>
      </ul>
    </div>
  )
}

// ============================================================================
// Tab — Schedule email
// ============================================================================

function ScheduleTab({
  email,
  setEmail,
  frequency,
  setFrequency,
  time,
  setTime,
  schedule,
  onSave,
  onCancel,
}: {
  email: string
  setEmail: (s: string) => void
  frequency: ScheduleFrequency
  setFrequency: (f: ScheduleFrequency) => void
  time: string
  setTime: (s: string) => void
  schedule: InsightsSchedule | null
  onSave: (e: React.FormEvent) => void
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col gap-5">
      {schedule && (
        <div className="rounded-lg border border-[var(--chidi-border-default)] bg-[var(--chidi-surface)]/60 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold mb-0.5">
                Currently scheduled
              </p>
              <p className="text-[12.5px] text-[var(--chidi-text-primary)] truncate">
                {schedule.email}
              </p>
              <p className="text-[11px] text-[var(--chidi-text-muted)] mt-0.5 capitalize">
                {schedule.frequency} · {schedule.time}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-1 text-[11px] text-[var(--chidi-warning)] hover:underline flex-shrink-0"
            >
              <Trash2 className="w-3 h-3" strokeWidth={2} />
              Cancel schedule
            </button>
          </div>
        </div>
      )}

      <form onSubmit={onSave} className="flex flex-col gap-4">
        {/* Email */}
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold">
            Email
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3 py-2 rounded-md border border-[var(--chidi-border-default)] bg-[var(--card)] text-[13px] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:outline-none focus:border-[var(--chidi-text-primary)] transition-colors"
          />
        </label>

        {/* Frequency */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold inline-flex items-center gap-1">
            <Calendar className="w-3 h-3" strokeWidth={2} />
            Frequency
          </span>
          <div className="inline-flex w-full items-center rounded-md border border-[var(--chidi-border-default)] bg-[var(--card)] p-0.5">
            {FREQUENCY_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.id}
                onClick={() => setFrequency(opt.id)}
                className={cn(
                  "flex-1 px-3 py-1.5 rounded text-[12px] font-medium transition-colors",
                  frequency === opt.id
                    ? "bg-[var(--chidi-text-primary)] text-[var(--background)]"
                    : "text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)]",
                )}
                aria-pressed={frequency === opt.id}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time */}
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold inline-flex items-center gap-1">
            <Clock className="w-3 h-3" strokeWidth={2} />
            Send time
          </span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-[var(--chidi-border-default)] bg-[var(--card)] text-[13px] text-[var(--chidi-text-primary)] focus:outline-none focus:border-[var(--chidi-text-primary)] transition-colors"
          />
        </label>

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[var(--chidi-text-primary)] text-[var(--background)] text-[13px] font-semibold hover:opacity-90 transition-opacity mt-1"
        >
          <Mail className="w-4 h-4" strokeWidth={2.2} />
          {schedule ? "Update schedule" : "Save schedule"}
        </button>
      </form>
    </div>
  )
}
