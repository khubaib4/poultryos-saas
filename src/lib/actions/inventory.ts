'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isFarmAssignedToUser } from '@/lib/queries/farm-user'

async function getAuthedUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

function roundQty(n: number): number {
  return Math.round(n * 100) / 100
}

function revalidateInventoryPaths(farmId: string, itemId?: string) {
  revalidatePath('/farm/inventory')
  revalidatePath('/farm/inventory/new')
  if (itemId) {
    revalidatePath(`/farm/inventory/${itemId}`)
    revalidatePath(`/farm/inventory/${itemId}/edit`)
  }
  revalidatePath('/farm')
}

export type InventoryFormPayload = {
  farm_id: string
  type: string
  name: string
  unit: string
  current_stock: number
  min_stock: number
  unit_price: number
  notes?: string | null
}

export async function createInventoryItemAction(
  data: InventoryFormPayload
): Promise<{ error: string } | { id: string }> {
  const userId = await getAuthedUserId()
  if (!userId) return { error: 'You must be signed in.' }

  const ok = await isFarmAssignedToUser(userId, data.farm_id)
  if (!ok) return { error: 'You do not have access to this farm.' }

  const supabase = await createClient()

  const { data: row, error } = await supabase
    .from('inventory')
    .insert({
      farm_id: data.farm_id,
      type: data.type.trim(),
      name: data.name.trim(),
      unit: data.unit.trim(),
      current_stock: roundQty(data.current_stock),
      min_stock: roundQty(data.min_stock),
      unit_price: roundQty(data.unit_price),
      notes: data.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !row) {
    return { error: error?.message ?? 'Failed to create item.' }
  }

  revalidateInventoryPaths(data.farm_id, row.id)
  return { id: row.id }
}

export async function updateInventoryItemAction(
  itemId: string,
  data: InventoryFormPayload
): Promise<{ error: string } | { success: true }> {
  const userId = await getAuthedUserId()
  if (!userId) return { error: 'You must be signed in.' }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('inventory')
    .select('id, farm_id')
    .eq('id', itemId)
    .single()

  if (!existing || existing.farm_id !== data.farm_id) {
    return { error: 'Item not found.' }
  }

  const ok = await isFarmAssignedToUser(userId, data.farm_id)
  if (!ok) return { error: 'You do not have access to this farm.' }

  const { error } = await supabase
    .from('inventory')
    .update({
      type: data.type.trim(),
      name: data.name.trim(),
      unit: data.unit.trim(),
      current_stock: roundQty(data.current_stock),
      min_stock: roundQty(data.min_stock),
      unit_price: roundQty(data.unit_price),
      notes: data.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)

  if (error) return { error: error.message }

  revalidateInventoryPaths(data.farm_id, itemId)
  return { success: true }
}

export async function deleteInventoryItemAction(
  itemId: string,
  farmId: string
): Promise<{ error: string } | { success: true }> {
  const userId = await getAuthedUserId()
  if (!userId) return { error: 'You must be signed in.' }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('inventory')
    .select('id, farm_id')
    .eq('id', itemId)
    .single()

  if (!existing || existing.farm_id !== farmId) {
    return { error: 'Item not found.' }
  }

  const ok = await isFarmAssignedToUser(userId, farmId)
  if (!ok) return { error: 'You do not have access to this farm.' }

  const { error } = await supabase.from('inventory').delete().eq('id', itemId)
  if (error) return { error: error.message }

  revalidateInventoryPaths(farmId)
  return { success: true }
}

export async function addStockAction(
  itemId: string,
  farmId: string,
  quantity: number,
  reason?: string | null
): Promise<{ error: string } | { success: true }> {
  const userId = await getAuthedUserId()
  if (!userId) return { error: 'You must be signed in.' }

  const qty = roundQty(quantity)
  if (qty <= 0) return { error: 'Quantity must be greater than zero.' }

  const supabase = await createClient()
  const { data: item } = await supabase
    .from('inventory')
    .select('id, farm_id, current_stock')
    .eq('id', itemId)
    .single()

  if (!item || item.farm_id !== farmId) {
    return { error: 'Item not found.' }
  }

  const ok = await isFarmAssignedToUser(userId, farmId)
  if (!ok) return { error: 'You do not have access to this farm.' }

  const newStock = roundQty(Number(item.current_stock ?? 0) + qty)

  const { error: txErr } = await supabase.from('inventory_transactions').insert({
    inventory_id: itemId,
    type: 'add',
    quantity: qty,
    reason: reason?.trim() || null,
    transaction_date: new Date().toISOString(),
    created_by: userId,
  })

  if (txErr) return { error: txErr.message }

  const { error: upErr } = await supabase
    .from('inventory')
    .update({
      current_stock: newStock,
      last_restocked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)

  if (upErr) return { error: upErr.message }

  revalidateInventoryPaths(farmId, itemId)
  return { success: true }
}

export async function reduceStockAction(
  itemId: string,
  farmId: string,
  quantity: number,
  reason: string
): Promise<{ error: string } | { success: true }> {
  const userId = await getAuthedUserId()
  if (!userId) return { error: 'You must be signed in.' }

  const reasonTrim = reason?.trim()
  if (!reasonTrim) return { error: 'Reason is required.' }

  const qty = roundQty(quantity)
  if (qty <= 0) return { error: 'Quantity must be greater than zero.' }

  const supabase = await createClient()
  const { data: item } = await supabase
    .from('inventory')
    .select('id, farm_id, current_stock')
    .eq('id', itemId)
    .single()

  if (!item || item.farm_id !== farmId) {
    return { error: 'Item not found.' }
  }

  const ok = await isFarmAssignedToUser(userId, farmId)
  if (!ok) return { error: 'You do not have access to this farm.' }

  const current = roundQty(Number(item.current_stock ?? 0))
  if (qty > current) {
    return { error: 'Quantity cannot exceed current stock.' }
  }

  const newStock = roundQty(current - qty)

  const { error: txErr } = await supabase.from('inventory_transactions').insert({
    inventory_id: itemId,
    type: 'reduce',
    quantity: qty,
    reason: reasonTrim,
    transaction_date: new Date().toISOString(),
    created_by: userId,
  })

  if (txErr) return { error: txErr.message }

  const { error: upErr } = await supabase
    .from('inventory')
    .update({
      current_stock: newStock,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)

  if (upErr) return { error: upErr.message }

  revalidateInventoryPaths(farmId, itemId)
  return { success: true }
}
