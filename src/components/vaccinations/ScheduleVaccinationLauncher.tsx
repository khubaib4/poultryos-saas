'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScheduleVaccinationModal } from '@/components/vaccinations/ScheduleVaccinationModal'
import type { Flock } from '@/types/database'

interface ScheduleVaccinationLauncherProps {
  farmId: string
  flocks: Flock[]
}

export function ScheduleVaccinationLauncher({
  farmId,
  flocks,
}: ScheduleVaccinationLauncherProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant="primarySimple"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        Schedule vaccination
      </Button>
      <ScheduleVaccinationModal
        open={open}
        onOpenChange={setOpen}
        farmId={farmId}
        flocks={flocks}
      />
    </>
  )
}
