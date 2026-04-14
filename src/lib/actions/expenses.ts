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

function revalidateExpensePaths(farmId: string, expenseId?: string) {
  revalidatePath('/farm/expenses')
  revalidatePath('/farm/expenses/new')
  if (expenseId) {
    revalidatePath(`/farm/expenses/${expenseId}`)
    revalidatePath(`/farm/expenses/${expenseId}/edit`)
  }
  revalidatePath('/farm')
}

export type ExpenseFormPayload = {
  farm_id: string
  category: string
  amount: number
  expense_date: string
  description: string
  vendor?: string | null
  payment_method: string
  reference?: string | null
  notes?: string | null
}

export async function createExpenseAction(
  data: ExpenseFormPayload
): Promise<{ error: string } | { id: string }> {
  const userId = await getAuthedUserId()
  if (!userId) return { error: 'You must be signed in.' }

  const ok = await isFarmAssignedToUser(userId, data.farm_id)
  if (!ok) return { error: 'You do not have access to this farm.' }

  const supabase = await createClient()

  const { data: row, error } = await supabase
    .from('expenses')
    .insert({
      farm_id: data.farm_id,
      category: data.category.trim(),
      amount: data.amount,
      expense_date: data.expense_date,
      date: data.expense_date,
      description: data.description.trim(),
      vendor: data.vendor?.trim() || null,
      payment_method:
        data.payment_method === 'pending'
          ? 'pending'
          : data.payment_method || 'cash',
      reference: data.reference?.trim() || null,
      notes: data.notes?.trim() || null,
    })
    .select('id')
    .single()

  if (error || !row) {
    return { error: error?.message ?? 'Failed to create expense.' }
  }

  revalidateExpensePaths(data.farm_id, row.id)
  return { id: row.id }
}

export async function updateExpenseAction(
  expenseId: string,
  data: ExpenseFormPayload
): Promise<{ error: string } | { success: true }> {
  const userId = await getAuthedUserId()
  if (!userId) return { error: 'You must be signed in.' }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('expenses')
    .select('id, farm_id')
    .eq('id', expenseId)
    .single()

  if (!existing || existing.farm_id !== data.farm_id) {
    return { error: 'Expense not found.' }
  }

  const ok = await isFarmAssignedToUser(userId, data.farm_id)
  if (!ok) return { error: 'You do not have access to this farm.' }

  const { error } = await supabase
    .from('expenses')
    .update({
      category: data.category.trim(),
      amount: data.amount,
      expense_date: data.expense_date,
      date: data.expense_date,
      description: data.description.trim(),
      vendor: data.vendor?.trim() || null,
      payment_method:
        data.payment_method === 'pending'
          ? 'pending'
          : data.payment_method || 'cash',
      reference: data.reference?.trim() || null,
      notes: data.notes?.trim() || null,
    })
    .eq('id', expenseId)

  if (error) return { error: error.message }

  revalidateExpensePaths(data.farm_id, expenseId)
  return { success: true }
}

export async function deleteExpenseAction(
  expenseId: string,
  farmId: string
): Promise<{ error: string } | { success: true }> {
  const userId = await getAuthedUserId()
  if (!userId) return { error: 'You must be signed in.' }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('expenses')
    .select('id, farm_id')
    .eq('id', expenseId)
    .single()

  if (!existing || existing.farm_id !== farmId) {
    return { error: 'Expense not found.' }
  }

  const ok = await isFarmAssignedToUser(userId, farmId)
  if (!ok) return { error: 'You do not have access to this farm.' }

  const { error } = await supabase.from('expenses').delete().eq('id', expenseId)
  if (error) return { error: error.message }

  revalidateExpensePaths(farmId)
  return { success: true }
}
