'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  getSupabaseAdmin,
  serviceRoleKeySetupError,
} from '@/lib/supabase/admin'
import { seedDefaultEggCategoriesForFarm } from '@/lib/egg-categories/seed-defaults'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreateFarmData {
  name: string
  location?: string
  status: string
  organization_id: string
  createWorker?: boolean
  workerName?: string
  workerEmail?: string
  workerPhone?: string
  workerPassword?: string
}

export type CreateFarmResult =
  | { error: string }
  | { id: string; worker?: { email: string; password: string } }
  | { partial: true; farmId: string; error: string }

export type AddFarmWorkerResult =
  | { error: string }
  | { worker: { email: string; password: string } }

async function provisionFarmWorker(params: {
  organizationId: string
  farmId: string
  name: string
  email: string
  phone?: string | null
  password: string
}): Promise<{ ok: true; email: string; password: string } | { ok: false; error: string }> {
  const setupErr = serviceRoleKeySetupError()
  if (setupErr) {
    return { ok: false, error: setupErr }
  }
  const admin = getSupabaseAdmin()
  if (!admin) {
    return {
      ok: false,
      error:
        'Could not initialize the Supabase admin client. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    }
  }

  const supabase = await createClient()
  const normalizedEmail = params.email.trim().toLowerCase()
  const name = params.name.trim()
  const phone = params.phone?.trim() || null

  const { data: authData, error: createErr } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password: params.password,
    email_confirm: true,
    user_metadata: { name },
  })

  if (createErr || !authData.user) {
    const msg = createErr?.message ?? 'Failed to create worker account.'
    if (/already|registered|exists|duplicate/i.test(msg)) {
      return { ok: false, error: 'An account with this email already exists.' }
    }
    return { ok: false, error: msg }
  }

  const userId = authData.user.id

  const { error: insUser } = await admin.from('users').insert({
    id: userId,
    email: normalizedEmail,
    name,
    phone,
    role: 'FARM_USER',
    status: 'ACTIVE',
    organization_id: params.organizationId,
  })

  if (insUser) {
    await admin.auth.admin.deleteUser(userId)
    return {
      ok: false,
      error: insUser.message ?? 'Failed to create user profile for the worker.',
    }
  }

  const { error: fuErr } = await supabase.from('farm_users').insert({
    user_id: userId,
    farm_id: params.farmId,
  })

  if (fuErr) {
    await admin.from('users').delete().eq('id', userId)
    await admin.auth.admin.deleteUser(userId)
    return {
      ok: false,
      error: fuErr.message ?? 'Failed to assign the worker to this farm.',
    }
  }

  revalidatePath('/admin/farms')
  revalidatePath(`/admin/farms/${params.farmId}`)
  revalidatePath('/admin')
  return { ok: true, email: normalizedEmail, password: params.password }
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createFarmAction(data: CreateFarmData): Promise<CreateFarmResult> {
  if (data.createWorker) {
    const email = data.workerEmail?.trim().toLowerCase()
    const hasWorker =
      Boolean(data.workerName?.trim()) &&
      Boolean(email) &&
      Boolean(data.workerPassword && data.workerPassword.length >= 8)

    if (hasWorker) {
      const setupErr = serviceRoleKeySetupError()
      if (setupErr) {
        return { error: `${setupErr} Or turn off worker creation and add a worker later from the farm page.` }
      }
      const admin = getSupabaseAdmin()
      if (!admin) {
        return {
          error:
            'Could not initialize the Supabase admin client. Check your environment variables and restart.',
        }
      }
      const { data: existing } = await admin
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle()
      if (existing) {
        return {
          error:
            'An account with this worker email already exists. Use a different email or turn off worker creation for now.',
        }
      }
    }
  }

  const supabase = await createClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('max_farms')
    .eq('id', data.organization_id)
    .single()

  const { count: currentCount } = await supabase
    .from('farms')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', data.organization_id)

  if (org && currentCount !== null && currentCount >= org.max_farms) {
    return {
      error: `Farm limit reached. Your plan allows a maximum of ${org.max_farms} farm${org.max_farms === 1 ? '' : 's'}. Please upgrade your plan.`,
    }
  }

  const { data: farm, error } = await supabase
    .from('farms')
    .insert({
      name: data.name.trim(),
      location: data.location?.trim() || null,
      status: data.status,
      organization_id: data.organization_id,
    })
    .select('id')
    .single()

  if (error || !farm) {
    return { error: error?.message ?? 'Failed to create farm. Please try again.' }
  }

  await seedDefaultEggCategoriesForFarm(farm.id)

  revalidatePath('/admin/farms')
  revalidatePath('/admin')

  if (!data.createWorker) {
    return { id: farm.id }
  }

  const name = data.workerName?.trim()
  const email = data.workerEmail?.trim()
  const password = data.workerPassword

  if (!name || !email || !password) {
    return {
      partial: true,
      farmId: farm.id,
      error: 'Farm was created, but worker details were missing. Add a worker from the farm page.',
    }
  }

  const worker = await provisionFarmWorker({
    organizationId: data.organization_id,
    farmId: farm.id,
    name,
    email,
    phone: data.workerPhone,
    password,
  })

  if (!worker.ok) {
    return { partial: true, farmId: farm.id, error: worker.error }
  }

  return {
    id: farm.id,
    worker: { email: worker.email, password: worker.password },
  }
}

// ─── Add worker to existing farm ─────────────────────────────────────────────

export async function addWorkerToFarmAction(
  farmId: string,
  data: {
    name: string
    email: string
    phone?: string
    password: string
  }
): Promise<AddFarmWorkerResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be signed in to add a worker.' }
  }

  const { data: adminRow, error: adminErr } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (adminErr || !adminRow?.organization_id) {
    return { error: 'Could not verify your account.' }
  }

  if (adminRow.role !== 'ADMIN') {
    return { error: 'Only organization admins can add farm workers.' }
  }

  const { data: farm, error: farmErr } = await supabase
    .from('farms')
    .select('id, organization_id')
    .eq('id', farmId)
    .single()

  if (farmErr || !farm || farm.organization_id !== adminRow.organization_id) {
    return { error: 'Farm not found or you do not have access to it.' }
  }

  const setupErr = serviceRoleKeySetupError()
  if (setupErr) {
    return { error: setupErr }
  }
  const admin = getSupabaseAdmin()
  if (!admin) {
    return {
      error:
        'Could not initialize the Supabase admin client. Check your environment variables and restart.',
    }
  }

  const normalizedEmail = data.email.trim().toLowerCase()
  const { data: existing } = await admin
    .from('users')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existing) {
    return { error: 'An account with this email already exists.' }
  }

  const worker = await provisionFarmWorker({
    organizationId: farm.organization_id,
    farmId: farm.id,
    name: data.name.trim(),
    email: normalizedEmail,
    phone: data.phone?.trim() || null,
    password: data.password,
  })

  if (!worker.ok) {
    return { error: worker.error }
  }

  return { worker: { email: worker.email, password: worker.password } }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateFarmAction(
  farmId: string,
  data: { name: string; location?: string; status: string }
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('farms')
    .update({
      name: data.name.trim(),
      location: data.location?.trim() || null,
      status: data.status,
    })
    .eq('id', farmId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/farms')
  revalidatePath(`/admin/farms/${farmId}`)
  revalidatePath('/admin')
  return { success: true }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteFarmAction(
  farmId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()

  const { error } = await supabase.from('farms').delete().eq('id', farmId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/farms')
  revalidatePath('/admin')
  return { success: true }
}
