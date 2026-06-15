import {
  parseDay,
  getToday,
  daysBetween,
  pluralDias,
  isDaysWarning,
  addCalendarDays,
} from '../utils/dates.js'
import { PROJECT_END } from '../config/project.js'
import { estadoKey, milestoneEstado } from './estado.js'
import { computeRfStats, activeRequerimientos, isRfDeprecado } from './requerimientos.js'

export function milestoneNumeroFromCodigo(codigo) {
  const m = String(codigo || '').match(/\d+/)
  return m ? m[0] : ''
}

export function renderTrabajandoMilestoneHeading(codigo) {
  const num = milestoneNumeroFromCodigo(codigo)
  if (!num) return `<span class="trabajando-ahora-milestone-label">${codigo || 'Milestone'}</span>`
  return `<span class="trabajando-ahora-milestone-label">Milestone ${num}</span><span class="trabajando-ahora-milestone-ref"> (${codigo})</span>`
}

function allRfsCompletados(ms) {
  const s = computeRfStats(ms.requerimientos, ms)
  return s.total === 0 || s.completado === s.total
}

/** Estado derivado: fecha fin + avance de RFs (no solo el campo en BD). */
export function computeMilestoneEstado(ms) {
  const db = (ms.estado || '').trim()
  const dbLower = db.toLowerCase()

  if (allRfsCompletados(ms)) {
    if (dbLower === 'entregado') return 'Entregado'
    if (dbLower === 'completado') return 'Completado'
    return 'Completado'
  }

  const today = getToday()
  if (ms.fecha_fin && parseDay(ms.fecha_fin) < today) {
    return 'Atrasada'
  }

  if (ms.fecha_inicio && parseDay(ms.fecha_inicio) > today) {
    return 'Sin iniciar'
  }

  if (dbLower === 'en progreso') return 'En progreso'
  if (ms.fecha_inicio && parseDay(ms.fecha_inicio) <= today) return 'En progreso'

  return db || 'Sin iniciar'
}

export function milestoneAtrasoDias(ms) {
  if (estadoKey(milestoneEstado(ms)) !== 'atrasado' || !ms.fecha_fin) return 0
  return Math.max(0, daysBetween(ms.fecha_fin, getToday()))
}

export function computeRetrasoAcumulado(milestones) {
  return milestones.reduce((sum, ms) => sum + milestoneAtrasoDias(ms), 0)
}

export function findProximoEntregable(milestones) {
  return [...milestones]
    .filter(ms => estadoKey(milestoneEstado(ms)) !== 'done' && ms.fecha_fin)
    .sort((a, b) => parseDay(a.fecha_fin) - parseDay(b.fecha_fin))[0] ?? null
}

export function findMilestoneActual(milestones) {
  const activos = milestones.filter(ms => {
    const k = estadoKey(milestoneEstado(ms))
    return k === 'progress' || k === 'atrasado'
  })
  if (!activos.length) return null
  const enProgreso = activos.filter(ms => estadoKey(milestoneEstado(ms)) === 'progress')
  const pool = enProgreso.length ? enProgreso : activos
  return [...pool].sort((a, b) => parseDay(a.fecha_inicio) - parseDay(b.fecha_inicio))[0]
}

export function computeAvanceGlobalPct(rfGlobal) {
  if (!rfGlobal.total) return 0
  return Math.round((rfGlobal.completado / rfGlobal.total) * 100)
}

export function computeEstadoGeneral(milestones, retrasoAcumulado) {
  const atrasados = milestones.filter(m => estadoKey(milestoneEstado(m)) === 'atrasado')
  if (atrasados.length > 0 || retrasoAcumulado > 0) {
    return { key: 'atrasado', label: 'Atrasado' }
  }
  const today = getToday()
  const enRiesgo = milestones.some(ms => {
    const key = estadoKey(milestoneEstado(ms))
    if (key !== 'progress' || !ms.fecha_fin) return false
    const restantes = daysBetween(today, ms.fecha_fin)
    return restantes >= 0 && restantes <= 5
  })
  if (enRiesgo) {
    return { key: 'riesgo', label: 'Riesgo moderado' }
  }
  return { key: 'ok', label: 'En tiempo' }
}

export function computeProjectInsights(milestones, rfGlobal) {
  const retrasoAcumulado = computeRetrasoAcumulado(milestones)
  return {
    retrasoAcumulado,
    avanceGlobalPct: computeAvanceGlobalPct(rfGlobal),
    entregaFinal: PROJECT_END,
    nuevaFecha: addCalendarDays(PROJECT_END, retrasoAcumulado),
    proximo: findProximoEntregable(milestones),
    actual: findMilestoneActual(milestones),
    estadoGeneral: computeEstadoGeneral(milestones, retrasoAcumulado),
  }
}

export function activeMilestoneDaysInfo(ms) {
  if (!ms) return { label: '', warn: false }
  const key = estadoKey(milestoneEstado(ms))
  const today = getToday()

  if (key === 'pending' && ms.fecha_inicio) {
    const daysNum = daysBetween(today, ms.fecha_inicio)
    const label = daysNum === 0 ? 'Inicia hoy' : `Inicia en ${pluralDias(daysNum)}`
    return { label, warn: isDaysWarning(daysNum) }
  }
  if (key === 'atrasado' && ms.fecha_fin) {
    const daysNum = daysBetween(ms.fecha_fin, today)
    return { label: `${pluralDias(daysNum)} de atraso`, warn: true }
  }
  if (ms.fecha_fin) {
    const daysNum = Math.max(0, daysBetween(today, ms.fecha_fin))
    const label = daysNum === 0 ? 'Último día' : `${pluralDias(daysNum)} restantes`
    return { label, warn: isDaysWarning(daysNum) }
  }
  return { label: '', warn: false }
}

/** Texto de avance en calendario (solo milestones activos). */
export function renderMilestoneTimeInfo(ms, est) {
  const key = estadoKey(est)
  if (key === 'done') return ''

  if (!ms.fecha_inicio || !ms.fecha_fin) return ''

  const today = getToday()
  const start = parseDay(ms.fecha_inicio)
  const end = parseDay(ms.fecha_fin)

  if (today < start) {
    const faltan = daysBetween(today, ms.fecha_inicio)
    if (faltan === 0) return '<span class="ms-time-info">Inicia hoy</span>'
    const warn = isDaysWarning(faltan)
    return `<span class="ms-time-info${warn ? ' ms-time-info--warning' : ''}">Inicia en ${pluralDias(faltan)}</span>`
  }

  const transcurridos = daysBetween(ms.fecha_inicio, today) + 1

  if (today > end || key === 'atrasado') {
    const atraso = daysBetween(ms.fecha_fin, today)
    const cls = 'ms-time-info ms-time-info--atrasado'
    if (atraso <= 0) {
      return `<span class="${cls}">${pluralDias(transcurridos)} · vence hoy</span>`
    }
    return `<span class="${cls}">${pluralDias(transcurridos)} · ${pluralDias(atraso)} de atraso</span>`
  }

  const restantes = daysBetween(today, ms.fecha_fin)
  if (restantes === 0) {
    const warn = isDaysWarning(0)
    return `<span class="ms-time-info${warn ? ' ms-time-info--warning' : ''}">${pluralDias(transcurridos)} · último día</span>`
  }
  const warn = isDaysWarning(restantes)
  return `<span class="ms-time-info${warn ? ' ms-time-info--warning' : ''}">${pluralDias(transcurridos)} · ${pluralDias(restantes)} restantes</span>`
}

export function attachRequerimientos(milestones, requerimientos) {
  const byMilestone = new Map()
  for (const rf of requerimientos) {
    if (!rf.milestone_id || isRfDeprecado(rf)) continue
    if (!byMilestone.has(rf.milestone_id)) byMilestone.set(rf.milestone_id, [])
    byMilestone.get(rf.milestone_id).push(rf)
  }
  return milestones.map(ms => {
    const enriched = {
      ...ms,
      requerimientos: activeRequerimientos(byMilestone.get(ms.id) || []),
    }
    return {
      ...enriched,
      estadoEfectivo: computeMilestoneEstado(enriched),
    }
  })
}
