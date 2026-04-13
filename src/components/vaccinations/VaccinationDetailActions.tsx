'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { MarkCompleteModal } from '@/components/vaccinations/MarkCompleteModal'
import { MarkSkippedModal } from '@/components/vaccinations/MarkSkippedModal'
import { DeleteVaccinationButton } from '@/components/vaccinations/DeleteVaccinationButton'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import type { InventoryItem } from '@/types/database'
import { cn } from '@/lib/utils'

interface VaccinationDetailActionsProps {
  vaccinationId: string
  farmId: string
  vaccineLabel: string
  isScheduled: boolean
  vaccineInventory: InventoryItem[]
}

export function VaccinationDetailActions({
  vaccinationId,
  farmId,
  vaccineLabel,
  isScheduled,
  vaccineInventory,
}: VaccinationDetailActionsProps) {
  const [completeOpen, setCompleteOpen] = useState(false)
  const [skipOpen, setSkipOpen] = useState(false)

  if (!isScheduled) {
    return (
      <div className="flex flex-wrap gap-2">
        <DeleteVaccinationButton
          vaccinationId={vaccinationId}
          farmId={farmId}
          label={vaccineLabel}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={cn(
          buttonVariants(),
          'bg-primary text-white hover:bg-primary-dark'
        )}
        onClick={() => setCompleteOpen(true)}
      >
        Mark complete
      </button>
      <button
        type="button"
        className={buttonVariants({ variant: 'secondary' })}
        onClick={() => setSkipOpen(true)}
      >
        Mark skipped
      </button>
      <Link
        href={withFarmQuery(`/farm/vaccinations/${vaccinationId}/edit`, farmId)}
        className={cn(buttonVariants({ variant: 'outline' }))}
      >
        <Pencil className="mr-2 h-4 w-4" />
        Edit
      </Link>
      <DeleteVaccinationButton
        vaccinationId={vaccinationId}
        farmId={farmId}
        label={vaccineLabel}
      />
      <MarkCompleteModal
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        vaccinationId={vaccinationId}
        farmId={farmId}
        vaccineLabel={vaccineLabel}
        vaccineInventory={vaccineInventory}
      />
      <MarkSkippedModal
        open={skipOpen}
        onOpenChange={setSkipOpen}
        vaccinationId={vaccinationId}
        farmId={farmId}
        vaccineLabel={vaccineLabel}
      />
    </div>
  )
}
