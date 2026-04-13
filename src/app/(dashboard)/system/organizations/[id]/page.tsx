import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Building2, Users, DollarSign, CreditCard } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatCard } from '@/components/shared/StatCard'
import { getOrganization } from '@/lib/queries/system'
import { formatCurrency, formatDate } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { OrganizationDetailToolbar } from '@/components/system/OrganizationDetailToolbar'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function OrganizationDetailPage({ params }: PageProps) {
  const { id } = await params
  const org = await getOrganization(id)

  if (!org) notFound()

  const admin = org.admin

  return (
    <div className="space-y-6">
      <PageHeader
        title={org.name}
        description={`Created ${formatDate(org.created_at)}`}
        action={
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <OrganizationDetailToolbar orgId={org.id} status={org.status} />
            <Link
              href="/system/organizations"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              Back to organizations
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Farms" value={org.farms_count} icon={Building2} />
        <StatCard title="Users" value={org.users_count} icon={Users} />
        <StatCard
          title="Total sales"
          value={formatCurrency(org.total_sales)}
          icon={DollarSign}
        />
        <StatCard
          title="Plan"
          value={org.plan}
          description={org.plan_status}
          icon={CreditCard}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Status</span>
              <Badge variant={org.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {org.status}
              </Badge>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Plan</span>
              <span className="font-medium">{org.plan}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Billing</span>
              <span>{org.plan_status}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Max farms</span>
              <span className="tabular-nums">{org.max_farms}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Max users</span>
              <span className="tabular-nums">{org.max_users}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Primary admin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {admin ? (
              <>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Name</span>
                  <Link
                    href={`/system/admins/${admin.id}`}
                    className="font-medium text-primary-dark hover:underline"
                  >
                    {admin.name}
                  </Link>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Email</span>
                  <span className="text-right break-all">{admin.email}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Phone</span>
                  <span>{admin.phone ?? '—'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Status</span>
                  <Badge variant="outline">{admin.status}</Badge>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Joined</span>
                  <span>{formatDate(admin.created_at)}</span>
                </div>
              </>
            ) : (
              <p className="text-gray-500">No admin user linked.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Farms in this organization</CardTitle>
        </CardHeader>
        <CardContent>
          {org.farms.length === 0 ? (
            <p className="text-sm text-gray-500">No farms yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {org.farms.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{f.status}</Badge>
                      </TableCell>
                      <TableCell className="text-gray-600 whitespace-nowrap">
                        {formatDate(f.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
