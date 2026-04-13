'use client'

import { useRouter } from 'next/navigation'
import { MoreVertical, Eye, Pencil } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { DeleteFlockButton } from './DeleteFlockButton'

interface FlockCardActionsProps {
  flockId: string
  flockLabel: string
  farmId: string
  navBase?: 'admin' | 'farm'
}

export function FlockCardActions({
  flockId,
  flockLabel,
  farmId,
  navBase = 'admin',
}: FlockCardActionsProps) {
  const router = useRouter()

  const detail =
    navBase === 'farm'
      ? withFarmQuery(`/farm/flocks/${flockId}`, farmId)
      : `/admin/farms/${farmId}/flocks/${flockId}`
  const edit =
    navBase === 'farm'
      ? withFarmQuery(`/farm/flocks/${flockId}/edit`, farmId)
      : `/admin/farms/${farmId}/flocks/${flockId}/edit`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-7 w-7 items-center justify-center rounded hover:bg-gray-100 outline-none">
        <MoreVertical className="h-4 w-4 text-gray-500" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="gap-2 cursor-pointer"
          onClick={() => router.push(detail)}
        >
          <Eye className="h-4 w-4" />
          View
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 cursor-pointer"
          onClick={() => router.push(edit)}
        >
          <Pencil className="h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <div className="px-1 py-0.5">
          <DeleteFlockButton
            flockId={flockId}
            flockLabel={flockLabel}
            farmId={farmId}
            variant="menu-item"
            navBase={navBase}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
