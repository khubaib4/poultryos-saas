'use server'

import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getSessionProfile } from '@/lib/auth/session'
import type { Organization } from '@/types/database'

async function requireSystemOwner() {
  const { profile } = await getSessionProfile()
  if (profile.role !== 'SYSTEM_OWNER') {
    return { error: 'Access denied.' as const, profile: null }
  }
  if (profile.status !== 'ACTIVE') {
    return { error: 'Account not active.' as const, profile: null }
  }
  return { error: null, profile }
}

export type CreateOrgWithAdminPayload = {
  organizationName: string
  adminName: string
  adminEmail: string
  adminPhone?: string | null
  adminPassword: string
  plan: 'FREE' | 'BASIC' | 'PREMIUM'
  maxFarms: number
  maxUsers: number
}

export async function createOrganizationWithAdmin(
  data: CreateOrgWithAdminPayload
): Promise<{ error: string } | { id: string; organizationId: string }> {
  const gate = await requireSystemOwner()
  if (gate.error || !gate.profile) return { error: gate.error }

  const email = data.adminEmail.trim().toLowerCase()
  if (!email || !data.adminPassword || data.adminPassword.length < 8) {
    return { error: 'Valid email and password (8+ chars) are required.' }
  }

  let service
  try {
    service = createServiceClient()
  } catch {
    return {
      error:
        'Server is not configured for admin provisioning (missing SUPABASE_SERVICE_ROLE_KEY).',
    }
  }

  const { data: created, error: authErr } = await service.auth.admin.createUser({
    email,
    password: data.adminPassword,
    email_confirm: true,
    user_metadata: { name: data.adminName.trim() },
  })

  if (authErr || !created.user) {
    return { error: authErr?.message ?? 'Failed to create auth user.' }
  }

  const userId = created.user.id
  const supabase = await createClient()

  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .insert({
      name: data.organizationName.trim(),
      admin_id: userId,
      plan: data.plan,
      plan_status: 'ACTIVE',
      status: 'ACTIVE',
      max_farms: data.maxFarms,
      max_users: data.maxUsers,
    })
    .select('id')
    .single()

  if (orgErr || !org) {
    await service.auth.admin.deleteUser(userId)
    return { error: orgErr?.message ?? 'Failed to create organization.' }
  }

  const { error: userErr } = await supabase.from('users').insert({
    id: userId,
    email,
    name: data.adminName.trim(),
    phone: data.adminPhone?.trim() || null,
    role: 'ADMIN',
    status: 'ACTIVE',
    organization_id: org.id,
  })

  if (userErr) {
    await supabase.from('organizations').delete().eq('id', org.id)
    await service.auth.admin.deleteUser(userId)
    return { error: userErr.message }
  }

  revalidatePath('/system')
  revalidatePath('/system/organizations')
  return { id: userId, organizationId: org.id }
}

export type UpdateOrganizationPayload = {
  name: string
  plan: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE'
  plan_status: Organization['plan_status']
  status: 'ACTIVE' | 'INACTIVE'
  max_farms: number
  max_users: number
}

export async function updateOrganization(
  id: string,
  data: UpdateOrganizationPayload
): Promise<{ error: string } | { success: true }> {
  const gate = await requireSystemOwner()
  if (gate.error) return { error: gate.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from('organizations')
    .update({
      name: data.name.trim(),
      plan: data.plan,
      plan_status: data.plan_status,
      status: data.status,
      max_farms: data.max_farms,
      max_users: data.max_users,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/system/organizations')
  revalidatePath(`/system/organizations/${id}`)
  revalidatePath(`/system/organizations/${id}/edit`)
  return { success: true }
}

export async function activateOrganization(
  id: string
): Promise<{ error: string } | { success: true }> {
  const gate = await requireSystemOwner()
  if (gate.error) return { error: gate.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from('organizations')
    .update({ status: 'ACTIVE' })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/system/organizations')
  revalidatePath(`/system/organizations/${id}`)
  return { success: true }
}

export async function suspendAdmin(
  id: string
): Promise<{ error: string } | { success: true }> {
  const gate = await requireSystemOwner()
  if (gate.error) return { error: gate.error }

  const supabase = await createClient()
  const { data: u } = await supabase.from('users').select('role').eq('id', id).single()
  if (!u || u.role !== 'ADMIN') return { error: 'Not an organization admin.' }

  const { error } = await supabase.from('users').update({ status: 'SUSPENDED' }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/system/admins')
  revalidatePath(`/system/admins/${id}`)
  return { success: true }
}

export async function activateAdmin(
  id: string
): Promise<{ error: string } | { success: true }> {
  const gate = await requireSystemOwner()
  if (gate.error) return { error: gate.error }

  const supabase = await createClient()
  const { error } = await supabase.from('users').update({ status: 'ACTIVE' }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/system/admins')
  revalidatePath(`/system/admins/${id}`)
  return { success: true }
}

export async function sendAdminPasswordRecovery(
  adminId: string
): Promise<{ error: string } | { success: true; actionLink?: string }> {
  const gate = await requireSystemOwner()
  if (gate.error) return { error: gate.error }

  let service
  try {
    service = createServiceClient()
  } catch {
    return { error: 'Service role not configured.' }
  }

  const supabase = await createClient()
  const { data: user } = await supabase
    .from('users')
    .select('email, role')
    .eq('id', adminId)
    .single()

  if (!user?.email || user.role !== 'ADMIN') {
    return { error: 'Invalid admin.' }
  }

  const { data, error } = await service.auth.admin.generateLink({
    type: 'recovery',
    email: user.email,
  })

  if (error) return { error: error.message }
  return {
    success: true,
    actionLink: data.properties?.action_link,
  }
}

export async function setAdminTempPassword(
  adminId: string
): Promise<{ error: string } | { success: true; password: string }> {
  const gate = await requireSystemOwner()
  if (gate.error) return { error: gate.error }

  let service
  try {
    service = createServiceClient()
  } catch {
    return { error: 'Service role not configured.' }
  }

  const supabase = await createClient()
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', adminId)
    .single()

  if (!user || user.role !== 'ADMIN') return { error: 'Invalid admin.' }

  const password = randomBytes(12).toString('base64url').slice(0, 16)

  const { error } = await service.auth.admin.updateUserById(adminId, { password })
  if (error) return { error: error.message }

  revalidatePath('/system/admins')
  return { success: true, password }
}


export async function suspendOrganization(
  id: string
): Promise<{ error: string } | { success: true }> {
  const gate = await requireSystemOwner()
  if (gate.error) return { error: gate.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from('organizations')
    .update({ status: 'INACTIVE' })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/system/organizations')
  revalidatePath(`/system/organizations/${id}`)
  return { success: true }
}
