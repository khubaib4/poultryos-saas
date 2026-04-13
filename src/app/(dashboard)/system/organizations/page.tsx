import Link from 'next/link'
import { Building2, Plus } from 'lucide-react'
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
import { getOrganizations } from '@/lib/queries/system'
import type { OrgPlanFilter, OrgStatusFilter } from '@/lib/queries/system'
import { cn, formatDate } from '@/lib/utils'
import { OrganizationActions } from '@/components/system/OrganizationActions'

interface PageProps {
  searchParams: Promise<{
    q?: string
    plan?: string
    status?: string
  }>
}

function parsePlan(p?: string): OrgPlanFilter {
  if (p === 'FREE' || p === 'BASIC' || p === 'PREMIUM') return p
  return 'all'
}

function parseStatus(p?: string): OrgStatusFilter {
  if (p === 'ACTIVE' || p === 'INACTIVE') return p
  return 'all'
}

export default async function SystemOrganizationsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const search = sp.q?.trim() ?? ''
  const plan = parsePlan(sp.plan)
  const status = parseStatus(sp.status)

  const rows = await getOrganizations({ search: search || undefined, plan, status })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        description="All organizations on the platform"
        action={
          <Link
            href="/system/organizations/new"
            className={cn(
              buttonVariants(),
              'bg-primary text-white hover:bg-primary-dark'
            )}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add organization
          </Link>
        }
      />

      <form
        method="get"
        className="flex flex-col gap-3 rounded-xl border bg-white p-4 lg:flex-row lg:flex-wrap lg:items-end"
      >
        <div className="grid gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:gap-3">
          <div className="space-y-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-500">Search</label>
            <Input name="q" placeholder="Name" defaultValue={search} className="h-9" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Plan</label>
            <select
              name="plan"
              defaultValue={plan}
              className="flex h-9 w-full min-w-[140px] rounded-lg border border-input bg-background px-2 text-sm"
            >
              <option value="all">All</option>
              <option value="FREE">Free</option>
              <option value="BASIC">Basic</option>
              <option value="PREMIUM">Premium</option>
            </select>
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
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
        <button type="submit" className={cn(buttonVariants({ variant: 'secondary' }))}>
          Apply
        </button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No organizations"
          description="Adjust filters or add an organization."
        />
      ) : (
        <div className="rounded-xl border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Farms</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/system/organizations/${o.id}`}
                      className="text-primary-dark hover:underline"
                    >
                      {o.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{o.admin_name ?? '—'}</div>
                    <div className="text-xs text-gray-500">{o.admin_email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{o.plan}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{o.farms_count}</TableCell>
                  <TableCell className="text-right tabular-nums">{o.users_count}</TableCell>
                  <TableCell>
                    <Badge
                      variant={o.status === 'ACTIVE' ? 'default' : 'secondary'}
                      className={
                        o.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : ''
                      }
                    >
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-gray-600">
                    {formatDate(o.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <OrganizationActions orgId={o.id} status={o.status} />
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
