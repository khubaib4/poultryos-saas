import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Building2, DollarSign, Bird } from 'lucide-react'
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
import { getAdmin } from '@/lib/queries/system'
import { formatCurrency, formatDate } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AdminDetailToolbar } from '@/components/system/AdminDetailToolbar'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminDetailPage({ params }: PageProps) {
  const { id } = await params
  const admin = await getAdmin(id)

  if (!admin) notFound()

  const org = admin.organization

  return (
    <div className="space-y-6">
      <PageHeader
        title={admin.name}
        description={admin.email}
        action={
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <AdminDetailToolbar adminId={admin.id} status={admin.status} />
            <Link
              href="/system/admins"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              Back to admins
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          title="Farms managed"
          value={admin.activity.farmsManaged}
          icon={Bird}
        />
        <StatCard
          title="Total sales (org farms)"
          value={formatCurrency(admin.activity.totalSales)}
          icon={DollarSign}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Admin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Status</span>
              <Badge variant="outline">{admin.status}</Badge>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Phone</span>
              <span>{admin.phone ?? '—'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Joined</span>
              <span>{formatDate(admin.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {org ? (
              <>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Name</span>
                  <Link
                    href={`/system/organizations/${org.id}`}
                    className="font-medium text-primary-dark hover:underline"
                  >
                    {org.name}
                  </Link>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Plan</span>
                  <span>{org.plan}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Status</span>
                  <Badge variant="outline">{org.status ?? 'ACTIVE'}</Badge>
                </div>
              </>
            ) : (
              <p className="text-gray-500">No organization linked.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Farms in organization
          </CardTitle>
        </CardHeader>
        <CardContent>
          {admin.farms.length === 0 ? (
            <p className="text-sm text-gray-500">No farms yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admin.farms.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.name}</TableCell>
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
