'use client'

import { useRouter } from 'next/navigation'
import { MoreVertical, Building2, Pencil } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DeleteFarmButton } from './DeleteFarmButton'

interface FarmCardActionsProps {
  farmId: string
  farmName: string
}

export function FarmCardActions({ farmId, farmName }: FarmCardActionsProps) {
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-7 w-7 items-center justify-center rounded hover:bg-gray-100 outline-none">
        <MoreVertical className="h-4 w-4 text-gray-500" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="gap-2 cursor-pointer"
          onClick={() => router.push(`/admin/farms/${farmId}`)}
        >
          <Building2 className="h-4 w-4" />
          View
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 cursor-pointer"
          onClick={() => router.push(`/admin/farms/${farmId}/edit`)}
        >
          <Pencil className="h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <div className="px-1 py-0.5">
          <DeleteFarmButton
            farmId={farmId}
            farmName={farmName}
            variant="menu-item"
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
