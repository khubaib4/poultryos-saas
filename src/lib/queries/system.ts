import { createClient } from '@/lib/supabase/server'
import type { Organization, User } from '@/types/database'

export type OrgPlanFilter = 'all' | 'FREE' | 'BASIC' | 'PREMIUM'
export type OrgStatusFilter = 'all' | 'ACTIVE' | 'INACTIVE'
export type AdminStatusFilter = 'all' | 'ACTIVE' | 'SUSPENDED'

export interface SystemStats {
  totalOrganizations: number
  totalAdmins: number
  totalFarms: number
  totalActiveUsers: number
}

export interface OrganizationListRow {
  id: string
  name: string
  admin_id: string
  plan: string
  plan_status: string
  status: string
  max_farms: number
  max_users: number
  created_at: string
  admin_name: string | null
  admin_email: string | null
  farms_count: number
  users_count: number
}

export interface OrganizationDetail extends Organization {
  status: 'ACTIVE' | 'INACTIVE'
  admin: Pick<User, 'id' | 'name' | 'email' | 'phone' | 'status' | 'created_at'> | null
  farms_count: number
  users_count: number
  total_sales: number
  farms: { id: string; name: string; status: string; created_at: string }[]
}

export interface AdminListRow {
  id: string
  name: string
  email: string
  status: string
  role: string
  organization_id: string | null
  created_at: string
  organization_name: string | null
  farms_count: number
}

export interface AdminDetail extends User {
  organization: Organization | null
  farms: { id: string; name: string; created_at: string }[]
  activity: {
    totalSales: number
    farmsManaged: number
  }
}

export interface RecentActivity {
  recentOrganizations: { id: string; name: string; created_at: string; plan: string }[]
  recentAdmins: {
    id: string
    name: string
    email: string
    created_at: string
    organization_name: string | null
  }[]
}

export interface PlatformHealth {
  byPlan: { plan: string; count: number }[]
  orgActive: number
  orgInactive: number
}

export async function getSystemStats(): Promise<SystemStats> {
  const supabase = await createClient()

  const [{ count: orgCount }, { count: adminCount }, { count: farmCount }, { count: userCount }] =
    await Promise.all([
      supabase.from('organizations').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'ADMIN'),
      supabase.from('farms').select('id', { count: 'exact', head: true }),
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'ACTIVE'),
    ])

  return {
    totalOrganizations: orgCount ?? 0,
    totalAdmins: adminCount ?? 0,
    totalFarms: farmCount ?? 0,
    totalActiveUsers: userCount ?? 0,
  }
}

export async function getRecentActivity(limit = 8): Promise<RecentActivity> {
  const supabase = await createClient()

  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, created_at, plan')
    .order('created_at', { ascending: false })
    .limit(limit)

  const { data: admins } = await supabase
    .from('users')
    .select('id, name, email, created_at, organization_id')
    .eq('role', 'ADMIN')
    .order('created_at', { ascending: false })
    .limit(limit)

  const orgIds = [...new Set((admins ?? []).map((a) => a.organization_id).filter(Boolean))]
  let orgNameMap = new Map<string, string>()
  if (orgIds.length > 0) {
    const { data: onames } = await supabase
      .from('organizations')
      .select('id, name')
      .in('id', orgIds as string[])
    for (const o of onames ?? []) {
      orgNameMap.set((o as { id: string }).id, (o as { name: string }).name)
    }
  }

  return {
    recentOrganizations: (orgs ?? []) as RecentActivity['recentOrganizations'],
    recentAdmins: (admins ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      created_at: a.created_at,
      organization_name: a.organization_id
        ? orgNameMap.get(a.organization_id) ?? null
        : null,
    })),
  }
}

export async function getPlatformHealth(): Promise<PlatformHealth> {
  const supabase = await createClient()

  const { data: orgs } = await supabase
    .from('organizations')
    .select('plan, status')

  const byPlanMap = new Map<string, number>()
  let orgActive = 0
  let orgInactive = 0

  for (const o of orgs ?? []) {
    const p = (o as { plan: string }).plan ?? 'FREE'
    byPlanMap.set(p, (byPlanMap.get(p) ?? 0) + 1)
    const st = (o as { status?: string }).status ?? 'ACTIVE'
    if (st === 'ACTIVE') orgActive += 1
    else orgInactive += 1
  }

  const byPlan = [...byPlanMap.entries()].map(([plan, count]) => ({ plan, count }))

  return { byPlan, orgActive, orgInactive }
}

export interface OrganizationFilters {
  search?: string
  plan?: OrgPlanFilter
  status?: OrgStatusFilter
  limit?: number
}

export async function getOrganizations(
  filters?: OrganizationFilters
): Promise<OrganizationListRow[]> {
  const supabase = await createClient()

  let q = supabase
    .from('organizations')
    .select(
      `
      id,
      name,
      admin_id,
      plan,
      plan_status,
      status,
      max_farms,
      max_users,
      created_at
    `
    )
    .order('created_at', { ascending: false })

  const plan = filters?.plan ?? 'all'
  if (plan !== 'all') {
    q = q.eq('plan', plan)
  }

  const st = filters?.status ?? 'all'
  if (st !== 'all') {
    q = q.eq('status', st)
  }

  if (filters?.search?.trim()) {
    q = q.ilike('name', `%${filters.search.trim()}%`)
  }

  q = q.limit(filters?.limit ?? 500)

  const { data: orgRows, error } = await q
  if (error || !orgRows) {
    console.error('[getOrganizations]', error?.message)
    return []
  }

  const adminIds = [...new Set(orgRows.map((o) => o.admin_id).filter(Boolean))]
  const { data: adminUsers } = await supabase
    .from('users')
    .select('id, name, email')
    .in('id', adminIds)

  const adminMap = new Map(
    (adminUsers ?? []).map((u) => [u.id, { name: u.name, email: u.email }])
  )

  const orgIds = orgRows.map((o) => o.id)

  const { data: farmCounts } = await supabase
    .from('farms')
    .select('organization_id')
    .in('organization_id', orgIds)

  const { data: userCounts } = await supabase
    .from('users')
    .select('organization_id')
    .in('organization_id', orgIds)

  const farmsPerOrg = new Map<string, number>()
  for (const f of farmCounts ?? []) {
    const id = (f as { organization_id: string }).organization_id
    farmsPerOrg.set(id, (farmsPerOrg.get(id) ?? 0) + 1)
  }

  const usersPerOrg = new Map<string, number>()
  for (const u of userCounts ?? []) {
    const id = (u as { organization_id: string | null }).organization_id
    if (!id) continue
    usersPerOrg.set(id, (usersPerOrg.get(id) ?? 0) + 1)
  }

  return orgRows.map((o) => {
    const adm = adminMap.get(o.admin_id)
    return {
      ...o,
      status: (o as { status?: string }).status ?? 'ACTIVE',
      admin_name: adm?.name ?? null,
      admin_email: adm?.email ?? null,
      farms_count: farmsPerOrg.get(o.id) ?? 0,
      users_count: usersPerOrg.get(o.id) ?? 0,
    } as OrganizationListRow
  })
}

export async function getOrganization(id: string): Promise<OrganizationDetail | null> {
  const supabase = await createClient()

  const { data: org, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !org) return null

  const { data: admin } = await supabase
    .from('users')
    .select('id, name, email, phone, status, created_at')
    .eq('id', org.admin_id)
    .maybeSingle()

  const { data: farms } = await supabase
    .from('farms')
    .select('id, name, status, created_at')
    .eq('organization_id', id)
    .order('created_at', { ascending: false })

  const farmIds = (farms ?? []).map((f) => f.id)
  let total_sales = 0
  if (farmIds.length > 0) {
    const { data: salesRows } = await supabase
      .from('sales')
      .select('total_amount')
      .in('farm_id', farmIds)
    for (const s of salesRows ?? []) {
      total_sales += Number((s as { total_amount: number }).total_amount ?? 0)
    }
  }

  const { count: users_count } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', id)

  const rawStatus = (org as { status?: string }).status ?? 'ACTIVE'
  const orgStatus: 'ACTIVE' | 'INACTIVE' = rawStatus === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'

  return {
    ...(org as Organization),
    status: orgStatus,
    admin: (admin ?? null) as OrganizationDetail['admin'],
    farms_count: farms?.length ?? 0,
    users_count: users_count ?? 0,
    total_sales,
    farms: (farms ?? []) as OrganizationDetail['farms'],
  }
}

export interface AdminFilters {
  search?: string
  status?: AdminStatusFilter
  limit?: number
}

export async function getAdmins(filters?: AdminFilters): Promise<AdminListRow[]> {
  const supabase = await createClient()

  let q = supabase
    .from('users')
    .select('id, name, email, status, role, organization_id, created_at')
    .eq('role', 'ADMIN')
    .order('created_at', { ascending: false })

  const st = filters?.status ?? 'all'
  if (st === 'ACTIVE') q = q.eq('status', 'ACTIVE')
  else if (st === 'SUSPENDED') q = q.eq('status', 'SUSPENDED')

  if (filters?.search?.trim()) {
    const t = filters.search.trim()
    q = q.or(`name.ilike.%${t}%,email.ilike.%${t}%`)
  }

  q = q.limit(filters?.limit ?? 500)

  const { data: rows, error } = await q
  if (error || !rows) return []

  const orgIds = [...new Set(rows.map((r) => r.organization_id).filter(Boolean))]
  let orgNames = new Map<string, string>()
  if (orgIds.length > 0) {
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name')
      .in('id', orgIds as string[])
    for (const o of orgs ?? []) {
      orgNames.set((o as { id: string }).id, (o as { name: string }).name)
    }
  }

  const orgIdsForFarms = [...new Set(rows.map((r) => r.organization_id).filter(Boolean))] as string[]
  const farmCountByOrg = new Map<string, number>()
  if (orgIdsForFarms.length > 0) {
    const { data: farmRows } = await supabase
      .from('farms')
      .select('organization_id')
      .in('organization_id', orgIdsForFarms)
    for (const f of farmRows ?? []) {
      const oid = (f as { organization_id: string }).organization_id
      farmCountByOrg.set(oid, (farmCountByOrg.get(oid) ?? 0) + 1)
    }
  }

  return rows.map((r) => {
    const oid = r.organization_id as string | null
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      status: r.status,
      role: r.role,
      organization_id: oid,
      created_at: r.created_at,
      organization_name: oid ? orgNames.get(oid) ?? null : null,
      farms_count: oid ? farmCountByOrg.get(oid) ?? 0 : 0,
    }
  })
}

export async function getAdmin(id: string): Promise<AdminDetail | null> {
  const supabase = await createClient()

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .eq('role', 'ADMIN')
    .maybeSingle()

  if (error || !user) return null

  let organization: Organization | null = null
  if (user.organization_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', user.organization_id)
      .maybeSingle()
    organization = org as Organization | null
  }

  const { data: farms } = await supabase
    .from('farms')
    .select('id, name, created_at')
    .eq('organization_id', user.organization_id ?? '')
    .order('created_at', { ascending: false })

  const farmIds = (farms ?? []).map((f) => f.id)
  let totalSales = 0
  if (farmIds.length > 0) {
    const { data: sales } = await supabase
      .from('sales')
      .select('total_amount')
      .in('farm_id', farmIds)
    for (const s of sales ?? []) {
      totalSales += Number((s as { total_amount: number }).total_amount ?? 0)
    }
  }

  return {
    ...(user as User),
    organization,
    farms: (farms ?? []) as AdminDetail['farms'],
    activity: {
      totalSales,
      farmsManaged: farms?.length ?? 0,
    },
  }
}
