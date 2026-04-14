import type { VaccinationDisplayStatus } from '@/lib/vaccination-constants'

export const vaccinationStatusStyles = {
  completed: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    badge: 'bg-green-600 text-white',
  },
  scheduled: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    badge: 'bg-blue-600 text-white',
  },
  overdue: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    badge: 'bg-red-600 text-white',
  },
  skipped: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    badge: 'bg-gray-500 text-white',
  },
} as const

/** Timeline mini-blocks (Stitch). */
export const timelineBlockColors: Record<
  'completed' | 'scheduled' | 'overdue' | 'planned',
  string
> = {
  completed: 'bg-blue-500',
  scheduled: 'bg-green-500',
  overdue: 'bg-red-400',
  planned: 'bg-teal-500',
}

export type CountdownVariant = 'amber' | 'red' | 'gray'

export function getCountdownBadge(scheduledDate: Date): {
  text: string
  variant: CountdownVariant
} {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const scheduled = new Date(scheduledDate)
  scheduled.setHours(0, 0, 0, 0)

  const diffDays = Math.ceil(
    (scheduled.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays < 0) return { text: 'OVERDUE', variant: 'red' }
  if (diffDays === 0) return { text: 'TODAY', variant: 'amber' }
  if (diffDays === 1) return { text: 'TOMORROW', variant: 'amber' }
  return { text: `IN ${diffDays} DAYS`, variant: 'gray' }
}

/** Optional time string saved in notes as "Scheduled time: …" */
export function parseScheduledTimeFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null
  const m = notes.match(/scheduled time:\s*([^\n]+)/i)
  return m?.[1]?.trim() ?? null
}

export function buildNotesWithRemindersAndTime(
  baseNotes: string,
  opts: { reminders: boolean; scheduledTimeLabel?: string | null }
): string {
  let out = baseNotes.trim()
  const bits: string[] = []
  if (opts.reminders) bits.push('[Reminders enabled]')
  if (opts.scheduledTimeLabel) bits.push(`Scheduled time: ${opts.scheduledTimeLabel}`)
  if (bits.length) {
    const prefix = bits.join(' ')
    out = out ? `${prefix}\n${out}` : prefix
  }
  return out || ''
}
