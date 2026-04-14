import { NextResponse, type NextRequest } from 'next/server'
import { getSessionProfile } from '@/lib/auth/session'
import { isFarmAssignedToUser } from '@/lib/queries/farm-user'
import {
  getDeathsTrend,
  getEggsTrend,
  getLiveBirdsTrend,
  getSalesTrend,
  type TrendPeriod,
} from '@/lib/queries/farm-dashboard'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const farmId = searchParams.get('farmId')?.trim() || ''
  const type = (searchParams.get('type') || '') as
    | 'eggs'
    | 'deaths'
    | 'sales'
    | 'birds'
  const period = (searchParams.get('period') || '') as TrendPeriod

  if (!farmId || !type || !period) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }
  if (!['1w', '1m', '3m', '6m'].includes(period)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
  }
  if (!['eggs', 'deaths', 'sales', 'birds'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const { profile } = await getSessionProfile()

  // FARM_USER must be assigned to the farm; ADMIN/SYSTEM_OWNER have separate dashboards.
  if (profile.role !== 'FARM_USER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const ok = await isFarmAssignedToUser(profile.id, farmId)
  if (!ok) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const trend =
      type === 'eggs'
        ? await getEggsTrend(farmId, period)
        : type === 'deaths'
          ? await getDeathsTrend(farmId, period)
          : type === 'sales'
            ? await getSalesTrend(farmId, period)
            : await getLiveBirdsTrend(farmId, period)

    return NextResponse.json({ trend })
  } catch (error) {
    console.error('[stats-trend]', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}

