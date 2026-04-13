'use client'

import { useRouter } from 'next/navigation'
import { MoreVertical, Pencil } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DeleteDailyEntryButton } from './DeleteDailyEntryButton'

interface DailyEntryRowActionsProps {
  farmId: string
  entryId: string
  flockLabel: string
  entryDateLabel: string
  variant?: 'admin' | 'farm'
}

export function DailyEntryRowActions({
  farmId,
  entryId,
  flockLabel,
  entryDateLabel,
  variant = 'admin',
}: DailyEntryRowActionsProps) {
  const router = useRouter()

  const editHref =
    variant === 'farm'
      ? `/farm/daily-entry/${entryId}/edit?farm=${encodeURIComponent(farmId)}`
      : `/admin/farms/${farmId}/daily-entry/${entryId}/edit`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-7 w-7 items-center justify-center rounded hover:bg-gray-100 outline-none">
        <MoreVertical className="h-4 w-4 text-gray-500" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="gap-2 cursor-pointer"
          onClick={() => router.push(editHref)}
        >
          <Pencil className="h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <div className="px-1 py-0.5">
          <DeleteDailyEntryButton
            entryId={entryId}
            farmId={farmId}
            flockLabel={flockLabel}
            entryDate={entryDateLabel}
            variant="menu-item"
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
