import Link from 'next/link'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { DailyEntryForm } from '@/components/daily-entries/DailyEntryForm'
import { RecentHistory } from '@/components/daily-entries/RecentHistory'
import { SmartTip } from '@/components/daily-entries/SmartTip'
import { getSessionProfile } from '@/lib/auth/session'
import { getFlocks } from '@/lib/queries/flocks'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { withFarmQuery } from '@/lib/farm-worker-nav'

interface PageProps {
  searchParams: Promise<{ farm?: string }>
}

export default async function WorkerNewDailyEntryPage({
  searchParams,
}: PageProps) {
  const { profile } = await getSessionProfile()
  const sp = await searchParams
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Select a farm"
        description="Choose an assigned farm from the header before adding an entry."
      />
    )
  }

  const farmName = assigned.find((f) => f.id === farmId)?.name ?? 'Farm'
  const flocks = await getFlocks(farmId)
  const activeFlocks = flocks.filter((f) => f.status === 'active')

  const listPath = withFarmQuery('/farm/daily-entry', farmId)

  return (
    <div className="space-y-6">
      {/* Page header row (matches Stitch screenshot within content) */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href={listPath}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold text-gray-900">
            Add Daily Entry
          </h2>
          <p className="text-sm text-gray-500">{farmName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        {/* Left: form */}
        <div className="rounded-2xl bg-white p-6 shadow-card">
          <DailyEntryForm
            farmId={farmId}
            activeFlocks={activeFlocks}
            entriesListPath={listPath}
            ui="stitch"
          />
        </div>

        {/* Right: sidebar */}
        <aside className="space-y-6">
          <RecentHistory farmId={farmId} />
          <SmartTip />
        </aside>
      </div>
    </div>
  )
}
