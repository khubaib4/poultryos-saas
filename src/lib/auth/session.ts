import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfileFromCookie } from '@/lib/auth/profile-cache-server'
import { isTransientAuthFailure } from '@/lib/auth/transient-auth'
import type { UserProfile } from '@/types/database'

/**
 * Gets the current user's profile from the session.
 * When Supabase is unreachable (offline), falls back to the profile cookie
 * set by the client after a successful login.
 */
export async function getSessionProfile() {
  const supabase = await createClient()

  let user: { id: string } | null = null

  try {
    const {
      data: { user: u },
      error,
    } = await supabase.auth.getUser()
    if (error) {
      if (isTransientAuthFailure(error.message)) {
        const cookieProfile = await getProfileFromCookie()
        if (cookieProfile) {
          return { supabase, profile: cookieProfile }
        }
      }
      redirect('/login')
    }
    user = u
  } catch {
    const cookieProfile = await getProfileFromCookie()
    if (cookieProfile) {
      return { supabase, profile: cookieProfile }
    }
    redirect('/login')
  }

  if (!user) {
    const cookieProfile = await getProfileFromCookie()
    if (cookieProfile) {
      return { supabase, profile: cookieProfile }
    }
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, name, email, role, status, organization_id')
    .eq('id', user.id)
    .single()

  if (!profileError && profile) {
    return { supabase, profile: profile as UserProfile }
  }

  const cookieProfile = await getProfileFromCookie()
  if (cookieProfile && cookieProfile.id === user.id) {
    return { supabase, profile: cookieProfile }
  }

  redirect('/login')
}
