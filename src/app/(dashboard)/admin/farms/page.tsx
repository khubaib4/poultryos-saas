import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, MapPin, Bird, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { FarmCardActions } from '@/components/farms/FarmCardActions'
import { getSessionProfile } from '@/lib/auth/session'
import { getFarms } from '@/lib/queries/farms'
import { createClient } from '@/lib/supabase/server'

export default async function FarmsPage() {
  const { profile } = await getSessionProfile()
  if (!profile.organization_id) redirect('/login')

  const supabase = await createClient()
  const [farms, orgRes] = await Promise.all([
    getFarms(profile.organization_id),
    supabase
      .from('organizations')
      .select('max_farms, name')
      .eq('id', profile.organization_id)
      .single(),
  ])

  const maxFarms = orgRes.data?.max_farms ?? 0
  const usedPercent = maxFarms > 0 ? Math.min((farms.length / maxFarms) * 100, 100) : 0
  const atLimit = farms.length >= maxFarms

  return (
    <div className="space-y-6">
      <PageHeader
        title="Farms"
        description="Manage all farms in your organization."
        action={
          atLimit ? (
            <Button
              className="bg-primary hover:bg-primary-dark"
              disabled
              title="Farm limit reached. Upgrade your plan."
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Farm
            </Button>
          ) : (
            <Link href="/admin/farms/new">
              <Button className="bg-primary hover:bg-primary-dark">
                <Plus className="mr-2 h-4 w-4" />
                Add Farm
              </Button>
            </Link>
          )
        }
      />

      {/* Plan usage */}
      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium text-gray-700">Farm Usage</span>
          <span className={`font-semibold ${atLimit ? 'text-red-600' : 'text-gray-900'}`}>
            {farms.length} of {maxFarms} farms used
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-all ${
              atLimit ? 'bg-red-500' : usedPercent > 75 ? 'bg-yellow-500' : 'bg-primary'
            }`}
            style={{ width: `${usedPercent}%` }}
          />
        </div>
        {atLimit && (
          <p className="mt-2 text-xs text-red-600">
            Farm limit reached. Contact support to upgrade your plan.
          </p>
        )}
      </div>

      {/* Farms grid */}
      {farms.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No farms yet"
          description="Create your first farm to start managing your poultry operation."
          action={
            <Link href="/admin/farms/new">
              <Button className="bg-primary hover:bg-primary-dark">
                <Plus className="mr-2 h-4 w-4" />
                Add Farm
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {farms.map((farm) => (
            <Card
              key={farm.id}
              className="relative overflow-hidden transition-shadow hover:shadow-md"
            >
              <CardContent className="p-5">
                {/* Top row: name + dropdown */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/farms/${farm.id}`}>
                      <p className="font-semibold text-gray-900 hover:text-primary-dark truncate">
                        {farm.name}
                      </p>
                    </Link>
                    {farm.location && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {farm.location}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      className={
                        farm.status === 'ACTIVE'
                          ? 'bg-primary-light text-primary-dark hover:bg-primary-light'
                          : 'bg-gray-100 text-gray-600'
                      }
                    >
                      {farm.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </Badge>
                    <FarmCardActions farmId={farm.id} farmName={farm.name} />
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded bg-white">
                      <Bird className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Flocks</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {farm.flocks_count}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded bg-white">
                      <Bird className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Birds</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {farm.total_birds.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
