'use client'

import { useMemo, useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { recordPaymentAction } from '@/lib/actions/sales'
import { roundMoney } from '@/lib/sale-utils'
import { toast } from 'sonner'

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'jazzcash', label: 'JazzCash' },
  { value: 'easypaisa', label: 'Easypaisa' },
] as const

export type OpenSaleOption = {
  id: string
  invoice_number: string
  balance_due: number
  sale_date: string
}

interface RecordPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  farmId: string
  openSales: OpenSaleOption[]
  defaultDate: string
}

export function RecordPaymentModal({
  open,
  onOpenChange,
  farmId,
  openSales,
  defaultDate,
}: RecordPaymentModalProps) {
  const [isPending, startTransition] = useTransition()

  const [saleId, setSaleId] = useState(openSales[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(defaultDate)
  const [method, setMethod] = useState('cash')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')

  const saleMap = useMemo(() => {
    const m = new Map<string, OpenSaleOption>()
    for (const s of openSales) m.set(s.id, s)
    return m
  }, [openSales])

  const selected = saleMap.get(saleId)
  const maxPay = roundMoney(Number(selected?.balance_due ?? 0))

  function reset() {
    setSaleId(openSales[0]?.id ?? '')
    setAmount('')
    setPaymentDate(defaultDate)
    setMethod('cash')
    setReference('')
    setNotes('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!saleId) {
      toast.error('Select an invoice.')
      return
    }
    const amt = roundMoney(parseFloat(amount) || 0)
    if (amt <= 0) {
      toast.error('Enter a valid amount.')
      return
    }
    if (amt > maxPay + 0.0001) {
      toast.error(`Amount cannot exceed balance (${maxPay.toFixed(2)} PKR).`)
      return
    }

    startTransition(async () => {
      const result = await recordPaymentAction({
        sale_id: saleId,
        farm_id: farmId,
        amount: amt,
        payment_date: paymentDate,
        payment_method: method,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
      })
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Payment recorded.')
      reset()
      onOpenChange(false)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset()
        onOpenChange(v)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              {selected ? (
                <>
                  Invoice <strong>{selected.invoice_number}</strong> • Balance due:{' '}
                  <strong>PKR {maxPay.toLocaleString()}</strong>
                </>
              ) : (
                <>Select an unpaid invoice to record a payment.</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Invoice</Label>
              <Select
                value={saleId}
                onValueChange={(v) => v && setSaleId(v)}
                disabled={isPending}
                items={openSales.reduce<Record<string, string>>((acc, s) => {
                  acc[s.id] = `${s.invoice_number} — PKR ${roundMoney(s.balance_due).toLocaleString()}`
                  return acc
                }, {})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select invoice" />
                </SelectTrigger>
                <SelectContent>
                  {openSales.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.invoice_number} — PKR {roundMoney(s.balance_due).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pay_amt">Amount (PKR)</Label>
              <Input
                id="pay_amt"
                type="number"
                min={0}
                step="0.01"
                max={maxPay}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isPending || !saleId}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay_date">Payment date</Label>
              <Input
                id="pay_date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                disabled={isPending || !saleId}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select
                value={method}
                onValueChange={(v) => v && setMethod(v)}
                disabled={isPending || !saleId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay_ref">Reference #</Label>
              <Input
                id="pay_ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                disabled={isPending || !saleId}
                placeholder="Txn id, cheque #, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay_notes">Notes</Label>
              <textarea
                id="pay_notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isPending || !saleId}
                className="flex w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primarySimple"
              disabled={isPending || !saleId || maxPay <= 0}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Record payment'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

