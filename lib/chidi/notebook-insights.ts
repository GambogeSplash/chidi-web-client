/**
 * Chidi's Notebook — derived insights about the merchant's business.
 *
 * Backend can replace this with real ML-derived patterns; the shape stays
 * stable so the UI doesn't change. For now we mock from whatever data is
 * available + sensible defaults.
 */

export interface NotebookInsight {
  id: string
  category: "rhythm" | "customer" | "product" | "channel" | "opportunity"
  headline: string
  body: string
  evidence?: string
  confidence: "noticed" | "noticing" | "still_learning"
}

export interface CustomerHighlight {
  id: string
  name: string
  oneLiner: string
  metric: string
}

export const MOCK_NOTEBOOK_INSIGHTS: NotebookInsight[] = [
  {
    id: "rhythm-saturday",
    category: "rhythm",
    headline: "Saturdays carry the week.",
    body: "Your average Saturday brings in about 38% more revenue than a weekday. Last Saturday alone matched Mon–Wed combined.",
    evidence: "Based on the last 8 weeks of orders.",
    confidence: "noticed",
  },
  {
    id: "rhythm-late-night",
    category: "rhythm",
    headline: "Customers shop late.",
    body: "About 1 in 4 of your orders comes in between 10pm and 1am. I keep replying through that window so you don't lose them.",
    confidence: "noticed",
  },
  {
    id: "product-sneakers",
    category: "product",
    headline: "Red sneakers outsell blue 3:1.",
    body: "Across the last 6 weeks, the red colourway moved 34 units to blue's 11. Worth ordering deeper on red next restock.",
    confidence: "noticed",
  },
  {
    id: "product-stale",
    category: "product",
    headline: "3 SKUs haven't moved in 30+ days.",
    body: "Want me to suggest a Saturday-only discount for the slow movers? I can draft a broadcast for both your Telegram and WhatsApp channels.",
    confidence: "noticing",
  },
  {
    id: "channel-mix",
    category: "channel",
    headline: "Your channel mix is healthy.",
    body: "About 55% of orders came in through Telegram and 45% through WhatsApp this month — both channels are pulling weight. Worth keeping the broadcast cadence even across both.",
    confidence: "noticed",
  },
  {
    id: "customer-repeat",
    category: "customer",
    headline: "12 customers came back this month.",
    body: "Repeat customers spend on average 2.1× more per order than first-timers. I'm tracking who they are so you can treat them well.",
    confidence: "noticed",
  },
  {
    id: "opportunity-followup",
    category: "opportunity",
    headline: "7 conversations went quiet last week.",
    body: "Customers asked about products and didn't come back. I can draft a soft check-in if you want — no pressure, just 'still interested?'",
    confidence: "noticing",
  },
  {
    id: "opportunity-pricing",
    category: "opportunity",
    headline: "Your matte lipsticks are underpriced.",
    body: "You sell 14 a week with no resistance. I think you have room to test a 10–15% raise on those without losing volume.",
    evidence: "Comparing your conversion rate vs ask price across SKUs.",
    confidence: "still_learning",
  },
]

export const MOCK_CUSTOMER_HIGHLIGHTS: CustomerHighlight[] = [
  { id: "1", name: "Adaeze Okafor", oneLiner: "Buys every Friday for resale. Always pays fast.", metric: "₦184k · 22 orders" },
  { id: "2", name: "Tunde Bakare", oneLiner: "Size 42, lives in Lekki, asks before he buys.", metric: "₦67k · 8 orders" },
  { id: "3", name: "Ifeoma Eze", oneLiner: "Wholesale buyer. Last asked about minimum order quantity.", metric: "₦310k · 5 orders" },
  { id: "4", name: "Kemi Adebayo", oneLiner: "First-time buyer last week, hasn't paid yet. Worth a soft nudge.", metric: "₦14k · pending" },
]
