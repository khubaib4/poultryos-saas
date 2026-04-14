/** Stitch-aligned chart colors for farm reports. */
export const chartColors = {
  primary: '#22C55E',
  secondary: '#3B82F6',
  tertiary: '#F59E0B',
  danger: '#EF4444',
  gray: '#6B7280',
  wholesale: '#22C55E',
  retail: '#3B82F6',
  direct: '#F59E0B',
  feed: '#F59E0B',
  labor: '#3B82F6',
  medical: '#EF4444',
} as const

export function formatRsShort(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}Rs ${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}Rs ${(abs / 1_000).toFixed(0)}k`
  return `${sign}Rs ${abs.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`
}

export function formatRsFull(n: number): string {
  return `Rs ${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`
}

export function pctChange(cur: number, prev: number): number | null {
  if (prev === 0 && cur === 0) return null
  if (prev === 0) return null
  return ((cur - prev) / Math.abs(prev)) * 100
}
