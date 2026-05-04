"use client"

/**
 * NotesPanel — Arc-style scratchpad living in the right-side Sheet.
 *
 * Behaviors:
 *   - Auto-save on blur OR every 800ms idle. Visual "Saved" flash on the row.
 *   - ⌘N inside the Sheet → new empty note + focuses it.
 *   - Esc closes the Sheet.
 *   - Search field at the top filters by body (debounced 200ms).
 *   - Markdown-lite rendered on blur, raw textarea on focus.
 *   - Cap of 200 notes — older entries auto-prune in lib/chidi/notes.ts.
 *
 * The Sheet primitive already handles click-outside-to-close, focus trap
 * (Radix Dialog), and the slide-in animation. We only hook ⌘N + the local
 * autosave timers on top.
 */

import { useEffect, useRef, useState } from "react"
import { Plus, Search, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import {
  createNote,
  deleteNote,
  listNotes,
  renderNoteHTML,
  subscribe,
  timeAgo,
  updateNote,
  type Note,
} from "@/lib/chidi/notes"

interface NotesPanelProps {
  /** When provided, NotesPanel renders no trigger — the consumer wires its own. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** When NotesPanel owns its trigger, this child appears as the SheetTrigger. */
  children?: React.ReactNode
}

export function NotesPanel({ open: controlledOpen, onOpenChange, children }: NotesPanelProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v)
    onOpenChange?.(v)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {children && <SheetTrigger asChild>{children}</SheetTrigger>}
      <SheetContent
        side="right"
        className="w-full sm:max-w-[320px] p-0 bg-[var(--card)] flex flex-col"
        // Prevent the Sheet from auto-focusing its built-in close button so
        // that ⌘N → focus-newest-textarea wins on first key after open.
      >
        <NotesPanelBody onClose={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}

function NotesPanelBody({ onClose }: { onClose: () => void }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [focusId, setFocusId] = useState<string | null>(null)

  useEffect(() => {
    setNotes(listNotes())
    return subscribe((next) => setNotes(next))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 200)
    return () => clearTimeout(t)
  }, [query])

  // ⌘N → new note (only when the panel is open, which is implicit since this
  // body only mounts inside the open Sheet).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "n" || e.key === "N") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        const created = createNote("")
        setFocusId(created.id)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  const handleNew = () => {
    const created = createNote("")
    setFocusId(created.id)
  }

  const filtered = debouncedQuery
    ? notes.filter((n) => n.body.toLowerCase().includes(debouncedQuery))
    : notes

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[var(--chidi-border-subtle)] flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-medium">
            Sidebar
          </p>
          <h2 className="font-chidi-voice text-[15px] font-semibold text-[var(--chidi-text-primary)] mt-0.5">
            Quick notes
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close notes"
          className="p-1.5 -mr-1 rounded-md text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      {notes.length > 0 && (
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--chidi-text-muted)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes"
              className="h-8 pl-8 text-[12px] bg-[var(--chidi-surface)] border-[var(--chidi-border-default)] font-chidi-voice"
            />
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 chidi-notes-fade-in">
        {filtered.length === 0 ? (
          <EmptyState onCreate={handleNew} hasQuery={debouncedQuery.length > 0} />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {filtered.map((note) => (
              <NoteRow
                key={note.id}
                note={note}
                autoFocus={focusId === note.id}
                onFocused={() => setFocusId(null)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--chidi-border-subtle)] bg-[var(--card)]">
        <button
          onClick={handleNew}
          className="w-full flex items-center justify-center gap-2 h-9 rounded-full bg-[var(--chidi-text-primary)] text-[var(--chidi-bg-primary)] text-[13px] font-chidi-voice font-medium hover:opacity-90 transition-opacity active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-win)]/40"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.4} />
          New note
          <kbd className="ml-1.5 hidden sm:inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded bg-[var(--chidi-bg-primary)]/15 text-[10px] tabular-nums font-sans font-medium">
            ⌘N
          </kbd>
        </button>
      </div>
    </div>
  )
}

function EmptyState({ onCreate, hasQuery }: { onCreate: () => void; hasQuery: boolean }) {
  if (hasQuery) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-[12px] text-[var(--chidi-text-muted)] font-chidi-voice">
          No notes match that search.
        </p>
      </div>
    )
  }
  return (
    <button
      onClick={onCreate}
      className="w-full text-left px-3 py-6 rounded-lg hover:bg-[var(--chidi-surface)]/60 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-win)]/40"
    >
      <p className="text-[12px] text-[var(--chidi-text-muted)] font-chidi-voice">
        Jot anything. Customers, ideas, reminders.
      </p>
      <p className="mt-2 text-[11px] text-[var(--chidi-text-muted)]/80 font-chidi-voice flex items-center gap-1.5 group-hover:text-[var(--chidi-text-secondary)]">
        <Plus className="w-3 h-3" strokeWidth={2} />
        Tap to start a note
      </p>
    </button>
  )
}

interface NoteRowProps {
  note: Note
  autoFocus: boolean
  onFocused: () => void
}

function NoteRow({ note, autoFocus, onFocused }: NoteRowProps) {
  const [body, setBody] = useState(note.body)
  const [isFocused, setIsFocused] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const idleTimer = useRef<number | null>(null)
  const dirty = useRef(false)

  // Sync from external mutations (e.g. "Clear all" elsewhere)
  useEffect(() => {
    if (!isFocused) setBody(note.body)
  }, [note.body, isFocused])

  // Focus newly-created notes
  useEffect(() => {
    if (autoFocus && taRef.current) {
      taRef.current.focus()
      // Position caret at end so the merchant just starts typing.
      const len = taRef.current.value.length
      taRef.current.setSelectionRange(len, len)
      onFocused()
    }
  }, [autoFocus, onFocused])

  // Auto-resize the textarea to its content (up to a sensible cap).
  const resize = () => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = "0px"
    ta.style.height = Math.min(ta.scrollHeight, 320) + "px"
  }
  useEffect(() => {
    resize()
  }, [body, isFocused])

  const flushSave = () => {
    if (!dirty.current) return
    updateNote(note.id, body)
    dirty.current = false
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 900)
  }

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBody(e.target.value)
    dirty.current = true
    if (idleTimer.current) window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(flushSave, 800)
  }

  const onBlur = () => {
    setIsFocused(false)
    if (idleTimer.current) window.clearTimeout(idleTimer.current)
    flushSave()
  }

  const onDelete = () => {
    if (idleTimer.current) window.clearTimeout(idleTimer.current)
    deleteNote(note.id)
  }

  return (
    <li
      className={cn(
        "group relative rounded-lg border border-transparent bg-[var(--chidi-surface)]/40 hover:border-[var(--chidi-border-subtle)] transition-colors px-2.5 py-2",
        isFocused && "border-[var(--chidi-border-default)] bg-[var(--card)]",
      )}
    >
      {isFocused ? (
        <textarea
          ref={taRef}
          value={body}
          onChange={onChange}
          onBlur={onBlur}
          rows={1}
          className="w-full bg-transparent text-[13px] leading-snug font-chidi-voice text-[var(--chidi-text-primary)] resize-none focus:outline-none placeholder:text-[var(--chidi-text-muted)]"
          placeholder="Start typing…"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setIsFocused(true)
            // Focus on the next paint, after the textarea mounts.
            window.setTimeout(() => taRef.current?.focus(), 0)
          }}
          className="block w-full text-left text-[13px] leading-snug font-chidi-voice text-[var(--chidi-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-win)]/40 rounded"
        >
          {body.trim() ? (
            <span
              className="block whitespace-pre-wrap break-words [&_strong]:font-semibold [&_em]:italic [&_.chidi-note-checkbox]:inline-block [&_.chidi-note-checkbox]:mr-1 [&_.chidi-note-checkbox--done]:text-[var(--chidi-win)]"
              dangerouslySetInnerHTML={{ __html: renderNoteHTML(body) }}
            />
          ) : (
            <span className="text-[var(--chidi-text-muted)] italic">Empty note. Tap to write.</span>
          )}
        </button>
      )}

      {/* Hidden textarea for the focused-mode mount + bootstrap. We render the
          textarea unconditionally above when focused; this one stays mounted
          so the focusing transition is seamless. */}
      {!isFocused && (
        <textarea
          ref={taRef}
          value={body}
          onChange={onChange}
          onBlur={onBlur}
          tabIndex={-1}
          aria-hidden="true"
          rows={1}
          className="sr-only"
        />
      )}

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] text-[var(--chidi-text-muted)] font-chidi-voice tabular-nums">
          {timeAgo(note.updatedAt)}
        </span>
        <div className="flex items-center gap-1.5">
          {savedFlash && (
            <span
              className="text-[10px] text-[var(--chidi-success)] font-chidi-voice chidi-notes-saved-flash"
              aria-live="polite"
            >
              Saved
            </span>
          )}
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete note"
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 -mr-1 rounded text-[var(--chidi-text-muted)] hover:text-[var(--chidi-danger)] hover:bg-[var(--chidi-surface)] transition-opacity"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </li>
  )
}
