import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/shared/PageHeader'
import { EditOrganizationForm } from '@/components/system/EditOrganizationForm'
import { getOrganization } from '@/lib/queries/system'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditOrganizationPage({ params }: PageProps) {
  const { id } = await params
  const org = await getOrganization(id)

  if (!org) notFound()

  const initial = {
    name: org.name,
    plan: org.plan,
    plan_status: org.plan_status,
    status: (org.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
    max_farms: org.max_farms,
    max_users: org.max_users,
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit organization"
        description={org.name}
        action={
          <Link
            href={`/system/organizations/${id}`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            Back to organization
          </Link>
        }
      />
      <EditOrganizationForm organizationId={id} initial={initial} />
    </div>
  )
}
