import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSessionProfile } from '@/lib/auth/session'
import { getFarm } from '@/lib/queries/farms'

interface NewFlockPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminNewFlockRedirectPage({
  params,
}: NewFlockPageProps) {
  const { id: farmId } = await params
  const { profile } = await getSessionProfile()

  const farm = await getFarm(farmId)
  if (!farm || farm.organization_id !== profile.organization_id) notFound()

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href={`/admin/farms/${farmId}/flocks`}>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back to Flocks
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-5 w-5 text-blue-600" />
            Flocks are managed by farm workers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <p>
            Admins no longer create or edit flocks here. Assigned workers add and
            update batches from the <strong>Farm</strong> area after they sign in.
          </p>
          <p>
            Share the worker login with your team. They should open{' '}
            <strong>Flocks</strong> in the sidebar (with the correct farm
            selected) to add a batch.
          </p>
          <p className="text-xs text-gray-500">
            Farm overview:{' '}
            <Link
              href={`/admin/farms/${farmId}`}
              className="font-medium text-primary-dark underline-offset-2 hover:underline"
            >
              {farm.name}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
