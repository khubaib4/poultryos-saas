'use client'

import { useRouter } from 'next/navigation'
import { Eye, MoreVertical, Pencil } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { withFarmQuery } from '@/lib/farm-worker-nav'

interface VaccinationRowActionsProps {
  vaccinationId: string
  farmId: string
  /** Only scheduled rows are editable */
  canEdit: boolean
}

export function VaccinationRowActions({
  vaccinationId,
  farmId,
  canEdit,
}: VaccinationRowActionsProps) {
  const router = useRouter()
  const q = `?farm=${encodeURIComponent(farmId)}`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-7 w-7 items-center justify-center rounded hover:bg-gray-100 outline-none">
        <MoreVertical className="h-4 w-4 text-gray-500" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="gap-2 cursor-pointer"
          onClick={() => router.push(`/farm/vaccinations/${vaccinationId}${q}`)}
        >
          <Eye className="h-4 w-4" />
          View
        </DropdownMenuItem>
        {canEdit && (
          <DropdownMenuItem
            className="gap-2 cursor-pointer"
            onClick={() =>
              router.push(
                withFarmQuery(`/farm/vaccinations/${vaccinationId}/edit`, farmId)
              )
            }
          >
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
