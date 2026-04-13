import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ReportType =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'financial'
  | 'flock'

interface ReportsToolbarProps {
  action: string
  type: ReportType
  farmId?: string
  /** Admin: all farms or one farm id */
  farmScope?: string
  farmOptions?: { id: string; name: string }[]
  showCompare?: boolean
  date?: string
  weekStart?: string
  month?: string
  finPeriod?: 'month' | 'quarter' | 'year'
  finAnchor?: string
  flockId?: string
  flockRangeStart?: string
  flockRangeEnd?: string
  flockOptions?: { id: string; label: string }[]
  compare?: boolean
}

export function ReportsToolbar({
  action,
  type,
  farmId,
  farmScope,
  farmOptions,
  showCompare,
  date,
  weekStart,
  month,
  finPeriod = 'month',
  finAnchor,
  flockId,
  flockRangeStart,
  flockRangeEnd,
  flockOptions,
  compare,
}: ReportsToolbarProps) {
  return (
    <form
      method="get"
      action={action}
      className="flex flex-col gap-4 rounded-xl border bg-white p-4 print:hidden"
    >
      {farmId && !farmOptions?.length && (
        <input type="hidden" name="farm" value={farmId} />
      )}
      {farmOptions && farmOptions.length > 0 && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Farm</label>
          <select
            name="farmScope"
            defaultValue={farmScope ?? 'all'}
            className="flex h-9 min-w-[200px] rounded-lg border border-input bg-background px-2 text-sm"
          >
            <option value="all">All farms</option>
            {farmOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {showCompare && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="compare" value="1" defaultChecked={compare} />
          Compare farms
        </label>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Report type</label>
          <select
            name="type"
            defaultValue={type}
            className="flex h-9 min-w-[160px] rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="financial">Financial</option>
            <option value="flock">Flock performance</option>
          </select>
        </div>

        {type === 'daily' && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Date</label>
            <input
              type="date"
              name="date"
              defaultValue={date}
              className="flex h-9 rounded-lg border border-input bg-background px-2 text-sm"
            />
          </div>
        )}

        {type === 'weekly' && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Week (any day)</label>
            <input
              type="date"
              name="weekStart"
              defaultValue={weekStart}
              className="flex h-9 rounded-lg border border-input bg-background px-2 text-sm"
            />
          </div>
        )}

        {(type === 'monthly' || type === 'financial') && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Month</label>
            <input
              type="month"
              name="month"
              defaultValue={month}
              className="flex h-9 rounded-lg border border-input bg-background px-2 text-sm"
            />
          </div>
        )}

        {type === 'financial' && (
          <>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Period</label>
              <select
                name="finPeriod"
                defaultValue={finPeriod}
                className="flex h-9 rounded-lg border border-input bg-background px-2 text-sm"
              >
                <option value="month">Month</option>
                <option value="quarter">Quarter</option>
                <option value="year">Year</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Anchor</label>
              <input
                type="date"
                name="finAnchor"
                defaultValue={finAnchor}
                className="flex h-9 rounded-lg border border-input bg-background px-2 text-sm"
              />
            </div>
          </>
        )}

        {type === 'flock' && (
          <>
            {flockOptions && flockOptions.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Flock</label>
                <select
                  name="flockId"
                  defaultValue={flockId ?? 'all'}
                  className="flex h-9 min-w-[200px] rounded-lg border border-input bg-background px-2 text-sm"
                >
                  <option value="all">All flocks</option>
                  {flockOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">From</label>
              <input
                type="date"
                name="flockRangeStart"
                defaultValue={flockRangeStart}
                className="flex h-9 rounded-lg border border-input bg-background px-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">To</label>
              <input
                type="date"
                name="flockRangeEnd"
                defaultValue={flockRangeEnd}
                className="flex h-9 rounded-lg border border-input bg-background px-2 text-sm"
              />
            </div>
          </>
        )}

        <button type="submit" className={cn(buttonVariants(), 'bg-primary hover:bg-primary-dark')}>
          Apply
        </button>
      </div>
    </form>
  )
}
