'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isFarmAssignedToUser } from '@/lib/queries/farm-user'
import { generateInvoiceNumber } from '@/lib/queries/sales'
import {
  computeSaleTotals,
  derivePaymentStatus,
  roundMoney,
  type DiscountType,
} from '@/lib/sale-utils'
import type { SaleLineItem } from '@/types/database'

async function getAuthedUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

function revalidateSalePaths(farmId: string, saleId?: string) {
  revalidatePath('/farm/sales')
  revalidatePath('/farm')
  if (saleId) {
    revalidatePath(`/farm/sales/${saleId}`)
    revalidatePath(`/farm/sales/${saleId}/edit`)
  }
  revalidatePath(`/farm/customers`)
}

export type SaleFormPayload = {
  farm_id: string
  customer_id: string | null
  sale_date: string
  due_date: string | null
  line_items: SaleLineItem[]
  discount_type: DiscountType | string | null
  discount_value: number
  /** Only used when creating a sale */
  initial_paid?: number
  notes: string | null
}

/** DB column `discount_type` is NOT NULL — use `'none'` when there is no discount. */
function normalizeDiscountType(
  v: SaleFormPayload['discount_type']
): 'none' | 'percentage' | 'fixed' {
  if (v === 'percentage' || v === 'fixed') return v
  return 'none'
}

async function refreshSalePaymentAggregate(saleId: string) {
  const supabase = await createClient()
  const { data: sale } = await supabase
    .from('sales')
    .select('total_amount')
    .eq('id', saleId)
    .single()

  const { data: pays } = await supabase
    .from('payments')
    .select('amount')
    .eq('sale_id', saleId)

  const total = roundMoney(Number(sale?.total_amount ?? 0))
  const paid = roundMoney(
    (pays ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0)
  )
  const balance = roundMoney(Math.max(0, total - paid))
  const status = derivePaymentStatus(total, paid)

  await supabase
    .from('sales')
    .update({
      paid_amount: paid,
      balance_due: balance,
      payment_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', saleId)
}

export async function createSaleAction(
  data: SaleFormPayload
): Promise<{ error: string } | { id: string }> {
  const userId = await getAuthedUserId()
  if (!userId) return { error: 'You must be signed in.' }

  const ok = await isFarmAssignedToUser(userId, data.farm_id)
  if (!ok) return { error: 'You do not have access to this farm.' }

  if (!data.line_items?.length) {
    return { error: 'Add at least one line item.' }
  }

  const discountType = normalizeDiscountType(data.discount_type)
  const { subtotal, discountAmount, total } = computeSaleTotals(
    data.line_items,
    discountType,
    data.discount_value ?? 0
  )

  const initialPaid = roundMoney(Math.max(0, Number(data.initial_paid ?? 0)))
  if (initialPaid > total) {
    return { error: 'Amount paid cannot exceed the invoice total.' }
  }

  const balance = roundMoney(total - initialPaid)
  const status = derivePaymentStatus(total, initialPaid)

  const supabase = await createClient()
  let invoiceNumber = await generateInvoiceNumber(data.farm_id)
  const maxAttempts = 5

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data: row, error } = await supabase
      .from('sales')
      .insert({
        farm_id: data.farm_id,
        customer_id: data.customer_id,
        invoice_number: invoiceNumber,
        sale_date: data.sale_date,
        due_date: data.due_date || null,
        line_items: data.line_items,
        subtotal,
        discount_type: discountType,
        discount_value: roundMoney(data.discount_value ?? 0),
        discount_amount: discountAmount,
        total_amount: total,
        paid_amount: initialPaid,
        balance_due: balance,
        payment_status: status,
        notes: data.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (!error && row) {
      if (initialPaid > 0) {
        await supabase.from('payments').insert({
          sale_id: row.id,
          amount: initialPaid,
          payment_date: data.sale_date,
          payment_method: 'cash',
          notes: 'Initial payment at sale',
        })
        await refreshSalePaymentAggregate(row.id)
      }

      revalidateSalePaths(data.farm_id, row.id)
      return { id: row.id }
    }

    if (
      error?.message?.includes('duplicate') ||
      error?.code === '23505'
    ) {
      invoiceNumber = await generateInvoiceNumber(data.farm_id)
      continue
    }

    return { error: error?.message ?? 'Failed to create sale.' }
  }

  return { error: 'Could not allocate a unique invoice number. Try again.' }
}

export async function updateSaleAction(
  saleId: string,
  data: SaleFormPayload
): Promise<{ error: string } | { success: true }> {
  const userId = await getAuthedUserId()
  if (!userId) return { error: 'You must be signed in.' }

  const ok = await isFarmAssignedToUser(userId, data.farm_id)
  if (!ok) return { error: 'You do not have access to this farm.' }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('sales')
    .select('id, farm_id')
    .eq('id', saleId)
    .single()

  if (!existing || existing.farm_id !== data.farm_id) {
    return { error: 'Sale not found.' }
  }

  if (!data.line_items?.length) {
    return { error: 'Add at least one line item.' }
  }

  const discountType = normalizeDiscountType(data.discount_type)
  const { subtotal, discountAmount, total } = computeSaleTotals(
    data.line_items,
    discountType,
    data.discount_value ?? 0
  )

  const { data: pays } = await supabase
    .from('payments')
    .select('amount')
    .eq('sale_id', saleId)
  const paidSum = roundMoney(
    (pays ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0)
  )

  if (paidSum > total) {
    return {
      error:
        'Recorded payments exceed the new total. Remove or adjust payments first.',
    }
  }

  const balance = roundMoney(total - paidSum)
  const status = derivePaymentStatus(total, paidSum)

  const { error } = await supabase
    .from('sales')
    .update({
      customer_id: data.customer_id,
      sale_date: data.sale_date,
      due_date: data.due_date || null,
      line_items: data.line_items,
      subtotal,
      discount_type: discountType,
      discount_value: roundMoney(data.discount_value ?? 0),
      discount_amount: discountAmount,
      total_amount: total,
      paid_amount: paidSum,
      balance_due: balance,
      payment_status: status,
      notes: data.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', saleId)

  if (error) return { error: error.message }

  await refreshSalePaymentAggregate(saleId)
  revalidateSalePaths(data.farm_id, saleId)
  return { success: true }
}

export async function deleteSaleAction(
  saleId: string,
  farmId: string
): Promise<{ error: string } | { success: true }> {
  const userId = await getAuthedUserId()
  if (!userId) return { error: 'You must be signed in.' }

  const ok = await isFarmAssignedToUser(userId, farmId)
  if (!ok) return { error: 'You do not have access to this farm.' }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('sales')
    .select('id, farm_id')
    .eq('id', saleId)
    .single()

  if (!existing || existing.farm_id !== farmId) {
    return { error: 'Sale not found.' }
  }

  const { error } = await supabase.from('sales').delete().eq('id', saleId)
  if (error) return { error: error.message }

  revalidateSalePaths(farmId)
  return { success: true }
}

export type RecordPaymentPayload = {
  sale_id: string
  farm_id: string
  amount: number
  payment_date: string
  payment_method: string
  reference: string | null
  notes: string | null
}

export async function recordPaymentAction(
  data: RecordPaymentPayload
): Promise<{ error: string } | { success: true }> {
  const userId = await getAuthedUserId()
  if (!userId) return { error: 'You must be signed in.' }

  const ok = await isFarmAssignedToUser(userId, data.farm_id)
  if (!ok) return { error: 'You do not have access to this farm.' }

  const supabase = await createClient()
  const { data: sale } = await supabase
    .from('sales')
    .select('id, farm_id, total_amount, balance_due')
    .eq('id', data.sale_id)
    .single()

  if (!sale || sale.farm_id !== data.farm_id) {
    return { error: 'Sale not found.' }
  }

  const amt = roundMoney(data.amount)
  if (amt <= 0) return { error: 'Amount must be greater than zero.' }

  const balance = roundMoney(Number(sale.balance_due ?? 0))
  if (amt > balance + 0.001) {
    return { error: 'Amount cannot exceed the balance due.' }
  }

  const { error } = await supabase.from('payments').insert({
    sale_id: data.sale_id,
    amount: amt,
    payment_date: data.payment_date,
    payment_method: data.payment_method,
    reference: data.reference?.trim() || null,
    notes: data.notes?.trim() || null,
  })

  if (error) return { error: error.message }

  await refreshSalePaymentAggregate(data.sale_id)
  revalidateSalePaths(data.farm_id, data.sale_id)
  return { success: true }
}
