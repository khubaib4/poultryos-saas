'use client'

import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface ExportButtonsProps {
  onPdf: () => void | Promise<void>
  onExcel: () => void | Promise<void>
  disabled?: boolean
}

export function ExportButtons({ onPdf, onExcel, disabled }: ExportButtonsProps) {
  const [pdfBusy, setPdfBusy] = useState(false)
  const [xlsxBusy, setXlsxBusy] = useState(false)

  async function runPdf() {
    setPdfBusy(true)
    try {
      await onPdf()
    } finally {
      setPdfBusy(false)
    }
  }

  async function runExcel() {
    setXlsxBusy(true)
    try {
      await onExcel()
    } finally {
      setXlsxBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || pdfBusy}
        onClick={runPdf}
        className="border-gray-200"
      >
        {pdfBusy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileText className="mr-2 h-4 w-4" />
        )}
        PDF
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || xlsxBusy}
        onClick={runExcel}
        className="border-gray-200"
      >
        {xlsxBusy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="mr-2 h-4 w-4" />
        )}
        Excel
      </Button>
    </div>
  )
}
