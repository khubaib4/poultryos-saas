import Link from 'next/link'
import {
  Egg,
  Plus,
  BarChart3,
  Check,
  AlertTriangle,
  Skull,
  Bird,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { ClickableStatCard } from '@/components/dashboard/ClickableStatCard'
import { EggProductionChart } from '@/components/dashboard/EggProductionChart'
import { VitalInsights } from '@/components/dashboard/VitalInsights'
import { UpgradePromo } from '@/components/dashboard/UpgradePromo'
import { getSessionProfile } from '@/lib/auth/session'
import { getFarmDashboardPack } from '@/lib/queries/farm-dashboard'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { formatCurrency } from '@/lib/utils'
import { withFarmQuery } from '@/lib/farm-worker-nav'

interface FarmDashboardProps {
  searchParams: Promise<{ farm?: string }>
}

function greetingLine(name: string, farmLabel: string) {
  const h = new Date().getHours()
  const salute = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  const first = name.split(/\s+/)[0] ?? name
  return `${salute}, ${first}. Here's ${farmLabel}'s status.`
}

function trendFromPct(
  pct: number | null,
  direction: 'up' | 'down' | 'steady',
  suffix: string,
): { value: string; direction: 'up' | 'down' | 'steady' } {
  if (pct == null || direction === 'steady' || Math.abs(pct) < 0.05) {
    return { value: 'Steady', direction: 'steady' }
  }
  return {
    value: `${Math.abs(pct).toFixed(1)}% ${suffix}`,
    direction,
  }
}

export default async function FarmDashboard({
  searchParams,
}: FarmDashboardProps) {
  const { profile } = await getSessionProfile()
  const sp = await searchParams
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) {
    return (
      <div className="space-y-4">
        <PageHeader title="Farm workspace" />
        <p className="text-sm text-gray-600">
          When an admin assigns you to a farm, your dashboard and tools will
          appear here.
        </p>
      </div>
    )
  }

  const farmName = assigned.find((f) => f.id === farmId)?.name ?? 'your farm'
  const pack = await getFarmDashboardPack(
    farmId,
    profile.organization_id ?? '',
  )

  const reportsHref = withFarmQuery('/farm/reports', farmId)
  const dailyNewHref = withFarmQuery('/farm/daily-entry/new', farmId)
  const salesNewHref = withFarmQuery('/farm/sales/new', farmId)

  const eggsTrend = trendFromPct(
    pack.eggsWeekTrendPct,
    pack.eggsTrendDirection,
    'vs last week',
  )
  const salesTrend = trendFromPct(
    pack.salesTrendPct,
    pack.salesTrendDirection,
    'vs yesterday',
  )

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Morning overview
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 md:text-[26px] md:leading-8">
            {greetingLine(profile.name, farmName)}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={dailyNewHref}>
            <Button variant="primarySimple" className="gap-2 rounded-xl">
              <Plus className="h-4 w-4" />
              Add daily entry
            </Button>
          </Link>
          <Link href={salesNewHref}>
            <Button variant="outline" className="rounded-xl shadow-sm">
              New sale
            </Button>
          </Link>
          <Link href={reportsHref}>
            <Button variant="outline" className="rounded-xl shadow-sm">
              View reports
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <ClickableStatCard
          icon={<Egg className="h-6 w-6 text-blue-600" aria-hidden />}
          iconBg="bg-blue-100 text-blue-600"
          label="Total eggs"
          value={pack.eggsWeekTotal.toLocaleString()}
          trend={eggsTrend}
          farmId={farmId}
          statType="eggs"
        />
        <ClickableStatCard
          icon={<Skull className="h-6 w-6 text-red-600" aria-hidden />}
          iconBg="bg-red-100 text-red-600"
          label="Total deaths"
          value={pack.deathsWeekTotal.toLocaleString()}
          trend={{
            value:
              pack.deathsWeekTrendPct == null
                ? 'Steady'
                : `${Math.abs(pack.deathsWeekTrendPct).toFixed(1)}% vs last week`,
            direction: pack.deathsTrendDirection,
          }}
          farmId={farmId}
          statType="deaths"
        />
        <ClickableStatCard
          icon={<BarChart3 className="h-6 w-6 text-emerald-600" aria-hidden />}
          iconBg="bg-emerald-100 text-emerald-600"
          label="Today's sales"
          value={formatCurrency(pack.salesToday)}
          trend={salesTrend}
          farmId={farmId}
          statType="sales"
          formatValue={(v) => formatCurrency(v)}
        />
        <ClickableStatCard
          icon={<Bird className="h-6 w-6 text-purple-600" aria-hidden />}
          iconBg="bg-purple-100 text-purple-600"
          label="Live birds"
          value={pack.liveBirdsCount.toLocaleString()}
          trend={{ value: 'Real-time count', direction: 'steady' }}
          farmId={farmId}
          statType="birds"
        />
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Egg production
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Daily yield for current week
                </p>
              </div>
              <Badge
                variant="outline"
                className="w-fit shrink-0 border-primary/40 bg-primary-lighter/60 text-xs font-semibold uppercase tracking-wide text-primary-dark"
              >
                Weekly
              </Badge>
            </div>
            <div className="mt-4">
              <EggProductionChart data={pack.weeklyEggs} className="h-[280px] w-full min-w-0" />
            </div>
          </div>

          <UpgradePromo href={reportsHref} />
        </div>

        <div className="lg:col-span-1">
          <VitalInsights insights={pack.vitalInsights} />
        </div>
      </section>
    </div>
  )
}
