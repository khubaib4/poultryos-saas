'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { VaccinationScheduleForm } from '@/components/vaccinations/VaccinationScheduleForm'
import type { Flock } from '@/types/database'

interface ScheduleVaccinationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  farmId: string
  flocks: Flock[]
}

export function ScheduleVaccinationModal({
  open,
  onOpenChange,
  farmId,
  flocks,
}: ScheduleVaccinationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,880px)] max-w-3xl overflow-y-auto rounded-2xl border-gray-200 p-0 gap-0">
        <DialogHeader className="space-y-1 border-b border-gray-100 px-6 py-5 text-left">
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Schedule new vaccination
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Enter vaccine details to update the flock medical records.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 py-5">
          <VaccinationScheduleForm
            farmId={farmId}
            flocks={flocks}
            variant="modal"
            redirectAfterCreate={false}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
