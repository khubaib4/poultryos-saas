import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface PdfTableSection {
  title?: string
  head: string[][]
  body: (string | number)[][]
}

export function downloadReportPdf(options: {
  title: string
  subtitle?: string
  brandName: string
  sections: PdfTableSection[]
  filename: string
}): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  let y = 48

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(22, 101, 52)
  doc.text(options.brandName, 48, y)
  y += 22
  doc.setFontSize(12)
  doc.text(options.title, 48, y)
  y += 16
  if (options.subtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(80, 80, 80)
    doc.text(options.subtitle, 48, y)
    y += 20
  }

  doc.setTextColor(0, 0, 0)

  for (const sec of options.sections) {
    if (sec.title) {
      if (y > doc.internal.pageSize.getHeight() - 120) {
        doc.addPage()
        y = 48
      }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(sec.title, 48, y)
      y += 14
    }
    autoTable(doc, {
      startY: y,
      head: sec.head,
      body: sec.body.map((row) => row.map((c) => String(c))),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [22, 101, 52] },
      margin: { left: 48, right: 48 },
    })
    const docExt = doc as unknown as { lastAutoTable?: { finalY: number } }
    y = (docExt.lastAutoTable?.finalY ?? y) + 24
  }

  doc.save(options.filename)
}
