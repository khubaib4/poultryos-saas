'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AddWorkerDialog } from '@/components/farms/AddWorkerDialog'
import type { FarmWorkerRow } from '@/lib/queries/farms'
import type { UserStatus } from '@/types/database'
import { Users } from 'lucide-react'

const STATUS_BADGE: Record<UserStatus, string> = {
  ACTIVE: 'bg-primary-light text-primary-dark hover:bg-primary-light',
  INACTIVE: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
  SUSPENDED: 'bg-red-100 text-red-700 hover:bg-red-100',
}

interface FarmWorkersPanelProps {
  farmId: string
  workers: FarmWorkerRow[]
}

export function FarmWorkersPanel({ farmId, workers }: FarmWorkersPanelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-500" />
          Assigned workers
        </CardTitle>
        <AddWorkerDialog farmId={farmId} />
      </CardHeader>
      <CardContent>
        {workers.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            <p>No workers yet. Use &ldquo;Add Worker&rdquo; above to create a login for this farm.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell className="text-muted-foreground">{w.email}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_BADGE[w.status] ?? STATUS_BADGE.INACTIVE}>
                      {w.status.charAt(0) + w.status.slice(1).toLowerCase()}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
