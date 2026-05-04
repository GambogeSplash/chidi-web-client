/**
 * Playbook plays — repeatable moves Chidi runs (or can run) on the merchant's
 * behalf. Each play is a tactic with a trigger, the move, the expected outcome,
 * and a track record from past runs.
 *
 * Mental model: a tactical book a coach hands a player. Not "things I noticed."
 */

export type PlayCategory =
  | "recovery"
  | "conversion"
  | "retention"
  | "inventory"
  | "routine"

export type PlayState = "active" | "paused" | "draft"

export interface PlayRunEvidence {
  /** ISO date the play was last run */
  ran_at: string
  /** Plain-language one-liner: who/what */
  context: string
  /** Did the play succeed by its own definition (e.g. paid, replied, came back) */
  outcome: "won" | "lost" | "pending"
  /** Optional sub-figure shown next to the outcome (e.g. "₦18k recovered") */
  detail?: string
}

export interface PlaybookPlay {
  id: string
  category: PlayCategory
  title: string
  /** When the play fires — short imperative phrase */
  trigger: string
  /** The 3 (sometimes 2 or 4) steps Chidi executes */
  steps: string[]
  /** Plain-language outcome promise */
  outcome: string
  /** Quantified track record. `runs` includes pending. */
  stats: {
    runs: number
    won: number
    win_rate_pct: number
    last_30d_value_recovered_ngn?: number
  }
  /** State of the play in the merchant's playbook */
  state: PlayState
  /** Recent runs, newest first. Show top 3. */
  recent: PlayRunEvidence[]
  /** A real example of the message Chidi sends when the play fires.
      Renders as a WhatsApp-style bubble in the expanded view so the play
      reads as a concrete tactic, not an abstract policy. */
  sample_message?: string
  /** Customer-side plays: names of people the play would currently affect.
      Used to render stacked avatars in the play card. */
  affected_customers?: string[]
  /** A short, voice-y subtitle that explains the play in human terms.
      Renders under the title in both Today + Always-running. */
  subtitle?: string
  /** Inventory plays: image URLs of the SKUs the play targets. Drives
      product thumbnails in the play card. */
  affected_product_images?: string[]
  /** Routine plays: 7-day activity values for the inline sparkline. */
  spark?: number[]
  /** Optional cover photo for the featured-play hero (Pexels CDN). */
  cover_image?: string
  /** When true, this play is eligible to be the "Play of the moment" hero. */
  featured?: boolean
}

export const PLAY_CATEGORY_LABEL: Record<PlayCategory, string> = {
  recovery: "Recovery",
  conversion: "Conversion",
  retention: "Retention",
  inventory: "Inventory",
  routine: "Routine",
}

export const PLAY_STATE_LABEL: Record<PlayState, string> = {
  active: "Running",
  paused: "Paused",
  draft: "Draft",
}

// Pexels CDN helper — same shape as mock-data so product thumbnails match the
// inventory tab. Sized smaller for play-card use.
const px = (id: string) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop`

// =============================================================================
// The plays — authored, not auto-generated. Each is opinionated.
// =============================================================================

export const PLAYS: PlaybookPlay[] = [
  // ---- RECOVERY ------------------------------------------------------------
  {
    id: "play-pending-payment",
    category: "recovery",
    title: "The 24-hour chase",
    subtitle: "When someone drops off at checkout, follow up with grace.",
    trigger: "An order has been in PENDING_PAYMENT for 24 hours.",
    steps: [
      "Send a soft nudge in the customer's voice: \"Hey, still want to grab that one? I'm holding it.\"",
      "If no reply by 36h, drop the bank details + a friendly deadline (\"till tomorrow noon\").",
      "If still cold by 48h, mark the order CANCELLED and free the stock back.",
    ],
    outcome: "47% of cold pending payments come back and pay within 12h of the nudge.",
    stats: {
      runs: 34,
      won: 16,
      win_rate_pct: 47,
      last_30d_value_recovered_ngn: 184_500,
    },
    state: "active",
    recent: [
      { ran_at: "2026-04-30", context: "Tunde Bakare, Red Adidas size 42", outcome: "won", detail: "₦18,000 recovered" },
      { ran_at: "2026-04-29", context: "Folake Olamide, 3 lipstick sets", outcome: "won", detail: "₦22,500 recovered" },
      { ran_at: "2026-04-28", context: "Aisha Mohammed, Ankara two-piece", outcome: "lost", detail: "Cancelled at 48h" },
    ],
    sample_message:
      "Hey Tunde, just checking — still want to grab the Red Adidas size 42? I'm holding it for you till tomorrow noon. Bank: GTBank 0123456789. ✨",
    affected_customers: ["Tunde Bakare", "Folake Olamide", "Aisha Mohammed", "Bola Tinubu-Lewis", "Ngozi Iweala"],
    cover_image: "https://images.pexels.com/photos/4549408/pexels-photo-4549408.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop",
    featured: true,
  },
  {
    id: "play-cart-abandon",
    category: "recovery",
    title: "Quiet ones",
    subtitle: "When a chat goes silent after a quote, slip in once.",
    trigger: "Customer asks about a product, gets a quote, then goes silent for 3+ hours.",
    steps: [
      "Send a single message tied to what they asked: \"That blue one is still here if you want it.\"",
      "If they reply with a question, answer + nudge to commit (\"I can hold it till end of day\").",
      "Stop after 2 messages — no third nudge. Respect the silence.",
    ],
    outcome: "32% of dropped chats come back with intent within 6 hours.",
    stats: {
      runs: 89,
      won: 28,
      win_rate_pct: 32,
      last_30d_value_recovered_ngn: 142_700,
    },
    state: "active",
    recent: [
      { ran_at: "2026-04-30", context: "Yemi Aluko, Bluetooth earbuds question", outcome: "won", detail: "Order placed" },
      { ran_at: "2026-04-30", context: "Hassan Sule, fabric quote", outcome: "pending" },
      { ran_at: "2026-04-29", context: "Blessing Okoro, headwrap question", outcome: "lost" },
    ],
    sample_message:
      "Hi! Those Bluetooth Earbuds you asked about — still here at ₦18,500. I can hold a pair till end of day if you want.",
    affected_customers: ["Yemi Aluko", "Hassan Sule", "Blessing Okoro", "Damilola Owolabi"],
  },

  // ---- CONVERSION ----------------------------------------------------------
  {
    id: "play-bulk-quote",
    category: "conversion",
    title: "Big basket",
    subtitle: "When someone asks for ten or more, quote on the spot.",
    trigger: "Customer asks about quantities of 10+ units.",
    steps: [
      "Quote the unit price including a tiered discount (5% at 10, 10% at 20, 15% at 50).",
      "Offer to pull the order together right now and confirm stock.",
      "Drop bank details immediately if they accept — no second back-and-forth.",
    ],
    outcome: "Wholesale quotes close at ₦92k average, 3.4× a normal order.",
    stats: {
      runs: 18,
      won: 11,
      win_rate_pct: 61,
      last_30d_value_recovered_ngn: 412_800,
    },
    state: "active",
    recent: [
      { ran_at: "2026-04-30", context: "Ifeoma Eze, 20 yards wax print", outcome: "won", detail: "₦78,000 sale" },
      { ran_at: "2026-04-29", context: "Folake Olamide, 15 yards wax print", outcome: "won", detail: "₦48,000 sale" },
      { ran_at: "2026-04-26", context: "Damilola Owolabi, 10 fabric bundles", outcome: "lost" },
    ],
    sample_message:
      "For 20 yards, I can do ₦2,720/yard (10% off). Total ₦54,400. Want me to lock it in and send the bank details now?",
    affected_customers: ["Ifeoma Eze", "Folake Olamide", "Damilola Owolabi"],
  },
  {
    id: "play-upsell-bundle",
    category: "conversion",
    title: "Two for the road",
    subtitle: "When a beauty item lands, offer its companion at a kindness.",
    trigger: "A customer adds a beauty item to their order.",
    steps: [
      "Offer the matching companion product (bonnet → lipstick set, soap → lotion).",
      "Frame it as a discount: \"₦1,500 off if we bundle.\"",
      "Don't push twice. One ask only.",
    ],
    outcome: "23% of beauty orders accept the bundle. Average uplift: ₦4,200/order.",
    stats: {
      runs: 47,
      won: 11,
      win_rate_pct: 23,
      last_30d_value_recovered_ngn: 46_200,
    },
    state: "active",
    recent: [
      { ran_at: "2026-04-30", context: "Adaeze Okafor, lipstick + bonnet", outcome: "won", detail: "+₦5,000" },
      { ran_at: "2026-04-29", context: "Sade Lawal, soap order", outcome: "lost" },
      { ran_at: "2026-04-28", context: "Maryam Bello, lotion + soap bundle", outcome: "won", detail: "+₦3,000" },
    ],
    sample_message:
      "Quick one — pair the lipstick set with a silk bonnet for ₦8,500 instead of ₦10,000. Want me to add it?",
    affected_product_images: [
      "https://images.pexels.com/photos/7256082/pexels-photo-7256082.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop",
      "https://images.pexels.com/photos/7897135/pexels-photo-7897135.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop",
      "https://images.pexels.com/photos/4202926/pexels-photo-4202926.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop",
    ],
  },

  // ---- RETENTION -----------------------------------------------------------
  {
    id: "play-vip-checkin",
    category: "retention",
    title: "Wake up old friends",
    subtitle: "When a regular goes quiet for six weeks, send a real note.",
    trigger: "A repeat customer (3+ orders) has gone 6 weeks without a message.",
    steps: [
      "Send a personal note tied to their last purchase (\"how's the headwrap holding up?\").",
      "Mention one new arrival you genuinely think they'd like.",
      "No discount unless they ask — don't cheapen the relationship.",
    ],
    outcome: "44% of dormant VIPs reply within 48h. 19% place an order within a week.",
    stats: {
      runs: 26,
      won: 5,
      win_rate_pct: 19,
      last_30d_value_recovered_ngn: 87_400,
    },
    state: "active",
    recent: [
      { ran_at: "2026-04-28", context: "Adaeze Okafor, after 7 weeks quiet", outcome: "won", detail: "Re-ordered ₦12k" },
      { ran_at: "2026-04-22", context: "Kemi Adebayo, after 6 weeks", outcome: "pending" },
      { ran_at: "2026-04-15", context: "Olumide Sanusi, after 8 weeks", outcome: "lost" },
    ],
    sample_message:
      "Hi Adaeze, just thinking about you — how's that headwrap holding up? We just got the new royal blue Aso-Oke Gele in. Thought of you immediately.",
    affected_customers: ["Adaeze Okafor", "Kemi Adebayo", "Olumide Sanusi", "Patience Jonathan"],
  },
  {
    id: "play-thank-you-receipt",
    category: "retention",
    title: "First handshake",
    subtitle: "When an order is fulfilled, send the receipt with a thank-you in your voice.",
    trigger: "An order is marked FULFILLED.",
    steps: [
      "Send a branded receipt + a one-line thank you in your shop voice.",
      "Quietly ask if delivery went well (one yes/no question, not a survey).",
      "If they reply with anything bad, escalate to you and pause Chidi for the thread.",
    ],
    outcome: "Repeat-purchase rate is 38% higher for customers who got the note.",
    stats: {
      runs: 24,
      won: 21,
      win_rate_pct: 87,
      last_30d_value_recovered_ngn: 0,
    },
    state: "active",
    recent: [
      { ran_at: "2026-04-30", context: "Ayodeji Balogun, lotion delivery", outcome: "won", detail: "Replied positive" },
      { ran_at: "2026-04-30", context: "Patience Jonathan, fabric order", outcome: "won", detail: "Replied positive" },
      { ran_at: "2026-04-29", context: "Joel Mensah, earbuds + powerbank", outcome: "won", detail: "Replied positive" },
    ],
    sample_message:
      "Order complete 🎉 Receipt attached. Did the delivery go smoothly today?",
    affected_customers: ["Ayodeji Balogun", "Patience Jonathan", "Joel Mensah", "Tobi Akinwumi", "Sade Lawal", "Maryam Bello"],
  },

  // ---- INVENTORY -----------------------------------------------------------
  {
    id: "play-restock-fast-mover",
    category: "inventory",
    title: "Empty shelf alarm",
    subtitle: "When a fast-mover dips below threshold, draft the supplier message.",
    trigger: "A product hits 30% of its reorder threshold and is selling 3+ units/week.",
    steps: [
      "Notify you in the morning brief with stock-out ETA in days.",
      "Pre-fill a supplier message based on past orders (your contact, your usual quantity).",
      "Pause customer-facing \"in stock\" claims if it dips below 1.",
    ],
    outcome: "Zero stockouts in 30 days when the play runs. 4 stockouts in months it didn't.",
    stats: {
      runs: 11,
      won: 11,
      win_rate_pct: 100,
      last_30d_value_recovered_ngn: 218_400,
    },
    state: "active",
    recent: [
      { ran_at: "2026-04-29", context: "Wax print fabric, ETA 4 days", outcome: "won", detail: "Restocked in time" },
      { ran_at: "2026-04-26", context: "Lagos Tee White, ETA 3 days", outcome: "won", detail: "Restocked in time" },
      { ran_at: "2026-04-22", context: "Bluetooth Earbuds, ETA 6 days", outcome: "won", detail: "Restocked in time" },
    ],
    sample_message:
      "Hey Mama Funmi 👋 Need to reorder African Wax Print Fabric — running low. Can I send your usual 60 yards? ETA matters — last 4 Saturdays averaged 12 yards each.",
    affected_product_images: [
      px("8655018"),
      px("12025472"),
      px("33298188"),
      px("6760143"),
    ],
  },
  {
    id: "play-clearance-stale",
    category: "inventory",
    title: "Dust off the shelf",
    subtitle: "When stock sits for forty-five days, mark it down quietly.",
    trigger: "A product hasn't sold in 45 days but is taking up cash + space.",
    steps: [
      "Suggest a 20% markdown for one week, listed with the regular catalog.",
      "Offer it free as a bundle topper on any order over ₦25k.",
      "If still unsold after the week, recommend pulling from the catalog.",
    ],
    outcome: "63% of stale items clear within 10 days when the markdown runs.",
    stats: {
      runs: 8,
      won: 5,
      win_rate_pct: 63,
      last_30d_value_recovered_ngn: 38_900,
    },
    state: "paused",
    recent: [
      { ran_at: "2026-04-18", context: "iPhone 14 Clear Case, 3 weeks stale", outcome: "lost", detail: "No takers" },
      { ran_at: "2026-04-12", context: "Beaded necklace, 2 months stale", outcome: "won", detail: "₦5,800 cleared" },
      { ran_at: "2026-04-05", context: "Hair bonnet bulk", outcome: "won", detail: "₦18,000 cleared" },
    ],
    sample_message:
      "🏷️ This week only — 20% off Beaded Coral Necklace (₦4,640, was ₦5,800). Limited at 9 in stock.",
    affected_product_images: [
      px("33539866"),
      px("7897135"),
      px("7360460"),
    ],
  },

  // ---- ROUTINE -------------------------------------------------------------
  {
    id: "play-morning-brief",
    category: "routine",
    title: "First light",
    subtitle: "Every morning at 7:30, your day on one screen.",
    trigger: "Every weekday at 7:30am, before you open the app.",
    steps: [
      "Summarize overnight: orders, payments, conversations needing you.",
      "Surface the one thing that matters most for the next 4 hours.",
      "Flag anything that needs a human reply, with the customer's history loaded.",
    ],
    outcome: "Average time-to-first-reply drops from 47 minutes to 8 minutes on brief days.",
    stats: {
      runs: 22,
      won: 22,
      win_rate_pct: 100,
      last_30d_value_recovered_ngn: 0,
    },
    state: "active",
    recent: [
      { ran_at: "2026-05-01", context: "3 overnight orders, ₦47k, 1 needs you", outcome: "won" },
      { ran_at: "2026-04-30", context: "1 overnight order, ₦18k, 0 need you", outcome: "won" },
      { ran_at: "2026-04-29", context: "2 overnight orders, ₦31k, 2 need you", outcome: "won" },
    ],
    sample_message:
      "Good morning ☀️ Overnight: 3 sales (₦47k), 2 messages handled, Tunde's pending payment. The one thing for the next 4 hours: Adaeze hasn't replied since Tuesday — quick check-in?",
    spark: [2, 3, 1, 4, 2, 3, 5],
  },
  {
    id: "play-saturday-prep",
    category: "routine",
    title: "Friday rush",
    subtitle: "Fire a stock check + status idea before Saturday's peak.",
    trigger: "Every Friday at 6pm — Saturdays are 1.85× your average day.",
    steps: [
      "Cross-check stock vs last 4 Saturdays' top sellers.",
      "Flag anything below 2× the average Saturday velocity.",
      "Suggest one product to feature in your status / stories tomorrow.",
    ],
    outcome: "Saturdays where the play ran moved 22% more units than ones it didn't.",
    stats: {
      runs: 4,
      won: 4,
      win_rate_pct: 100,
      last_30d_value_recovered_ngn: 142_300,
    },
    state: "active",
    recent: [
      { ran_at: "2026-04-26", context: "Flagged: Wax print, Lagos Tee, Earbuds", outcome: "won", detail: "₦68k Saturday" },
      { ran_at: "2026-04-19", context: "Flagged: Wax print, Headwrap", outcome: "won", detail: "₦42k Saturday" },
      { ran_at: "2026-04-12", context: "Flagged: Bluetooth Earbuds, Bonnet", outcome: "won", detail: "₦31k Saturday" },
    ],
    sample_message:
      "Tomorrow's Saturday 📈 Stock check: Wax print solid (38 yards), Lagos Tee thin (3 left), Earbuds OK. Featuring the wax print in tonight's status?",
    spark: [0, 0, 0, 0, 0, 1, 0],
  },
]

export const playsByCategory = (): Record<PlayCategory, PlaybookPlay[]> => {
  const out: Record<PlayCategory, PlaybookPlay[]> = {
    recovery: [],
    conversion: [],
    retention: [],
    inventory: [],
    routine: [],
  }
  for (const p of PLAYS) out[p.category].push(p)
  return out
}

export const formatNGN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n)
