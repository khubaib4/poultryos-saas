import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { getSessionProfile } from '@/lib/auth/session'
import { getDashboardStats } from '@/lib/queries/dashboard'

export default async function AdminSettingsPage() {
  const { profile } = await getSessionProfile()
  if (!profile.organization_id) redirect('/login')

  const stats = await getDashboardStats(profile.organization_id)
  const org = stats.organization ?? null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization settings"
        description="High-level organization information."
        action={
          <Link href="/admin">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        }
      />

      <Card className="max-w-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Your organization</CardTitle>
          </div>
          <CardDescription>
            Plan limits and billing flows can be extended here. Farm workers use
            the Farm workspace for day-to-day operations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-muted-foreground">Name</p>
            <p className="font-medium text-gray-900">{org?.name ?? '—'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <p className="text-muted-foreground">Farm limit</p>
              <p className="font-medium tabular-nums">
                {stats.farms_count} / {org?.max_farms ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Plan</p>
              <p className="font-medium">{org?.plan ?? '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
