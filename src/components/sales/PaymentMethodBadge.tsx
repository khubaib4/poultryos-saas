import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
  cheque: 'Cheque',
  mobile: 'Mobile',
  jazzcash: 'JazzCash',
  easypaisa: 'Easypaisa',
}

interface PaymentMethodBadgeProps {
  method: string
  className?: string
}

export function PaymentMethodBadge({ method, className }: PaymentMethodBadgeProps) {
  const key = method?.toLowerCase() ?? 'cash'
  const label = LABELS[key] ?? method

  return (
    <Badge variant="secondary" className={cn('font-normal', className)}>
      {label}
    </Badge>
  )
}
