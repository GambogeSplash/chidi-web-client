/**
 * Customer memory — what Chidi has "learned" about each customer over time.
 *
 * The shipped UI shows a compact memory line under each conversation row so
 * the merchant sees customers as people, not rows. The backend can populate
 * this from real order history + conversation summaries; until then we
 * deterministically derive a plausible string from the customer ID so the
 * same customer always shows the same memory.
 */

export interface CustomerMemoryInput {
  customerId: string
  customerName?: string | null
  lastIntent?: string | null
}

const SIZES = ["S", "M", "L", "XL", "38", "40", "42", "44"]
const PRODUCTS = [
  "the red Adidas",
  "matte lipsticks",
  "size 42 sneakers",
  "African print fabric",
  "iPhone cases",
  "the natural hair products",
  "wholesale lots",
  "kids' uniforms",
]
const AREAS = ["Lekki", "Ikeja", "Yaba", "Surulere", "VI", "Ajah", "Magodo", "Gbagada"]
const CADENCES = ["weekly", "every Friday", "twice a month", "for events", "for resale"]

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]
}

export function deriveCustomerMemory(input: CustomerMemoryInput): string | null {
  if (!input.customerId) return null
  const seed = hash(input.customerId)

  // Tier the memory by how "known" the customer feels — derived from the seed
  // so a given customer always reads the same.
  const tier = seed % 5

  if (tier === 0) {
    // First-time / unknown
    return null
  }

  const orders = 2 + (seed % 22)
  const product = pick(PRODUCTS, seed >> 2)
  const size = pick(SIZES, seed >> 5)
  const area = pick(AREAS, seed >> 7)
  const cadence = pick(CADENCES, seed >> 9)
  const daysAgo = 1 + (seed % 90)

  const lastBoughtPhrase =
    daysAgo < 7 ? `last bought ${daysAgo}d ago` :
    daysAgo < 30 ? `last bought ${Math.floor(daysAgo / 7)}w ago` :
    `last bought ${Math.floor(daysAgo / 30)}mo ago`

  const fragments: string[] = []
  fragments.push(`${orders} order${orders === 1 ? "" : "s"}`)
  if (tier >= 2) fragments.push(`buys ${cadence}`)
  if (tier >= 3) fragments.push(`usually ${product}`)
  if (tier >= 4) fragments.push(`size ${size}, ${area}`)
  fragments.push(lastBoughtPhrase)

  return fragments.join(" · ")
}
