'use client'

import { useRouter } from 'next/navigation'
import { Eye, MoreVertical, Pencil } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ExpenseRowActionsProps {
  expenseId: string
  farmId: string
}

export function ExpenseRowActions({ expenseId, farmId }: ExpenseRowActionsProps) {
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
          onClick={() => router.push(`/farm/expenses/${expenseId}${q}`)}
        >
          <Eye className="h-4 w-4" />
          View
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 cursor-pointer"
          onClick={() => router.push(`/farm/expenses/${expenseId}/edit${q}`)}
        >
          <Pencil className="h-4 w-4" />
          Edit
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
