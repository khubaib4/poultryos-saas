import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FarmForm } from '@/components/farms/FarmForm'
import { getSessionProfile } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export default async function NewFarmPage() {
  const { profile } = await getSessionProfile()
  if (!profile.organization_id) redirect('/login')

  // Check the farm limit before even showing the form
  const supabase = await createClient()
  const [orgRes, countRes] = await Promise.all([
    supabase
      .from('organizations')
      .select('max_farms')
      .eq('id', profile.organization_id)
      .single(),
    supabase
      .from('farms')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', profile.organization_id),
  ])

  const maxFarms = orgRes.data?.max_farms ?? 0
  const currentCount = countRes.count ?? 0
  const atLimit = currentCount >= maxFarms

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/farms">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back to Farms
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Farm</CardTitle>
          <CardDescription>
            Set up a new farm in your organization. You currently have{' '}
            <strong>{currentCount}</strong> of <strong>{maxFarms}</strong> farms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {atLimit ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Farm limit reached</p>
                <p className="mt-1 text-sm text-gray-500">
                  Your plan allows a maximum of {maxFarms} farm
                  {maxFarms === 1 ? '' : 's'}. Please upgrade your plan to add
                  more farms.
                </p>
              </div>
              <div className="flex gap-3">
                <Link href="/admin/farms">
                  <Button variant="outline">Back to Farms</Button>
                </Link>
                <Link href="/admin/settings">
                  <Button className="bg-primary hover:bg-primary-dark">
                    Upgrade Plan
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <FarmForm organizationId={profile.organization_id} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
