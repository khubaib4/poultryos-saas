'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
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
import { createExpenseAction, updateExpenseAction } from '@/lib/actions/expenses'
import { useOfflineOptional } from '@/components/providers/OfflineProvider'
import { createOfflineExpense, updateOfflineExpense } from '@/lib/offline/offlineCrud'
import { EXPENSE_CATEGORIES } from '@/lib/expense-categories'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Expense } from '@/types/database'

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'mobile', label: 'Mobile' },
] as const

const expenseSchema = z.object({
  category: z.string().min(1, 'Category is required.'),
  amount: z
    .string()
    .min(1, 'Enter amount')
    .refine(
      (s) => !Number.isNaN(parseFloat(s)) && parseFloat(s) > 0,
      'Amount must be greater than zero.'
    )
    .transform((s) => parseFloat(s)),
  expense_date: z.string().min(1, 'Date is required.'),
  description: z.string().min(1, 'Description is required.').max(2000),
  vendor: z.string().max(200).optional().or(z.literal('')),
  payment_method: z.enum(['cash', 'bank_transfer', 'cheque', 'mobile']),
  reference: z.string().max(200).optional().or(z.literal('')),
  notes: z.string().max(5000).optional().or(z.literal('')),
})

type ExpenseFormInput = z.input<typeof expenseSchema>
type ExpenseFormValues = z.output<typeof expenseSchema>

interface ExpenseFormProps {
  farmId: string
  expenseId?: string
  initial?: Expense | null
}

export function ExpenseForm({ farmId, expenseId, initial }: ExpenseFormProps) {
  const router = useRouter()
  const offline = useOfflineOptional()
  const isOnline = offline?.isOnline ?? true
  const [isPending, startTransition] = useTransition()
  const isEditing = Boolean(expenseId)

  const defaultDate =
    initial?.expense_date?.slice(0, 10) ??
    initial?.date?.slice(0, 10) ??
    new Date().toISOString().slice(0, 10)

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<ExpenseFormInput, unknown, ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: initial?.category ?? 'Other',
      amount: initial ? String(initial.amount) : '',
      expense_date: defaultDate,
      description: initial?.description ?? '',
      vendor: initial?.vendor ?? '',
      payment_method:
        (initial?.payment_method as ExpenseFormValues['payment_method']) ?? 'cash',
      reference: initial?.reference ?? '',
      notes: initial?.notes ?? '',
    },
  })

  const onSubmit = (values: ExpenseFormValues) => {
    startTransition(async () => {
      const payload = {
        farm_id: farmId,
        category: values.category,
        amount: values.amount,
        expense_date: values.expense_date,
        description: values.description,
        vendor: values.vendor || null,
        payment_method: values.payment_method,
        reference: values.reference || null,
        notes: values.notes || null,
      }

      if (!isOnline) {
        if (isEditing) {
          await updateOfflineExpense(expenseId!, payload)
        } else {
          await createOfflineExpense(payload)
        }
        toast.success('Saved offline. Will sync when connected.')
        await offline?.refreshPending()
        if (!isEditing) {
          router.push(`/farm/expenses?farm=${encodeURIComponent(farmId)}`)
          return
        }
        router.push(`/farm/expenses/${expenseId}?farm=${encodeURIComponent(farmId)}`)
        return
      }

      const result = isEditing
        ? await updateExpenseAction(expenseId!, payload)
        : await createExpenseAction(payload)

      if ('error' in result) {
        setError('root', { message: result.error })
        return
      }

      toast.success(isEditing ? 'Expense updated.' : 'Expense recorded.')
      if (!isEditing && 'id' in result) {
        router.push(
          `/farm/expenses/${result.id}?farm=${encodeURIComponent(farmId)}`
        )
        return
      }
      router.push(`/farm/expenses/${expenseId}?farm=${encodeURIComponent(farmId)}`)
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-xl">
      {errors.root && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.root.message}
        </div>
      )}

      <div className="space-y-2">
        <Label>
          Category <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(v) => v && field.onChange(v)}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.category && (
          <p className="text-xs text-red-600">{errors.category.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amount">
            Amount (PKR) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min={0}
            disabled={isPending}
            {...register('amount')}
          />
          {errors.amount && (
            <p className="text-xs text-red-600">{errors.amount.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="expense_date">
            Expense date <span className="text-red-500">*</span>
          </Label>
          <Input
            id="expense_date"
            type="date"
            disabled={isPending}
            {...register('expense_date')}
          />
          {errors.expense_date && (
            <p className="text-xs text-red-600">{errors.expense_date.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">
          Description <span className="text-red-500">*</span>
        </Label>
        <Input
          id="description"
          placeholder="What was purchased or paid for"
          disabled={isPending}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-xs text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="vendor">Vendor</Label>
        <Input
          id="vendor"
          placeholder="Supplier or payee (optional)"
          disabled={isPending}
          {...register('vendor')}
        />
      </div>

      <div className="space-y-2">
        <Label>Payment method</Label>
        <Controller
          name="payment_method"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(v) =>
                v && field.onChange(v as ExpenseFormValues['payment_method'])
              }
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reference">Reference</Label>
        <Input
          id="reference"
          placeholder="Receipt #, transaction id…"
          disabled={isPending}
          {...register('reference')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          rows={3}
          disabled={isPending}
          className={cn(
            'flex w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm',
            'outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
          )}
          {...register('notes')}
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
          ) : isEditing ? (
            'Save changes'
          ) : (
            'Save expense'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            router.push(`/farm/expenses?farm=${encodeURIComponent(farmId)}`)
          }
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
