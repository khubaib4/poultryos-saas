import { createClient } from '@/lib/supabase/server'
import type { DashboardStats, Organization } from '@/types/database'

/**
 * All summary stats for the admin dashboard, scoped to an organization.
 */
export async function getDashboardStats(organizationId: string): Promise<DashboardStats> {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0]

  const [orgRes, farmsRes] = await Promise.all([
    supabase
      .from('organizations')
      .select('id, name, admin_id, plan, plan_status, max_farms, max_users, created_at')
      .eq('id', organizationId)
      .single(),
    supabase
      .from('farms')
      .select('id')
      .eq('organization_id', organizationId),
  ])

  const organization = orgRes.data as Organization | null
  const farmIds = farmsRes.data?.map((f) => f.id) ?? []

  if (!farmIds.length) {
    return {
      organization: organization!,
      farms_count: 0,
      total_birds: 0,
      today_eggs: 0,
      monthly_revenue: 0,
    }
  }

  // Flocks across all farms
  const { data: flocks } = await supabase
    .from('flocks')
    .select('id, current_count, status')
    .in('farm_id', farmIds)

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
      .in('farm_id', farmIds)
      .gte('sale_date', monthStart),
  ])

  return {
    organization: organization!,
    farms_count: farmIds.length,
    total_birds: totalBirds,
    today_eggs: (eggsRes.data ?? []).reduce((s, r) => s + (r.eggs_collected ?? 0), 0),
    monthly_revenue: (revenueRes.data ?? []).reduce((s, r) => {
      const row = r as { total_amount?: number | null; amount?: number | null }
      return s + Number(row.total_amount ?? row.amount ?? 0)
    }, 0),
  }
}

/**
 * Recent daily entries across all farms in an organization (last 5).
 */
export async function getRecentActivity(organizationId: string) {
  const supabase = await createClient()

  // Get all farm IDs
  const { data: farms } = await supabase
    .from('farms')
    .select('id, name')
    .eq('organization_id', organizationId)

  if (!farms?.length) return []

  const farmIds = farms.map((f) => f.id)
  const farmMap = Object.fromEntries(farms.map((f) => [f.id, f.name]))

  // Get flocks for those farms
  const { data: flocks } = await supabase
    .from('flocks')
    .select('id, farm_id')
    .in('farm_id', farmIds)

  if (!flocks?.length) return []

  const flockIds = flocks.map((f) => f.id)
  const flockToFarm = Object.fromEntries(flocks.map((f) => [f.id, f.farm_id]))

  // Get recent daily entries
  const { data: entries } = await supabase
    .from('daily_entries')
    .select('id, date, eggs_collected, deaths, flock_id')
    .in('flock_id', flockIds)
    .order('date', { ascending: false })
    .limit(5)

  return (entries ?? []).map((entry) => ({
    ...entry,
    farm_id: flockToFarm[entry.flock_id],
    farm_name: farmMap[flockToFarm[entry.flock_id]] ?? '—',
  }))
}

/** Daily egg rows across the org for charts; aggregate with `buildEggChartSeries`. */
export async function getOrganizationEggTrend(organizationId: string, days = 30) {
  const supabase = await createClient()
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString().split('T')[0]

  const { data: farms } = await supabase
    .from('farms')
    .select('id')
    .eq('organization_id', organizationId)

  const farmIds = farms?.map((f) => f.id) ?? []
  if (!farmIds.length) {
    return [] as { date: string; eggs_collected: number | null }[]
  }

  const { data: flocks } = await supabase
    .from('flocks')
    .select('id')
    .in('farm_id', farmIds)

  const flockIds = flocks?.map((f) => f.id) ?? []
  if (!flockIds.length) return []

  const { data } = await supabase
    .from('daily_entries')
    .select('date, eggs_collected')
    .in('flock_id', flockIds)
    .gte('date', sinceStr)
    .order('date', { ascending: true })

  return data ?? []
}
