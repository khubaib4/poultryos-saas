import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FlockForm } from '@/components/flocks/FlockForm'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { suggestBatchNumber } from '@/lib/queries/flocks'
import { withFarmQuery } from '@/lib/farm-worker-nav'

interface PageProps {
  searchParams: Promise<{ farm?: string }>
}

export default async function FarmNewFlockPage({ searchParams }: PageProps) {
  const { profile } = await getSessionProfile()
  const sp = await searchParams
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) notFound()
  if (!assigned.some((f) => f.id === farmId)) notFound()

  const farmName = assigned.find((f) => f.id === farmId)?.name ?? 'Farm'
  const suggestedBatch = await suggestBatchNumber(farmId)
  const listPath = withFarmQuery('/farm/flocks', farmId)

  return (
    <div className="space-y-6">
      <Link href={listPath}>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back to Flocks
        </Button>
      </Link>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Add New Flock</h2>
        <p className="mt-1 text-sm text-gray-500">
          Starting a new batch at <span className="font-medium">{farmName}</span>.
        </p>
      </div>

      <Card className="max-w-2xl shadow-sm ring-1 ring-black/[0.04]">
        <CardHeader>
          <CardTitle className="text-base">Flock Details</CardTitle>
        </CardHeader>
        <CardContent>
          <FlockForm
            farmId={farmId}
            navBase="farm"
            initialValues={{ batch_number: suggestedBatch }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
