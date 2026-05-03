/**
 * Dev-mode auth bypass — when there's no real backend wired, let any
 * email/password sign in and any OTP verify so the app is fully usable
 * for demos / preview deploys.
 *
 * Activation logic (2026-05-04 update):
 *   - Active whenever the configured Supabase URL is missing or still the
 *     placeholder, OR the API base URL is the default localhost:8000 / unset
 *   - This now applies in BOTH dev and prod, so demo deploys without a
 *     backend (the current Vercel state) work end-to-end with mock data
 *   - Hard kill switch: set NEXT_PUBLIC_DISABLE_DEV_BYPASS=true on the
 *     environment when you wire a real backend so this can never fire.
 */

export const isDevBypassActive = (): boolean => {
  // Hard kill switch — flip this when you deploy with a real backend.
  if (process.env.NEXT_PUBLIC_DISABLE_DEV_BYPASS === "true") return false

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""

  const noRealSupabase = !supabaseUrl || supabaseUrl.includes("placeholder")
  const localOrUnsetApi = !apiBase || apiBase.includes("localhost:8000")

  return noRealSupabase || localOrUnsetApi
}

const DEV_BUSINESS_SLUG = "demo-shop"

export interface DevBypassUser {
  id: string
  email: string
  name: string
  businessId: string
  businessName: string
  businessSlug: string
  phone: string
  category: string
  createdAt: string
  email_verified: boolean
}

export const buildDevBypassUser = (email: string): DevBypassUser => {
  const namePart = email.split("@")[0] || "Demo Owner"
  const friendly = namePart
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
  return {
    id: "dev-user",
    email,
    name: friendly,
    businessId: "dev-business",
    businessName: `${friendly}'s Shop`,
    businessSlug: DEV_BUSINESS_SLUG,
    phone: "+234 800 000 0000",
    category: "fashion",
    createdAt: new Date().toISOString(),
    email_verified: true,
  }
}

export const setDevBypassSession = (email: string) => {
  if (typeof window === "undefined") return
  const user = buildDevBypassUser(email)
  // Persist a dummy auth indicator so authAPI.isAuthenticated() returns true.
  document.cookie = `chidi_logged_in=true; path=/; max-age=86400; SameSite=Lax`
  localStorage.setItem("chidi_auth_token", "dev-bypass-token")
  localStorage.setItem("chidi_dev_user", JSON.stringify(user))
  // Stash the inventory + business IDs so downstream API helpers can resolve.
  // (productsAPI.getProducts reads inventory_id from localStorage.)
  localStorage.setItem("chidi_inventory_id", "dev-inventory")
  localStorage.setItem("chidi_business_id", user.businessId)
}

export const getDevBypassUser = (): DevBypassUser | null => {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem("chidi_dev_user")
    return raw ? (JSON.parse(raw) as DevBypassUser) : null
  } catch {
    return null
  }
}

export const clearDevBypassSession = () => {
  if (typeof window === "undefined") return
  document.cookie = "chidi_logged_in=; path=/; max-age=0"
  localStorage.removeItem("chidi_auth_token")
  localStorage.removeItem("chidi_dev_user")
  localStorage.removeItem("chidi_inventory_id")
  localStorage.removeItem("chidi_business_id")
}

export const DEV_BYPASS_BUSINESS_SLUG = DEV_BUSINESS_SLUG
