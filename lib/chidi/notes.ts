/**
 * Notes — merchant scratchpad. Local-only.
 *
 * The Notes panel sits in the nav rail as a sliding right-side Sheet. Each
 * note is a free-form body (markdown-lite at render time). Newest first.
 *
 * Cap at 200 entries — beyond that we prune the oldest by updatedAt so the
 * list never grows unbounded inside localStorage. A real merchant who wants
 * a permanent journal can use the Notebook surface; this slot is for jotting.
 *
 * Storage shape (chidi:notes):
 *   [{ id, body, createdAt, updatedAt }]
 *
 * Events:
 *   chidi:notes-changed — list mutated
 */

const STORAGE_KEY = "chidi:notes"
const MAX_NOTES = 200

export interface Note {
  id: string
  body: string
  /** ISO timestamp. */
  createdAt: string
  /** ISO timestamp. Same as createdAt on first save; bumped on every edit. */
  updatedAt: string
}

type Listener = (notes: Note[]) => void
const listeners = new Set<Listener>()

function safeRead(): Note[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (n): n is Note =>
        n &&
        typeof n === "object" &&
        typeof n.id === "string" &&
        typeof n.body === "string" &&
        typeof n.createdAt === "string" &&
        typeof n.updatedAt === "string",
    )
  } catch {
    return []
  }
}

function safeWrite(notes: Note[]) {
  if (typeof window === "undefined") return
  try {
    // Sort newest first, then enforce the cap on the tail.
    const sorted = [...notes].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    const trimmed = sorted.slice(0, MAX_NOTES)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
    window.dispatchEvent(new CustomEvent("chidi:notes-changed"))
    listeners.forEach((cb) => {
      try {
        cb(trimmed)
      } catch {
        // noop
      }
    })
  } catch {
    // localStorage full / blocked — silently no-op
  }
}

export function listNotes(): Note[] {
  return safeRead().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

export function createNote(body = ""): Note {
  const now = new Date().toISOString()
  const note: Note = {
    id: `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    body,
    createdAt: now,
    updatedAt: now,
  }
  const next = [note, ...safeRead()]
  safeWrite(next)
  return note
}

export function updateNote(id: string, body: string) {
  const list = safeRead()
  const next = list.map((n) =>
    n.id === id ? { ...n, body, updatedAt: new Date().toISOString() } : n,
  )
  safeWrite(next)
}

export function deleteNote(id: string) {
  const next = safeRead().filter((n) => n.id !== id)
  safeWrite(next)
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb)
  if (typeof window !== "undefined") {
    const onEvt = () => cb(listNotes())
    window.addEventListener("chidi:notes-changed", onEvt)
    window.addEventListener("storage", onEvt)
    return () => {
      listeners.delete(cb)
      window.removeEventListener("chidi:notes-changed", onEvt)
      window.removeEventListener("storage", onEvt)
    }
  }
  return () => {
    listeners.delete(cb)
  }
}

/**
 * Markdown-lite renderer. Supports:
 *   **bold**   → <strong>
 *   *italic*   → <em>
 *   [ ] or [x] → checkbox glyph (read-only display)
 *
 * Escapes raw HTML before transforming so a merchant typing `<script>` in a
 * note can't accidentally inject markup.
 */
export function renderNoteHTML(body: string): string {
  if (!body) return ""
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
  return escaped
    .replace(/\[\s\]/g, '<span class="chidi-note-checkbox" aria-hidden="true">☐</span>')
    .replace(/\[x\]/gi, '<span class="chidi-note-checkbox chidi-note-checkbox--done" aria-hidden="true">☑</span>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/\n/g, "<br />")
}

/** Compact "time ago" stamp — only ever needs a few buckets in this surface. */
export function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return "just now"
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return "just now"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  const wk = Math.floor(day / 7)
  if (wk < 5) return `${wk}w ago`
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export const NOTES_STORAGE_KEY = STORAGE_KEY
export const NOTES_MAX = MAX_NOTES
