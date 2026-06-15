import { getToday, addCalendarDays } from '../utils/dates.js'
import { TRABAJO_ADICIONAL } from '../config/trabajo-adicional.js'

function resolveFechaFin(item) {
  if (item.fechaFin) return item.fechaFin
  if (typeof item.finEnDias === 'number') return addCalendarDays(getToday(), item.finEnDias)
  return getToday()
}

export function resolveTrabajoAdicional(item, milestones) {
  const msInicio = milestones.find(m => m.codigo === item.milestoneInicio)
  const fechaInicio = item.fechaInicio ?? msInicio?.fecha_inicio
  const fechaFin = resolveFechaFin(item)
  if (!fechaInicio || !fechaFin) return null
  return {
    ...item,
    fechaInicio,
    fechaFin,
    insertAfter: item.insertAfter ?? item.milestoneFin,
  }
}

export function getTrabajoAdicionalForGantt(milestones) {
  return TRABAJO_ADICIONAL
    .map(item => resolveTrabajoAdicional(item, milestones))
    .filter(Boolean)
}

export function groupTrabajoAdicionalByInsertAfter(milestones) {
  const byAfter = new Map()
  for (const trabajo of getTrabajoAdicionalForGantt(milestones)) {
    const key = trabajo.insertAfter
    if (!byAfter.has(key)) byAfter.set(key, [])
    byAfter.get(key).push(trabajo)
  }
  return byAfter
}
