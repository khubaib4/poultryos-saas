import { format, parseISO } from 'date-fns'
import type { DailyEntry } from '@/types/database'

export function formatDailyEntryDate(dateStr: string) {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

export function DailyEntryEggCell({ row }: { row: DailyEntry }) {
  const a = row.eggs_grade_a ?? 0
  const b = row.eggs_grade_b ?? 0
  const c = row.eggs_cracked ?? 0
  const sumGrades = a + b + c
  const total = row.eggs_collected ?? 0
  const hasBreakdown = sumGrades > 0

  if (hasBreakdown) {
    return (
      <div className="text-xs leading-relaxed sm:text-sm">
        <span className="text-gray-600">A {a}</span>
        <span className="mx-1 text-gray-300">·</span>
        <span className="text-gray-600">B {b}</span>
        <span className="mx-1 text-gray-300">·</span>
        <span className="text-gray-600">C {c}</span>
        <div className="mt-0.5 font-medium text-gray-900">
          Total {total.toLocaleString()}
        </div>
      </div>
    )
  }

  if (total > 0) {
    return (
      <span className="text-gray-900">Total {total.toLocaleString()}</span>
    )
  }

  return <span className="text-gray-400">0</span>
}
