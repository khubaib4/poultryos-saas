import * as XLSX from 'xlsx'

export interface ExcelSheet {
  name: string
  rows: (string | number | null | undefined)[][]
}

export function downloadReportExcel(options: {
  sheets: ExcelSheet[]
  filename: string
}): void {
  const wb = XLSX.utils.book_new()
  for (const sh of options.sheets) {
    const ws = XLSX.utils.aoa_to_sheet(sh.rows)
    XLSX.utils.book_append_sheet(wb, ws, sh.name.slice(0, 31))
  }
  XLSX.writeFile(wb, options.filename)
}
