'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createOrganizationWithAdmin } from '@/lib/actions/system'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const PLAN_DEFAULTS: Record<'FREE' | 'BASIC' | 'PREMIUM', { maxFarms: number; maxUsers: number }> =
  {
    FREE: { maxFarms: 1, maxUsers: 5 },
    BASIC: { maxFarms: 5, maxUsers: 25 },
    PREMIUM: { maxFarms: 20, maxUsers: 100 },
  }

export function CreateOrganizationForm() {
  const router = useRouter()
  const [pending, start] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const plan = (fd.get('plan') as string) as 'FREE' | 'BASIC' | 'PREMIUM'
    const defaults = PLAN_DEFAULTS[plan] ?? PLAN_DEFAULTS.FREE

    start(async () => {
      const res = await createOrganizationWithAdmin({
        organizationName: String(fd.get('organizationName') ?? ''),
        adminName: String(fd.get('adminName') ?? ''),
        adminEmail: String(fd.get('adminEmail') ?? ''),
        adminPhone: String(fd.get('adminPhone') ?? '') || null,
        adminPassword: String(fd.get('adminPassword') ?? ''),
        plan,
        maxFarms: Number(fd.get('maxFarms') ?? defaults.maxFarms),
        maxUsers: Number(fd.get('maxUsers') ?? defaults.maxUsers),
      })
      if ('error' in res) {
        toast.error(res.error)
        return
      }
      toast.success('Organization and admin created.')
      router.push(`/system/organizations/${res.organizationId}`)
    })
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-4">
      <div className="space-y-2">
        <Label htmlFor="organizationName">Organization name</Label>
        <Input id="organizationName" name="organizationName" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="adminName">Admin name</Label>
          <Input id="adminName" name="adminName" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="adminEmail">Admin email</Label>
          <Input id="adminEmail" name="adminEmail" type="email" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="adminPhone">Admin phone (optional)</Label>
        <Input id="adminPhone" name="adminPhone" type="tel" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="adminPassword">Admin password</Label>
        <Input
          id="adminPassword"
          name="adminPassword"
          type="password"
          minLength={8}
          required
        />
        <p className="text-xs text-gray-500">Minimum 8 characters. Share securely with the admin.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="plan">Plan</Label>
        <select
          id="plan"
          name="plan"
          required
          defaultValue="FREE"
          className={cn(
            'flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm'
          )}
        >
          <option value="FREE">Free</option>
          <option value="BASIC">Basic</option>
          <option value="PREMIUM">Premium</option>
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="maxFarms">Max farms</Label>
          <Input
            id="maxFarms"
            name="maxFarms"
            type="number"
            min={1}
            defaultValue={PLAN_DEFAULTS.FREE.maxFarms}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxUsers">Max users</Label>
          <Input
            id="maxUsers"
            name="maxUsers"
            type="number"
            min={1}
            defaultValue={PLAN_DEFAULTS.FREE.maxUsers}
          />
        </div>
      </div>
      <Button type="submit" disabled={pending} className="bg-primary hover:bg-primary-dark">
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating…
          </>
        ) : (
          'Create organization'
        )}
      </Button>
    </form>
  )
}
