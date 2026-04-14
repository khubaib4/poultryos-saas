import { format } from 'date-fns'

export interface ReportExportPayload {
  title: string
  tab: string
  farmName: string
  rangeLabel: string
  rows: string[][]
}

/** Browser-only PDF export (call from client components). */
export async function exportReportPDF(payload: ReportExportPayload): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 48
  let y = margin
  doc.setFontSize(16)
  doc.text(payload.title, margin, y)
  y += 28
  doc.setFontSize(10)
  doc.setTextColor(80)
  doc.text(`${payload.farmName} · ${payload.rangeLabel}`, margin, y)
  y += 18
  doc.text(`Tab: ${payload.tab}`, margin, y)
  y += 28
  doc.setTextColor(0)
  doc.setFontSize(9)
  for (const row of payload.rows) {
    const line = row.join(' · ')
    const lines = doc.splitTextToSize(line, 500)
    for (const ln of lines) {
      if (y > 760) {
        doc.addPage()
        y = margin
      }
      doc.text(ln, margin, y)
      y += 12
    }
  }
  doc.save(`poultryos-report-${payload.tab}-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`)
}

/** Browser-only Excel export. */
export async function exportReportExcel(payload: ReportExportPayload): Promise<void> {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.aoa_to_sheet([
    [payload.title],
    [payload.farmName, payload.rangeLabel],
    [`Tab: ${payload.tab}`],
    [],
    ...payload.rows,
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Report')
  XLSX.writeFile(
    wb,
    `poultryos-report-${payload.tab}-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`
  )
}
