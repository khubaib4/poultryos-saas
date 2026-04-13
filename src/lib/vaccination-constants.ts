export const COMMON_VACCINES = [
  "Newcastle Disease (ND)",
  'Infectious Bronchitis (IB)',
  "Marek's Disease",
  'Fowl Pox',
  'Infectious Bursal Disease (IBD/Gumboro)',
  'Avian Influenza (AI)',
  'Mycoplasma Gallisepticum (MG)',
  'Egg Drop Syndrome (EDS)',
  'Salmonella',
] as const

export const VACCINATION_METHODS = [
  'Drinking Water',
  'Eye Drop',
  'Injection (Subcutaneous)',
  'Injection (Intramuscular)',
  'Spray',
  'Wing Web',
] as const

/** Stored in DB */
export const VACCINATION_STATUSES = ['scheduled', 'completed', 'skipped'] as const
export type VaccinationStatus = (typeof VACCINATION_STATUSES)[number]

/** UI / computed */
export type VaccinationDisplayStatus =
  | 'scheduled'
  | 'overdue'
  | 'completed'
  | 'skipped'

export const SKIP_VACCINATION_REASONS = [
  'Not Available',
  'Flock Sold',
  'Postponed',
  'Not Required',
  'Other',
] as const

export function isoDateToday(): string {
  return new Date().toISOString().slice(0, 10)
}

export function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00.000Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
