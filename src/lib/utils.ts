import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return `PKR ${amount.toLocaleString()}`
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Short label for chart X-axis (ISO date `YYYY-MM-DD`). */
export function formatChartAxisDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('en-PK', {
    month: 'short',
    day: 'numeric',
  })
}

export function buildEggChartSeries(
  rows: { date: string; eggs_collected?: number | null }[],
): { name: string; eggs: number }[] {
  const byDate = new Map<string, number>()
  for (const row of rows) {
    if (!row.date) continue
    byDate.set(
      row.date,
      (byDate.get(row.date) ?? 0) + Number(row.eggs_collected ?? 0),
    )
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, eggs]) => ({
      name: formatChartAxisDate(date),
      eggs,
    }))
}
