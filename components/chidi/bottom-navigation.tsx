"use client"

import { MessageSquare, ShoppingBag, Package, BarChart3, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export type TabId = "inbox" | "orders" | "inventory" | "insights" | "chidi"

interface BottomNavigationProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

const navItems: { id: TabId; label: string; icon: typeof MessageSquare }[] = [
  { id: "inbox", label: "Inbox", icon: MessageSquare },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "insights", label: "Insights", icon: BarChart3 },
  { id: "chidi", label: "Chidi", icon: Sparkles },
]

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[var(--chidi-border-subtle)] safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id
          const Icon = item.icon
          const isChidi = item.id === "chidi"
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full px-2 transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chidi-accent)] focus-visible:ring-offset-2",
                isActive 
                  ? "text-[var(--chidi-text-primary)]" 
                  : "text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-secondary)]"
              )}
            >
              <Icon 
                className={cn(
                  "w-5 h-5 mb-1 transition-all",
                  isActive && "scale-110",
                  isChidi && isActive && "text-[var(--chidi-accent)]"
                )} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span 
                className={cn(
                  "text-[10px] leading-tight",
                  isActive ? "font-semibold" : "font-medium"
                )}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
