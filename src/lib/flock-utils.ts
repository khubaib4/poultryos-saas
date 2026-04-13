/**
 * Calculate a flock's current age in weeks + days.
 *
 * Age = (days since arrival_date) + age_at_arrival (days)
 */
export function calculateFlockAge(
  arrivalDate: string,
  ageAtArrivalDays: number
): { weeks: number; days: number; totalDays: number } {
  const arrival = new Date(arrivalDate)
  const now = new Date()
  const msPerDay = 1000 * 60 * 60 * 24
  const daysSinceArrival = Math.max(
    0,
    Math.floor((now.getTime() - arrival.getTime()) / msPerDay)
  )
  const totalDays = daysSinceArrival + (ageAtArrivalDays ?? 0)
  return {
    weeks: Math.floor(totalDays / 7),
    days: totalDays % 7,
    totalDays,
  }
}

export function formatFlockAge(
  arrivalDate: string,
  ageAtArrivalDays: number
): string {
  const { weeks, days } = calculateFlockAge(arrivalDate, ageAtArrivalDays)
  if (weeks === 0) return `${days} day${days === 1 ? '' : 's'}`
  if (days === 0) return `${weeks} week${weeks === 1 ? '' : 's'}`
  return `${weeks}w ${days}d`
}
