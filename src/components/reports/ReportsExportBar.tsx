'use client'

import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { exportReportExcel, exportReportPDF } from '@/lib/export/reports'
import { toast } from 'sonner'

interface ReportsExportBarProps {
  title: string
  tab: string
  farmName: string
  rangeLabel: string
  tableRows: string[][]
}

export function ReportsExportBar({
  title,
  tab,
  farmName,
  rangeLabel,
  tableRows,
}: ReportsExportBarProps) {
  const [pdfBusy, setPdfBusy] = useState(false)
  const [xlBusy, setXlBusy] = useState(false)

  async function runPdf() {
    setPdfBusy(true)
    try {
      await exportReportPDF({ title, tab, farmName, rangeLabel, rows: tableRows })
      toast.success('PDF downloaded')
    } catch (e) {
      console.error(e)
      toast.error('Could not generate PDF')
    } finally {
      setPdfBusy(false)
    }
  }

  async function runExcel() {
    setXlBusy(true)
    try {
      await exportReportExcel({ title, tab, farmName, rangeLabel, rows: tableRows })
      toast.success('Excel downloaded')
    } catch (e) {
      console.error(e)
      toast.error('Could not generate Excel')
    } finally {
      setXlBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-xl border-gray-200"
        disabled={pdfBusy}
        onClick={runPdf}
      >
        {pdfBusy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileText className="mr-2 h-4 w-4" />
        )}
        Export PDF
      </Button>
      <Button
        type="button"
        size="sm"
        className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700"
        disabled={xlBusy}
        onClick={runExcel}
      >
        {xlBusy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="mr-2 h-4 w-4" />
        )}
        Export Excel
      </Button>
    </div>
  )
}
