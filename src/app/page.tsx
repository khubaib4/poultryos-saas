import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  ShoppingCart,
  HeartPulse,
  FileText,
  Bird,
  CheckCircle2,
} from 'lucide-react'

const features = [
  {
    icon: Bird,
    title: 'Track production',
    description:
      'Monitor flock performance, egg production, and feed use with clear daily records.',
  },
  {
    icon: ShoppingCart,
    title: 'Manage sales',
    description:
      'Record eggs, broilers, and by-products in PKR with invoices and payment status.',
  },
  {
    icon: HeartPulse,
    title: 'Monitor health',
    description:
      'Log vaccinations, mortality, and treatments so nothing falls through the cracks.',
  },
  {
    icon: FileText,
    title: 'Generate reports',
    description:
      'Financial and production summaries across farms — ready to print or export.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description:
      'See trends across batches and time periods without digging through spreadsheets.',
  },
  {
    icon: CheckCircle2,
    title: 'Multi-farm & roles',
    description:
      'Organization admins and farm workers each get the right level of access.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 min-h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-gradient text-sm font-bold text-white shadow-sm"
              aria-hidden
            >
              P
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">PoultryOS</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-gray-600">
                Log in
              </Button>
            </Link>
            <Link href="/register">
              <Button>Get started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="border-b border-gray-200 bg-gradient-to-b from-primary-lightest via-primary-lighter/40 to-white py-20 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <Badge variant="secondary" className="mb-4 border-primary/20 bg-primary-light text-primary-dark">
            Poultry farm operations
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Run your poultry business with confidence
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg font-medium text-primary-dark">
            PoultryOS — built for farm teams and organization admins.
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-gray-600">
            A clear, modern workspace for flocks, daily entry, sales, and reports.
            Simple enough for busy barns; structured enough for head office.
          </p>
          <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <Link href="/register" className="sm:inline-flex">
              <Button size="lg" className="w-full sm:w-auto">
                Start free trial
              </Button>
            </Link>
            <Link href="/login" className="sm:inline-flex">
              <Button size="lg" variant="outline" className="w-full border-primary text-primary hover:bg-primary-lighter sm:w-auto">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-semibold text-gray-900">
              Everything in one place
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-gray-600">
              From flock arrival to final sale — record what matters and review it anytime.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <Card
                  key={feature.title}
                  className="border-gray-200 bg-white shadow-none transition-colors hover:border-primary/30"
                >
                  <CardContent className="p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-light">
                      <Icon className="h-6 w-6 text-primary" aria-hidden />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-gray-900">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-5 text-gray-600">{feature.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-gray-200 bg-primary-gradient py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold text-white">Ready to modernize your farm?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/90">
            Get your team on the same page with a tool that respects how poultry farms actually work.
          </p>
          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <Link href="/register" className="sm:inline-flex">
              <Button
                size="lg"
                className="w-full border-0 bg-white text-primary shadow-md hover:bg-primary-lightest sm:w-auto"
              >
                Get started free
              </Button>
            </Link>
            <Link href="/login" className="sm:inline-flex">
              <Button
                size="lg"
                variant="outline"
                className="w-full border-white bg-transparent text-white hover:bg-white/10 sm:w-auto"
              >
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-500 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-gradient text-xs font-bold text-white"
              aria-hidden
            >
              P
            </div>
            <span className="font-semibold text-gray-800">PoultryOS</span>
          </div>
          <p className="mt-2">
            &copy; {new Date().getFullYear()} PoultryOS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
