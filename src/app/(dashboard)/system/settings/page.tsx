import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SystemSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="System settings"
        description="Platform-wide defaults and templates (placeholders)"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Platform name</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="platformName">Display name</Label>
            <Input
              id="platformName"
              name="platformName"
              defaultValue="PoultryOS"
              disabled
              className="max-w-md"
            />
            <p className="text-xs text-gray-500">
              Global branding will be configurable in a future release.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Default plan settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <p>
              Default limits when creating organizations: Free (1 farm, 5 users), Basic (5 farms,
              25 users), Premium (20 farms, 100 users). Adjust per organization on the
              organization edit screen.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Email templates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Transactional email content and Supabase templates will be managed here. Not
              implemented yet.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
