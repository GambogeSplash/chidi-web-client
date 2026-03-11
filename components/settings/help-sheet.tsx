"use client"

import { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  MessageCircle,
  Package,
  ShoppingBag,
  ChevronDown,
  ExternalLink,
  HelpCircle,
} from "lucide-react"

interface HelpSheetProps {
  isOpen: boolean
  onClose: () => void
}

interface HelpSection {
  id: string
  title: string
  icon: React.ElementType
  content: React.ReactNode
}

export function HelpSheet({ isOpen, onClose }: HelpSheetProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id)
  }

  const helpSections: HelpSection[] = [
    {
      id: "telegram",
      title: "How to connect Telegram",
      icon: MessageCircle,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-[var(--chidi-text-secondary)]">
            Connect your Telegram bot to receive customer messages.
          </p>
          <ol className="text-sm text-[var(--chidi-text-secondary)] space-y-2 pl-4 list-decimal">
            <li>Open Telegram and search for <strong>@BotFather</strong></li>
            <li>Send <code className="bg-[var(--chidi-surface)] px-1 py-0.5 rounded">/newbot</code> and follow the prompts to name your bot</li>
            <li>BotFather will reply with a token like <code className="bg-[var(--chidi-surface)] px-1 py-0.5 rounded">123456789:ABC...</code></li>
            <li>Go to <strong>Settings → Integrations → Telegram</strong> and paste your token</li>
            <li>Share your bot's link with customers to start receiving messages</li>
          </ol>
          <a 
            href="https://t.me/BotFather" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-[var(--chidi-accent)] hover:underline"
          >
            Open BotFather
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      ),
    },
    {
      id: "whatsapp",
      title: "How to connect WhatsApp",
      icon: MessageCircle,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-[var(--chidi-text-secondary)]">
            Chidi uses Twilio to connect to WhatsApp Business.
          </p>
          <ol className="text-sm text-[var(--chidi-text-secondary)] space-y-2 pl-4 list-decimal">
            <li>Create a <strong>Twilio account</strong> if you don't have one</li>
            <li>Get a <strong>WhatsApp-enabled phone number</strong> from Twilio</li>
            <li>Complete the WhatsApp Business Profile setup in Twilio</li>
            <li>Go to <strong>Settings → Integrations → WhatsApp</strong></li>
            <li>Enter your WhatsApp number (with country code)</li>
          </ol>
          <a 
            href="https://www.twilio.com/docs/whatsapp" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-[var(--chidi-accent)] hover:underline"
          >
            Twilio WhatsApp Setup Guide
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      ),
    },
    {
      id: "products",
      title: "How products and AI work together",
      icon: Package,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-[var(--chidi-text-secondary)]">
            Chidi uses your product inventory to help customers.
          </p>
          <ul className="text-sm text-[var(--chidi-text-secondary)] space-y-2 pl-4 list-disc">
            <li>Add products with clear names, descriptions, and prices</li>
            <li>Keep stock levels updated — Chidi tells customers what's available</li>
            <li>Use product categories to organize your inventory</li>
            <li>Add variations (sizes, colors) for products with options</li>
            <li>Set reorder thresholds to get low-stock alerts</li>
          </ul>
          <p className="text-sm text-[var(--chidi-text-secondary)]">
            The more products you add, the better Chidi can answer customer questions and take orders.
          </p>
        </div>
      ),
    },
    {
      id: "orders",
      title: "Understanding orders",
      icon: ShoppingBag,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-[var(--chidi-text-secondary)]">
            Orders are created when customers purchase through your messaging channels.
          </p>
          <div className="text-sm text-[var(--chidi-text-secondary)] space-y-2">
            <p><strong>Order lifecycle:</strong></p>
            <ol className="pl-4 list-decimal space-y-1">
              <li><strong>Pending Payment</strong> — Customer placed an order, waiting for payment</li>
              <li><strong>Confirmed</strong> — You've confirmed payment was received</li>
              <li><strong>Fulfilled</strong> — You've shipped or delivered the order</li>
            </ol>
          </div>
          <p className="text-sm text-[var(--chidi-text-secondary)]">
            When you confirm or fulfill an order, Chidi automatically notifies the customer on their messaging channel.
          </p>
        </div>
      ),
    },
  ]

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-white">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2 text-[var(--chidi-text-primary)]">
            <HelpCircle className="w-5 h-5" />
            Help & Support
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-2">
          {helpSections.map((section) => {
            const Icon = section.icon
            const isExpanded = expandedSection === section.id
            
            return (
              <Collapsible
                key={section.id}
                open={isExpanded}
                onOpenChange={() => toggleSection(section.id)}
              >
                <CollapsibleTrigger className="w-full flex items-center gap-3 p-3 rounded-lg border border-[var(--chidi-border-subtle)] hover:bg-[var(--chidi-surface)] transition-colors text-left">
                  <Icon className="w-5 h-5 text-[var(--chidi-text-muted)] flex-shrink-0" />
                  <span className="flex-1 font-medium text-sm text-[var(--chidi-text-primary)]">
                    {section.title}
                  </span>
                  <ChevronDown 
                    className={`w-4 h-4 text-[var(--chidi-text-muted)] transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 py-4 ml-8 border-l-2 border-[var(--chidi-border-subtle)]">
                    {section.content}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </div>

        <div className="mt-8 p-4 bg-[var(--chidi-surface)] rounded-lg">
          <p className="text-sm text-[var(--chidi-text-secondary)]">
            Need more help? Contact us at{" "}
            <a 
              href="mailto:support@chidi.app" 
              className="text-[var(--chidi-accent)] hover:underline"
            >
              support@chidi.app
            </a>
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
