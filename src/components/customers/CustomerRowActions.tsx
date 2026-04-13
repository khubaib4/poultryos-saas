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

interface CustomerRowActionsProps {
  customerId: string
  farmId: string
}

export function CustomerRowActions({ customerId, farmId }: CustomerRowActionsProps) {
  const router = useRouter()
  const viewHref = withFarmQuery(`/farm/customers/${customerId}`, farmId)
  const editHref = withFarmQuery(`/farm/customers/${customerId}/edit`, farmId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-7 w-7 items-center justify-center rounded hover:bg-gray-100 outline-none">
        <MoreVertical className="h-4 w-4 text-gray-500" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="gap-2 cursor-pointer"
          onClick={() => router.push(viewHref)}
        >
          <Eye className="h-4 w-4" />
          View
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 cursor-pointer"
          onClick={() => router.push(editHref)}
        >
          <Pencil className="h-4 w-4" />
          Edit
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
