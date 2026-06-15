import { parseDay, addCalendarDays } from '../utils/dates.js'

export const PROJECT_START = parseDay('2026-01-19')
export const PROJECT_END = parseDay('2026-11-27')
export const PROJECT_SPAN = PROJECT_END.getTime() - PROJECT_START.getTime()

/** Etiquetas de mes centradas en la porción visible del mes dentro del proyecto. */
export function buildMonthTicksFor(endDate = PROJECT_END) {
  const ticks = []
  const end = parseDay(endDate)
  const startMs = PROJECT_START.getTime()
  const endMs = end.getTime()
  const span = endMs - startMs
  if (span <= 0) return ticks

  let y = PROJECT_START.getFullYear()
  let m = PROJECT_START.getMonth()
  const endY = end.getFullYear()
  const endM = end.getMonth()

  while (y < endY || (y === endY && m <= endM)) {
    const monthStart = new Date(y, m, 1, 12, 0, 0)
    const monthEnd = new Date(y, m + 1, 0, 12, 0, 0)
    const segStart = Math.max(monthStart.getTime(), startMs)
    const segEnd = Math.min(monthEnd.getTime(), endMs)
    if (segStart <= segEnd) {
      const centerMs = (segStart + segEnd) / 2
      ticks.push({
        label: monthStart.toLocaleDateString('es-MX', { month: 'short' }),
        centerPct: ((centerMs - startMs) / span) * 100,
        startPct: ((segStart - startMs) / span) * 100,
      })
    }
    m++
    if (m > 11) { m = 0; y++ }
  }
  return ticks
}

export const MONTH_TICKS = buildMonthTicksFor(PROJECT_END)

export function appendMonthGridLines(track, ticks = MONTH_TICKS) {
  ticks.forEach(tick => {
    if (tick.startPct <= 0) return
    const line = document.createElement('div')
    line.className = 'month-grid-line'
    line.style.left = tick.startPct + '%'
    track.appendChild(line)
  })
}

export function getGanttTimeline(retrasoDias) {
  const end = retrasoDias > 0 ? addCalendarDays(PROJECT_END, retrasoDias) : PROJECT_END
  return {
    start: PROJECT_START,
    end,
    retrasoDias,
    nuevaFecha: end,
  }
}

/** % en el eje del Gantt (puede extenderse si hay atraso acumulado). */
export function ganttPct(date, timeline) {
  const t = parseDay(date).getTime()
  const span = timeline.end.getTime() - timeline.start.getTime()
  if (span <= 0) return 0
  return Math.max(0, Math.min(100, ((t - timeline.start.getTime()) / span) * 100))
}

/** Barra inclusive en el eje del Gantt. */
export function ganttBarRange(fechaInicio, fechaFin, timeline) {
  if (!fechaInicio || !fechaFin) return { left: 0, width: 0 }
  const start = parseDay(fechaInicio)
  const endExclusive = parseDay(fechaFin)
  endExclusive.setDate(endExclusive.getDate() + 1)
  const left = ganttPct(start, timeline)
  const right = ganttPct(endExclusive, timeline)
  return { left, width: Math.max(0.35, right - left) }
}

/** % en el eje del proyecto [PROJECT_START … PROJECT_END]. */
export function projectPct(date) {
  const t = parseDay(date).getTime()
  return Math.max(0, Math.min(100, ((t - PROJECT_START.getTime()) / PROJECT_SPAN) * 100))
}

/** Barra inclusive: inicio y fin del milestone ocupan el día completo. */
export function milestoneBarRange(fechaInicio, fechaFin) {
  const start = parseDay(fechaInicio)
  const endExclusive = parseDay(fechaFin)
  endExclusive.setDate(endExclusive.getDate() + 1)
  const left = projectPct(start)
  const right = projectPct(endExclusive)
  return { left, width: Math.max(0.35, right - left) }
}
