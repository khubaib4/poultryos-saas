import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { DailyEntryForm } from '@/components/daily-entries/DailyEntryForm'
import { getSessionProfile } from '@/lib/auth/session'
import { getFlocks } from '@/lib/queries/flocks'
import { getDailyEntry } from '@/lib/queries/daily-entries'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import type { DeathCause } from '@/types/database'

interface PageProps {
  params: Promise<{ entryId: string }>
  searchParams: Promise<{ farm?: string }>
}

export default async function WorkerEditDailyEntryPage({
  params,
  searchParams,
}: PageProps) {
  const { entryId } = await params
  const sp = await searchParams
  const { profile } = await getSessionProfile()
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) notFound()

  const entry = await getDailyEntry(entryId)
  if (!entry || entry.flocks?.farm_id !== farmId) notFound()
  if (!assigned.some((f) => f.id === farmId)) notFound()

  const flocks = await getFlocks(farmId)
  const activeFlocks = flocks.filter((f) => f.status === 'active')
  const entryFlock = flocks.find((f) => f.id === entry.flock_id)
  const formFlocks =
    entryFlock && !activeFlocks.some((f) => f.id === entryFlock.id)
      ? [entryFlock, ...activeFlocks]
      : activeFlocks

  const deathCause = entry.death_cause as DeathCause | null | undefined
  const validCauses: DeathCause[] = [
    'Disease',
    'Heat Stress',
    'Predator',
    'Unknown',
    'Other',
  ]
  const deathCauseValue =
    deathCause && validCauses.includes(deathCause) ? deathCause : ''

  const listPath = withFarmQuery('/farm/daily-entry', farmId)

  return (
    <div className="space-y-6">
      <Link href={listPath}>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Daily Entries
        </Button>
      </Link>

      <PageHeader
        title="Edit daily entry"
        description={`${entry.flocks?.batch_number ?? 'Flock'} · ${entry.date}`}
      />

      <div className="max-w-2xl rounded-xl border bg-white p-6">
        <DailyEntryForm
          farmId={farmId}
          activeFlocks={formFlocks}
          entryId={entryId}
          entriesListPath={listPath}
          ui="stitch"
          initialValues={{
            date: entry.date,
            flock_id: entry.flock_id,
            eggs_grade_a: entry.eggs_grade_a ?? 0,
            eggs_grade_b: entry.eggs_grade_b ?? 0,
            eggs_cracked: entry.eggs_cracked ?? 0,
            deaths: entry.deaths ?? 0,
            death_cause: deathCauseValue,
            feed_consumed:
              entry.feed_consumed != null
                ? Number(entry.feed_consumed)
                : null,
            notes: entry.notes ?? '',
          }}
        />
      </div>
    </div>
  )
}
