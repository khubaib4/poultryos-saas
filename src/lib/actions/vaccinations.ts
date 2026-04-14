'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isFarmAssignedToUser } from '@/lib/queries/farm-user'
import { reduceStockAction } from '@/lib/actions/inventory'

async function getAuthedUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

function revalidateVaccinationPaths(farmId: string, vaccinationId?: string) {
  revalidatePath('/farm/vaccinations')
  revalidatePath('/farm/vaccinations/new')
  if (vaccinationId) {
    revalidatePath(`/farm/vaccinations/${vaccinationId}`)
    revalidatePath(`/farm/vaccinations/${vaccinationId}/edit`)
  }
  revalidatePath('/farm')
}

export type VaccinationFormPayload = {
  farm_id: string
  flock_id: string
  vaccine_name: string
  scheduled_date: string
  dosage?: string | null
  method?: string | null
  administered_by?: string | null
  notes?: string | null
}

async function assertFlockOnFarm(
  flockId: string,
  farmId: string
): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('flocks')
    .select('id, farm_id')
    .eq('id', flockId)
    .maybeSingle()
  return Boolean(data && data.farm_id === farmId)
}

export async function createVaccinationAction(
  data: VaccinationFormPayload
): Promise<{ error: string } | { id: string }> {
  const userId = await getAuthedUserId()
  if (!userId) return { error: 'You must be signed in.' }

  const ok = await isFarmAssignedToUser(userId, data.farm_id)
  if (!ok) return { error: 'You do not have access to this farm.' }

  const flockOk = await assertFlockOnFarm(data.flock_id, data.farm_id)
  if (!flockOk) return { error: 'Invalid flock for this farm.' }

  const supabase = await createClient()

  const { data: row, error } = await supabase
    .from('vaccinations')
    .insert({
      farm_id: data.farm_id,
      flock_id: data.flock_id,
      vaccine_name: data.vaccine_name.trim(),
      scheduled_date: data.scheduled_date.slice(0, 10),
      status: 'scheduled',
      dosage: data.dosage?.trim() || null,
      method: data.method?.trim() || null,
      administered_by: data.administered_by?.trim() || null,
      notes: data.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !row) {
    return { error: error?.message ?? 'Failed to schedule vaccination.' }
  }

  revalidateVaccinationPaths(data.farm_id, row.id)
  return { id: row.id }
}

export async function updateVaccinationAction(
  vaccinationId: string,
  data: VaccinationFormPayload
): Promise<{ error: string } | { success: true }> {
  const userId = await getAuthedUserId()
  if (!userId) return { error: 'You must be signed in.' }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('vaccinations')
    .select('id, farm_id, status')
    .eq('id', vaccinationId)
    .maybeSingle()

  if (!existing || existing.farm_id !== data.farm_id) {
    return { error: 'Vaccination not found.' }
  }

  if (existing.status !== 'scheduled') {
    return { error: 'Only scheduled vaccinations can be edited.' }
  }

  const ok = await isFarmAssignedToUser(userId, data.farm_id)
  if (!ok) return { error: 'You do not have access to this farm.' }

  const flockOk = await assertFlockOnFarm(data.flock_id, data.farm_id)
  if (!flockOk) return { error: 'Invalid flock for this farm.' }

  const { error } = await supabase
    .from('vaccinations')
    .update({
      flock_id: data.flock_id,
      vaccine_name: data.vaccine_name.trim(),
      scheduled_date: data.scheduled_date.slice(0, 10),
      dosage: data.dosage?.trim() || null,
      method: data.method?.trim() || null,
      administered_by: data.administered_by?.trim() || null,
      notes: data.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', vaccinationId)

  if (error) return { error: error.message }

  revalidateVaccinationPaths(data.farm_id, vaccinationId)
  return { success: true }
}

export async function deleteVaccinationAction(
  vaccinationId: string,
  farmId: string
): Promise<{ error: string } | { success: true }> {
  const userId = await getAuthedUserId()
  if (!userId) return { error: 'You must be signed in.' }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('vaccinations')
    .select('id, farm_id')
    .eq('id', vaccinationId)
    .maybeSingle()

  if (!existing || existing.farm_id !== farmId) {
    return { error: 'Vaccination not found.' }
  }

  const ok = await isFarmAssignedToUser(userId, farmId)
  if (!ok) return { error: 'You do not have access to this farm.' }

  const { error } = await supabase
    .from('vaccinations')
    .delete()
    .eq('id', vaccinationId)

  if (error) return { error: error.message }

  revalidateVaccinationPaths(farmId)
  return { success: true }
}

export type MarkCompletedPayload = {
  completed_date: string
  administered_by?: string | null
  batch_number?: string | null
  notes?: string | null
  /** Optional: deduct from vaccine inventory */
  inventory_id?: string | null
  quantity_used?: number | null
}

export async function markCompletedAction(
  vaccinationId: string,
  farmId: string,
  payload: MarkCompletedPayload
): Promise<{ error: string } | { success: true }> {
  const userId = await getAuthedUserId()
  if (!userId) return { error: 'You must be signed in.' }

  const completed = payload.completed_date.slice(0, 10)
  if (!completed) return { error: 'Completed date is required.' }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('vaccinations')
    .select('id, farm_id, status')
    .eq('id', vaccinationId)
    .maybeSingle()

  if (!existing || existing.farm_id !== farmId) {
    return { error: 'Vaccination not found.' }
  }

  if (existing.status !== 'scheduled') {
    return { error: 'Only scheduled vaccinations can be completed.' }
  }

  const ok = await isFarmAssignedToUser(userId, farmId)
  if (!ok) return { error: 'You do not have access to this farm.' }

  const qty = payload.quantity_used != null ? Number(payload.quantity_used) : null
  const invId = payload.inventory_id?.trim() || null

  if (invId && qty != null && qty > 0) {
    const reduce = await reduceStockAction(
      invId,
      farmId,
      qty,
      'Vaccination use'
    )
    if ('error' in reduce) return reduce
  }

  const { error } = await supabase
    .from('vaccinations')
    .update({
      status: 'completed',
      completed_date: completed,
      administered_by: payload.administered_by?.trim() || null,
      batch_number: payload.batch_number?.trim() || null,
      notes: payload.notes?.trim() || null,
      skipped_reason: null,
      inventory_id: invId,
      quantity_used: qty != null && qty > 0 ? qty : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', vaccinationId)

  if (error) return { error: error.message }

  revalidateVaccinationPaths(farmId, vaccinationId)
  return { success: true }
}

export async function markSkippedAction(
  vaccinationId: string,
  farmId: string,
  reason: string
): Promise<{ error: string } | { success: true }> {
  const userId = await getAuthedUserId()
  if (!userId) return { error: 'You must be signed in.' }

  const r = reason?.trim()
  if (!r) return { error: 'Reason is required.' }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('vaccinations')
    .select('id, farm_id, status')
    .eq('id', vaccinationId)
    .maybeSingle()

  if (!existing || existing.farm_id !== farmId) {
    return { error: 'Vaccination not found.' }
  }

  if (existing.status !== 'scheduled') {
    return { error: 'Only scheduled vaccinations can be skipped.' }
  }

  const ok = await isFarmAssignedToUser(userId, farmId)
  if (!ok) return { error: 'You do not have access to this farm.' }

  const { error } = await supabase
    .from('vaccinations')
    .update({
      status: 'skipped',
      skipped_reason: r,
      completed_date: null,
      administered_by: null,
      batch_number: null,
      inventory_id: null,
      quantity_used: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', vaccinationId)

  if (error) return { error: error.message }

  revalidateVaccinationPaths(farmId, vaccinationId)
  return { success: true }
}
