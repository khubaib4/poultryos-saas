'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireFarmWorkerForFarm } from '@/lib/server/require-farm-worker'
import type { FlockStatus } from '@/types/database'

function revalidateFlockPaths(farmId: string, flockId?: string) {
  revalidatePath(`/admin/farms/${farmId}`)
  revalidatePath(`/admin/farms/${farmId}/flocks`)
  revalidatePath('/admin/farms')
  revalidatePath('/admin')
  revalidatePath('/farm/flocks')
  revalidatePath('/farm', 'layout')
  if (flockId) {
    revalidatePath(`/admin/farms/${farmId}/flocks/${flockId}`)
    revalidatePath(`/farm/flocks/${flockId}`)
  }
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createFlockAction(data: {
  farm_id: string
  batch_number: string
  breed: string
  initial_count: number
  age_at_arrival: number
  arrival_date: string
  notes?: string
}): Promise<{ error: string } | { id: string }> {
  const gate = await requireFarmWorkerForFarm(data.farm_id, {
    adminBlockedMessage:
      'Flocks are created and updated by farm workers from the Farm portal. Admins can view flock data on the farm overview and in reports.',
  })
  if ('error' in gate) return gate

  const supabase = await createClient()

  const { data: flock, error } = await supabase
    .from('flocks')
    .insert({
      farm_id: data.farm_id,
      batch_number: data.batch_number.trim(),
      breed: data.breed.trim(),
      initial_count: data.initial_count,
      current_count: data.initial_count,
      age_at_arrival: data.age_at_arrival,
      arrival_date: data.arrival_date,
      status: 'active' satisfies FlockStatus,
      notes: data.notes?.trim() || null,
    })
    .select('id')
    .single()

  if (error || !flock) {
    return { error: error?.message ?? 'Failed to create flock. Please try again.' }
  }

  revalidateFlockPaths(data.farm_id, flock.id)
  return { id: flock.id }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateFlockAction(
  flockId: string,
  data: {
    batch_number: string
    breed: string
    initial_count: number
    current_count: number
    age_at_arrival: number
    arrival_date: string
    status: FlockStatus
    notes?: string
  }
): Promise<{ error: string } | { success: true; farm_id: string }> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('flocks')
    .select('farm_id')
    .eq('id', flockId)
    .single()

  if (!existing) return { error: 'Flock not found.' }

  const gate = await requireFarmWorkerForFarm(existing.farm_id, {
    adminBlockedMessage:
      'Flocks are created and updated by farm workers from the Farm portal. Admins can view flock data on the farm overview and in reports.',
  })
  if ('error' in gate) return gate

  const { error } = await supabase
    .from('flocks')
    .update({
      batch_number: data.batch_number.trim(),
      breed: data.breed.trim(),
      initial_count: data.initial_count,
      current_count: data.current_count,
      age_at_arrival: data.age_at_arrival,
      arrival_date: data.arrival_date,
      status: data.status,
      notes: data.notes?.trim() || null,
    })
    .eq('id', flockId)

  if (error) {
    return { error: error.message }
  }

  revalidateFlockPaths(existing.farm_id, flockId)
  return { success: true, farm_id: existing.farm_id }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteFlockAction(
  flockId: string
): Promise<{ error: string } | { success: true; farm_id: string }> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('flocks')
    .select('farm_id')
    .eq('id', flockId)
    .single()

  if (!existing) return { error: 'Flock not found.' }

  const gate = await requireFarmWorkerForFarm(existing.farm_id, {
    adminBlockedMessage:
      'Flocks are created and updated by farm workers from the Farm portal. Admins can view flock data on the farm overview and in reports.',
  })
  if ('error' in gate) return gate

  const { error } = await supabase.from('flocks').delete().eq('id', flockId)

  if (error) {
    return { error: error.message }
  }

  revalidateFlockPaths(existing.farm_id)
  return { success: true, farm_id: existing.farm_id }
}
