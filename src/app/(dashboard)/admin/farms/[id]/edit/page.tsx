import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { FarmForm } from '@/components/farms/FarmForm'
import { DeleteFarmButton } from '@/components/farms/DeleteFarmButton'
import { getSessionProfile } from '@/lib/auth/session'
import { getFarm } from '@/lib/queries/farms'
import type { UserStatus } from '@/types/database'

interface EditFarmPageProps {
  params: Promise<{ id: string }>
}

export default async function EditFarmPage({ params }: EditFarmPageProps) {
  const { id } = await params
  const { profile } = await getSessionProfile()

  const farm = await getFarm(id)

  if (!farm || farm.organization_id !== profile.organization_id) notFound()

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/admin/farms/${farm.id}`}>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back to Farm
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Farm</CardTitle>
          <CardDescription>
            Update the details for <strong>{farm.name}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FarmForm
            organizationId={farm.organization_id}
            farmId={farm.id}
            initialValues={{
              name: farm.name,
              location: farm.location ?? '',
              status: farm.status as 'ACTIVE' | 'INACTIVE',
            }}
          />
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-red-700">Danger Zone</CardTitle>
          <CardDescription>
            Deleting a farm is permanent and cannot be undone. All associated
            flocks, daily entries, and sales will be removed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Separator className="mb-4" />
          <DeleteFarmButton
            farmId={farm.id}
            farmName={farm.name}
            variant="button"
          />
        </CardContent>
      </Card>
    </div>
  )
}
