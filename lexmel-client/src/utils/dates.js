/** Fecha a mediodía local (evita desfases UTC en el gantt). */
export function parseDay(input) {
  if (input instanceof Date) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate(), 12, 0, 0)
  }
  const [y, m, d] = String(input).split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

export function getToday() {
  const override = new URLSearchParams(window.location.search).get('hoy')
  if (override) return parseDay(override)
  return parseDay(new Date())
}

export function fmtDate(str) {
  if (!str) return '—'
  return parseDay(str).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtDateLong(input) {
  return parseDay(input).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function addCalendarDays(date, days) {
  const d = parseDay(date)
  d.setDate(d.getDate() + days)
  return d
}

export const MS_DAY = 86400000

export function daysBetween(from, to) {
  return Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / MS_DAY)
}

export function pluralDias(n) {
  return `${n} día${n === 1 ? '' : 's'}`
}

export const DAYS_WARNING_THRESHOLD = 14

export function isDaysWarning(days) {
  return typeof days === 'number' && days >= 0 && days < DAYS_WARNING_THRESHOLD
}
