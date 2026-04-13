'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireFarmWorkerForFarm } from '@/lib/server/require-farm-worker'
import { seedDefaultEggCategoriesForFarm } from '@/lib/egg-categories/seed-defaults'
import { getEggCategories } from '@/lib/queries/egg-categories'
import { isFarmAssignedToUser } from '@/lib/queries/farm-user'

async function getAuthedUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

/** Active egg categories for the sales form (same access as creating a sale). */
export async function listEggCategoriesForSaleAction(farmId: string): Promise<
  | { error: string }
  | { categories: Array<{ id: string; name: string; default_price: number }> }
> {
  const userId = await getAuthedUserId()
  if (!userId) return { error: 'You must be signed in.' }

  const ok = await isFarmAssignedToUser(userId, farmId)
  if (!ok) return { error: 'You do not have access to this farm.' }

  const rows = await getEggCategories(farmId)
  return {
    categories: rows.map((c) => ({
      id: c.id,
      name: c.name,
      default_price: c.default_price,
    })),
  }
}

function revalidateEggCategoryPaths(farmId: string) {
  revalidatePath('/farm/settings')
  revalidatePath('/farm/sales')
  revalidatePath('/farm/sales/new')
  revalidatePath('/farm', 'layout')
}

export async function createEggCategoryAction(data: {
  farm_id: string
  name: string
  description?: string | null
  default_price: number
}): Promise<{ error: string } | { id: string }> {
  const gate = await requireFarmWorkerForFarm(data.farm_id, {
    adminBlockedMessage:
      'Egg categories are managed by farm workers in Farm → Settings.',
  })
  if ('error' in gate) return gate

  const supabase = await createClient()
  const { data: maxRow } = await supabase
    .from('egg_categories')
    .select('sort_order')
    .eq('farm_id', data.farm_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = (maxRow?.sort_order as number | undefined) ?? -1
  const sort_order = nextOrder + 1

  const { data: row, error } = await supabase
    .from('egg_categories')
    .insert({
      farm_id: data.farm_id,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      default_price: data.default_price,
      sort_order,
      is_active: true,
    })
    .select('id')
    .single()

  if (error || !row) {
    if (error?.code === '23505' || error?.message.includes('duplicate')) {
      return { error: 'A category with this name already exists for this farm.' }
    }
    return { error: error?.message ?? 'Failed to create category.' }
  }

  revalidateEggCategoryPaths(data.farm_id)
  return { id: row.id as string }
}

export async function updateEggCategoryAction(
  id: string,
  data: {
    name?: string
    description?: string | null
    default_price?: number
    is_active?: boolean
  }
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { data: existing, error: fetchErr } = await supabase
    .from('egg_categories')
    .select('farm_id')
    .eq('id', id)
    .single()

  if (fetchErr || !existing) return { error: 'Category not found.' }

  const gate = await requireFarmWorkerForFarm(existing.farm_id as string, {
    adminBlockedMessage:
      'Egg categories are managed by farm workers in Farm → Settings.',
  })
  if ('error' in gate) return gate

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.name !== undefined) patch.name = data.name.trim()
  if (data.description !== undefined) patch.description = data.description?.trim() || null
  if (data.default_price !== undefined) patch.default_price = data.default_price
  if (data.is_active !== undefined) patch.is_active = data.is_active

  const { error } = await supabase.from('egg_categories').update(patch).eq('id', id)

  if (error) {
    if (error.code === '23505' || error.message.includes('duplicate')) {
      return { error: 'A category with this name already exists for this farm.' }
    }
    return { error: error.message }
  }

  revalidateEggCategoryPaths(existing.farm_id as string)
  return { success: true }
}

/** Soft delete: sets is_active to false. */
export async function deleteEggCategoryAction(
  id: string
): Promise<{ error: string } | { success: true }> {
  return updateEggCategoryAction(id, { is_active: false })
}

export async function reorderEggCategoriesAction(
  farmId: string,
  orderedIds: string[]
): Promise<{ error: string } | { success: true }> {
  const gate = await requireFarmWorkerForFarm(farmId, {
    adminBlockedMessage:
      'Egg categories are managed by farm workers in Farm → Settings.',
  })
  if ('error' in gate) return gate

  const supabase = await createClient()
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('egg_categories')
      .update({ sort_order: i, updated_at: new Date().toISOString() })
      .eq('id', orderedIds[i])
      .eq('farm_id', farmId)
    if (error) return { error: error.message }
  }

  revalidateEggCategoryPaths(farmId)
  return { success: true }
}

export async function seedDefaultEggCategoriesAction(
  farmId: string
): Promise<{ error: string } | { success: true }> {
  const gate = await requireFarmWorkerForFarm(farmId, {
    adminBlockedMessage:
      'Egg categories are managed by farm workers in Farm → Settings.',
  })
  if ('error' in gate) return gate

  const supabase = await createClient()
  const { count } = await supabase
    .from('egg_categories')
    .select('*', { count: 'exact', head: true })
    .eq('farm_id', farmId)
  if ((count ?? 0) > 0) {
    return { error: 'This farm already has categories. Add or edit items in the list.' }
  }

  await seedDefaultEggCategoriesForFarm(farmId)
  revalidateEggCategoryPaths(farmId)
  return { success: true }
}
