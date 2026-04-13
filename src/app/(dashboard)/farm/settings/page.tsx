import { Suspense } from 'react'
import { Settings } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { FarmOfflineSettings } from '@/components/offline/FarmOfflineSettings'
import { EggCategoryList } from '@/components/egg-categories/EggCategoryList'
import { getSessionProfile } from '@/lib/auth/session'
import { getAllEggCategories } from '@/lib/queries/egg-categories'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { EmptyState } from '@/components/shared/EmptyState'

interface PageProps {
  searchParams: Promise<{ farm?: string }>
}

export default async function FarmSettingsPage({ searchParams }: PageProps) {
  const { profile } = await getSessionProfile()
  const sp = await searchParams
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) {
    return (
      <EmptyState
        icon={Settings}
        title="Select a farm"
        description="Choose an assigned farm to manage offline settings."
      />
    )
  }

  const farmName = assigned.find((f) => f.id === farmId)?.name ?? 'Farm'
  const eggCategories = await getAllEggCategories(farmId)

  return (
    <div className="space-y-8">
      <PageHeader title="Farm settings" description={farmName} />
      <EggCategoryList farmId={farmId} initialCategories={eggCategories} />
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl border bg-muted/40" />}>
        <FarmOfflineSettings farmId={farmId} />
      </Suspense>
    </div>
  )
}
