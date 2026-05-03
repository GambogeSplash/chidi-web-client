"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Command } from "cmdk"
import {
  MessageSquare,
  ShoppingBag,
  Package,
  BarChart3,
  BookOpen,
  Settings as SettingsIcon,
  ArrowRight,
  Plus,
  Smile,
  Heart,
  Bug,
  Phone,
  Quote as QuoteIcon,
} from "lucide-react"
import type { TabId } from "./bottom-navigation"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ChidiMark, ChidiCharacter } from "./chidi-mark"
import { CustomerCharacter } from "./customer-character"
import { useCustomers } from "@/lib/hooks/use-analytics"
import { formatRelativeTime } from "@/lib/api/analytics"

interface CommandPaletteProps {
  onTabChange: (tab: TabId) => void
  onAddProduct?: () => void
}

interface EasterEgg {
  match: (q: string) => boolean
  reply: () => { title: string; description?: string; icon: React.ReactNode }
}

const EASTER_EGGS: EasterEgg[] = [
  {
    match: (q) => /\b(joke|make me laugh|something funny)\b/.test(q),
    reply: () => {
      const jokes = [
        { title: "Why did the trader bring a ladder to the market?", description: "Because she heard the prices were going up." },
        { title: "What did the customer ask the SKU?", description: "Are you in stock today, or just stocking around?" },
        { title: "How does Chidi like its coffee?", description: "Compiled, never raw." },
        { title: "Why don't WhatsApp messages get lonely?", description: "They've always got blue ticks." },
      ]
      return { ...jokes[Math.floor(Math.random() * jokes.length)], icon: <Smile className="w-4 h-4 text-[var(--chidi-win)]" /> }
    },
  },
  {
    match: (q) => /\b(what do you (really )?think|honest opinion|be honest)\b/.test(q),
    reply: () => ({
      title: "Honestly?",
      description: "Your customers love the small touches. Reply to the ones who say thanks, they remember it.",
      icon: <ChidiMark size={16} variant="win" />,
    }),
  },
  {
    match: (q) => /\b(make me feel better|i'?m sad|tough day|hard day|stressed)\b/.test(q),
    reply: () => ({
      title: "I see you.",
      description: "You showed up today. Even if the numbers were quiet, that counts. Tomorrow's a fresh inbox.",
      icon: <Heart className="w-4 h-4 text-[var(--chidi-win)]" />,
    }),
  },
  {
    match: (q) => /\b(what'?s broken|debug|something wrong|not working|status)\b/.test(q),
    reply: () => ({
      title: "I'm watching the wires.",
      description: "WhatsApp connection: ✓. Order tracking: ✓. AI replies: ✓. If something seems off, refresh and ping me again.",
      icon: <Bug className="w-4 h-4 text-[var(--chidi-success)]" />,
    }),
  },
  {
    match: (q) => /\b(quote|inspire|motivat|wisdom)\b/.test(q),
    reply: () => {
      const quotes = [
        { title: "From a Lagos market mama:", description: "\"The customer who haggles the longest pays the fastest. Hold your price.\"" },
        { title: "From an Accra textile trader:", description: "\"Sell to one customer like you're selling to a hundred. They'll bring the other ninety-nine.\"" },
        { title: "From Chidi:", description: "\"Quiet days build the pattern. Loud days reveal it.\"" },
      ]
      return { ...quotes[Math.floor(Math.random() * quotes.length)], icon: <QuoteIcon className="w-4 h-4 text-[var(--chidi-win)]" /> }
    },
  },
  {
    match: (q) => /\b(thank you|thanks chidi|love you|you'?re the best)\b/.test(q),
    reply: () => ({
      title: "Means a lot.",
      description: "I'll keep showing up. Now go close some sales.",
      icon: <Heart className="w-4 h-4 text-[var(--chidi-win)]" />,
    }),
  },
  {
    match: (q) => /\b(who are you|what are you|tell me about yourself)\b/.test(q),
    reply: () => ({
      title: "I'm Chidi.",
      description: "Your assistant for selling on WhatsApp. I reply to your customers, track every order, and learn your business. Built in Lagos, for Lagos and beyond.",
      icon: <ChidiMark size={16} variant="win" />,
    }),
  },
]

function findEasterEgg(query: string): ReturnType<EasterEgg["reply"]> | null {
  const q = query.trim().toLowerCase()
  if (q.length < 3) return null
  const hit = EASTER_EGGS.find((e) => e.match(q))
  return hit ? hit.reply() : null
}

const STARTER_PROMPTS = [
  "What sold well this week?",
  "Who hasn't ordered in a while?",
  "Add a product",
]

/**
 * Cmd+K palette. Built on cmdk so the keyboard mechanics are battle-tested.
 *
 * Surface logic:
 *   No query → starter prompts + recent customers + jump-to
 *   Query    → "Ask Chidi: '<query>'" pinned top + matching jump-to + easter egg
 *   No match → "Ask Chidi instead?" warm fallback
 */
export function CommandPalette({ onTabChange, onAddProduct }: CommandPaletteProps) {
  const router = useRouter()
  const params = useParams()
  const slug = params?.slug as string | undefined

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  // Recent customers — real, from the same API the rest of the app uses.
  // Only fetched while the palette is open so we don't pay for it idle.
  const { data: customersData } = useCustomers(undefined, "last_order", 4)
  const recentCustomers = customersData?.customers ?? []

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === "Escape" && open) {
        setOpen(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open])

  // Reset search when closed
  useEffect(() => {
    if (!open) setSearch("")
  }, [open])

  const trimmed = search.trim()
  const hasQuery = trimmed.length > 0
  const easterEgg = useMemo(() => findEasterEgg(search), [search])

  const close = () => setOpen(false)
  const go = (tab: TabId) => {
    close()
    onTabChange(tab)
  }
  const askChidi = () => {
    close()
    onTabChange("chidi")
  }
  const callChidi = () => {
    close()
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("chidi:open-call"))
    }
  }

  const fireEasterEgg = () => {
    if (!easterEgg) return
    toast(easterEgg.title, {
      description: easterEgg.description,
      icon: easterEgg.icon,
      duration: 6000,
      style: {
        background: "var(--card)",
        color: "var(--chidi-text-primary)",
        border: "1px solid var(--chidi-win)",
        fontFamily: "var(--font-inter)",
        fontWeight: 500,
      },
    })
    close()
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[100] bg-[var(--chidi-text-primary)]/40 backdrop-blur-[2px] animate-in fade-in duration-150"
          onClick={close}
        />
      )}

      {open && (
        <div
          className={cn(
            // Mobile: full-screen sheet anchored to bottom safe area, slides
            // up from bottom. Desktop (sm+): centered modal at the top third.
            "fixed z-[101] animate-in duration-200",
            "inset-x-0 bottom-0 top-0 sm:top-[12vh] sm:bottom-auto sm:left-1/2 sm:right-auto sm:inset-x-auto sm:-translate-x-1/2 sm:w-full sm:max-w-[640px] sm:px-4",
            "fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:slide-in-from-top-4",
          )}
        >
          <Command
            className="bg-[var(--card)] sm:rounded-2xl rounded-t-2xl shadow-[0_24px_64px_-16px_rgba(0,0,0,0.25)] border-t border-l-0 border-r-0 border-b-0 sm:border sm:border-[var(--chidi-border-subtle)] border-[var(--chidi-border-subtle)] overflow-hidden chidi-paper h-full sm:h-auto flex flex-col safe-area-bottom"
            shouldFilter={hasQuery}
          >
            {/* Input row — Chidi's reactive blob is the surface's identity */}
            <div className="flex items-center gap-3 px-4 border-b border-[var(--chidi-border-subtle)] relative z-[2]">
              <ChidiCharacter size={22} expression="listening" className="flex-shrink-0" />
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder="Search the app, or ask Chidi anything"
                className="flex-1 h-14 bg-transparent text-[15px] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] outline-none font-chidi-voice"
                autoFocus
              />
              <kbd className="text-[10px] font-mono text-[var(--chidi-text-muted)] bg-[var(--chidi-surface)] border border-[var(--chidi-border-subtle)] px-1.5 py-0.5 rounded">
                ESC
              </kbd>
            </div>

            <Command.List className="flex-1 sm:flex-none sm:max-h-[440px] overflow-y-auto p-2 relative z-[2]">
              {/* Pinned: Ask Chidi about the current query */}
              {hasQuery && (
                <Command.Group className="mb-2">
                  <Command.Item
                    value={`__ask__${trimmed}`}
                    onSelect={askChidi}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer bg-[var(--chidi-win-soft,rgba(108,249,216,0.10))] border border-[var(--chidi-win)]/20 data-[selected=true]:bg-[var(--chidi-win-soft,rgba(108,249,216,0.16))]"
                  >
                    <ChidiMark size={18} variant="win" className="flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-chidi-voice mb-0.5">
                        Ask Chidi
                      </p>
                      <p className="text-[14px] text-[var(--chidi-text-primary)] font-chidi-voice truncate">
                        {trimmed}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[var(--chidi-text-muted)] flex-shrink-0" />
                  </Command.Item>
                </Command.Group>
              )}

              {/* Easter egg surfaced inline when query matches */}
              {easterEgg && (
                <Command.Group className="mb-2">
                  <Command.Item
                    value={`__egg__${trimmed}`}
                    onSelect={fireEasterEgg}
                    className="flex items-start gap-3 px-3 py-3 rounded-lg cursor-pointer data-[selected=true]:bg-[var(--chidi-surface)]"
                  >
                    <span className="flex-shrink-0 mt-0.5">{easterEgg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-[var(--chidi-text-primary)] font-chidi-voice leading-tight">
                        {easterEgg.title}
                      </p>
                      {easterEgg.description && (
                        <p className="text-[12px] text-[var(--chidi-text-secondary)] font-chidi-voice mt-1 leading-relaxed">
                          {easterEgg.description}
                        </p>
                      )}
                    </div>
                  </Command.Item>
                </Command.Group>
              )}

              {/* No query → starter prompts to teach the surface */}
              {!hasQuery && (
                <PaletteSection heading="Try asking">
                  {STARTER_PROMPTS.map((prompt) => (
                    <Command.Item
                      key={prompt}
                      value={`__prompt__${prompt}`}
                      onSelect={() => setSearch(prompt)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-[13px] font-chidi-voice text-[var(--chidi-text-secondary)] data-[selected=true]:bg-[var(--chidi-surface)] data-[selected=true]:text-[var(--chidi-text-primary)] transition-colors"
                    >
                      <ChidiMark size={12} variant="muted" className="flex-shrink-0" />
                      <span className="flex-1 truncate">{prompt}</span>
                    </Command.Item>
                  ))}
                </PaletteSection>
              )}

              {/* No query → recent customers (real data, sorted by last_order) */}
              {!hasQuery && recentCustomers.length > 0 && (
                <PaletteSection heading="Recent customers">
                  {recentCustomers.map((customer) => {
                    const display = customer.name || customer.phone
                    return (
                      <Command.Item
                        key={customer.phone}
                        value={`__customer__${display}`}
                        onSelect={() => go("inbox")}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-[13px] font-chidi-voice text-[var(--chidi-text-secondary)] data-[selected=true]:bg-[var(--chidi-surface)] data-[selected=true]:text-[var(--chidi-text-primary)] transition-colors"
                      >
                        <CustomerCharacter
                          name={customer.name}
                          fallbackId={customer.phone}
                          size="xs"
                        />
                        <span className="flex-1 truncate">{display}</span>
                        {customer.last_order && (
                          <span className="text-[11px] text-[var(--chidi-text-muted)] tabular-nums flex-shrink-0">
                            {formatRelativeTime(customer.last_order)}
                          </span>
                        )}
                      </Command.Item>
                    )
                  })}
                </PaletteSection>
              )}

              {/* Always-visible navigation */}
              <PaletteSection heading="Jump to">
                <PaletteItem icon={MessageSquare} label="Inbox" onSelect={() => go("inbox")} />
                <PaletteItem icon={ShoppingBag} label="Orders" onSelect={() => go("orders")} />
                <PaletteItem icon={Package} label="Inventory" onSelect={() => go("inventory")} />
                <PaletteItem icon={BarChart3} label="Insights" onSelect={() => go("insights")} />
                <PaletteItem
                  iconNode={<ChidiMark size={14} variant="muted" />}
                  label="Ask Chidi"
                  onSelect={() => go("chidi")}
                />
                <Command.Item
                  value="/call call chidi voice"
                  onSelect={callChidi}
                  className="chidi-palette-row flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-[13px] font-chidi-voice text-[var(--chidi-text-secondary)] data-[selected=true]:bg-[var(--chidi-surface)] data-[selected=true]:text-[var(--chidi-text-primary)] transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 flex-shrink-0 text-[var(--chidi-text-muted)]" strokeWidth={1.8} />
                  <span className="flex-1 truncate">Call Chidi</span>
                  <kbd className="text-[10px] font-mono text-[var(--chidi-text-muted)] bg-[var(--chidi-surface)] border border-[var(--chidi-border-subtle)] px-1.5 py-0.5 rounded">⌘⇧C</kbd>
                </Command.Item>
                {slug && (
                  <PaletteItem
                    icon={BookOpen}
                    label="Playbook"
                    onSelect={() => {
                      close()
                      router.push(`/dashboard/${slug}/notebook`)
                    }}
                  />
                )}
                {slug && (
                  <PaletteItem
                    icon={SettingsIcon}
                    label="Workspace settings"
                    onSelect={() => {
                      close()
                      router.push(`/dashboard/${slug}/settings`)
                    }}
                  />
                )}
              </PaletteSection>

              {/* Quick actions */}
              {onAddProduct && (
                <PaletteSection heading="Actions">
                  <PaletteItem
                    icon={Plus}
                    label="Add a product"
                    onSelect={() => {
                      close()
                      onAddProduct()
                    }}
                  />
                </PaletteSection>
              )}

              {/* Empty state — only fires when filter has nothing */}
              <Command.Empty className="py-10 text-center">
                <p className="text-[13px] text-[var(--chidi-text-secondary)] font-chidi-voice mb-2">
                  Nothing matched.
                </p>
                {hasQuery && (
                  <button
                    onClick={askChidi}
                    className="inline-flex items-center gap-1.5 text-[13px] text-[var(--chidi-win)] font-medium font-chidi-voice hover:underline"
                  >
                    <ChidiMark size={12} variant="win" />
                    Ask Chidi instead
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </Command.Empty>
            </Command.List>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-[var(--chidi-border-subtle)] flex items-center justify-between text-[10px] text-[var(--chidi-text-muted)] font-chidi-voice relative z-[2]">
              <span className="inline-flex items-center gap-3">
                <span><kbd className="font-mono">↑↓</kbd> navigate</span>
                <span><kbd className="font-mono">↵</kbd> select</span>
              </span>
              <span><kbd className="font-mono">⌘K</kbd> open anywhere</span>
            </div>
          </Command>
        </div>
      )}
    </>
  )
}

interface PaletteSectionProps {
  heading: string
  children: React.ReactNode
}

function PaletteSection({ heading, children }: PaletteSectionProps) {
  return (
    <Command.Group className="mb-1">
      <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-chidi-voice">
        {heading}
      </div>
      {children}
    </Command.Group>
  )
}

interface PaletteItemProps {
  icon?: React.ElementType
  iconNode?: React.ReactNode
  label: string
  onSelect: () => void
}

function PaletteItem({ icon: Icon, iconNode, label, onSelect }: PaletteItemProps) {
  return (
    <Command.Item
      value={label}
      onSelect={onSelect}
      className="chidi-palette-row flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-[13px] font-chidi-voice text-[var(--chidi-text-secondary)] data-[selected=true]:bg-[var(--chidi-surface)] data-[selected=true]:text-[var(--chidi-text-primary)] transition-colors"
    >
      {iconNode ?? (Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0 text-[var(--chidi-text-muted)]" strokeWidth={1.8} />)}
      <span className="flex-1 truncate">{label}</span>
    </Command.Item>
  )
}
