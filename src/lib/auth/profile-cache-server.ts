import { cookies } from 'next/headers'
import { PROFILE_COOKIE_NAME } from '@/lib/auth/profile-cache'
import type { UserProfile } from '@/types/database'

/** Server-only: read profile from cookie when Supabase is unreachable. */
export async function getProfileFromCookie(): Promise<UserProfile | null> {
  try {
    const store = await cookies()
    const raw = store.get(PROFILE_COOKIE_NAME)?.value
    if (!raw) return null
    const profile = JSON.parse(decodeURIComponent(raw)) as UserProfile
    if (profile?.id && profile?.email && profile?.role) return profile
  } catch {
    /* ignore */
  }
  return null
}
