import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  Users,
  ArrowLeft,
  Building2,
  MapPin,
  Mail,
  Phone,
  TrendingUp,
  Star,
  Clock3,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import {
  getCustomerDetail,
} from '@/lib/queries/customers'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn, formatCurrency } from '@/lib/utils'
import { categoryColors, categoryKeyFromDb } from '@/components/customers/customer-category-colors'
import { CustomerTransactions } from '@/components/customers/CustomerTransactions'
import { CustomerDetailHeader } from '@/components/customers/CustomerDetailHeader'

interface PageProps {
  params: Promise<{ customerId: string }>
  searchParams: Promise<{ farm?: string }>
}

export default async function CustomerDetailPage({ params, searchParams }: PageProps) {
  const { customerId } = await params
  const { profile } = await getSessionProfile()
  const sp = await searchParams
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) {
    return (
      <EmptyState
        icon={Users}
        title="Select a farm"
        description="Choose an assigned farm from the header to view this customer."
      />
    )
  }

  const pack = await getCustomerDetail(customerId, farmId, 80)
  if (!pack) notFound()

  const { customer, totals, openSales, transactions, paymentDueBanner } = pack

  const editHref = withFarmQuery(`/farm/customers/${customerId}/edit`, farmId)
  const listHref = withFarmQuery('/farm/customers', farmId)

  const key = categoryKeyFromDb(customer.category)
  const colors = categoryColors[key]
  const initials = customer.name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

  const todayIso = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-6">
      <Link href={listHref}>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </Link>

      <CustomerDetailHeader
        farmId={farmId}
        customerName={customer.name}
        initials={initials}
        avatarClass={colors.avatar}
        category={customer.category}
        location={customer.address ?? '—'}
        editHref={editHref}
        openSales={openSales}
        defaultDate={todayIso}
      />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/[0.04]">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Financial Vitality
            </p>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Sales</span>
                <span className="text-lg font-semibold text-gray-900">
                  {formatCurrency(totals.totalSales)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Paid</span>
                <span className="text-lg font-semibold text-green-700">
                  {formatCurrency(totals.totalPaid)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Current Balance</span>
                <span className={cn('text-2xl font-bold', totals.balance > 0 ? 'text-green-700' : 'text-gray-900')}>
                  {formatCurrency(totals.balance)}
                </span>
              </div>
              {paymentDueBanner ? (
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ring-1',
                    paymentDueBanner.status === 'overdue' &&
                      'bg-red-100 text-red-700 ring-red-200',
                    (paymentDueBanner.status === 'today' ||
                      paymentDueBanner.status === 'upcoming') &&
                      'bg-amber-50 text-amber-700 ring-amber-200',
                    paymentDueBanner.status === 'ok' &&
                      'bg-green-100 text-green-700 ring-green-200'
                  )}
                >
                  {paymentDueBanner.status === 'ok' ? (
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                  ) : (
                    <Clock className="h-4 w-4" aria-hidden />
                  )}
                  {paymentDueBanner.message}
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/[0.04]">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Contact Details
            </p>
            <div className="mt-4 space-y-3 text-sm text-gray-700">
              <div className="flex gap-3">
                <Building2 className="mt-0.5 h-4 w-4 text-gray-400" aria-hidden />
                <div>
                  <p className="text-xs text-gray-500">Business name</p>
                  <p className="font-semibold text-gray-900">
                    {customer.business_name ?? customer.name}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-gray-400" aria-hidden />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="font-semibold text-gray-900">{customer.phone ?? '—'}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-gray-400" aria-hidden />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-semibold text-gray-900">—</p>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-gray-400" aria-hidden />
                <div>
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="whitespace-pre-wrap font-semibold text-gray-900">
                    {customer.address ?? '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <CustomerTransactions rows={transactions} farmId={farmId} />
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/[0.04]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700">
              <TrendingUp className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">Purchase Frequency</p>
              <p className="text-sm text-gray-600">2.4 orders / month</p>
            </div>
          </div>
          <Progress value={60} className="mt-4" />
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/[0.04]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <Star className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">Customer Health</p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">4.5</span> rating
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Top 10% consistent payees this quarter.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/[0.04]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700">
              <Clock3 className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">Last Contact</p>
              <p className="text-sm text-gray-600">Yesterday, 4:15 PM</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            “Inquired about next flock availability.”
          </p>
        </div>
      </div>
    </div>
  )
}
