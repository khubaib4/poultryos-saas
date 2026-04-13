import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { CreateOrganizationForm } from '@/components/system/CreateOrganizationForm'
import { cn } from '@/lib/utils'

export default function NewOrganizationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Add organization"
        description="Create an organization and its primary admin account"
        action={
          <Link
            href="/system/organizations"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            Back to list
          </Link>
        }
      />
      <CreateOrganizationForm />
    </div>
  )
}
