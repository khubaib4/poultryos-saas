'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkEntryExists } from '@/lib/queries/daily-entries'
import type { DeathCause } from '@/types/database'

function eggTotal(data: {
  eggs_grade_a: number
  eggs_grade_b: number
  eggs_cracked: number
}) {
  return data.eggs_grade_a + data.eggs_grade_b + data.eggs_cracked
}

async function assertFlockOnFarm(
  supabase: Awaited<ReturnType<typeof createClient>>,
  flockId: string,
  farmId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('flocks')
    .select('id')
    .eq('id', flockId)
    .eq('farm_id', farmId)
    .maybeSingle()
  return Boolean(data)
}

export async function checkDailyEntryExistsAction(
  flockId: string,
  date: string,
  excludeEntryId?: string
): Promise<boolean> {
  return checkEntryExists(flockId, date, excludeEntryId)
}

export type DailyEntryFormPayload = {
  farm_id: string
  flock_id: string
  date: string
  eggs_grade_a: number
  eggs_grade_b: number
  eggs_cracked: number
  deaths: number
  death_cause: DeathCause | null
  feed_consumed: number | null
  notes?: string | null
}

export async function createDailyEntryAction(
  data: DailyEntryFormPayload
): Promise<{ error: string } | { id: string }> {
  const supabase = await createClient()

  const onFarm = await assertFlockOnFarm(supabase, data.flock_id, data.farm_id)
  if (!onFarm) {
    return { error: 'Flock not found on this farm.' }
  }

  const exists = await checkEntryExists(data.flock_id, data.date)
  if (exists) {
    return {
      error: 'An entry already exists for this flock on this date.',
    }
  }

  const { data: flock } = await supabase
    .from('flocks')
    .select('current_count')
    .eq('id', data.flock_id)
    .single()

  const current = flock?.current_count ?? 0
  if (data.deaths > current) {
    return { error: 'Deaths cannot exceed the flock’s current bird count.' }
  }

  const eggs_collected = eggTotal(data)
  const death_cause =
    data.deaths > 0 ? data.death_cause : null

  if (data.deaths > 0 && !death_cause) {
    return { error: 'Select a death cause when recording deaths.' }
  }

  const { data: row, error } = await supabase
    .from('daily_entries')
    .insert({
      farm_id: data.farm_id,
      flock_id: data.flock_id,
      date: data.date,
      eggs_collected,
      eggs_grade_a: data.eggs_grade_a,
      eggs_grade_b: data.eggs_grade_b,
      eggs_cracked: data.eggs_cracked,
      deaths: data.deaths,
      death_cause,
      feed_consumed: data.feed_consumed,
      notes: data.notes?.trim() || null,
    })
    .select('id')
    .single()

  if (error || !row) {
    return {
      error:
        error?.message ??
        'Failed to save entry. If egg grade columns are missing, run supabase-daily-entries-columns.sql.',
    }
  }

  if (data.deaths > 0) {
    const { error: flockErr } = await supabase
      .from('flocks')
      .update({ current_count: current - data.deaths })
      .eq('id', data.flock_id)

    if (flockErr) {
      await supabase.from('daily_entries').delete().eq('id', row.id)
      return { error: flockErr.message }
    }
  }

  revalidateDailyEntryPaths(data.farm_id, data.flock_id)
  return { id: row.id }
}

export async function updateDailyEntryAction(
  entryId: string,
  data: DailyEntryFormPayload
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()

  const { data: existing, error: fetchErr } = await supabase
    .from('daily_entries')
    .select('id, flock_id, date, deaths')
    .eq('id', entryId)
    .single()

  if (fetchErr || !existing) {
    return { error: 'Entry not found.' }
  }

  const onFarm = await assertFlockOnFarm(supabase, data.flock_id, data.farm_id)
  if (!onFarm) {
    return { error: 'Flock not found on this farm.' }
  }

  const duplicate = await checkEntryExists(
    data.flock_id,
    data.date,
    entryId
  )
  if (duplicate) {
    return {
      error: 'Another entry already exists for this flock on this date.',
    }
  }

  const oldFlockId = existing.flock_id
  const oldDeaths = existing.deaths ?? 0
  const newFlockId = data.flock_id
  const newDeaths = data.deaths

  if (oldFlockId !== newFlockId) {
    const oldOnFarm = await assertFlockOnFarm(
      supabase,
      oldFlockId,
      data.farm_id
    )
    if (!oldOnFarm) {
      return { error: 'Original flock not found on this farm.' }
    }
  }

  const { data: newFlockRow } = await supabase
    .from('flocks')
    .select('current_count')
    .eq('id', newFlockId)
    .single()

  const newFlockCount = newFlockRow?.current_count ?? 0

  if (oldFlockId === newFlockId) {
    const deathDelta = newDeaths - oldDeaths
    const projected = newFlockCount - deathDelta
    if (projected < 0) {
      return {
        error:
          'This update would make the flock count negative. Check death totals.',
      }
    }
  } else {
    if (newDeaths > newFlockCount) {
      return {
        error: 'Deaths cannot exceed the selected flock’s current bird count.',
      }
    }
  }

  const eggs_collected = eggTotal(data)
  const death_cause =
    data.deaths > 0 ? data.death_cause : null

  if (data.deaths > 0 && !death_cause) {
    return { error: 'Select a death cause when recording deaths.' }
  }

  const { error } = await supabase
    .from('daily_entries')
    .update({
      farm_id: data.farm_id,
      flock_id: data.flock_id,
      date: data.date,
      eggs_collected,
      eggs_grade_a: data.eggs_grade_a,
      eggs_grade_b: data.eggs_grade_b,
      eggs_cracked: data.eggs_cracked,
      deaths: data.deaths,
      death_cause,
      feed_consumed: data.feed_consumed,
      notes: data.notes?.trim() || null,
    })
    .eq('id', entryId)

  if (error) {
    return {
      error:
        error.message ??
        'Failed to update entry. If egg grade columns are missing, run supabase-daily-entries-columns.sql.',
    }
  }

  if (oldFlockId === newFlockId) {
    const deathDelta = newDeaths - oldDeaths
    if (deathDelta !== 0) {
      const projected = newFlockCount - deathDelta
      const { error: flockErr } = await supabase
        .from('flocks')
        .update({ current_count: projected })
        .eq('id', newFlockId)

      if (flockErr) {
        return { error: flockErr.message }
      }
    }
  } else if (oldDeaths > 0 || newDeaths > 0) {
    const { data: oldFlockRow } = await supabase
      .from('flocks')
      .select('current_count')
      .eq('id', oldFlockId)
      .single()

    const oldFlockCount = oldFlockRow?.current_count ?? 0

    if (oldDeaths > 0) {
      const { error: e1 } = await supabase
        .from('flocks')
        .update({ current_count: oldFlockCount + oldDeaths })
        .eq('id', oldFlockId)
      if (e1) return { error: e1.message }
    }

    if (newDeaths > 0) {
      const { error: e2 } = await supabase
        .from('flocks')
        .update({ current_count: newFlockCount - newDeaths })
        .eq('id', newFlockId)
      if (e2) return { error: e2.message }
    }
  }

  revalidateDailyEntryPaths(data.farm_id, data.flock_id, { entryId })
  if (existing.flock_id !== data.flock_id) {
    revalidateDailyEntryPaths(data.farm_id, existing.flock_id, { entryId })
  }
  return { success: true }
}

export async function deleteDailyEntryAction(
  entryId: string,
  farmId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()

  const { data: existing, error: fetchErr } = await supabase
    .from('daily_entries')
    .select('id, flock_id, deaths')
    .eq('id', entryId)
    .single()

  if (fetchErr || !existing) {
    return { error: 'Entry not found.' }
  }

  const onFarm = await assertFlockOnFarm(
    supabase,
    existing.flock_id,
    farmId
  )
  if (!onFarm) {
    return { error: 'Entry not found on this farm.' }
  }

  const deaths = existing.deaths ?? 0

  const { error } = await supabase
    .from('daily_entries')
    .delete()
    .eq('id', entryId)

  if (error) {
    return { error: error.message }
  }

  if (deaths > 0) {
    const { data: flock } = await supabase
      .from('flocks')
      .select('current_count')
      .eq('id', existing.flock_id)
      .single()

    const current = flock?.current_count ?? 0
    await supabase
      .from('flocks')
      .update({ current_count: current + deaths })
      .eq('id', existing.flock_id)
  }

  revalidateDailyEntryPaths(farmId, existing.flock_id, { entryId })
  return { success: true }
}

function revalidateDailyEntryPaths(
  farmId: string,
  flockId: string,
  options?: { entryId?: string }
) {
  revalidatePath(`/admin/farms/${farmId}/daily-entry`)
  revalidatePath(`/admin/farms/${farmId}/daily-entry/new`)
  if (options?.entryId) {
    revalidatePath(
      `/admin/farms/${farmId}/daily-entry/${options.entryId}/edit`
    )
  }
  revalidatePath(`/admin/farms/${farmId}`)
  revalidatePath(`/admin/farms/${farmId}/flocks/${flockId}`)
  revalidatePath(`/admin/farms/${farmId}/flocks`)

  revalidatePath('/farm')
  revalidatePath('/farm/daily-entry')
  revalidatePath('/farm/daily-entry/new')
  if (options?.entryId) {
    revalidatePath(`/farm/daily-entry/${options.entryId}/edit`)
  }
  revalidatePath('/farm/flocks')
}
