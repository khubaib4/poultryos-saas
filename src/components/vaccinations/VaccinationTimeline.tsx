'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  addCalendarDays,
  addDaysIso,
  isoDateToday,
  startOfWeekMonday,
  toIsoDate,
} from '@/lib/vaccination-constants'
import {
  parseScheduledTimeFromNotes,
  timelineBlockColors,
} from '@/lib/vaccination-badges'
import type { TimelineVaccination } from '@/lib/queries/vaccinations'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn } from '@/lib/utils'

type ViewMode = 'month' | 'week' | 'day'

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

type BlockKey = 'completed' | 'scheduled' | 'overdue' | 'planned'

function blockKeyForEvent(ev: TimelineVaccination, todayIso: string): BlockKey {
  if (ev.displayStatus === 'completed') return 'completed'
  if (ev.displayStatus === 'overdue') return 'overdue'
  if (ev.displayStatus === 'scheduled') {
    const d = ev.scheduled_date
    if (d > addDaysIso(todayIso, 7)) return 'planned'
    return 'scheduled'
  }
  return 'scheduled'
}

function captionForBlock(ev: TimelineVaccination, key: BlockKey): string {
  if (key === 'completed') return 'Done'
  if (key === 'overdue') return 'OVERDUE'
  const t = parseScheduledTimeFromNotes(ev.notes ?? null)
  if (t) return t
  if (key === 'planned') return 'Planned'
  return 'Scheduled'
}

interface VaccinationTimelineProps {
  events: TimelineVaccination[]
  farmId: string
  className?: string
}

export function VaccinationTimeline({
  events,
  farmId,
  className,
}: VaccinationTimelineProps) {
  const todayIso = isoDateToday()
  const [view, setView] = useState<ViewMode>('week')
  const [cursor, setCursor] = useState(() => new Date())

  const { gridStart, dayCount, headerLabel } = useMemo(() => {
    if (view === 'day') {
      const d = new Date(cursor)
      d.setHours(0, 0, 0, 0)
      return {
        gridStart: d,
        dayCount: 1,
        headerLabel: d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      }
    }
    if (view === 'week') {
      const mon = startOfWeekMonday(cursor)
      const end = addCalendarDays(mon, 13)
      return {
        gridStart: mon,
        dayCount: 14,
        headerLabel: `${mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      }
    }
    const first = startOfMonth(cursor)
    const gridStart = startOfWeekMonday(first)
    return {
      gridStart,
      dayCount: 35,
      headerLabel: cursor.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    }
  }, [view, cursor])

  const days = useMemo(() => {
    const out: { date: Date; iso: string }[] = []
    for (let i = 0; i < dayCount; i++) {
      const date = addCalendarDays(gridStart, i)
      out.push({ date, iso: toIsoDate(date) })
    }
    return out
  }, [gridStart, dayCount])

  const byDay = useMemo(() => {
    const m = new Map<string, TimelineVaccination[]>()
    for (const ev of events) {
      const k = ev.scheduled_date.slice(0, 10)
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(ev)
    }
    return m
  }, [events])

  function navPrev() {
    if (view === 'day') {
      setCursor((c) => addCalendarDays(c, -1))
      return
    }
    if (view === 'week') {
      setCursor((c) => addCalendarDays(startOfWeekMonday(c), -14))
      return
    }
    setCursor((c) => addMonths(startOfMonth(c), -1))
  }

  function navNext() {
    if (view === 'day') {
      setCursor((c) => addCalendarDays(c, 1))
      return
    }
    if (view === 'week') {
      setCursor((c) => addCalendarDays(startOfWeekMonday(c), 14))
      return
    }
    setCursor((c) => addMonths(startOfMonth(c), 1))
  }

  const cols = view === 'day' ? 1 : 7
  const rows = Math.ceil(dayCount / cols)

  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-100 bg-white p-5 shadow-sm',
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-400" aria-hidden />
          <h2 className="text-lg font-semibold text-gray-900">Timeline view</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['month', 'week', 'day'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                view === v
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={navPrev}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          aria-label="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="min-w-0 flex-1 text-center text-sm font-medium text-gray-700">
          {headerLabel}
        </p>
        <button
          type="button"
          onClick={navNext}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          aria-label="Next"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div
        className="mt-4 grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {days.map(({ date, iso }) => {
          const isToday = iso === todayIso
          const list = byDay.get(iso) ?? []
          const dow = date.toLocaleDateString('en-US', { weekday: 'short' })
          return (
            <div
              key={iso}
              className={cn(
                'min-h-[100px] rounded-xl border border-gray-100 bg-gray-50/50 p-1.5',
                isToday && 'ring-2 ring-primary/30'
              )}
            >
              <div className="flex items-center justify-between gap-1 px-0.5 pb-1">
                <span className="text-[10px] font-semibold uppercase text-gray-400">
                  {dow}
                </span>
                {isToday ? (
                  <span className="rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                    Today
                  </span>
                ) : null}
              </div>
              <p className="px-0.5 text-xs font-semibold text-gray-700">
                {date.getDate()}
              </p>
              <div className="mt-1 space-y-1">
                {list.slice(0, 4).map((ev) => {
                  const bk = blockKeyForEvent(ev, todayIso)
                  const bg = timelineBlockColors[bk]
                  const cap = captionForBlock(ev, bk)
                  return (
                    <Link
                      key={ev.id}
                      href={withFarmQuery(`/farm/vaccinations/${ev.id}`, farmId)}
                      className={cn(
                        'block truncate rounded-md px-1.5 py-1 text-[10px] font-semibold leading-tight text-white shadow-sm',
                        bg
                      )}
                    >
                      <span className="block truncate">{ev.vaccine_name}</span>
                      <span className="block truncate text-[9px] font-medium opacity-95">
                        {cap}
                      </span>
                    </Link>
                  )
                })}
                {list.length > 4 ? (
                  <p className="text-[10px] text-gray-500">+{list.length - 4} more</p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      {view !== 'day' && rows > 1 ? (
        <p className="mt-2 text-center text-xs text-gray-400">
          {rows} week{rows === 1 ? '' : 's'} · {dayCount} days
        </p>
      ) : null}
    </div>
  )
}
