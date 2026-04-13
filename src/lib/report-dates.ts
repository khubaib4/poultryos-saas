import {
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  endOfWeek,
} from 'date-fns'
import type { DateRange } from '@/lib/queries/reports'

export type FinancialPeriod = 'month' | 'quarter' | 'year'

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function defaultWeekRange(reference = new Date()): DateRange {
  const start = startOfWeek(reference, { weekStartsOn: 1 })
  const end = endOfWeek(reference, { weekStartsOn: 1 })
  return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') }
}

export function parseWeekFromParam(weekStart?: string | null): DateRange {
  if (!weekStart?.trim()) return defaultWeekRange()
  const d = new Date(weekStart.slice(0, 10) + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return defaultWeekRange()
  const start = startOfWeek(d, { weekStartsOn: 1 })
  const end = endOfWeek(d, { weekStartsOn: 1 })
  return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') }
}

export function parseMonthFromParam(month?: string | null): DateRange {
  if (!month?.trim()) {
    const now = new Date()
    return {
      start: format(startOfMonth(now), 'yyyy-MM-dd'),
      end: format(endOfMonth(now), 'yyyy-MM-dd'),
    }
  }
  const [y, m] = month.slice(0, 7).split('-').map(Number)
  if (!y || !m) {
    const now = new Date()
    return {
      start: format(startOfMonth(now), 'yyyy-MM-dd'),
      end: format(endOfMonth(now), 'yyyy-MM-dd'),
    }
  }
  const d = new Date(y, m - 1, 1)
  return {
    start: format(startOfMonth(d), 'yyyy-MM-dd'),
    end: format(endOfMonth(d), 'yyyy-MM-dd'),
  }
}

export function financialRange(
  period: FinancialPeriod,
  anchor?: string | null
): DateRange {
  const ref = anchor?.trim()
    ? new Date(anchor.slice(0, 10) + 'T12:00:00')
    : new Date()
  const base = Number.isNaN(ref.getTime()) ? new Date() : ref

  if (period === 'month') {
    return {
      start: format(startOfMonth(base), 'yyyy-MM-dd'),
      end: format(endOfMonth(base), 'yyyy-MM-dd'),
    }
  }
  if (period === 'quarter') {
    return {
      start: format(startOfQuarter(base), 'yyyy-MM-dd'),
      end: format(endOfQuarter(base), 'yyyy-MM-dd'),
    }
  }
  return {
    start: format(startOfYear(base), 'yyyy-MM-dd'),
    end: format(endOfYear(base), 'yyyy-MM-dd'),
  }
}

/** Previous period of same length (for flock default range = last 30 days) */
export function lastNDaysRange(days: number): DateRange {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - days)
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  }
}
