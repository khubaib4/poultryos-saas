'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isFarmAssignedToUser } from '@/lib/queries/farm-user'
import type { CustomerCategory } from '@/types/database'

async function getAuthedUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

function revalidateCustomerPaths(farmId: string, customerId?: string) {
  revalidatePath('/farm/customers')
  revalidatePath('/farm/customers/new')
  if (customerId) {
    revalidatePath(`/farm/customers/${customerId}`)
    revalidatePath(`/farm/customers/${customerId}/edit`)
  }
  revalidatePath('/farm')
}

export type CustomerFormPayload = {
  farm_id: string
  name: string
  phone?: string | null
  business_name?: string | null
  address?: string | null
  category: CustomerCategory | string
  notes?: string | null
  is_active?: boolean
}

export async function createCustomerAction(
  data: CustomerFormPayload
): Promise<{ error: string } | { id: string }> {
  const userId = await getAuthedUserId()
  if (!userId) {
    return { error: 'You must be signed in.' }
  }

  const ok = await isFarmAssignedToUser(userId, data.farm_id)
  if (!ok) {
    return { error: 'You do not have access to this farm.' }
  }

  const supabase = await createClient()

  const { data: row, error } = await supabase
    .from('customers')
    .insert({
      farm_id: data.farm_id,
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      business_name: data.business_name?.trim() || null,
      address: data.address?.trim() || null,
      category: data.category || 'Individual',
      is_active: data.is_active ?? true,
      notes: data.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !row) {
    return { error: error?.message ?? 'Failed to create customer.' }
  }

  revalidateCustomerPaths(data.farm_id, row.id)
  return { id: row.id }
}

export async function updateCustomerAction(
  customerId: string,
  data: CustomerFormPayload
): Promise<{ error: string } | { success: true }> {
  const userId = await getAuthedUserId()
  if (!userId) {
    return { error: 'You must be signed in.' }
  }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('customers')
    .select('id, farm_id')
    .eq('id', customerId)
    .single()

  if (!existing || existing.farm_id !== data.farm_id) {
    return { error: 'Customer not found.' }
  }

  const ok = await isFarmAssignedToUser(userId, data.farm_id)
  if (!ok) {
    return { error: 'You do not have access to this farm.' }
  }

  const { error } = await supabase
    .from('customers')
    .update({
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      business_name: data.business_name?.trim() || null,
      address: data.address?.trim() || null,
      category: data.category || 'Individual',
      is_active: data.is_active ?? true,
      notes: data.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId)

  if (error) {
    return { error: error.message }
  }

  revalidateCustomerPaths(data.farm_id, customerId)
  return { success: true }
}

export async function deleteCustomerAction(
  customerId: string,
  farmId: string
): Promise<{ error: string } | { success: true }> {
  const userId = await getAuthedUserId()
  if (!userId) {
    return { error: 'You must be signed in.' }
  }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('customers')
    .select('id, farm_id')
    .eq('id', customerId)
    .single()

  if (!existing || existing.farm_id !== farmId) {
    return { error: 'Customer not found.' }
  }

  const ok = await isFarmAssignedToUser(userId, farmId)
  if (!ok) {
    return { error: 'You do not have access to this farm.' }
  }

  const { error } = await supabase.from('customers').delete().eq('id', customerId)

  if (error) {
    return { error: error.message }
  }

  revalidateCustomerPaths(farmId)
  return { success: true }
}
