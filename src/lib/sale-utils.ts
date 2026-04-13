import type { SaleLineItem } from '@/types/database'

export type DiscountType = 'none' | 'percentage' | 'fixed'

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export function lineItemTotal(item: Pick<SaleLineItem, 'quantity' | 'unit_price'>): number {
  return roundMoney(item.quantity * item.unit_price)
}

export function computeSaleTotals(
  lineItems: SaleLineItem[],
  discountType: DiscountType | string | null | undefined,
  discountValue: number
): { subtotal: number; discountAmount: number; total: number } {
  const sub = lineItems.reduce((s, li) => {
    const t = li.total ?? lineItemTotal(li)
    return s + t
  }, 0)
  const subtotal = roundMoney(sub)
  let discountAmount = 0
  const dt = discountType === 'none' || !discountType ? 'none' : discountType
  if (dt === 'percentage' && discountValue > 0) {
    discountAmount = roundMoney((subtotal * discountValue) / 100)
  } else if (dt === 'fixed' && discountValue > 0) {
    discountAmount = roundMoney(Math.min(discountValue, subtotal))
  }
  const total = roundMoney(Math.max(0, subtotal - discountAmount))
  return { subtotal, discountAmount, total }
}

export function derivePaymentStatus(
  total: number,
  paid: number
): 'unpaid' | 'partial' | 'paid' {
  if (total <= 0) return paid > 0 ? 'paid' : 'unpaid'
  if (paid >= total) return 'paid'
  if (paid > 0) return 'partial'
  return 'unpaid'
}
