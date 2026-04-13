import Link from 'next/link'
import { UserCheck } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { getAdmins } from '@/lib/queries/system'
import type { AdminStatusFilter } from '@/lib/queries/system'
import { cn, formatDate } from '@/lib/utils'
import { AdminRowActions } from '@/components/system/AdminRowActions'

interface PageProps {
  searchParams: Promise<{
    q?: string
    status?: string
  }>
}

function parseStatus(p?: string): AdminStatusFilter {
  if (p === 'ACTIVE' || p === 'SUSPENDED') return p
  return 'all'
}

export default async function SystemAdminsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const search = sp.q?.trim() ?? ''
  const status = parseStatus(sp.status)

  const rows = await getAdmins({ search: search || undefined, status })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admins"
        description="Organization administrators across the platform"
      />

      <form
        method="get"
        className="flex flex-col gap-3 rounded-xl border bg-white p-4 lg:flex-row lg:flex-wrap lg:items-end"
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:gap-3">
          <div className="space-y-1 min-w-[220px]">
            <label className="text-xs font-medium text-gray-500">Search</label>
            <Input
              name="q"
              placeholder="Name or email"
              defaultValue={search}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Status</label>
            <select
              name="status"
              defaultValue={status}
              className="flex h-9 w-full min-w-[140px] rounded-lg border border-input bg-background px-2 text-sm"
            >
              <option value="all">All</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>
        <button type="submit" className={cn(buttonVariants({ variant: 'secondary' }))}>
          Apply
        </button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="No admins"
          description="Adjust filters or create an organization with an admin."
        />
      ) : (
        <div className="rounded-xl border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead className="text-right">Farms</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/system/admins/${a.id}`}
                      className="text-primary-dark hover:underline"
                    >
                      {a.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 break-all max-w-[200px]">
                    {a.email}
                  </TableCell>
                  <TableCell className="text-sm">
                    {a.organization_name ? (
                      <Link
                        href={`/system/organizations/${a.organization_id}`}
                        className="text-primary-dark hover:underline"
                      >
                        {a.organization_name}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{a.farms_count}</TableCell>
                  <TableCell>
                    <Badge
                      variant={a.status === 'ACTIVE' ? 'default' : 'secondary'}
                      className={
                        a.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : ''
                      }
                    >
                      {a.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-gray-600">
                    {formatDate(a.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <AdminRowActions adminId={a.id} status={a.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
