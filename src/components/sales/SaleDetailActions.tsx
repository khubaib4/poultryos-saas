'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Download, Loader2, Printer, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RecordPaymentModal } from '@/components/sales/RecordPaymentModal'
import { DeleteSaleButton } from '@/components/sales/DeleteSaleButton'
import { toast } from 'sonner'
import {
  downloadInvoiceBlob,
  generateInvoicePDF,
  openInvoicePdfForPrint,
  type InvoicePDFData,
} from '@/lib/export/invoice-pdf'

interface SaleDetailActionsProps {
  saleId: string
  farmId: string
  invoiceNumber: string
  balanceDue: number
  saleDate: string
  pdfData: InvoicePDFData
}

export function SaleDetailActions({
  saleId,
  farmId,
  invoiceNumber,
  balanceDue,
  saleDate,
  pdfData,
}: SaleDetailActionsProps) {
  const [payOpen, setPayOpen] = useState(false)
  const [isPdfPending, startPdf] = useTransition()

  function safeFilename() {
    const base = invoiceNumber.replace(/[^\w.-]+/g, '_') || 'invoice'
    return `${base}.pdf`
  }

  function runPdf(fn: (blob: Blob) => void) {
    startPdf(async () => {
      try {
        const blob = await generateInvoicePDF(pdfData)
        fn(blob)
      } catch (e) {
        console.error(e)
        toast.error('Could not generate PDF.')
      }
    })
  }

  function handleDownload() {
    runPdf((blob) => {
      downloadInvoiceBlob(blob, safeFilename())
      toast.success('Invoice PDF downloaded.')
    })
  }

  function handlePrint() {
    runPdf((blob) => {
      openInvoicePdfForPrint(blob)
    })
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href={`/farm/sales/${saleId}/edit?farm=${encodeURIComponent(farmId)}`}>
          <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-xl">
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        </Link>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-xl"
          disabled={isPdfPending}
          onClick={handlePrint}
        >
          {isPdfPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Printer className="h-4 w-4" />
          )}
          Print
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-xl"
          disabled={isPdfPending}
          onClick={handleDownload}
        >
          {isPdfPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download PDF
        </Button>
        {balanceDue > 0 && (
          <Button
            type="button"
            variant="primarySimple"
            size="sm"
            className="gap-1.5 rounded-xl"
            onClick={() => setPayOpen(true)}
          >
            Record Payment
          </Button>
        )}
        <DeleteSaleButton
          saleId={saleId}
          farmId={farmId}
          invoiceNumber={invoiceNumber}
        />
      </div>
      <RecordPaymentModal
        open={payOpen}
        onOpenChange={setPayOpen}
        saleId={saleId}
        farmId={farmId}
        balanceDue={balanceDue}
        defaultDate={saleDate.slice(0, 10)}
      />
    </>
  )
}
