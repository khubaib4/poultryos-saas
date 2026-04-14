import { format, parseISO } from 'date-fns'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { SaleDetail } from '@/lib/queries/sales'

const GREEN: [number, number, number] = [34, 197, 94]
const GRAY: [number, number, number] = [107, 114, 128]
const DARK: [number, number, number] = [31, 41, 55]
const LIGHT_GRAY: [number, number, number] = [243, 244, 246]
const LIGHT_GREEN_BG: [number, number, number] = [240, 253, 244]

export interface InvoicePDFData {
  invoice: {
    invoice_number: string
    date: string
    due_date: string
    status: 'paid' | 'partial' | 'unpaid'
    subtotal: number
    discount: number
    discount_label: string
    discount_amount: number
    total: number
    paid: number
    balance_due: number
    notes?: string
    payment_method?: string
    reference?: string
    payment_terms: string
  }
  farm: {
    name: string
    address?: string
    phone?: string
    email?: string
  }
  customer: {
    name: string
    business_name?: string
    category?: string
    address?: string
    phone?: string
    email?: string
  }
  lineItems: Array<{
    description: string
    details?: string
    quantity: number
    unit_price: number
    amount: number
  }>
  paymentDetails?: {
    bank_name?: string
    account_number?: string
    iban?: string
  }
}

const DEFAULT_BANK = {
  bank_name: 'Habib Bank Limited (HBL)',
  account_number: '0042-79014567-03',
  iban: 'PK21HABB004279001456703',
}

function formatRs(n: number): string {
  return `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDisplayDate(iso: string): string {
  try {
    return format(parseISO(iso.slice(0, 10)), 'MMMM d, yyyy')
  } catch {
    return iso
  }
}

function mapPaymentStatus(raw: string): 'paid' | 'partial' | 'unpaid' {
  const s = raw.toLowerCase()
  if (s === 'paid') return 'paid'
  if (s === 'partial') return 'partial'
  return 'unpaid'
}

function paymentTermsLabel(saleDate: string, dueDate: string | null | undefined): string {
  if (!dueDate) return 'Net 14 days'
  try {
    const a = parseISO(saleDate.slice(0, 10))
    const b = parseISO(dueDate.slice(0, 10))
    const days = Math.max(
      0,
      Math.round((b.getTime() - a.getTime()) / 86400000)
    )
    return days > 0 ? `Net ${days} days` : 'Due on receipt'
  } catch {
    return 'Net 14 days'
  }
}

function discountLabel(sale: SaleDetail): string {
  const amt = Number(sale.discount_amount ?? 0)
  if (amt <= 0.001) return ''
  const t = (sale.discount_type ?? '').toLowerCase()
  if (t === 'percentage') {
    return `Discount (${Number(sale.discount_value ?? 0)}%)`
  }
  return 'Discount'
}

export function buildInvoicePdfData(
  sale: SaleDetail,
  farm: { name: string; location?: string | null }
): InvoicePDFData {
  const lines = (sale.line_items ?? []).map((li) => {
    const qty = Number(li.quantity ?? 0)
    const unit = Number(li.unit_price ?? 0)
    const amt = Number(li.total ?? qty * unit)
    const type = String(li.type ?? 'Item')
    return {
      description: type,
      details: undefined,
      quantity: qty,
      unit_price: unit,
      amount: amt,
    }
  })

  const cust = sale.customers

  const customerName = cust?.name ?? sale.customer_name ?? 'Customer'
  const category = cust?.category
    ? String(cust.category).toUpperCase()
    : undefined

  const firstPay = sale.payments?.[0]

  return {
    invoice: {
      invoice_number: sale.invoice_number,
      date: formatDisplayDate(sale.sale_date),
      due_date: sale.due_date ? formatDisplayDate(sale.due_date) : '—',
      status: mapPaymentStatus(String(sale.payment_status)),
      subtotal: Number(sale.subtotal ?? 0),
      discount: Number(sale.discount_value ?? 0),
      discount_label: discountLabel(sale),
      discount_amount: Number(sale.discount_amount ?? 0),
      total: Number(sale.total_amount ?? 0),
      paid: Number(sale.paid_amount ?? 0),
      balance_due: Number(sale.balance_due ?? 0),
      notes: sale.notes ?? undefined,
      payment_method: firstPay?.payment_method ?? 'Bank Transfer',
      reference: firstPay?.reference ?? undefined,
      payment_terms: paymentTermsLabel(sale.sale_date, sale.due_date),
    },
    farm: {
      name: farm.name,
      address: farm.location ?? undefined,
      phone: undefined,
      email: undefined,
    },
    customer: {
      name: customerName,
      business_name: cust?.business_name ?? undefined,
      category,
      address: cust?.address ?? undefined,
      phone: cust?.phone ?? undefined,
      email: undefined,
    },
    lineItems: lines,
    paymentDetails: DEFAULT_BANK,
  }
}

export async function generateInvoicePDF(data: InvoicePDFData): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 48
  let y = margin

  const inv = data.invoice

  // —— Header: logo + brand (left)
  doc.setFillColor(...GREEN)
  doc.roundedRect(margin, y, 28, 28, 4, 4, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...DARK)
  doc.text('PoultryOS', margin + 36, y + 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text('FARM INTELLIGENCE', margin + 36, y + 28)

  // —— INVOICE (right)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.setTextColor(...GREEN)
  doc.text('INVOICE', pageWidth - margin, y + 12, { align: 'right' })
  doc.setFontSize(10)
  doc.setTextColor(...DARK)
  doc.text(inv.invoice_number, pageWidth - margin, y + 28, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  doc.text(`Issue date: ${inv.date}`, pageWidth - margin, y + 40, { align: 'right' })
  doc.text(`Due date: ${inv.due_date}`, pageWidth - margin, y + 52, { align: 'right' })

  const statusColors: Record<typeof inv.status, [number, number, number]> = {
    paid: [34, 197, 94],
    partial: [245, 158, 11],
    unpaid: [239, 68, 68],
  }
  const statusLabels: Record<typeof inv.status, string> = {
    paid: 'PAID',
    partial: 'PARTIAL',
    unpaid: 'UNPAID',
  }
  const badgeW = 56
  const badgeH = 18
  const badgeX = pageWidth - margin - badgeW
  const badgeY = y + 58
  doc.setFillColor(...statusColors[inv.status])
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 4, 4, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text(statusLabels[inv.status], badgeX + badgeW / 2, badgeY + 12, {
    align: 'center',
  })

  y += 100

  // —— FROM / BILLED TO
  const colGap = 24
  const colW = (pageWidth - margin * 2 - colGap) / 2
  const leftX = margin
  const rightX = margin + colW + colGap

  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text('FROM', leftX, y)
  doc.text('BILLED TO', rightX, y)
  y += 14

  let yL = y
  let yR = y

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...DARK)
  doc.text(data.farm.name, leftX, yL)
  yL += 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  if (data.farm.address) {
    const farmLines = doc.splitTextToSize(data.farm.address, colW - 4)
    doc.text(farmLines, leftX, yL)
    yL += farmLines.length * 11 + 4
  }
  if (data.farm.phone) {
    doc.text(data.farm.phone, leftX, yL)
    yL += 14
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...DARK)
  doc.text(data.customer.name, rightX, yR)
  const nameW = doc.getTextWidth(data.customer.name)
  if (data.customer.category) {
    const bx = rightX + nameW + 8
    doc.setFillColor(...LIGHT_GRAY)
    doc.roundedRect(bx, yR - 10, 72, 14, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6)
    doc.setTextColor(...GRAY)
    doc.text(data.customer.category, bx + 36, yR - 1, { align: 'center' })
  }
  yR += 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  if (data.customer.address) {
    const addrLines = doc.splitTextToSize(data.customer.address, colW - 4)
    doc.text(addrLines, rightX, yR)
    yR += addrLines.length * 11 + 4
  }
  if (data.customer.phone) {
    doc.text(data.customer.phone, rightX, yR)
    yR += 12
  }
  if (data.customer.email) {
    doc.text(data.customer.email, rightX, yR)
    yR += 12
  }

  y = Math.max(yL, yR) + 20

  // —— Payment info bar
  const barH = 36
  doc.setFillColor(...LIGHT_GRAY)
  doc.rect(margin, y, pageWidth - margin * 2, barH, 'F')

  const barMid = y + barH / 2 + 4
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('PAYMENT TERMS', margin + 12, y + 10)
  doc.text('METHOD', margin + 160, y + 10)
  doc.text('REFERENCE', margin + 300, y + 10)
  doc.setFontSize(9)
  doc.setTextColor(...DARK)
  doc.text(inv.payment_terms, margin + 12, barMid)
  doc.text(inv.payment_method ?? '—', margin + 160, barMid)
  doc.setTextColor(...GREEN)
  doc.text(inv.reference?.trim() || '—', margin + 300, barMid)

  y += barH + 20

  // —— Line items
  const body = data.lineItems.map((item, index) => {
    const desc = item.details
      ? `${item.description}\n${item.details}`
      : item.description
    return [
      String(index + 1).padStart(2, '0'),
      desc,
      String(item.quantity),
      formatRs(item.unit_price),
      formatRs(item.amount),
    ]
  })

  autoTable(doc, {
    startY: y,
    head: [['#', 'DESCRIPTION', 'QTY', 'UNIT PRICE', 'AMOUNT']],
    body,
    headStyles: {
      fillColor: GREEN,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: DARK,
      cellPadding: { top: 6, bottom: 6, left: 4, right: 4 },
    },
    columnStyles: {
      0: { cellWidth: 28, halign: 'center', valign: 'middle' },
      2: { cellWidth: 44, halign: 'center' },
      3: { cellWidth: 72, halign: 'right' },
      4: { cellWidth: 80, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: {
      lineColor: LIGHT_GRAY,
      lineWidth: 0.5,
    },
  })

  const docExt = doc as unknown as { lastAutoTable?: { finalY: number } }
  y = (docExt.lastAutoTable?.finalY ?? y) + 16

  // —— Totals: payment summary (left) + figures (right)
  const boxW = 200
  const boxH = 72
  doc.setFillColor(...LIGHT_GREEN_BG)
  doc.roundedRect(margin, y, boxW, boxH, 6, 6, 'F')
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('PAYMENT SUMMARY', margin + 12, y + 14)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Amount paid', margin + 12, y + 32)
  doc.setTextColor(...GREEN)
  doc.text(formatRs(inv.paid), margin + boxW - 12, y + 32, { align: 'right' })
  doc.setTextColor(180, 83, 9)
  doc.setFont('helvetica', 'bold')
  doc.text('Balance due', margin + 12, y + 52)
  doc.text(formatRs(inv.balance_due), margin + boxW - 12, y + 52, { align: 'right' })

  const tx = pageWidth - margin - 200
  let ty = y + 12
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  doc.text('Subtotal', tx, ty)
  doc.setTextColor(...DARK)
  doc.text(formatRs(inv.subtotal), pageWidth - margin, ty, { align: 'right' })
  ty += 16
  if (inv.discount_amount > 0.009) {
    doc.setTextColor(...GRAY)
    doc.text(inv.discount_label || 'Discount', tx, ty)
    doc.setTextColor(...GREEN)
    doc.text(`− ${formatRs(inv.discount_amount)}`, pageWidth - margin, ty, {
      align: 'right',
    })
    ty += 16
  }
  doc.setDrawColor(...LIGHT_GRAY)
  doc.line(tx, ty, pageWidth - margin, ty)
  ty += 14
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...GRAY)
  doc.text('Total', tx, ty)
  doc.setFontSize(16)
  doc.setTextColor(...GREEN)
  doc.text(formatRs(inv.total), pageWidth - margin, ty + 2, { align: 'right' })

  y += boxH + 28

  // —— Payment details + notes (two columns, aligned top)
  const pd = data.paymentDetails ?? DEFAULT_BANK
  const sectionHeadY = y
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...DARK)
  doc.text('PAYMENT DETAILS', leftX, sectionHeadY)
  doc.text('NOTES', rightX, sectionHeadY)
  const rowY = sectionHeadY + 14

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  doc.text('Bank:', leftX, rowY)
  doc.setTextColor(...DARK)
  doc.text(pd.bank_name ?? '—', leftX + 52, rowY)
  let yBank = rowY + 12
  doc.setTextColor(...GRAY)
  doc.text('Account:', leftX, yBank)
  doc.setTextColor(...DARK)
  doc.text(pd.account_number ?? '—', leftX + 52, yBank)
  yBank += 12
  doc.setTextColor(...GRAY)
  doc.text('IBAN:', leftX, yBank)
  doc.setTextColor(...DARK)
  doc.text(pd.iban ?? '—', leftX + 52, yBank)

  const notesText =
    inv.notes?.trim() ||
    'Thank you for your business! Please ensure payment is made within the agreed window. For any disputes regarding item quality, please contact our support within 24 hours of delivery.'
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  const notesLines = doc.splitTextToSize(notesText, colW)
  doc.text(notesLines, rightX, rowY)

  // —— Footer
  const footY = pageHeight - 28
  doc.setFillColor(...GREEN)
  doc.roundedRect(margin, footY, 10, 10, 2, 2, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text('Generated by PoultryOS', margin + 16, footY + 7)
  const totalPages = doc.getNumberOfPages()
  doc.text(
    `PAGE 1 OF ${totalPages}`,
    pageWidth - margin,
    footY + 7,
    { align: 'right' }
  )

  return doc.output('blob')
}

export function downloadInvoiceBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Opens the PDF in a new tab; user can print from the viewer. */
export function openInvoicePdfForPrint(blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const w = window.open(url, '_blank', 'noopener,noreferrer')
  if (w) {
    const tryPrint = () => {
      try {
        w.focus()
        w.print()
      } catch {
        /* viewer may block until loaded */
      }
    }
    setTimeout(tryPrint, 500)
  }
}
