import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Users, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { getSessionProfile } from '@/lib/auth/session'
import { getOrganizationFarmWorkersList } from '@/lib/queries/farms'
import { cn } from '@/lib/utils'

export default async function AdminUsersPage() {
  const { profile } = await getSessionProfile()
  if (!profile.organization_id) redirect('/login')

  const workers = await getOrganizationFarmWorkersList(profile.organization_id)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Farm workers"
        description="People assigned to your farms. Operational access is through the Farm portal."
        action={
          <Link href="/admin">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        }
      />

      {workers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No farm workers yet"
          description="Invite or register users with the Farm User role and assign them to farms from each farm’s detail page."
        />
      ) : (
        <div className="rounded-xl border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Assigned farms</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm break-all max-w-[220px]">
                    {w.email}
                  </TableCell>
                  <TableCell className="text-sm">
                    {w.assignedFarms.length === 0 ? (
                      <span className="text-muted-foreground">None</span>
                    ) : (
                      <ul className="space-y-1">
                        {w.assignedFarms.map((f) => (
                          <li key={f.id}>
                            <Link
                              href={`/admin/farms/${f.id}`}
                              className="text-primary-dark hover:underline"
                            >
                              {f.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn(
                        w.status === 'ACTIVE' && 'bg-green-100 text-green-800'
                      )}
                    >
                      {w.status}
                    </Badge>
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
