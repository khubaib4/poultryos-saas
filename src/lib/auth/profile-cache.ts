import type { UserProfile } from '@/types/database'

export const AUTH_CACHE_KEY = 'poultryos_auth_cache'
/** Short cookie name; value is JSON profile for offline server-side fallback. */
export const PROFILE_COOKIE_NAME = 'poultryos_profile'

export interface CachedAuth {
  profile: UserProfile
  cachedAt: number
}

export function cacheAuth(profile: UserProfile): void {
  if (typeof window === 'undefined') return
  try {
    const payload: CachedAuth = { profile, cachedAt: Date.now() }
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(payload))
    const enc = encodeURIComponent(JSON.stringify(profile))
    document.cookie = `${PROFILE_COOKIE_NAME}=${enc}; path=/; SameSite=Lax; max-age=${60 * 60 * 24 * 30}`
  } catch {
    /* ignore quota / private mode */
  }
}

export function getCachedAuth(): CachedAuth | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CachedAuth
  } catch {
    return null
  }
}

export function clearAuthCache(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(AUTH_CACHE_KEY)
    document.cookie = `${PROFILE_COOKIE_NAME}=; path=/; max-age=0`
  } catch {
    /* ignore */
  }
}
