import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
} from 'date-fns'

export type DateRangePreset =
  | 'today'
  | 'week'
  | 'month'
  | 'last3m'
  | 'ytd'
  | 'custom'

export interface ResolvedReportRange {
  start: string
  end: string
  preset: DateRangePreset
}

/** Inclusive day count between two ISO dates. */
export function daysInRange(start: string, end: string): number {
  const a = new Date(start.slice(0, 10) + 'T12:00:00').getTime()
  const b = new Date(end.slice(0, 10) + 'T12:00:00').getTime()
  return Math.max(1, Math.round((b - a) / 86400000) + 1)
}

/** Previous period of same length immediately before `start`. */
export function previousPeriodRange(start: string, end: string): { start: string; end: string } {
  const n = daysInRange(start, end)
  const endPrev = subDays(new Date(start.slice(0, 10) + 'T12:00:00'), 1)
  const startPrev = subDays(endPrev, n - 1)
  return {
    start: format(startPrev, 'yyyy-MM-dd'),
    end: format(endPrev, 'yyyy-MM-dd'),
  }
}

export function resolveReportDateRange(params: {
  from?: string | null
  to?: string | null
  preset?: string | null
}): ResolvedReportRange {
  const from = params.from?.trim()?.slice(0, 10)
  const to = params.to?.trim()?.slice(0, 10)
  if (from && to && from <= to) {
    return { start: from, end: to, preset: 'custom' }
  }

  const p = (params.preset?.toLowerCase() ?? 'week') as DateRangePreset
  const now = new Date()

  switch (p) {
    case 'today': {
      const d = format(now, 'yyyy-MM-dd')
      return { start: d, end: d, preset: 'today' }
    }
    case 'month': {
      return {
        start: format(startOfMonth(now), 'yyyy-MM-dd'),
        end: format(endOfMonth(now), 'yyyy-MM-dd'),
        preset: 'month',
      }
    }
    case 'last3m': {
      return {
        start: format(subMonths(now, 3), 'yyyy-MM-dd'),
        end: format(now, 'yyyy-MM-dd'),
        preset: 'last3m',
      }
    }
    case 'ytd': {
      return {
        start: format(startOfYear(now), 'yyyy-MM-dd'),
        end: format(now, 'yyyy-MM-dd'),
        preset: 'ytd',
      }
    }
    case 'week':
    default: {
      const ws = startOfWeek(now, { weekStartsOn: 1 })
      const we = endOfWeek(now, { weekStartsOn: 1 })
      return {
        start: format(ws, 'yyyy-MM-dd'),
        end: format(we, 'yyyy-MM-dd'),
        preset: 'week',
      }
    }
  }
}

export function parseReportTab(
  raw?: string | null
):
  | 'overview'
  | 'production'
  | 'financial'
  | 'flock'
  | 'inventory' {
  const t = raw?.toLowerCase()?.trim()
  if (
    t === 'production' ||
    t === 'financial' ||
    t === 'flock' ||
    t === 'inventory'
  ) {
    return t
  }
  return 'overview'
}
