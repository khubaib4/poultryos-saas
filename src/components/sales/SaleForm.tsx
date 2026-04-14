'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Check,
  FileText,
  Loader2,
  Sparkles,
  User,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { listEggCategoriesForSaleAction } from '@/lib/actions/egg-categories'
import { createSaleAction, updateSaleAction } from '@/lib/actions/sales'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { useOfflineOptional } from '@/components/providers/OfflineProvider'
import { createOfflineSale, updateOfflineSale } from '@/lib/offline/offlineCrud'
import { computeSaleTotals, lineItemTotal, roundMoney, type DiscountType } from '@/lib/sale-utils'
import { cn, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import type { Customer, Sale, SaleLineItem } from '@/types/database'
import { CustomerPicker } from './CustomerPicker'
import { LineItemsEditor } from '@/components/sales/LineItemsEditor'
import { FinancialSummary } from '@/components/sales/FinancialSummary'
import type { SaleEggCategoryOption } from '@/components/sales/egg-sale-types'

const OTHER = 'Other' as const

export type { SaleEggCategoryOption }

function emptyLine(categories: SaleEggCategoryOption[]): SaleLineItem {
  const first = categories[0]
  if (first) {
    return {
      type: first.name,
      quantity: 0,
      unit_price: first.default_price,
      total: 0,
    }
  }
  return { type: OTHER, quantity: 0, unit_price: 0, total: 0 }
}

function lineOptions(
  categories: SaleEggCategoryOption[],
  lines: SaleLineItem[]
): SaleEggCategoryOption[] {
  const map = new Map<string, SaleEggCategoryOption>()
  for (const c of categories) {
    map.set(c.name, c)
  }
  for (const l of lines) {
    if (l.type !== OTHER && !map.has(l.type)) {
      map.set(l.type, {
        id: `legacy:${l.type}`,
        name: l.type,
        default_price: l.unit_price,
      })
    }
  }
  return Array.from(map.values())
}

interface SaleFormProps {
  farmId: string
  customers: Customer[]
  mode: 'create' | 'edit'
  initialSale?: Sale
  /** Active egg categories for this farm (drives line item type dropdown). */
  eggCategories: SaleEggCategoryOption[]
  /** Next invoice number preview (create mode). */
  suggestedInvoiceNumber?: string
}

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer (HBL)' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'jazzcash', label: 'JazzCash' },
  { value: 'easypaisa', label: 'Easypaisa' },
] as const

export function SaleForm({
  farmId,
  customers,
  mode,
  initialSale,
  eggCategories: eggCategoriesProp,
  suggestedInvoiceNumber,
}: SaleFormProps) {
  const router = useRouter()
  const offline = useOfflineOptional()
  const isOnline = offline?.isOnline ?? true
  const [isPending, startTransition] = useTransition()
  const [eggCategories, setEggCategories] =
    useState<SaleEggCategoryOption[]>(eggCategoriesProp)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  const categoriesRequestId = useRef(0)

  useEffect(() => {
    const rid = ++categoriesRequestId.current
    setCategoriesLoading(true)
    setCategoriesError(null)
    listEggCategoriesForSaleAction(farmId).then((res) => {
      if (categoriesRequestId.current !== rid) return
      setCategoriesLoading(false)
      if ('error' in res) {
        setCategoriesError(res.error)
        if (process.env.NODE_ENV === 'development') {
          console.error('[SaleForm] listEggCategoriesForSaleAction:', res.error)
        }
        return
      }
      setEggCategories(res.categories)
    })
  }, [farmId])

  /** New sale: replace placeholder “Other” row once categories load from the server. */
  useEffect(() => {
    if (mode !== 'create' || eggCategories.length === 0) return
    setLines((prev) => {
      if (prev.length !== 1) return prev
      const row = prev[0]
      if (!row || row.type !== OTHER) return prev
      if (row.quantity !== 0 || row.unit_price !== 0) return prev
      const first = eggCategories[0]
      if (!first) return prev
      return [
        {
          type: first.name,
          quantity: 0,
          unit_price: first.default_price,
          total: 0,
        },
      ]
    })
  }, [eggCategories, mode])

  const [customerId, setCustomerId] = useState<string | null>(
    initialSale?.customer_id ?? null
  )
  const [saleDate, setSaleDate] = useState(
    initialSale?.sale_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
  )
  const [dueDate, setDueDate] = useState(initialSale?.due_date?.slice(0, 10) ?? '')
  const [lines, setLines] = useState<SaleLineItem[]>(() =>
    initialSale?.line_items?.length
      ? initialSale.line_items.map((l) => ({
          ...l,
          total: roundMoney(l.total ?? lineItemTotal(l)),
        }))
      : [emptyLine(eggCategories)]
  )
  const [discountType, setDiscountType] = useState<DiscountType | 'none'>(
    (initialSale?.discount_type as DiscountType | null) ?? 'none'
  )
  const [discountValue, setDiscountValue] = useState(
    String(initialSale?.discount_value ?? 0)
  )
  const [initialPaid, setInitialPaid] = useState(
    mode === 'create' ? '0' : String(initialSale?.paid_amount ?? 0)
  )
  const [notes, setNotes] = useState(initialSale?.notes ?? '')
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')

  const { subtotal, discountAmount, total } = useMemo(() => {
    const dv = parseFloat(discountValue) || 0
    return computeSaleTotals(
      lines.map((l) => ({
        ...l,
        total: lineItemTotal(l),
      })),
      discountType === 'none' ? 'none' : discountType,
      dv
    )
  }, [lines, discountType, discountValue])

  const paidNum = parseFloat(initialPaid) || 0
  const balanceDue = roundMoney(Math.max(0, total - paidNum))

  const paymentPill = useMemo<'paid' | 'partial' | 'unpaid'>(() => {
    if (total <= 0) return 'unpaid'
    if (paidNum <= 0) return 'unpaid'
    if (paidNum >= total - 0.009) return 'paid'
    return 'partial'
  }, [paidNum, total])

  const discountLabel =
    discountType === 'percentage' && (parseFloat(discountValue) || 0) > 0
      ? `Discount (${parseFloat(discountValue) || 0}%)`
      : discountType === 'fixed' && (parseFloat(discountValue) || 0) > 0
        ? 'Discount (fixed)'
        : 'Discount'

  const categoryOptions = useMemo(
    () => lineOptions(eggCategories, lines),
    [eggCategories, lines]
  )

  function updateLine(i: number, patch: Partial<SaleLineItem>) {
    setLines((prev) => {
      const next = [...prev]
      const row = { ...next[i], ...patch }
      row.total = lineItemTotal(row)
      next[i] = row
      return next
    })
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, j) => j !== i))
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine(eggCategories)])
  }

  function applyTypeChange(i: number, value: string) {
    setLines((prev) => {
      const next = [...prev]
      const cur = next[i]
      if (!cur) return prev
      if (value === OTHER) {
        next[i] = { ...cur, type: OTHER }
      } else {
        const cat = eggCategories.find((c) => c.name === value)
        next[i] = {
          ...cur,
          type: value,
          unit_price: cat ? cat.default_price : cur.unit_price,
        }
      }
      next[i] = { ...next[i], total: lineItemTotal(next[i]) }
      return next
    })
  }

  function saveDraft() {
    try {
      const draft = {
        customerId,
        saleDate,
        dueDate,
        lines,
        discountType,
        discountValue,
        initialPaid,
        notes,
        paymentMethod,
      }
      localStorage.setItem(
        `poultryos-sale-draft-${farmId}`,
        JSON.stringify(draft)
      )
      toast.success('Draft saved on this device.')
    } catch {
      toast.error('Could not save draft.')
    }
  }

  function setPaymentPill(kind: 'paid' | 'partial' | 'unpaid') {
    if (kind === 'paid') setInitialPaid(String(roundMoney(total)))
    else if (kind === 'unpaid') setInitialPaid('0')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const dv = parseFloat(discountValue) || 0
    const payloadLines = lines.map((l) => {
      const t = lineItemTotal({ ...l, quantity: l.quantity, unit_price: l.unit_price })
      return {
        type: l.type,
        quantity: l.quantity,
        unit_price: roundMoney(l.unit_price),
        total: t,
      }
    })

    const validLines = payloadLines.filter((l) => l.quantity > 0 && l.unit_price >= 0)
    if (validLines.length === 0) {
      toast.error('Add at least one line item with quantity and price.')
      return
    }

    startTransition(async () => {
      const payload = {
        farm_id: farmId,
        customer_id: customerId,
        sale_date: saleDate,
        due_date: dueDate.trim() || null,
        line_items: validLines,
        discount_type: discountType === 'none' ? null : discountType,
        discount_value: dv,
        initial_paid: mode === 'create' ? paidNum : 0,
        notes: notes.trim() || null,
      }

      if (mode === 'create') {
        if (paidNum > total) {
          toast.error('Amount paid cannot exceed total.')
          return
        }
        if (!isOnline) {
          await createOfflineSale({
            ...payload,
            initial_payment_method: paymentMethod,
          })
          toast.success('Sale saved offline. Will sync when connected.')
          await offline?.refreshPending()
          router.push(`/farm/sales?farm=${encodeURIComponent(farmId)}`)
          return
        }
        const result = await createSaleAction({
          ...payload,
          initial_payment_method: paymentMethod,
        })
        if ('error' in result) {
          toast.error(result.error)
          return
        }
        toast.success('Sale created.')
        router.push(`/farm/sales/${result.id}?farm=${encodeURIComponent(farmId)}`)
        return
      }

      if (!initialSale) return
      if (!isOnline) {
        await updateOfflineSale(initialSale.id, {
          ...payload,
          initial_paid: 0,
        })
        toast.success('Sale saved offline. Will sync when connected.')
        await offline?.refreshPending()
        router.push(`/farm/sales/${initialSale.id}?farm=${encodeURIComponent(farmId)}`)
        return
      }
      const result = await updateSaleAction(initialSale.id, {
        ...payload,
        initial_paid: 0,
      })
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Sale updated.')
      router.push(`/farm/sales/${initialSale.id}?farm=${encodeURIComponent(farmId)}`)
    })
  }

  const listPath = withFarmQuery('/farm/sales', farmId)
  const invoicePreview =
    mode === 'create'
      ? suggestedInvoiceNumber ?? '—'
      : initialSale?.invoice_number ?? '—'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={listPath}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
            aria-label="Back to sales"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h2 className="text-xl font-semibold text-primary sm:text-2xl">
            {mode === 'create' ? 'New Sale' : 'Edit Sale'}
          </h2>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {mode === 'create' && (
            <Button
              type="button"
              variant="ghost"
              className="text-gray-600"
              onClick={saveDraft}
              disabled={isPending}
            >
              Save as Draft
            </Button>
          )}
          <Button type="submit" variant="primarySimple" className="gap-2" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                {mode === 'create' ? 'Create Invoice' : 'Save changes'}
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/[0.04]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Customer Selection
            </p>
            <div className="mt-3 flex items-start gap-2">
              <div className="mt-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-lighter text-primary">
                <User className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <CustomerPicker
                  customers={customers}
                  value={customerId}
                  onChange={setCustomerId}
                  disabled={isPending}
                  placeholder="Select a customer..."
                />
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Invoice ID
                </Label>
                <Input
                  readOnly
                  value={invoicePreview}
                  className="h-10 rounded-lg bg-gray-50 font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="sale_date"
                  className="text-[11px] font-semibold uppercase tracking-wider text-gray-500"
                >
                  Issue Date
                </Label>
                <Input
                  id="sale_date"
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  disabled={isPending}
                  required
                  className="h-10 rounded-lg"
                />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label
                htmlFor="due_date"
                className="text-[11px] font-semibold uppercase tracking-wider text-gray-500"
              >
                Due date
              </Label>
              <Input
                id="due_date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isPending}
                className="h-10 max-w-xs rounded-lg"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/[0.04]">
            <LineItemsEditor
              farmId={farmId}
              lines={lines}
              categoryOptions={categoryOptions}
              eggCategories={eggCategories}
              categoriesLoading={categoriesLoading}
              categoriesError={categoriesError}
              isPending={isPending}
              onAddLine={addLine}
              onRemoveLine={removeLine}
              onApplyTypeChange={applyTypeChange}
              onUpdateLine={updateLine}
            />
            <div className="mt-6 flex flex-col gap-4 border-t border-gray-100 pt-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Global discount
                </Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={discountType}
                    onValueChange={(v) =>
                      v && setDiscountType(v as DiscountType | 'none')
                    }
                    disabled={isPending}
                  >
                    <SelectTrigger className="h-10 w-[140px] rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed (Rs)</SelectItem>
                    </SelectContent>
                  </Select>
                  {discountType !== 'none' && (
                    <div className="relative">
                      <Input
                        id="disc_val"
                        type="number"
                        min={0}
                        step={discountType === 'percentage' ? '1' : '0.01'}
                        max={discountType === 'percentage' ? 100 : undefined}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        disabled={isPending}
                        className="h-10 w-32 rounded-lg pr-8"
                      />
                      {discountType === 'percentage' && (
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                          %
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Subtotal Amount
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">
                  {formatCurrency(subtotal)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/[0.04]">
            <div className="flex items-center gap-2 text-gray-900">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-lighter text-primary">
                <Wallet className="h-4 w-4" aria-hidden />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wider">
                Payment Info
              </p>
            </div>
            {mode === 'create' && (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(
                    [
                      ['partial', 'Partial'],
                      ['paid', 'Paid'],
                      ['unpaid', 'Unpaid'],
                    ] as const
                  ).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setPaymentPill(k)}
                      className={cn(
                        'h-9 rounded-full px-4 text-sm font-semibold transition-colors',
                        paymentPill === k
                          ? k === 'partial'
                            ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-200'
                            : k === 'paid'
                              ? 'bg-green-100 text-green-800 ring-1 ring-green-200'
                              : 'bg-red-100 text-red-800 ring-1 ring-red-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  <Label htmlFor="initial_paid">Amount Received (Rs)</Label>
                  <Input
                    id="initial_paid"
                    type="number"
                    min={0}
                    step="0.01"
                    value={initialPaid}
                    onChange={(e) => setInitialPaid(e.target.value)}
                    disabled={isPending}
                    className="h-10 rounded-lg"
                  />
                </div>
                <div className="mt-4 space-y-2">
                  <Label>Payment Method</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(v) => v && setPaymentMethod(v)}
                    disabled={isPending}
                    items={PAYMENT_METHOD_OPTIONS.reduce<Record<string, string>>(
                      (acc, m) => {
                        acc[m.value] = m.label
                        return acc
                      },
                      {}
                    )}
                  >
                    <SelectTrigger className="h-10 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHOD_OPTIONS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {mode === 'edit' && (
              <p className="mt-3 text-sm text-gray-500">
                Record additional payments from the invoice detail page.
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/[0.04]">
            <div className="flex items-center gap-2 text-gray-900">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                <FileText className="h-4 w-4" aria-hidden />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wider">
                Invoice Notes
              </p>
            </div>
            <textarea
              id="notes"
              rows={4}
              disabled={isPending}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={cn(
                'mt-3 flex min-h-[100px] w-full rounded-xl border border-input bg-transparent px-3 py-2.5 text-sm',
                'outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary'
              )}
              placeholder="Terms of service, delivery details, or special instructions..."
            />
          </div>

          <FinancialSummary
            subtotal={subtotal}
            discountAmount={discountAmount}
            discountLabel={discountLabel}
            total={total}
            paid={
              mode === 'edit'
                ? Number(initialSale?.paid_amount ?? 0)
                : paidNum
            }
            balanceDue={
              mode === 'edit'
                ? roundMoney(
                    Math.max(
                      0,
                      total - Number(initialSale?.paid_amount ?? 0)
                    )
                  )
                : balanceDue
            }
          />

          <Link
            href={
              customerId
                ? withFarmQuery(`/farm/customers/${customerId}`, farmId)
                : listPath
            }
            className="relative block overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 p-5 text-white shadow-card-md ring-1 ring-black/10"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-slate-900/50 to-slate-900 opacity-90" />
            <div className="relative flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">View Customer Credit History</span>
              <Sparkles className="h-5 w-5 shrink-0 text-primary-light" aria-hidden />
            </div>
          </Link>

          {mode === 'edit' && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  router.push(
                    initialSale
                      ? `/farm/sales/${initialSale.id}?farm=${encodeURIComponent(farmId)}`
                      : listPath
                  )
                }
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </form>
  )
}
