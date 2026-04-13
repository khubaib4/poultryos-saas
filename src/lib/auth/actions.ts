'use server'

import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/database'

const ROLE_REDIRECT: Record<UserRole, string> = {
  SYSTEM_OWNER: '/system',
  ADMIN: '/admin',
  FARM_USER: '/farm',
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginAction(
  email: string,
  password: string
): Promise<{ error: string } | { redirectTo: string }> {
  const supabase = await createClient()

  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    if (authError.message.includes('Invalid login credentials')) {
      return { error: 'Invalid email or password.' }
    }
    return { error: authError.message }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Authentication failed. Please try again.' }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role, status')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    // Temporary: surface the real Supabase error so we can diagnose
    return {
      error: `Profile lookup failed — code: ${profileError?.code}, message: ${profileError?.message}, hint: ${profileError?.hint}`,
    }
  }

  if (profile.status === 'SUSPENDED') {
    await supabase.auth.signOut()
    return { error: 'Your account has been suspended. Please contact support.' }
  }

  if (profile.status === 'INACTIVE') {
    await supabase.auth.signOut()
    return { error: 'Your account is inactive. Please contact support.' }
  }

  return { redirectTo: ROLE_REDIRECT[profile.role as UserRole] ?? '/farm' }
}

// ─── Register ─────────────────────────────────────────────────────────────────

export async function registerAction(data: {
  name: string
  email: string
  phone?: string
  password: string
  organizationName: string
}): Promise<{ error: string } | { redirectTo: string }> {
  const supabase = await createClient()

  // 1. Create the Supabase auth user
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: { name: data.name },
    },
  })

  if (signUpError) {
    if (signUpError.message.includes('already registered')) {
      return { error: 'An account with this email already exists.' }
    }
    return { error: signUpError.message }
  }

  const user = authData.user
  if (!user) {
    return { error: 'Sign up failed. Please try again.' }
  }

  // If email confirmation is required, Supabase won't have a session yet.
  // We still insert the records so they're ready when the user confirms.
  // 2. Create the organization first so we have its ID
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: data.organizationName,
      admin_id: user.id,
      plan: 'FREE',
      plan_status: 'ACTIVE',
      max_farms: 1,
      max_users: 5,
    })
    .select('id')
    .single()

  if (orgError || !org) {
    // Clean up: sign out the newly created auth user
    await supabase.auth.signOut()
    return { error: 'Failed to create organization. Please try again.' }
  }

  // 3. Insert the user profile record
  const { error: userError } = await supabase.from('users').insert({
    id: user.id,
    email: data.email,
    name: data.name,
    phone: data.phone ?? null,
    role: 'ADMIN',
    status: 'ACTIVE',
    organization_id: org.id,
  })

  if (userError) {
    await supabase.auth.signOut()
    return { error: 'Failed to create user profile. Please try again.' }
  }

  // If no session yet (email confirmation required), tell the user
  if (!authData.session) {
    return {
      error:
        'Account created! Please check your email to confirm your account before logging in.',
    }
  }

  return { redirectTo: '/admin' }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
