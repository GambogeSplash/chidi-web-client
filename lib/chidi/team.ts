/**
 * Team / invites / roles — local-only persistence for the multi-seat
 * settings card. Phase-1 capture: real RBAC enforcement is a backend job;
 * this gives the merchant a working invite + role surface so they can
 * actually plan who sees what.
 *
 * Shape:
 *   chidi:team -> {
 *     members: TeamMember[]
 *   }
 *
 * The owner role is special — exactly one owner exists at a time and
 * cannot be removed. Admin can manage everything except billing. Agent
 * is scoped to inbox + orders only (the hands-on customer-facing role).
 */

const STORAGE_KEY = "chidi:team"
const SEED_FLAG_KEY = "chidi:team-seeded"

export type TeamRole = "owner" | "admin" | "agent"
export type TeamMemberStatus = "active" | "pending"

export interface TeamMember {
  id: string
  name: string
  email: string
  role: TeamRole
  invitedAt: string
  status: TeamMemberStatus
}

export interface TeamStore {
  members: TeamMember[]
}

type Listener = (store: TeamStore) => void
const listeners = new Set<Listener>()

export const ROLE_LABELS: Record<TeamRole, string> = {
  owner: "Owner",
  admin: "Admin",
  agent: "Agent",
}

export const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  owner: "Full control — including billing and team",
  admin: "Manage everything except billing",
  agent: "Inbox + orders only",
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function read(): TeamStore {
  if (!isBrowser()) return { members: [] }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { members: [] }
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.members)) {
      return parsed as TeamStore
    }
    return { members: [] }
  } catch {
    return { members: [] }
  }
}

function write(store: TeamStore): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* swallow quota errors */
  }
  listeners.forEach((cb) => {
    try {
      cb(store)
    } catch {
      /* swallow listener errors */
    }
  })
}

function makeId(): string {
  return `mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export function getTeam(): TeamStore {
  return read()
}

/**
 * Seed the owner + 2 demo members the first time. Owner is taken from
 * the auth user (name + email passed in); demo members give the merchant
 * something to look at instead of an empty list.
 */
export function seedTeamIfEmpty(owner: { name: string; email: string }): void {
  if (!isBrowser()) return
  if (window.localStorage.getItem(SEED_FLAG_KEY) === "1") return
  const current = read()
  if (current.members.length > 0) {
    try {
      window.localStorage.setItem(SEED_FLAG_KEY, "1")
    } catch {
      /* ignore */
    }
    return
  }
  const now = new Date().toISOString()
  const seeded: TeamStore = {
    members: [
      {
        id: makeId(),
        name: owner.name || "You",
        email: owner.email || "you@yourshop.ng",
        role: "owner",
        invitedAt: now,
        status: "active",
      },
      {
        id: makeId(),
        name: "Ada Okonkwo",
        email: "ada@demoshop.ng",
        role: "admin",
        invitedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active",
      },
      {
        id: makeId(),
        name: "Tunde Bello",
        email: "tunde@demoshop.ng",
        role: "agent",
        invitedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: "pending",
      },
    ],
  }
  write(seeded)
  try {
    window.localStorage.setItem(SEED_FLAG_KEY, "1")
  } catch {
    /* ignore */
  }
}

export function inviteMember(email: string, role: TeamRole): TeamMember | null {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed || !trimmed.includes("@")) return null
  const store = read()
  if (store.members.some((m) => m.email.toLowerCase() === trimmed)) return null
  const member: TeamMember = {
    id: makeId(),
    name: trimmed.split("@")[0],
    email: trimmed,
    role,
    invitedAt: new Date().toISOString(),
    status: "pending",
  }
  write({ members: [...store.members, member] })
  return member
}

export function changeRole(id: string, role: TeamRole): void {
  const store = read()
  // Owner can't be re-roled (would orphan the workspace) and you can't
  // promote anyone else to owner from this surface — that's a transfer-
  // ownership flow that lives elsewhere.
  if (role === "owner") return
  const next = store.members.map((m) =>
    m.id === id && m.role !== "owner" ? { ...m, role } : m,
  )
  write({ members: next })
}

export function removeMember(id: string): void {
  const store = read()
  const target = store.members.find((m) => m.id === id)
  if (!target || target.role === "owner") return // owner can't be removed
  write({ members: store.members.filter((m) => m.id !== id) })
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb)
  cb(read())
  return () => listeners.delete(cb)
}
