import { createClient } from '@/lib/supabase/server'
import { fetchCustomersByIds } from '@/lib/queries/sales'
import type { Farm, FarmWithStats, UserStatus } from '@/types/database'

export interface FarmWorkerRow {
  id: string
  name: string
  email: string
  status: UserStatus
}

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
 * All farms for an organization, with computed flock stats.
 *
 * Uses two queries (farms, then flocks) instead of a nested select so RLS / embed
 * issues cannot zero out the whole list while a plain `farms` count still works.
 */
export async function getFarms(organizationId: string): Promise<FarmWithStats[]> {
  const supabase = await createClient()

  const { data: farms, error: farmsError } = await supabase
    .from('farms')
    .select('id, name, location, status, organization_id, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (process.env.NODE_ENV === 'development') {
    console.log('[getFarms] query', {
      organizationId,
      farmsError: farmsError?.message ?? null,
      farmsCount: farms?.length ?? 0,
      farmIds: farms?.map((f) => f.id) ?? [],
    })
  }

  if (farmsError) {
    console.error('[getFarms] farms query failed:', farmsError)
    return []
  }
  if (!farms?.length) return []

  const farmIds = farms.map((f) => f.id)
  const { data: flocksRows, error: flocksError } = await supabase
    .from('flocks')
    .select('id, farm_id, current_count, status')
    .in('farm_id', farmIds)

  if (process.env.NODE_ENV === 'development') {
    console.log('[getFarms] flocks query', {
      flocksError: flocksError?.message ?? null,
      flocksCount: flocksRows?.length ?? 0,
    })
  }

  if (flocksError) {
    console.error('[getFarms] flocks query failed (showing farms with zero stats):', flocksError)
    return farms.map((farm) => farmWithStats(farm, []))
  }

  const byFarm = groupFlocksByFarmId(flocksRows as FlockRow[])

  return farms.map((farm) => farmWithStats(farm, byFarm.get(farm.id) ?? []))
}

/**
 * Single farm by ID with flock stats.
 */
export async function getFarm(farmId: string): Promise<FarmWithStats | null> {
  const supabase = await createClient()

  const { data: farm, error: farmError } = await supabase
    .from('farms')
    .select('id, name, location, status, organization_id, created_at')
    .eq('id', farmId)
    .single()

  if (farmError || !farm) return null

  const { data: flocksRows, error: flocksError } = await supabase
    .from('flocks')
    .select('id, farm_id, current_count, status')
    .eq('farm_id', farmId)

  if (flocksError) {
    console.error('[getFarm] flocks query failed:', flocksError)
    return farmWithStats(farm, [])
  }

  return farmWithStats(farm, (flocksRows as FlockRow[]) ?? [])
}

/**
 * Farm workers (users linked via farm_users for this farm).
 */
/** Farm workers in an org (for admin Users page). */
export interface OrgFarmWorkerAdminRow {
  id: string
  name: string
  email: string
  status: UserStatus
  assignedFarms: { id: string; name: string }[]
}

/**
 * All `FARM_USER` accounts in the organization with their farm assignments.
 */
export async function getOrganizationFarmWorkersList(
  organizationId: string
): Promise<OrgFarmWorkerAdminRow[]> {
  const supabase = await createClient()

  const { data: farmRows, error: farmsErr } = await supabase
    .from('farms')
    .select('id, name')
    .eq('organization_id', organizationId)

  if (farmsErr || !farmRows?.length) {
    const { data: usersOnly, error: usersErr } = await supabase
      .from('users')
      .select('id, name, email, status')
      .eq('organization_id', organizationId)
      .eq('role', 'FARM_USER')
      .order('name', { ascending: true })

    if (usersErr || !usersOnly?.length) return []

    return usersOnly.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      status: u.status as UserStatus,
      assignedFarms: [],
    }))
  }

  const farmIds = farmRows.map((f) => f.id)
  const farmNameById = new Map(
    farmRows.map((f) => [f.id as string, f.name as string])
  )

  const { data: links, error: linkErr } = await supabase
    .from('farm_users')
    .select('user_id, farm_id')
    .in('farm_id', farmIds)

  if (linkErr && process.env.NODE_ENV === 'development') {
    console.error('[getOrganizationFarmWorkersList] farm_users', linkErr.message)
  }

  const farmsByUser = new Map<string, { id: string; name: string }[]>()
  for (const row of links ?? []) {
    const uid = row.user_id as string
    const fid = row.farm_id as string
    const name = farmNameById.get(fid)
    if (!name) continue
    const list = farmsByUser.get(uid) ?? []
    list.push({ id: fid, name })
    farmsByUser.set(uid, list)
  }

  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id, name, email, status')
    .eq('organization_id', organizationId)
    .eq('role', 'FARM_USER')
    .order('name', { ascending: true })

  if (usersErr || !users?.length) return []

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    status: u.status as UserStatus,
    assignedFarms: farmsByUser.get(u.id) ?? [],
  }))
}

export async function getFarmWorkers(farmId: string): Promise<FarmWorkerRow[]> {
  const supabase = await createClient()

  const { data: links, error: linkErr } = await supabase
    .from('farm_users')
    .select('user_id')
    .eq('farm_id', farmId)

  if (linkErr || !links?.length) {
    if (linkErr && process.env.NODE_ENV === 'development') {
      console.error('[getFarmWorkers]', linkErr.message)
    }
    return []
  }

  const userIds = links.map((l) => l.user_id)
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id, name, email, status')
    .in('id', userIds)

  if (usersErr || !users?.length) return []

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    status: u.status as UserStatus,
  }))
}

/**
 * Recent daily entries for a specific farm (last 5).
 */
export async function getFarmRecentActivity(farmId: string) {
  const supabase = await createClient()

  // Get flock IDs for this farm first
  const { data: flocks } = await supabase
    .from('flocks')
    .select('id')
    .eq('farm_id', farmId)

  if (!flocks?.length) return { entries: [], sales: [] }

  const flockIds = flocks.map((f) => f.id)

  const [entriesRes, salesRes] = await Promise.all([
    supabase
      .from('daily_entries')
      .select('id, date, eggs_collected, deaths, flock_id')
      .in('flock_id', flockIds)
      .order('date', { ascending: false })
      .limit(5),
    supabase
      .from('sales')
      .select(
        'id, sale_date, invoice_number, total_amount, paid_amount, customer_name, customer_id'
      )
      .eq('farm_id', farmId)
      .order('sale_date', { ascending: false })
      .limit(5),
  ])

  const salesRows = salesRes.data ?? []
  const custIds = salesRows
    .map((r) => (r as { customer_id?: string | null }).customer_id)
    .filter((id): id is string => Boolean(id))
  const custMap = await fetchCustomersByIds(supabase, custIds)
  const sales = salesRows.map((r) => {
    const row = r as {
      id: string
      sale_date: string
      invoice_number?: string
      total_amount?: number
      paid_amount?: number
      customer_name?: string | null
      customer_id?: string | null
    }
    return {
      ...row,
      customers: row.customer_id ? custMap.get(row.customer_id) : undefined,
    }
  })

  return {
    entries: entriesRes.data ?? [],
    sales,
  }
}

/** Daily egg rows for charts; aggregate by date with `buildEggChartSeries`. */
export async function getFarmEggTrend(farmId: string, days = 30) {
  const supabase = await createClient()
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString().split('T')[0]

  const { data: flocks } = await supabase
    .from('flocks')
    .select('id')
    .eq('farm_id', farmId)

  if (!flocks?.length) {
    return [] as { date: string; eggs_collected: number | null }[]
  }

  const flockIds = flocks.map((f) => f.id)
  const { data } = await supabase
    .from('daily_entries')
    .select('date, eggs_collected')
    .in('flock_id', flockIds)
    .gte('date', sinceStr)
    .order('date', { ascending: true })

  return data ?? []
}

/**
 * Farm stats for the detail page header cards.
 */
export async function getFarmStats(farmId: string, organizationId: string) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0]

  const { data: flocks } = await supabase
    .from('flocks')
    .select('id, current_count, status')
    .eq('farm_id', farmId)

  const activeFlocks = flocks?.filter((f) => f.status === 'active') ?? []
  const flockIds = flocks?.map((f) => f.id) ?? []
  const totalBirds = activeFlocks.reduce((sum, f) => sum + (f.current_count ?? 0), 0)

  const [eggsRes, revenueRes] = await Promise.all([
    flockIds.length
      ? supabase
          .from('daily_entries')
          .select('eggs_collected')
          .in('flock_id', flockIds)
          .eq('date', today)
      : Promise.resolve({ data: [] }),
    supabase
      .from('sales')
      .select('total_amount, amount')
      .eq('farm_id', farmId)
      .gte('sale_date', monthStart),
  ])

  return {
    active_flocks: activeFlocks.length,
    total_birds: totalBirds,
    today_eggs: (eggsRes.data ?? []).reduce((s, r) => s + (r.eggs_collected ?? 0), 0),
    monthly_revenue: (revenueRes.data ?? []).reduce((s, r) => {
      const row = r as { total_amount?: number | null; amount?: number | null }
      const v = row.total_amount ?? row.amount ?? 0
      return s + Number(v)
    }, 0),
  }
}
