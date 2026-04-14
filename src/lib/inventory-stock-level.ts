/** "Full" reference level for progress bar (Stitch): 2× reorder / min_stock. */
export function calculateStockPercentage(
  current: number,
  minStock: number
): number {
  const c = Math.max(0, Number(current))
  const min = Math.max(0, Number(minStock))
  const maxRef = min > 0 ? min * 2 : Math.max(c, 1)
  return Math.min(100, Math.round((c / maxRef) * 100))
}

export type StockBarStatus = 'in' | 'low' | 'out'

/** UI tiers: &gt;50% in, 25–50% low, &lt;25% (including 0%) → out label + red bar (per Stitch spec). */
export function getStockBarStatus(percentage: number): StockBarStatus {
  if (percentage < 25) return 'out'
  if (percentage <= 50) return 'low'
  return 'in'
}

export const STOCK_BAR_STYLES: Record<
  StockBarStatus,
  { bar: string; text: string; label: string }
> = {
  in: {
    bar: 'bg-green-500',
    text: 'text-green-700',
    label: 'IN STOCK',
  },
  low: {
    bar: 'bg-amber-500',
    text: 'text-amber-700',
    label: 'LOW STOCK',
  },
  out: {
    bar: 'bg-red-500',
    text: 'text-red-700',
    label: 'OUT OF STOCK',
  },
}
