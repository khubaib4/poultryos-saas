import { AlertTriangle } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

export interface FinancialSummaryProps {
  subtotal: number
  discountAmount: number
  discountLabel: string
  total: number
  paid: number
  balanceDue: number
  className?: string
}

export function FinancialSummary({
  subtotal,
  discountAmount,
  discountLabel,
  total,
  paid,
  balanceDue,
  className,
}: FinancialSummaryProps) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-gradient-to-br from-teal-800 to-teal-700 p-5 text-white shadow-card-md',
        className
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
        Financial Summary
      </p>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-white/80">Subtotal</span>
          <span className="font-medium tabular-nums">{formatCurrency(subtotal)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between gap-4 text-amber-200">
            <span>{discountLabel}</span>
            <span className="tabular-nums">− {formatCurrency(discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between gap-4 border-t border-white/15 pt-3 text-base font-semibold">
          <span>Total Payable</span>
          <span className="tabular-nums text-lg">{formatCurrency(total)}</span>
        </div>
        <div className="flex justify-between gap-4 text-green-200">
          <span>Amount Paid</span>
          <span className="font-semibold tabular-nums">{formatCurrency(paid)}</span>
        </div>
      </div>
      <div className="mt-4 rounded-xl bg-amber-600/30 p-4 ring-1 ring-amber-400/30">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" aria-hidden />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-100/90">
              Balance Due
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{formatCurrency(balanceDue)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
