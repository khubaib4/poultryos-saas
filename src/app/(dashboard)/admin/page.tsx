import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Bird,
  Building2,
  Egg,
  TrendingUp,
  Plus,
  BarChart3,
  CalendarDays,
  MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/shared/StatCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getDashboardStats,
  getOrganizationEggTrend,
  getRecentActivity,
} from '@/lib/queries/dashboard'
import { getFarms } from '@/lib/queries/farms'
import { buildEggChartSeries, formatCurrency, formatDate } from '@/lib/utils'
import { EggProductionAreaChart } from '@/components/dashboard/EggProductionAreaChart'

export default async function AdminDashboard() {
  const { profile } = await getSessionProfile()

  if (!profile.organization_id) redirect('/login')

  const [stats, recentActivity, farms, eggTrendRows] = await Promise.all([
    getDashboardStats(profile.organization_id),
    getRecentActivity(profile.organization_id),
    getFarms(profile.organization_id),
    getOrganizationEggTrend(profile.organization_id),
  ])
  const eggChartData = buildEggChartSeries(eggTrendRows)

  const today = new Date().toLocaleDateString('en-PK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Welcome back, {profile.name.split(' ')[0]} 👋
          </h2>
          <p className="text-sm text-gray-500">
            {stats.organization?.name ?? 'Your Organization'} &middot; {today}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/farms/new">
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Add Farm
            </Button>
          </Link>
          <Link href="/admin/reports">
            <Button variant="outline" size="sm">
              <BarChart3 className="mr-1.5 h-4 w-4" />
              Reports
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Farms"
          value={stats.farms_count}
          description={`of ${stats.organization?.max_farms ?? '—'} allowed`}
          icon={Building2}
          iconTone="blue"
        />
        <StatCard
          title="Total Birds"
          value={stats.total_birds.toLocaleString()}
          description="Across all active flocks"
          icon={Bird}
          iconTone="primary"
        />
        <StatCard
          title="Today's Eggs"
          value={stats.today_eggs.toLocaleString()}
          description="Eggs collected today"
          icon={Egg}
          iconTone="amber"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(stats.monthly_revenue)}
          description="Sales this month"
          icon={TrendingUp}
          iconTone="green"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg font-semibold">
            Egg production (all farms)
          </CardTitle>
          <Egg className="h-5 w-5 text-gray-400" />
        </CardHeader>
        <CardContent className="pt-0">
          <EggProductionAreaChart
            data={eggChartData}
            className="h-[260px] w-full min-w-0"
          />
        </CardContent>
      </Card>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Recent Activity — spans 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">
              Recent Activity
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">
                No daily entries recorded yet. Farm workers add entries from the
                Farm workspace once flocks are set up.
              </p>
            ) : (
              <div className="space-y-0">
                <div className="grid grid-cols-4 border-b pb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <span>Date</span>
                  <span>Farm</span>
                  <span className="text-right">Eggs</span>
                  <span className="text-right">Deaths</span>
                </div>
                {recentActivity.map((entry) => (
                  <div
                    key={entry.id}
                    className="grid grid-cols-4 items-center border-b py-3 text-sm last:border-0"
                  >
                    <span className="text-gray-600">
                      {formatDate(entry.date)}
                    </span>
                    <span className="font-medium text-gray-900 truncate pr-2">
                      {entry.farm_name}
                    </span>
                    <span className="text-right text-gray-900">
                      {(entry.eggs_collected ?? 0).toLocaleString()}
                    </span>
                    <span
                      className={`text-right ${
                        (entry.deaths ?? 0) > 0
                          ? 'text-red-600 font-medium'
                          : 'text-gray-500'
                      }`}
                    >
                      {entry.deaths ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <Link href="/admin/farms/new" className="block">
              <Button className="w-full gap-2" size="sm">
                <Plus className="h-4 w-4" />
                Add new farm
              </Button>
            </Link>
            <Link href="/admin/farms" className="block">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                size="sm"
              >
                <Bird className="h-4 w-4 text-primary" />
                View farms
              </Button>
            </Link>
            <Link href="/admin/reports" className="block">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                size="sm"
              >
                <BarChart3 className="h-4 w-4 text-primary" />
                View reports
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Farms Overview */}
      <div>
        <PageHeader
          title="Farms Overview"
          action={
            <Link href="/admin/farms">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          }
        />

        {farms.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No farms yet"
            description="Add your first farm to start tracking flocks and production."
            action={
              <Link href="/admin/farms/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Farm
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {farms.slice(0, 6).map((farm) => (
              <Link key={farm.id} href={`/admin/farms/${farm.id}`}>
                <Card className="cursor-pointer transition-shadow hover:shadow-card-md">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 truncate">
                          {farm.name}
                        </p>
                        {farm.location && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 truncate">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {farm.location}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={
                          farm.status === 'ACTIVE'
                            ? 'success'
                            : farm.status === 'SUSPENDED'
                              ? 'warning'
                              : 'error'
                        }
                      >
                        {farm.status === 'ACTIVE'
                          ? 'Active'
                          : farm.status === 'SUSPENDED'
                            ? 'Suspended'
                            : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-3">
                      <div>
                        <p className="text-xs text-gray-500">Flocks</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {farm.flocks_count}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Birds</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {farm.total_birds.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
