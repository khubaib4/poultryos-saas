import { createClient } from '@/lib/supabase/server'
import type { Customer, Payment, Sale, SaleLineItem } from '@/types/database'

export interface SalesFilters {
  dateFrom?: string
  dateTo?: string
  customerId?: string
  paymentStatus?: 'all' | 'paid' | 'partial' | 'unpaid'
  limit?: number
}

export interface SalesSummary {
  totalSales: number
  collected: number
  outstanding: number
}

function parseLineItems(raw: unknown): SaleLineItem[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as SaleLineItem[]
  if (typeof raw === 'string') {
    try {
      const j = JSON.parse(raw) as unknown
      return Array.isArray(j) ? (j as SaleLineItem[]) : []
    } catch {
      return []
    }
  }
  return []
}

type CustomerRow = NonNullable<Sale['customers']>

/**
 * Load customers by id (no FK embed on `sales` — avoids PostgREST
 * “relationship not in schema cache” when FK metadata is missing).
 */
export async function fetchCustomersByIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[]
): Promise<Map<string, CustomerRow>> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return new Map()

  const { data, error } = await supabase
    .from('customers')
    .select('id, name, phone, business_name')
    .in('id', unique)

  if (error) {
    console.error('[fetchCustomersByIds]', error.message)
    return new Map()
  }

  const map = new Map<string, CustomerRow>()
  for (const c of data ?? []) {
    map.set((c as CustomerRow).id, c as CustomerRow)
  }
  return map
}

/**
 * Sales for a farm with optional filters (date range, customer, payment status).
 */
export async function getSales(
  farmId: string,
  filters?: SalesFilters
): Promise<Sale[]> {
  const supabase = await createClient()

  let q = supabase
    .from('sales')
    .select(
      `
      id,
      farm_id,
      customer_id,
      invoice_number,
      sale_date,
      due_date,
      line_items,
      subtotal,
      discount_type,
      discount_value,
      discount_amount,
      total_amount,
      paid_amount,
      balance_due,
      payment_status,
      notes,
      customer_name,
      amount,
      created_at,
      updated_at
    `
    )
    .eq('farm_id', farmId)
    .order('sale_date', { ascending: false })

  if (filters?.dateFrom) {
    q = q.gte('sale_date', filters.dateFrom)
  }
  if (filters?.dateTo) {
    q = q.lte('sale_date', filters.dateTo)
  }
  if (filters?.customerId) {
    q = q.eq('customer_id', filters.customerId)
  }
  if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
    q = q.eq('payment_status', filters.paymentStatus)
  }
  if (filters?.limit) {
    q = q.limit(filters.limit)
  }

  const { data, error } = await q
  if (error) {
    console.error('[getSales]', error.message)
    return []
  }

  const rows = (data ?? []) as Record<string, unknown>[]
  const customerIds = rows
    .map((r) => r.customer_id as string | null | undefined)
    .filter((id): id is string => Boolean(id))
  const customerMap = await fetchCustomersByIds(supabase, customerIds)

  return rows.map((row) => ({
    ...row,
    line_items: parseLineItems(row.line_items),
    customers: row.customer_id
      ? customerMap.get(row.customer_id as string)
      : undefined,
  })) as Sale[]
}

export interface SaleDetail extends Sale {
  payments: Payment[]
}

/**
 * Single sale with customer embed and payments.
 */
export async function getSale(saleId: string): Promise<SaleDetail | null> {
  const supabase = await createClient()

  const { data: row, error } = await supabase
    .from('sales')
    .select(
      `
      id,
      farm_id,
      customer_id,
      invoice_number,
      sale_date,
      due_date,
      line_items,
      subtotal,
      discount_type,
      discount_value,
      discount_amount,
      total_amount,
      paid_amount,
      balance_due,
      payment_status,
      notes,
      customer_name,
      amount,
      created_at,
      updated_at
    `
    )
    .eq('id', saleId)
    .maybeSingle()

  if (error || !row) {
    if (error) console.error('[getSale]', error.message)
    return null
  }

  const payments = await getPayments(saleId)

  const r = row as Record<string, unknown>
  const customerMap = await fetchCustomersByIds(supabase, [
    r.customer_id as string,
  ].filter(Boolean))

  const sale: Sale = {
    ...row,
    line_items: parseLineItems(row.line_items),
    customers: r.customer_id
      ? customerMap.get(r.customer_id as string)
      : undefined,
  } as Sale

  return { ...sale, payments }
}

/** Sale only if it belongs to the farm. */
export async function getSaleForFarm(
  saleId: string,
  farmId: string
): Promise<SaleDetail | null> {
  const detail = await getSale(saleId)
  if (!detail || detail.farm_id !== farmId) return null
  return detail
}

/**
 * Aggregates for a date range (defaults: all time if no bounds).
 */
export async function getSalesSummary(
  farmId: string,
  startDate?: string,
  endDate?: string
): Promise<SalesSummary> {
  const supabase = await createClient()

  let q = supabase
    .from('sales')
    .select('total_amount, paid_amount, balance_due')
    .eq('farm_id', farmId)

  if (startDate) q = q.gte('sale_date', startDate)
  if (endDate) q = q.lte('sale_date', endDate)

  const { data, error } = await q
  if (error) {
    console.error('[getSalesSummary]', error.message)
    return { totalSales: 0, collected: 0, outstanding: 0 }
  }

  const rows = data ?? []
  let totalSales = 0
  let collected = 0
  let outstanding = 0
  for (const r of rows) {
    totalSales += Number(r.total_amount ?? 0)
    collected += Number(r.paid_amount ?? 0)
    outstanding += Number(r.balance_due ?? 0)
  }

  return {
    totalSales,
    collected,
    outstanding,
  }
}

/**
 * Next invoice number for this farm: INV-YYYY-NNN (NNN increments per farm per year).
 */
export async function generateInvoiceNumber(farmId: string): Promise<string> {
  const supabase = await createClient()
  const year = new Date().getFullYear()
  const prefix = `INV-${year}-`

  const { data, error } = await supabase
    .from('sales')
    .select('invoice_number')
    .eq('farm_id', farmId)
    .ilike('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1)

  if (error) {
    console.error('[generateInvoiceNumber]', error.message)
    return `${prefix}001`
  }

  let next = 1
  const last = data?.[0]?.invoice_number as string | undefined
  if (last) {
    const m = last.match(/INV-(\d{4})-(\d+)$/)
    if (m) {
      next = parseInt(m[2], 10) + 1
    }
  }

  return `${prefix}${String(next).padStart(3, '0')}`
}

export async function getPayments(saleId: string): Promise<Payment[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('payments')
    .select(
      'id, sale_id, amount, payment_date, payment_method, reference, notes, created_at'
    )
    .eq('sale_id', saleId)
    .order('payment_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getPayments]', error.message)
    return []
  }
  return (data ?? []) as Payment[]
}

/** Customers for selectors (active only). */
export async function getCustomersForSaleForm(farmId: string): Promise<Customer[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('customers')
    .select(
      'id, farm_id, name, phone, business_name, address, category, is_active, notes, created_at, updated_at'
    )
    .eq('farm_id', farmId)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('[getCustomersForSaleForm]', error.message)
    return []
  }
  return (data ?? []) as Customer[]
}
