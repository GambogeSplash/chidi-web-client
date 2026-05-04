"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { ArcFace } from "./arc-face"

/**
 * The Chidi page shell — every dashboard page wraps in <ChidiPage>. Single
 * source of truth for: container width, padding, page eyebrow + serif title,
 * Chidi-voice subtitle, optional Chidi avatar (when Chidi is "speaking" the
 * page).
 *
 * Use this so settings, insights, notebook, profile, billing — all read like
 * the same product.
 */

interface ChidiPageProps {
  eyebrow?: string
  title?: string
  subtitle?: string
  /**
   * When true, renders Chidi's avatar next to the title — used when this is
   * Chidi addressing the merchant (Notebook, Settings-as-relationship).
   * Off when the page is purely operational (Insights, Inventory).
   */
  voice?: boolean
  /** Right-side actions in the header (refresh, period selector, etc.) */
  actions?: ReactNode
  /** Width cap. Default contains to a comfortable reading column. */
  width?: "narrow" | "default" | "wide" | "full"
  className?: string
  children: ReactNode
}

const WIDTH_CLASS = {
  narrow: "max-w-2xl",
  default: "max-w-4xl",
  wide: "max-w-5xl",
  full: "max-w-none",
} as const

export function ChidiPage({
  eyebrow,
  title,
  subtitle,
  voice = false,
  actions,
  width = "default",
  className,
  children,
}: ChidiPageProps) {
  const hasHeader = eyebrow || title || subtitle || actions

  return (
    <div className={cn("h-full overflow-y-auto", className)}>
      <div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 lg:py-7", WIDTH_CLASS[width])}>
        {hasHeader && (
          <header className="mb-5 lg:mb-7 flex items-end justify-between gap-4">
            <div className="min-w-0 flex-1">
              {eyebrow && <p className="ty-meta mb-1.5">{eyebrow}</p>}
              {title && (
                <div className="flex items-start gap-3">
                  {voice && <ArcFace size={32} className="mt-0.5 text-[var(--chidi-text-primary)]" />}
                  <div className="min-w-0">
                    <h1 className="ty-page-title text-[var(--chidi-text-primary)]">{title}</h1>
                    {subtitle && (
                      <p className="ty-body-voice text-[var(--chidi-text-secondary)] mt-1.5 leading-relaxed">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {!title && subtitle && (
                <p className="ty-body-voice text-[var(--chidi-text-secondary)]">{subtitle}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
          </header>
        )}
        {children}
      </div>
    </div>
  )
}

/**
 * <ChidiSection> — group header + content inside a page. Use for Settings
 * sections, Notebook category groups, etc.
 */
interface ChidiSectionProps {
  eyebrow?: string
  title?: string
  description?: string
  className?: string
  children: ReactNode
}

export function ChidiSection({ eyebrow, title, description, className, children }: ChidiSectionProps) {
  return (
    <section className={cn("py-4", className)}>
      {(eyebrow || title || description) && (
        <div className="mb-3">
          {eyebrow && <p className="ty-meta mb-1.5">{eyebrow}</p>}
          {title && <h2 className="ty-section text-[var(--chidi-text-primary)]">{title}</h2>}
          {description && (
            <p className="ty-body-voice text-[var(--chidi-text-muted)] mt-1">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  )
}

/**
 * <ChidiCard> — paper-textured card. Standard radius, border, shadow, hover.
 */
interface ChidiCardProps {
  className?: string
  paper?: boolean
  interactive?: boolean
  children: ReactNode
  onClick?: () => void
  as?: "div" | "button" | "article"
}

export function ChidiCard({
  className,
  paper = false,
  interactive = false,
  children,
  onClick,
  as = "div",
}: ChidiCardProps) {
  const Tag: any = onClick ? "button" : as
  return (
    <Tag
      onClick={onClick}
      className={cn(
        "bg-[var(--card)] border border-[var(--chidi-border-default)] rounded-2xl shadow-card overflow-hidden text-left w-full",
        paper && "chidi-paper",
        interactive && "chidi-card-lift cursor-pointer",
        className,
      )}
    >
      {paper ? <div className="relative z-[2]">{children}</div> : children}
    </Tag>
  )
}

/**
 * <ChidiRowItem> — list row used in Settings, customer profiles, etc.
 * Standard left-icon + label + meta + chevron pattern.
 */
interface ChidiRowItemProps {
  icon?: ReactNode
  label: string
  description?: string
  meta?: ReactNode
  onClick?: () => void
  className?: string
}

export function ChidiRowItem({ icon, label, description, meta, onClick, className }: ChidiRowItemProps) {
  const Tag: any = onClick ? "button" : "div"
  return (
    <Tag
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
        onClick && "hover:bg-[var(--chidi-surface)] active:scale-[0.995]",
        className,
      )}
    >
      {icon && (
        <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--chidi-surface)] flex items-center justify-center text-[var(--chidi-text-secondary)]">
          {icon}
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className="block ty-card-title text-[var(--chidi-text-primary)] truncate">{label}</span>
        {description && (
          <span className="block text-xs text-[var(--chidi-text-muted)] font-chidi-voice mt-0.5 truncate">
            {description}
          </span>
        )}
      </span>
      {meta && <span className="flex-shrink-0 text-xs text-[var(--chidi-text-muted)] font-chidi-voice">{meta}</span>}
    </Tag>
  )
}
