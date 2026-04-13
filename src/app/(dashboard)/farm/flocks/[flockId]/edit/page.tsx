import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { FlockForm } from '@/components/flocks/FlockForm'
import { DeleteFlockButton } from '@/components/flocks/DeleteFlockButton'
import { getSessionProfile } from '@/lib/auth/session'
import { getFlock } from '@/lib/queries/flocks'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { withFarmQuery } from '@/lib/farm-worker-nav'

interface PageProps {
  params: Promise<{ flockId: string }>
  searchParams: Promise<{ farm?: string }>
}

export default async function FarmEditFlockPage({
  params,
  searchParams,
}: PageProps) {
  const { flockId } = await params
  const sp = await searchParams
  const { profile } = await getSessionProfile()
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) notFound()
  if (!assigned.some((f) => f.id === farmId)) notFound()

  const flock = await getFlock(flockId)
  if (!flock || flock.farm_id !== farmId) notFound()

  const detailPath = withFarmQuery(`/farm/flocks/${flockId}`, farmId)

  return (
    <div className="space-y-6">
      <Link href={detailPath}>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back to Flock
        </Button>
      </Link>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Edit Flock</h2>
        <p className="mt-1 text-sm text-gray-500">
          Update details for{' '}
          <span className="font-medium">{flock.batch_number}</span>.
        </p>
      </div>

      <Card className="max-w-2xl shadow-sm ring-1 ring-black/[0.04]">
        <CardHeader>
          <CardTitle className="text-base">Flock Details</CardTitle>
        </CardHeader>
        <CardContent>
          <FlockForm
            farmId={farmId}
            flockId={flockId}
            navBase="farm"
            initialValues={{
              batch_number: flock.batch_number,
              breed: flock.breed,
              initial_count: flock.initial_count,
              current_count: flock.current_count,
              age_at_arrival: flock.age_at_arrival,
              arrival_date: flock.arrival_date,
              status: flock.status,
              notes: flock.notes ?? '',
            }}
          />
        </CardContent>
      </Card>

      <Separator />

      <Card className="max-w-2xl shadow-sm ring-1 ring-red-200">
        <CardHeader>
          <CardTitle className="text-base text-red-700">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Delete this flock</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Permanently removes the flock and all its daily entries.
              </p>
            </div>
            <DeleteFlockButton
              flockId={flockId}
              flockLabel={flock.batch_number}
              farmId={farmId}
              variant="button"
              navBase="farm"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
