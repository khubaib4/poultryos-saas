/** DB values for `payment_method` on expenses */
export function formatExpensePaymentMethod(method: string | null | undefined): string {
  const m = (method ?? 'cash').toLowerCase()
  const map: Record<string, string> = {
    cash: 'Cash',
    bank_transfer: 'Bank transfer',
    cheque: 'Cheque',
    mobile: 'Mobile',
  }
  return map[m] ?? method ?? 'Cash'
}
