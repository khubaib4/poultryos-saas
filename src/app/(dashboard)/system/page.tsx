import Link from 'next/link'
import { Building2, Users, Bird, UserCheck, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'
import {
  getSystemStats,
  getRecentActivity,
  getPlatformHealth,
} from '@/lib/queries/system'
import { formatDate } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default async function SystemDashboard() {
  const [stats, recent, health] = await Promise.all([
    getSystemStats(),
    getRecentActivity(8),
    getPlatformHealth(),
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        title="System dashboard"
        description="Platform-wide overview"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total organizations
            </CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.totalOrganizations}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total admins
            </CardTitle>
            <UserCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.totalAdmins}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total farms
            </CardTitle>
            <Bird className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalFarms}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active users
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.totalActiveUsers}
            </div>
            <p className="text-xs text-gray-500 mt-1">Users with ACTIVE status</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent organizations</CardTitle>
            <Link
              href="/system/organizations"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1')}
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent.recentOrganizations.length === 0 ? (
              <p className="text-sm text-gray-500">No organizations yet.</p>
            ) : (
              recent.recentOrganizations.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0"
                >
                  <div>
                    <Link
                      href={`/system/organizations/${o.id}`}
                      className="font-medium text-primary-dark hover:underline"
                    >
                      {o.name}
                    </Link>
                    <p className="text-xs text-gray-500">{formatDate(o.created_at)}</p>
                  </div>
                  <Badge variant="secondary">{o.plan}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recently registered admins</CardTitle>
            <Link
              href="/system/admins"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1')}
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent.recentAdmins.length === 0 ? (
              <p className="text-sm text-gray-500">No admins yet.</p>
            ) : (
              recent.recentAdmins.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0"
                >
                  <div>
                    <Link
                      href={`/system/admins/${a.id}`}
                      className="font-medium text-primary-dark hover:underline"
                    >
                      {a.name}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {a.email} · {a.organization_name ?? '—'}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(a.created_at)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform health</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Organizations by plan</h4>
            <ul className="space-y-1 text-sm">
              {health.byPlan.length === 0 ? (
                <li className="text-gray-500">No data</li>
              ) : (
                health.byPlan.map((p) => (
                  <li key={p.plan} className="flex justify-between">
                    <span>{p.plan}</span>
                    <span className="font-medium">{p.count}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Active vs inactive</h4>
            <ul className="space-y-1 text-sm">
              <li className="flex justify-between">
                <span>Active</span>
                <span className="font-medium text-primary-dark">{health.orgActive}</span>
              </li>
              <li className="flex justify-between">
                <span>Inactive / suspended</span>
                <span className="font-medium text-amber-700">{health.orgInactive}</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
