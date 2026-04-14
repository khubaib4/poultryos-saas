/** DB values for `payment_method` on expenses */
export function formatExpensePaymentMethod(method: string | null | undefined): string {
  const m = (method ?? 'cash').toLowerCase()
  if (m === 'pending') return 'Pending'
  const map: Record<string, string> = {
    cash: 'Cash',
    bank_transfer: 'Bank transfer',
    cheque: 'Cheque',
    mobile: 'Mobile',
  }
  return map[m] ?? method ?? 'Cash'
}

export function isExpensePaymentPending(method: string | null | undefined): boolean {
  return (method ?? '').toLowerCase() === 'pending'
}
