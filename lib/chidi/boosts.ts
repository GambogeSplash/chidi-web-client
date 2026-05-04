/**
 * Boosts — per-customer message templates.
 *
 * A "boost" is a tiny pre-baked dressing the merchant pins to a specific
 * customer so every reply they type to that customer comes out with the
 * right shape, without thinking. Examples:
 *   - "Adaeze always wants a discount line — auto-add it"
 *   - "Tola — always confirm payment received explicitly"
 *   - "Sign every reply with — Demo's Shop"
 *
 * The store is local-only (localStorage) and keyed by customerId.
 *
 * Shape:
 *   chidi:boosts -> { [customerId]: BoostRecord }
 *
 * Lifecycle:
 *   - getBoosts(customerId) — current record or null
 *   - setBoost(customerId, partial) — patch + bump updatedAt
 *   - clearBoost(customerId) — remove
 *   - applyBoosts(text, customerId) — the function called on draft send;
 *     wraps the message with autoPrepend / autoAppend / signature, in that
 *     order, with single blank-line separators.
 *   - countActive(record) — how many fields are filled (for the chip)
 *   - subscribe(cb) — change notifications for live UI
 */

const STORAGE_KEY = "chidi:boosts"

export interface BoostRecord {
  signature?: string
  autoPrepend?: string
  autoAppend?: string
  alwaysIncludeOrderRef?: boolean
  updatedAt: string
}

export type BoostStore = Record<string, BoostRecord>

type Listener = (store: BoostStore) => void
const listeners = new Set<Listener>()

function isBrowser(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  )
}

function read(): BoostStore {
  if (!isBrowser()) return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as BoostStore
    }
    return {}
  } catch {
    return {}
  }
}

function write(store: BoostStore): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Quota / private mode — boosts are convenience.
  }
  listeners.forEach((cb) => {
    try {
      cb(store)
    } catch {
      /* swallow */
    }
  })
}

/** Returns the boost record for this customer, or null. */
export function getBoosts(customerId: string | null | undefined): BoostRecord | null {
  if (!customerId) return null
  const store = read()
  return store[customerId] ?? null
}

/**
 * Patch the record for this customer. Empty strings clear the field rather
 * than persist whitespace. If the resulting record has no active fields,
 * it's removed entirely so the chip doesn't lie.
 */
export function setBoost(
  customerId: string,
  partial: Partial<Omit<BoostRecord, "updatedAt">>,
): BoostRecord | null {
  if (!customerId) return null
  const store = read()
  const current = store[customerId] ?? { updatedAt: new Date().toISOString() }

  const next: BoostRecord = {
    ...current,
    ...normalizePatch(partial),
    updatedAt: new Date().toISOString(),
  }

  if (countActive(next) === 0) {
    delete store[customerId]
    write(store)
    return null
  }

  store[customerId] = next
  write(store)
  return next
}

function normalizePatch(
  partial: Partial<Omit<BoostRecord, "updatedAt">>,
): Partial<Omit<BoostRecord, "updatedAt">> {
  const out: Partial<Omit<BoostRecord, "updatedAt">> = {}
  if ("signature" in partial) {
    out.signature = partial.signature?.trim() ? partial.signature : undefined
  }
  if ("autoPrepend" in partial) {
    out.autoPrepend = partial.autoPrepend?.trim() ? partial.autoPrepend : undefined
  }
  if ("autoAppend" in partial) {
    out.autoAppend = partial.autoAppend?.trim() ? partial.autoAppend : undefined
  }
  if ("alwaysIncludeOrderRef" in partial) {
    out.alwaysIncludeOrderRef = !!partial.alwaysIncludeOrderRef
  }
  return out
}

export function clearBoost(customerId: string): void {
  if (!customerId) return
  const store = read()
  if (!(customerId in store)) return
  delete store[customerId]
  write(store)
}

/**
 * Returns how many boost fields are active for this record. Used by the
 * "N boosts active" chip above the chat input.
 */
export function countActive(record: BoostRecord | null | undefined): number {
  if (!record) return 0
  let n = 0
  if (record.signature?.trim()) n += 1
  if (record.autoPrepend?.trim()) n += 1
  if (record.autoAppend?.trim()) n += 1
  if (record.alwaysIncludeOrderRef) n += 1
  return n
}

interface ApplyBoostsContext {
  /** Active order id for this conversation (used by alwaysIncludeOrderRef). */
  orderRef?: string | null
  /** Optional — used if we ever want to substitute {first_name}. */
  customerFirstName?: string
}

/**
 * Wraps the merchant's drafted text with the active boosts.
 *
 * Order: autoPrepend \n\n {text} {orderRef line if enabled} \n\n autoAppend \n\n signature
 *
 * Token replacement: any occurrence of `{first_name}` in autoPrepend /
 * autoAppend / signature is replaced with the customer's first name when
 * we have one, otherwise the token is dropped (collapsed to empty) so the
 * raw placeholder never reaches the customer.
 */
export function applyBoosts(
  text: string,
  customerId: string | null | undefined,
  ctx: ApplyBoostsContext = {},
): string {
  const trimmed = text ?? ""
  const record = getBoosts(customerId)
  if (!record) return trimmed

  const firstName = (ctx.customerFirstName ?? "").trim()
  const fill = (s: string | undefined) => {
    if (!s) return ""
    return s.replace(/\{first_name\}/gi, firstName).trim()
  }

  const prepend = fill(record.autoPrepend)
  const append = fill(record.autoAppend)
  const signature = fill(record.signature)

  const orderLine =
    record.alwaysIncludeOrderRef && ctx.orderRef
      ? `Re: order #${ctx.orderRef.slice(-6).toUpperCase()}`
      : ""

  // Build with double-newline separators between distinct sections; the body
  // and order-ref hug together since the order ref is contextual to the body.
  const body = orderLine ? `${trimmed.trim()}\n${orderLine}` : trimmed.trim()

  const sections = [prepend, body, append, signature].filter(
    (s) => s.length > 0,
  )

  return sections.join("\n\n")
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
