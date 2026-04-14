/** Value/label pairs for schedule forms (Stitch). Stored vaccine_name uses `label`. */
export const VACCINE_OPTIONS = [
  { value: 'newcastle-b1', label: 'Newcastle Disease (B1)' },
  { value: 'newcastle-lasota', label: 'Newcastle Disease (LaSota)' },
  { value: 'newcastle-nd', label: 'Newcastle Disease (ND)' },
  { value: 'infectious-bronchitis', label: 'Infectious Bronchitis (IB)' },
  { value: 'gumboro-ibd', label: 'Infectious Bursal Disease (Gumboro/IBD)' },
  { value: 'fowl-pox', label: 'Fowl Pox' },
  { value: 'mareks', label: "Marek's Disease" },
  { value: 'avian-influenza', label: 'Avian Influenza' },
  { value: 'coccidiosis', label: 'Coccidiosis' },
  { value: 'mycoplasma', label: 'Mycoplasma Gallisepticum (MG)' },
  { value: 'eds', label: 'Egg Drop Syndrome (EDS)' },
  { value: 'salmonella', label: 'Salmonella' },
  { value: 'other', label: 'Other' },
] as const

export const ADMINISTRATION_METHOD_OPTIONS = [
  { value: 'drinking-water', label: 'Drinking Water' },
  { value: 'eye-drop', label: 'Eye Drop' },
  { value: 'injection-sc', label: 'Injection (Subcutaneous)' },
  { value: 'injection-im', label: 'Injection (Intramuscular)' },
  { value: 'spray', label: 'Spray' },
  { value: 'wing-web', label: 'Wing Web' },
] as const

export function vaccineLabelFromPresetValue(value: string): string {
  const hit = VACCINE_OPTIONS.find((o) => o.value === value)
  return hit?.label ?? value
}

export function methodLabelFromValue(value: string): string {
  const hit = ADMINISTRATION_METHOD_OPTIONS.find((o) => o.value === value)
  return hit?.label ?? value
}

/** Match stored vaccine_name to preset value for selects (legacy strings included). */
export function matchVaccinePresetValue(storedName: string): string {
  const t = storedName.trim()
  const byLabel = VACCINE_OPTIONS.find((o) => o.label === t)
  if (byLabel) return byLabel.value
  const legacy: Record<string, string> = {
    'Newcastle Disease (ND)': 'newcastle-nd',
    'Newcastle Disease (ND) ': 'newcastle-nd',
  }
  if (legacy[t]) return legacy[t]
  return 'other'
}
