"use client"

import { CustomerCharacter } from "./customer-character"
import { CurrencyAmount } from "./currency-amount"
import { Clock, AlertTriangle, CheckCircle, Package } from "lucide-react"

/**
 * Ghost sample rows used inside <EmptyWithPreview> to show the merchant what
 * the surface will look like once it has data. Names are stylised mock that
 * resonate with the Lagos/Accra/Nairobi market the product is built for.
 */

export function SampleInboxRows() {
  const samples = [
    { name: "Adaeze Okafor", time: "2m", intent: "purchase", channel: "WhatsApp", status: "active" as const, memory: "12 orders · usually red Adidas · last 2w ago" },
    { name: "Tunde Bakare", time: "8m", intent: "question", channel: "WhatsApp", status: "needs" as const, memory: "Size 42, Lekki, asks before he buys" },
    { name: "Ifeoma Eze", time: "1h", intent: "purchase", channel: "Telegram", status: "active" as const, memory: "Wholesale buyer · ₦310k lifetime · 5 orders" },
    { name: "Kemi Adebayo", time: "3h", intent: "complaint", channel: "WhatsApp", status: "needs" as const, memory: "First-time, hasn't paid yet" },
    { name: "Olumide Sanusi", time: "5h", intent: "thanks", channel: "WhatsApp", status: "resolved" as const, memory: "Repeat customer · loyal" },
  ]

  return (
    <div className="divide-y divide-[var(--chidi-border-subtle)]">
      {samples.map((s, idx) => (
        <div key={idx} className="px-4 py-3 flex items-start gap-3">
          <CustomerCharacter name={s.name} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="ty-card-title text-[var(--chidi-text-primary)] truncate">
                  {s.name}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[var(--chidi-text-muted)] text-xs flex-shrink-0">
                <Clock className="w-3 h-3" />
                {s.time}
              </div>
            </div>
            <p className="text-xs text-[var(--chidi-text-muted)] truncate mb-1.5 font-chidi-voice">
              {s.memory}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                backgroundColor: s.channel === "WhatsApp" ? "#25D36620" : "#0088CC20",
                color: s.channel === "WhatsApp" ? "#25D366" : "#0088CC",
              }}>
                {s.channel}
              </span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium font-chidi-voice ${
                s.status === "needs" ? "text-[var(--chidi-warning)]" :
                s.status === "resolved" ? "text-[var(--chidi-text-muted)]" :
                "text-[var(--chidi-success)]"
              }`}>
                {s.status === "needs" ? <><AlertTriangle className="w-2.5 h-2.5" /> You</> :
                 s.status === "resolved" ? <><CheckCircle className="w-2.5 h-2.5" /> Done</> :
                 <><span className="w-1.5 h-1.5 rounded-full bg-[var(--chidi-success)]" /> Chidi</>}
              </span>
              <span className="text-[10px] text-[var(--chidi-text-muted)] capitalize">{s.intent}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function SampleOrderRows() {
  const samples = [
    { name: "Adaeze Okafor", items: "Red Adidas Size 42, White socks", total: 18000, time: "2m", status: { text: "Pending", color: "text-[var(--chidi-warning)]", bg: "bg-[var(--chidi-warning)]/10" } },
    { name: "Tunde Bakare", items: "Matte lipstick set", total: 7500, time: "1h", status: { text: "Confirmed", color: "text-[var(--chidi-success)]", bg: "bg-[var(--chidi-success)]/10" } },
    { name: "Ifeoma Eze", items: "Wholesale lot of Ankara fabric (12)", total: 145000, time: "4h", status: { text: "Fulfilled", color: "text-blue-600", bg: "bg-blue-50" } },
    { name: "Olumide Sanusi", items: "iPhone case (clear)", total: 4500, time: "1d", status: { text: "Fulfilled", color: "text-blue-600", bg: "bg-blue-50" } },
    { name: "Kemi Adebayo", items: "Hair products bundle", total: 22000, time: "2d", status: { text: "Pending", color: "text-[var(--chidi-warning)]", bg: "bg-[var(--chidi-warning)]/10" } },
  ]

  return (
    <div className="divide-y divide-[var(--chidi-border-subtle)]">
      {samples.map((s, idx) => (
        <div key={idx} className="px-6 py-4 flex items-start gap-3">
          <CustomerCharacter name={s.name} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="ty-card-title text-[var(--chidi-text-primary)] truncate">{s.name}</span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${s.status.bg} ${s.status.color}`}>
                {s.status.text}
              </span>
            </div>
            <p className="text-sm text-[var(--chidi-text-muted)] font-chidi-voice truncate mt-0.5">
              {s.items}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <CurrencyAmount
                amount={s.total}
                currency="NGN"
                showDualHover={false}
                className="text-sm font-medium text-[var(--chidi-text-primary)] tabular-nums"
              />
              <span className="text-xs text-[var(--chidi-text-muted)]">{s.time}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function SampleInventoryRows() {
  const samples = [
    { name: "Red Adidas — Size 42", category: "Sneakers", price: 18000, stock: 4, status: "low" as const },
    { name: "Matte Lipstick Set", category: "Beauty", price: 7500, stock: 22, status: "good" as const },
    { name: "African Print Fabric (per yard)", category: "Fabric", price: 3200, stock: 12, status: "good" as const },
    { name: "iPhone 14 Clear Case", category: "Accessories", price: 4500, stock: 0, status: "out" as const },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 px-4">
      {samples.map((s, idx) => (
        <div key={idx} className="bg-white border border-[var(--chidi-border-subtle)] rounded-xl overflow-hidden">
          <div className="aspect-square bg-[var(--chidi-surface)] flex items-center justify-center relative">
            <Package className="w-12 h-12 text-[var(--chidi-text-muted)]" strokeWidth={1} />
            {s.status !== "good" && (
              <div className="absolute bottom-2 left-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  s.status === "out"
                    ? "bg-[var(--chidi-danger)] text-white"
                    : "bg-[var(--chidi-warning)] text-[var(--chidi-warning-foreground)]"
                }`}>
                  {s.status === "out" ? "Out of stock" : "Low stock"}
                </span>
              </div>
            )}
          </div>
          <div className="p-3">
            <p className="text-sm font-medium text-[var(--chidi-text-primary)] line-clamp-2">{s.name}</p>
            <div className="flex items-center justify-between mt-1">
              <CurrencyAmount
                amount={s.price}
                currency="NGN"
                showDualHover={false}
                className="text-base font-semibold text-[var(--chidi-text-primary)] tabular-nums"
              />
              <span className="text-xs text-[var(--chidi-text-muted)]">{s.stock} units</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
