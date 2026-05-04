/**
 * copilot-attachments — small helpers for the Ask-Chidi attachment chip.
 *
 * Phase 1 / mock: the merchant can attach a competitor screenshot, supplier
 * price PDF, or product photo to a Copilot message. We keep the file as a
 * data URL in component state only (no upload), cap each at 2MB, and on
 * send we prepend `[attachment: filename] ` text to the message payload so
 * the chip appears in the sent message bubble. Real attachment upload is
 * phase-2 backend.
 */

export type CopilotAttachmentKind = "image" | "pdf" | "csv"

export interface CopilotAttachment {
  /** Stable id so React lists are happy and remove-by-id is trivial. */
  id: string
  /** Original filename (used for the chip label + the [attachment: ...] tag). */
  name: string
  /** Original MIME type from the File. */
  mime: string
  /** Bytes — used for the chip's "240 KB" sub-label. */
  size: number
  /** Coarse bucket for rendering (image gets a thumbnail, others get an icon). */
  kind: CopilotAttachmentKind
  /** Data URL — for images this drives the 48x48 thumbnail; for everything
   *  else it's available for a phase-2 upload. */
  dataUrl: string
}

/** Hard cap per attachment. Data URLs balloon ~33% so the actual transmitted
 *  size is a bit higher, but 2MB is the brief and it covers any realistic
 *  product photo / supplier PDF a small-shop merchant would drop in. */
export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024

/** MIME prefixes/types we accept. Anything outside this list is rejected
 *  with a quiet toast; the brief explicitly limits the surface so we don't
 *  accidentally inhale a 50MB .mov. */
export const ACCEPTED_MIME = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/csv",
] as const

/** The `<input accept="...">` string. Mirrors ACCEPTED_MIME. */
export const ACCEPT_ATTR = "image/jpeg,image/jpg,image/png,image/webp,application/pdf,text/csv"

export function isAcceptedFile(file: File): boolean {
  // Some browsers/OSes report image/jpg vs image/jpeg, and CSVs sometimes come
  // through as text/plain or application/vnd.ms-excel. Be lenient on those
  // two cases without expanding the surface to anything unexpected.
  if ((ACCEPTED_MIME as readonly string[]).includes(file.type)) return true
  if (file.type === "" || file.type === "text/plain") {
    // Fall back to extension sniff for stubborn browsers.
    const ext = file.name.toLowerCase().split(".").pop() ?? ""
    return ["jpg", "jpeg", "png", "webp", "pdf", "csv"].includes(ext)
  }
  return false
}

export function classifyKind(file: File): CopilotAttachmentKind {
  if (file.type.startsWith("image/")) return "image"
  if (file.type === "application/pdf") return "pdf"
  return "csv"
}

/** "240 KB" / "1.4 MB" — short, no-decimals for KB, one-decimal for MB. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Read a File into an attachment object. Rejects on size cap so the caller
 *  can surface a quiet toast — never throws on actual file IO failures
 *  beyond the standard FileReader error path. */
export function readFileAsAttachment(file: File): Promise<CopilotAttachment> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      reject(new Error("File too large — max 2MB."))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : ""
      resolve({
        id: `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        mime: file.type || "application/octet-stream",
        size: file.size,
        kind: classifyKind(file),
        dataUrl,
      })
    }
    reader.onerror = () => reject(reader.error ?? new Error("Couldn't read file"))
    reader.readAsDataURL(file)
  })
}

/**
 * Build the message payload that gets sent. We prepend `[attachment: name]`
 * tokens for each attachment so the chip is visible in the sent message
 * (phase 1 mock — no real upload). The merchant SEES what they attached.
 */
export function buildPayloadWithAttachments(
  text: string,
  attachments: CopilotAttachment[],
): string {
  if (attachments.length === 0) return text
  const tags = attachments.map((a) => `[attachment: ${a.name}]`).join(" ")
  // If the user typed nothing, just send the tags so the chip still appears.
  if (!text.trim()) return tags
  return `${tags} ${text}`
}
