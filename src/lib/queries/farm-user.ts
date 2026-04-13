import { createClient } from '@/lib/supabase/server'
import { fetchCustomersByIds } from '@/lib/queries/sales'
import type { Farm, FarmWithStats } from '@/types/database'

type FlockRow = { id: string; farm_id: string; current_count: number; status: string }

function groupFlocksByFarmId(rows: FlockRow[] | null | undefined) {
  const map = new Map<string, FlockRow[]>()
  for (const row of rows ?? []) {
    const list = map.get(row.farm_id) ?? []
    list.push(row)
    map.set(row.farm_id, list)
  }
  return map
}

function farmWithStats(
  farm: {
    id: string
    name: string
    location: string | null
    status: string
    organization_id: string
    created_at: string
  },
  flocks: FlockRow[]
): FarmWithStats {
  return {
    id: farm.id,
    name: farm.name,
    location: farm.location ?? undefined,
    status: farm.status as Farm['status'],
    organization_id: farm.organization_id,
    created_at: farm.created_at,
    flocks_count: flocks.filter((f) => f.status === 'active').length,
    total_birds: flocks.reduce((sum, f) => sum + (f.current_count ?? 0), 0),
  }
}

/**
 * Farms assigned to a worker via `farm_users`. Includes flock stats (same shape as getFarms).
 */
export async function getAssignedFarms(userId: string): Promise<FarmWithStats[]> {
  const supabase = await createClient()

  const { data: links, error: linkError } = await supabase
    .from('farm_users')
    .select('farm_id')
    .eq('user_id', userId)

  if (linkError || !links?.length) {
    if (linkError) {
      console.error('[getAssignedFarms] farm_users error:', linkError.message)
    }
    return []
  }

  const farmIds = [...new Set(links.map((l) => l.farm_id).filter(Boolean))]

  const { data: farms, error: farmsError } = await supabase
    .from('farms')
    .select('id, name, location, status, organization_id, created_at')
    .in('id', farmIds)
    .order('name', { ascending: true })

  if (farmsError || !farms?.length) {
    if (farmsError) {
      console.error('[getAssignedFarms] farms error:', farmsError.message)
    }
    return []
  }

  const { data: flocksRows, error: flocksError } = await supabase
    .from('flocks')
    .select('id, farm_id, current_count, status')
    .in('farm_id', farms.map((f) => f.id))

  if (flocksError) {
    console.error('[getAssignedFarms] flocks error:', flocksError.message)
    return farms.map((farm) => farmWithStats(farm, []))
  }

  const byFarm = groupFlocksByFarmId(flocksRows as FlockRow[])
  return farms.map((farm) => farmWithStats(farm, byFarm.get(farm.id) ?? []))
}

export async function getAssignedFarmIds(userId: string): Promise<string[]> {
  const farms = await getAssignedFarms(userId)
  return farms.map((f) => f.id)
}

/**
 * True if the worker has a row in farm_users for this farm.
 */
export async function isFarmAssignedToUser(
  userId: string,
  farmId: string
): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('farm_users')
    .select('id')
    .eq('user_id', userId)
    .eq('farm_id', farmId)
    .maybeSingle()
  return Boolean(data)
}

/**
 * Resolve `farm` search param against assigned farms; default to first assignment.
 */
export function resolveWorkerFarmId(
  assigned: FarmWithStats[],
  farmParam: string | undefined
): string | null {
  if (assigned.length === 0) return null
  if (farmParam && assigned.some((f) => f.id === farmParam)) return farmParam
  return assigned[0].id
}

export async function getFarmSalesForFarm(farmId: string, limit = 50) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sales')
    .select(
      'id, farm_id, sale_date, invoice_number, total_amount, paid_amount, balance_due, payment_status, customer_name, customer_id, amount, notes, created_at'
    )
    .eq('farm_id', farmId)
    .order('sale_date', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getFarmSalesForFarm]', error.message)
    return []
  }

  const rows = data ?? []
  const ids = rows
    .map((r) => (r as { customer_id?: string | null }).customer_id)
    .filter((id): id is string => Boolean(id))
  const map = await fetchCustomersByIds(supabase, ids)

  return rows.map((r) => {
    const row = r as { customer_id?: string | null; customer_name?: string | null }
    return {
      ...row,
      customers: row.customer_id ? map.get(row.customer_id) : undefined,
    }
  })
}

export async function getFarmExpensesForFarm(farmId: string, limit = 50) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .select(
      'id, farm_id, date, expense_date, amount, category, description, vendor, payment_method, reference, notes, created_at'
    )
    .eq('farm_id', farmId)
    .order('expense_date', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getFarmExpensesForFarm]', error.message)
    return []
  }
  return data ?? []
}
