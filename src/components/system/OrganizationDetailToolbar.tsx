'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Pencil, CreditCard, Ban, Check } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { suspendOrganization, activateOrganization } from '@/lib/actions/system'
import { toast } from 'sonner'

interface OrganizationDetailToolbarProps {
  orgId: string
  status: string
}

export function OrganizationDetailToolbar({ orgId, status }: OrganizationDetailToolbarProps) {
  const router = useRouter()
  const active = status === 'ACTIVE'

  async function toggle() {
    const res = active
      ? await suspendOrganization(orgId)
      : await activateOrganization(orgId)
    if ('error' in res) {
      toast.error(res.error)
      return
    }
    toast.success(active ? 'Organization suspended.' : 'Organization activated.')
    router.refresh()
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/system/organizations/${orgId}/edit`}
        className={cn(
          buttonVariants({ size: 'sm' }),
          'bg-primary text-white hover:bg-primary-dark'
        )}
      >
        <Pencil className="mr-1.5 h-4 w-4" />
        Edit
      </Link>
      <Link
        href={`/system/organizations/${orgId}/edit#plan-section`}
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
      >
        <CreditCard className="mr-1.5 h-4 w-4" />
        Change plan
      </Link>
      <Button
        type="button"
        variant={active ? 'destructive' : 'default'}
        size="sm"
        className={active ? '' : 'bg-primary hover:bg-primary-dark'}
        onClick={() => void toggle()}
      >
        {active ? (
          <>
            <Ban className="mr-1.5 h-4 w-4" />
            Suspend
          </>
        ) : (
          <>
            <Check className="mr-1.5 h-4 w-4" />
            Activate
          </>
        )}
      </Button>
    </div>
  )
}
