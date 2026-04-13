'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Trash2 } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Customer, Sale, SaleLineItem } from '@/types/database'
import { CustomerPicker } from './CustomerPicker'

const OTHER = 'Other' as const

export type SaleEggCategoryOption = {
  id: string
  name: string
  default_price: number
}

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
}

export function SaleForm({
  farmId,
  customers,
  mode,
  initialSale,
  eggCategories: eggCategoriesProp,
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
          await createOfflineSale(payload)
          toast.success('Sale saved offline. Will sync when connected.')
          await offline?.refreshPending()
          router.push(`/farm/sales?farm=${encodeURIComponent(farmId)}`)
          return
        }
        const result = await createSaleAction(payload)
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

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Customer</Label>
            <CustomerPicker
              customers={customers}
              value={customerId}
              onChange={setCustomerId}
              disabled={isPending}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sale_date">Sale date</Label>
              <Input
                id="sale_date"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                disabled={isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due date</Label>
              <Input
                id="due_date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-gray-50/80 p-4 space-y-2 text-sm">
          <p className="font-medium text-gray-900">Summary</p>
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span>PKR {subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Discount</span>
            <span>PKR {discountAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-semibold text-base border-t pt-2">
            <span>Total</span>
            <span>PKR {total.toLocaleString()}</span>
          </div>
          {mode === 'create' && (
            <>
              <div className="space-y-1 pt-2">
                <Label htmlFor="initial_paid">Amount paid (now)</Label>
                <Input
                  id="initial_paid"
                  type="number"
                  min={0}
                  step="0.01"
                  value={initialPaid}
                  onChange={(e) => setInitialPaid(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="flex justify-between text-amber-800 font-medium">
                <span>Balance due</span>
                <span>PKR {balanceDue.toLocaleString()}</span>
              </div>
            </>
          )}
          {mode === 'edit' && (
            <p className="text-xs text-gray-500 pt-2">
              Additional payments are recorded from the sale detail page.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Label className="text-base">Line items</Label>
            {categoriesLoading && (
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading categories…
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLine}
            disabled={isPending}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add item
          </Button>
        </div>
        {categoriesError && (
          <p className="text-sm text-amber-800 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            Could not load egg categories: {categoriesError}
          </p>
        )}
        {!categoriesLoading && eggCategories.length === 0 && (
          <p className="text-sm text-muted-foreground rounded-lg border border-dashed px-3 py-2">
            No egg categories. Add them in{' '}
            <Link
              href={withFarmQuery('/farm/settings', farmId)}
              className="font-medium text-primary-dark underline underline-offset-2 hover:text-primary-dark"
            >
              Settings
            </Link>
            .
          </p>
        )}
        <div className="rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="p-2 font-medium">Type</th>
                <th className="p-2 font-medium">Qty</th>
                <th className="p-2 font-medium">Unit (PKR)</th>
                <th className="p-2 font-medium text-right">Line total</th>
                <th className="p-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-2 align-top">
                    <Select
                      value={line.type}
                      onValueChange={(v) => v && applyTypeChange(i, v)}
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-8 min-w-[180px] max-w-[260px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((c) => (
                          <SelectItem key={c.id} value={c.name}>
                            {`${c.name} — default PKR ${Number(c.default_price).toLocaleString()}`}
                          </SelectItem>
                        ))}
                        <SelectItem value={OTHER}>Other (manual)</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2 align-top w-24">
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      className="h-8"
                      value={line.quantity || ''}
                      onChange={(e) =>
                        updateLine(i, { quantity: parseFloat(e.target.value) || 0 })
                      }
                      disabled={isPending}
                    />
                  </td>
                  <td className="p-2 align-top w-28">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="h-8"
                      value={line.unit_price || ''}
                      onChange={(e) =>
                        updateLine(i, {
                          unit_price: parseFloat(e.target.value) || 0,
                        })
                      }
                      disabled={isPending}
                    />
                  </td>
                  <td className="p-2 align-top text-right font-medium">
                    PKR {lineItemTotal(line).toLocaleString()}
                  </td>
                  <td className="p-2 align-top">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="h-8 w-8 text-red-600"
                      onClick={() => removeLine(i)}
                      disabled={isPending || lines.length <= 1}
                      aria-label="Remove line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 max-w-md">
        <div className="space-y-2">
          <Label>Discount</Label>
          <Select
            value={discountType}
            onValueChange={(v) =>
              v && setDiscountType(v as DiscountType | 'none')
            }
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="fixed">Fixed (PKR)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {discountType !== 'none' && (
          <div className="space-y-2">
            <Label htmlFor="disc_val">
              {discountType === 'percentage' ? 'Percent %' : 'Amount (PKR)'}
            </Label>
            <Input
              id="disc_val"
              type="number"
              min={0}
              step={discountType === 'percentage' ? '1' : '0.01'}
              max={discountType === 'percentage' ? 100 : undefined}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              disabled={isPending}
            />
          </div>
        )}
      </div>

      <div className="space-y-2 max-w-xl">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          rows={3}
          disabled={isPending}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={cn(
            'flex w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm',
            'outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
          )}
          placeholder="Optional"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          className="bg-primary hover:bg-primary-dark"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : mode === 'create' ? (
            'Save sale'
          ) : (
            'Save changes'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/farm/sales?farm=${encodeURIComponent(farmId)}`)}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
