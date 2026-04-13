'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateOrganization } from '@/lib/actions/system'
import type { Organization } from '@/types/database'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export interface EditOrganizationInitial {
  name: string
  plan: Organization['plan']
  plan_status: Organization['plan_status']
  status: 'ACTIVE' | 'INACTIVE'
  max_farms: number
  max_users: number
}

interface EditOrganizationFormProps {
  organizationId: string
  initial: EditOrganizationInitial
}

export function EditOrganizationForm({ organizationId, initial }: EditOrganizationFormProps) {
  const router = useRouter()
  const [pending, start] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    const plan = String(fd.get('plan') ?? initial.plan) as Organization['plan']
    const plan_status = String(
      fd.get('plan_status') ?? initial.plan_status
    ) as Organization['plan_status']
    const status = String(fd.get('status') ?? initial.status) as 'ACTIVE' | 'INACTIVE'

    start(async () => {
      const res = await updateOrganization(organizationId, {
        name: String(fd.get('name') ?? '').trim(),
        plan,
        plan_status,
        status,
        max_farms: Number(fd.get('max_farms') ?? initial.max_farms),
        max_users: Number(fd.get('max_users') ?? initial.max_users),
      })
      if ('error' in res) {
        toast.error(res.error)
        return
      }
      toast.success('Organization updated.')
      router.push(`/system/organizations/${organizationId}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Organization name</Label>
        <Input id="name" name="name" required defaultValue={initial.name} />
      </div>

      <div id="plan-section" className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="plan-select">Plan</Label>
          <select
            id="plan-select"
            name="plan"
            required
            defaultValue={initial.plan}
            className={cn(
              'flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm'
            )}
          >
            <option value="FREE">Free</option>
            <option value="BASIC">Basic</option>
            <option value="PREMIUM">Premium</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan_status">Plan billing status</Label>
          <select
            id="plan_status"
            name="plan_status"
            required
            defaultValue={initial.plan_status}
            className={cn(
              'flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm'
            )}
          >
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Organization status</Label>
        <select
          id="status"
          name="status"
          required
          defaultValue={initial.status}
          className={cn(
            'flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm'
          )}
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive (suspended)</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="max_farms">Max farms</Label>
          <Input
            id="max_farms"
            name="max_farms"
            type="number"
            min={1}
            required
            defaultValue={initial.max_farms}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max_users">Max users</Label>
          <Input
            id="max_users"
            name="max_users"
            type="number"
            min={1}
            required
            defaultValue={initial.max_users}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending} className="bg-primary hover:bg-primary-dark">
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save changes'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => router.push(`/system/organizations/${organizationId}`)}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
