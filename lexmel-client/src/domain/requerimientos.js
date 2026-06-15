import { estadoKey, milestoneEstado } from './estado.js'

export function isRfCompletado(estado) {
  const e = (estado || '').toLowerCase()
  return e === 'completado' || e === 'entregado'
}

export function isRfDeprecado(rf) {
  return (rf.nombre || '').toLowerCase().includes('deprecado')
}

/** RF fuera del alcance contractual (columna DB o prefijo RF-INT-). */
export function isRfFueraAlcance(rf) {
  if (rf.fuera_alcance === true || rf.fuera_alcance === 'true') return true
  return /^RF-INT/i.test(String(rf.codigo || ''))
}

export function splitRequerimientosByAlcance(rfs) {
  const active = activeRequerimientos(rfs)
  const planificados = active.filter(rf => !isRfFueraAlcance(rf))
  const adicionales = active.filter(rf => isRfFueraAlcance(rf))
  return { planificados, adicionales }
}

export function activeRequerimientos(rfs) {
  return (rfs || []).filter(rf => !isRfDeprecado(rf))
}

export function milestoneIsAtrasado(ms) {
  return estadoKey(milestoneEstado(ms)) === 'atrasado'
}

/** RFs no completados heredan atraso del milestone padre. */
export function classifyRf(rf, ms) {
  if (isRfCompletado(rf.estado)) return 'completado'
  if (milestoneIsAtrasado(ms)) return 'atrasado'
  const msEstado = (milestoneEstado(ms) || '').toLowerCase()
  if (msEstado === 'en progreso') return 'en-progreso'
  return 'pendiente'
}

export function computeRfStats(rfs, ms) {
  const active = activeRequerimientos(rfs)
  const stats = { total: active.length, completado: 0, atrasado: 0, enProgreso: 0, pendiente: 0 }
  for (const rf of active) {
    const cat = classifyRf(rf, ms)
    if (cat === 'completado') stats.completado++
    else if (cat === 'atrasado') stats.atrasado++
    else if (cat === 'en-progreso') stats.enProgreso++
    else stats.pendiente++
  }
  return stats
}

export function rfBadgeClassFromEstado(rf, ms) {
  const cat = classifyRf(rf, ms)
  if (cat === 'completado') return 'badge badge-rf-completado'
  if (cat === 'atrasado') return 'badge badge-rf-atrasado'
  const e = (rf.estado || '').trim().toLowerCase()
  if (e === 'en progreso') return 'badge badge-rf-en-progreso'
  if (e === 'pendiente') return 'badge badge-rf-pendiente'
  if (e === 'bloqueado') return 'badge badge-rf-bloqueado'
  if (e === 'nuevo') return 'badge badge-rf-nuevo'
  if (cat === 'en-progreso') return 'badge badge-rf-en-progreso'
  return 'badge badge-rf-pendiente'
}

export function rfEstadoLabelFromEstado(rf, ms) {
  const cat = classifyRf(rf, ms)
  if (cat === 'completado') {
    const e = (rf.estado || '').trim()
    return e || 'Completado'
  }
  if (cat === 'atrasado') return 'Atrasado'
  const e = (rf.estado || '').trim()
  if (e) return e
  if (cat === 'en-progreso') return 'En progreso'
  return 'Pendiente'
}

export function computeGlobalRfStats(milestones) {
  const stats = { total: 0, completado: 0, atrasado: 0, enProgreso: 0, pendiente: 0 }
  for (const ms of milestones) {
    for (const rf of activeRequerimientos(ms.requerimientos)) {
      stats.total++
      const cat = classifyRf(rf, ms)
      if (cat === 'completado') stats.completado++
      else if (cat === 'atrasado') stats.atrasado++
      else if (cat === 'en-progreso') stats.enProgreso++
      else stats.pendiente++
    }
  }
  return stats
}

