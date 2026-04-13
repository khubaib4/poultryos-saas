import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSessionProfile } from '@/lib/auth/session'
import { getFlock } from '@/lib/queries/flocks'

interface EditFlockPageProps {
  params: Promise<{ id: string; flockId: string }>
}

export default async function AdminEditFlockReadOnlyPage({
  params,
}: EditFlockPageProps) {
  const { id: farmId, flockId } = await params
  const { profile } = await getSessionProfile()

  const flock = await getFlock(flockId)

  if (
    !flock ||
    flock.farm_id !== farmId ||
    flock.farms?.organization_id !== profile.organization_id
  ) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href={`/admin/farms/${farmId}/flocks/${flockId}`}>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back to Flock
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-5 w-5 text-blue-600" />
            Editing flocks is done by farm workers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <p>
            You are viewing <strong>{flock.batch_number}</strong> as an admin.
            Changes to batches (including status and counts) are made by workers
            assigned to this farm in the Farm portal.
          </p>
          <Link href={`/admin/farms/${farmId}/flocks/${flockId}`}>
            <Button variant="outline" size="sm">
              View flock details
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
