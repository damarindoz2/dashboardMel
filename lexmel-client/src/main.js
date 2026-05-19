import './globals.css'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/** Fecha a mediodía local (evita desfases UTC en el gantt). */
function parseDay(input) {
  if (input instanceof Date) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate(), 12, 0, 0)
  }
  const [y, m, d] = String(input).split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

const PROJECT_START = parseDay('2026-01-19')
const PROJECT_END   = parseDay('2026-11-27')
const PROJECT_SPAN  = PROJECT_END.getTime() - PROJECT_START.getTime()

function getToday() {
  const override = new URLSearchParams(window.location.search).get('hoy')
  if (override) return parseDay(override)
  return parseDay(new Date())
}

/** Etiquetas de mes centradas en la porción visible del mes dentro del proyecto. */
function buildMonthTicksFor(endDate = PROJECT_END) {
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

const MONTH_TICKS = buildMonthTicksFor(PROJECT_END)

function appendMonthGridLines(track, ticks = MONTH_TICKS) {
  ticks.forEach(tick => {
    if (tick.startPct <= 0) return
    const line = document.createElement('div')
    line.className = 'month-grid-line'
    line.style.left = tick.startPct + '%'
    track.appendChild(line)
  })
}

function getGanttTimeline(retrasoDias) {
  const end = retrasoDias > 0 ? addCalendarDays(PROJECT_END, retrasoDias) : PROJECT_END
  return {
    start: PROJECT_START,
    end,
    retrasoDias,
    nuevaFecha: end,
  }
}

/** % en el eje del Gantt (puede extenderse si hay atraso acumulado). */
function ganttPct(date, timeline) {
  const t = parseDay(date).getTime()
  const span = timeline.end.getTime() - timeline.start.getTime()
  if (span <= 0) return 0
  return Math.max(0, Math.min(100, ((t - timeline.start.getTime()) / span) * 100))
}

/** Barra inclusive en el eje del Gantt. */
function ganttBarRange(fechaInicio, fechaFin, timeline) {
  if (!fechaInicio || !fechaFin) return { left: 0, width: 0 }
  const start = parseDay(fechaInicio)
  const endExclusive = parseDay(fechaFin)
  endExclusive.setDate(endExclusive.getDate() + 1)
  const left = ganttPct(start, timeline)
  const right = ganttPct(endExclusive, timeline)
  return { left, width: Math.max(0.35, right - left) }
}

function getGanttMilestoneDates(ms, retrasoDias) {
  const done = estadoKey(milestoneEstado(ms)) === 'done'
  if (done || !retrasoDias) {
    return {
      inicio: ms.fecha_inicio,
      fin: ms.fecha_fin,
      planInicio: null,
      planFin: null,
    }
  }
  return {
    inicio: ms.fecha_inicio ? addCalendarDays(ms.fecha_inicio, retrasoDias) : null,
    fin: ms.fecha_fin ? addCalendarDays(ms.fecha_fin, retrasoDias) : null,
    planInicio: ms.fecha_inicio,
    planFin: ms.fecha_fin,
  }
}

/** % en el eje del proyecto [PROJECT_START … PROJECT_END]. */
function projectPct(date) {
  const t = parseDay(date).getTime()
  return Math.max(0, Math.min(100, ((t - PROJECT_START.getTime()) / PROJECT_SPAN) * 100))
}

/** Barra inclusive: inicio y fin del milestone ocupan el día completo. */
function milestoneBarRange(fechaInicio, fechaFin) {
  const start = parseDay(fechaInicio)
  const endExclusive = parseDay(fechaFin)
  endExclusive.setDate(endExclusive.getDate() + 1)
  const left = projectPct(start)
  const right = projectPct(endExclusive)
  return { left, width: Math.max(0.35, right - left) }
}

function fmtDate(str) {
  if (!str) return '—'
  return parseDay(str).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

function milestoneEstado(ms) {
  return ms.estadoEfectivo ?? ms.estado
}

function milestoneNumeroFromCodigo(codigo) {
  const m = String(codigo || '').match(/\d+/)
  return m ? m[0] : ''
}

function renderTrabajandoMilestoneHeading(codigo) {
  const num = milestoneNumeroFromCodigo(codigo)
  if (!num) return `<span class="trabajando-ahora-milestone-label">${codigo || 'Milestone'}</span>`
  return `<span class="trabajando-ahora-milestone-label">Milestone ${num}</span><span class="trabajando-ahora-milestone-ref"> (${codigo})</span>`
}

/**
 * Catálogo oficial de módulos del sistema (orden de presentación).
 * Los entregables en milestones se normalizan a estos ids vía canonicalModuloKey().
 */
const MODULOS_SISTEMA = [
  { id: 'auth_acceso', label: 'Auth y acceso' },
  { id: 'layout', label: 'Layout' },
  { id: 'roles_permisos', label: 'Roles y permisos' },
  { id: 'despachos', label: 'Despachos' },
  { id: 'sedes', label: 'Sedes' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'catalogos', label: 'Catálogos' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'archivos', label: 'Archivos' },
  { id: 'tareas', label: 'Tareas' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'metricas', label: 'Métricas' },
  { id: 'garantias', label: 'Garantías' },
  { id: 'cartera', label: 'Cartera' },
  { id: 'juicio', label: 'Juicio' },
  { id: 'dictamenes', label: 'Dictámenes' },
  { id: 'formato_dictamen', label: 'Formato de dictamen' },
  { id: 'recordatorios', label: 'Recordatorios' },
  { id: 'notificaciones', label: 'Notificaciones' },
  { id: 'chat', label: 'Chat' },
  { id: 'busqueda', label: 'Búsqueda' },
  { id: 'papelera', label: 'Papelera' },
  { id: 'filtros', label: 'Filtros' },
  { id: 'migraciones', label: 'Migraciones' },
]

const MODULO_LABEL_BY_ID = Object.fromEntries(MODULOS_SISTEMA.map(m => [m.id, m.label]))
const MODULO_ORDER = Object.fromEntries(MODULOS_SISTEMA.map((m, i) => [m.id, i]))

/** Entregables de proyecto / QA: no son módulos del sistema. */
function isEntregableProyecto(lower) {
  return (
    /\bqa\b/.test(lower)
    || lower.includes('correccion')
    || lower.includes('despliegue')
    || lower.includes('capacitacion')
    || lower.includes('documentacion final')
    || lower.includes('wireframe')
    || lower.includes('modelo de datos')
    || lower.includes('mapa de sitio')
    || lower.includes('diseno ui')
    || lower === 'ers'
  )
}

function stripAccents(value) {
  return String(value).normalize('NFD').replace(/\p{M}/gu, '')
}

function canonicalModuloKey(name) {
  const lower = stripAccents(name.trim().toLowerCase())
  if (!lower || isEntregableProyecto(lower)) return null

  if (lower.includes('formato') && lower.includes('dictamen')) return 'formato_dictamen'
  if (lower.includes('dictamen')) return 'dictamenes'

  if (lower.includes('import') || lower.includes('migrac')) return 'migraciones'

  if (lower.includes('login') || lower.includes('sso') || lower.includes('auth') || lower.includes('autentic')) {
    return 'auth_acceso'
  }
  if (lower.includes('layout') || lower.includes('navegacion') || lower.includes('encabezado')) {
    return 'layout'
  }
  if (lower.includes('cartera') || lower.includes('widget') || (lower.includes('dashboard') && lower.includes('widget'))) {
    return 'cartera'
  }
  if (lower.includes('rol') || lower.includes('permiso')) return 'roles_permisos'
  if (lower.includes('despacho')) return 'despachos'
  if (lower.includes('sede')) return 'sedes'
  if (lower.includes('usuario')) return 'usuarios'
  if (lower.includes('catalogo')) return 'catalogos'

  if (lower.includes('papelera')) return 'papelera'
  if (lower.includes('filtro')) return 'filtros'
  if (lower.includes('busqueda')) return 'busqueda'

  if (lower.includes('comentario') && lower.includes('documento')) return 'archivos'
  if (lower.includes('archivo') || lower.includes('documento') || lower.includes('carpeta')) return 'archivos'

  if (lower.includes('cliente')) return 'clientes'
  if (lower.includes('tarea')) return 'tareas'
  if (lower.includes('agenda')) return 'agenda'
  if (lower.includes('metrica')) return 'metricas'
  if (lower.includes('garant') || lower.includes('subgarant')) return 'garantias'

  if (lower.includes('recordatorio')) return 'recordatorios'
  if (lower.includes('notificacion') || lower.includes('alerta') || (lower.includes('correo') && lower.includes('notif'))) {
    return 'notificaciones'
  }

  if (lower.includes('chat')) return 'chat'

  if (
    lower.includes('juicio')
    || lower.includes('bitacora')
    || lower.includes('timeline')
    || (lower.includes('comentario') && !lower.includes('documento'))
    || (lower.includes('solicitud') && lower.includes('cambio'))
    || lower.includes('domicilio')
  ) {
    return 'juicio'
  }

  return null
}

function canonicalModuloLabel(key) {
  return MODULO_LABEL_BY_ID[key] || key
}

function sortModuloItems(items) {
  return [...items].sort((a, b) => (MODULO_ORDER[a.id] ?? 99) - (MODULO_ORDER[b.id] ?? 99))
}

function estadoKey(estado) {
  const e = (estado || '').toLowerCase()
  if (e === 'entregado' || e === 'completado') return 'done'
  if (e === 'atrasada' || e === 'atrasado') return 'atrasado'
  if (e === 'en progreso') return 'progress'
  return 'pending'
}

function badgeClass(estado) {
  const key = estadoKey(estado)
  if (key === 'done') return 'badge badge-success'
  if (key === 'atrasado') return 'badge badge-atrasado'
  if (key === 'progress') return 'badge badge-warning'
  return 'badge badge-secondary'
}

function visualClass(estado) {
  const key = estadoKey(estado)
  if (key === 'done') return 'done'
  if (key === 'atrasado') return 'atrasado'
  if (key === 'progress') return 'progress'
  return 'pending'
}

const MS_DAY = 86400000

function daysBetween(from, to) {
  return Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / MS_DAY)
}

function pluralDias(n) {
  return `${n} día${n === 1 ? '' : 's'}`
}

const DAYS_WARNING_THRESHOLD = 14

function isDaysWarning(days) {
  return typeof days === 'number' && days >= 0 && days < DAYS_WARNING_THRESHOLD
}

function renderMiniProgressBar(pct, vis = 'progress') {
  const w = Math.min(100, Math.max(0, pct))
  return `<div class="ms-progress ms-progress--mini"><div class="ms-progress-fill ms-progress-fill--${vis}" style="width:${w}%"></div></div>`
}


/** Ajusta anchos de segmentos para que sumen 100% (evita hueco al final de la barra). */
function segmentWidthsPercent(segmentDefs, total) {
  if (!segmentDefs.length || !total) return []
  const widths = segmentDefs.map(s => Math.floor((s.n / total) * 100))
  let slack = 100 - widths.reduce((a, b) => a + b, 0)
  let i = 0
  while (slack > 0) {
    widths[i % widths.length] += 1
    slack -= 1
    i += 1
  }
  return widths
}

function milestoneStatusIcon(est) {
  const key = estadoKey(est)
  if (key === 'done') {
    return `<span class="ms-status-icon ms-status-icon--done" aria-hidden="true"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6l3 3 5-5"/></svg></span>`
  }
  if (key === 'atrasado') {
    return '<span class="ms-status-icon ms-status-icon--atrasado" aria-hidden="true"><span class="ms-status-dot"></span></span>'
  }
  if (key === 'progress') {
    return '<span class="ms-status-icon ms-status-icon--progress" aria-hidden="true"><span class="ms-status-dot"></span></span>'
  }
  return '<span class="ms-status-icon ms-status-icon--pending" aria-hidden="true"><span class="ms-status-dot"></span></span>'
}

function activeMilestoneDaysInfo(ms) {
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

function renderModalRfProgress(stats) {
  if (!stats.total) return ''
  const pct = Math.round((stats.completado / stats.total) * 100)
  return `
    <div class="modal-rf-progress">
      <div class="ms-progress">
        <div class="ms-progress-fill ms-progress-fill--done" style="width:${pct}%"></div>
      </div>
      <p class="text-sm text-foreground/80">
        <strong class="text-foreground">${stats.completado}/${stats.total}</strong> completados en este milestone
      </p>
    </div>
  `
}

function fmtDateLong(input) {
  return parseDay(input).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

function addCalendarDays(date, days) {
  const d = parseDay(date)
  d.setDate(d.getDate() + days)
  return d
}

function milestoneAtrasoDias(ms) {
  if (estadoKey(milestoneEstado(ms)) !== 'atrasado' || !ms.fecha_fin) return 0
  return Math.max(0, daysBetween(ms.fecha_fin, getToday()))
}

function computeRetrasoAcumulado(milestones) {
  return milestones.reduce((sum, ms) => sum + milestoneAtrasoDias(ms), 0)
}

function findProximoEntregable(milestones) {
  return [...milestones]
    .filter(ms => estadoKey(milestoneEstado(ms)) !== 'done' && ms.fecha_fin)
    .sort((a, b) => parseDay(a.fecha_fin) - parseDay(b.fecha_fin))[0] ?? null
}

function findMilestoneActual(milestones) {
  const activos = milestones.filter(ms => {
    const k = estadoKey(milestoneEstado(ms))
    return k === 'progress' || k === 'atrasado'
  })
  if (!activos.length) return null
  const enProgreso = activos.filter(ms => estadoKey(milestoneEstado(ms)) === 'progress')
  const pool = enProgreso.length ? enProgreso : activos
  return [...pool].sort((a, b) => parseDay(a.fecha_inicio) - parseDay(b.fecha_inicio))[0]
}

function computeAvanceGlobalPct(rfGlobal) {
  if (!rfGlobal.total) return 0
  return Math.round((rfGlobal.completado / rfGlobal.total) * 100)
}

const MILESTONE_FILTER_OPTIONS = [
  { id: 'all', label: 'Todas' },
  { id: 'done', label: 'Completadas' },
  { id: 'atrasado', label: 'Atrasadas' },
  { id: 'progress', label: 'En progreso' },
  { id: 'pending', label: 'Sin iniciar' },
]

function milestoneMatchesFilter(ms, filterId) {
  if (filterId === 'all') return true
  return estadoKey(milestoneEstado(ms)) === filterId
}

function countMilestonesByFilter(milestones) {
  const counts = { all: milestones.length, done: 0, atrasado: 0, progress: 0, pending: 0 }
  for (const ms of milestones) {
    const key = estadoKey(milestoneEstado(ms))
    if (key in counts) counts[key]++
  }
  return counts
}

function computeEstadoGeneral(milestones, retrasoAcumulado) {
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

function estadoGeneralIcon(key) {
  if (key === 'atrasado') {
    return `<span class="insight-status-icon insight-status-icon--atrasado" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.75v4M8 11h.01" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg></span>`
  }
  if (key === 'riesgo') {
    return `<span class="insight-status-icon insight-status-icon--riesgo" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><path d="M8 2.5L13.5 12.5H2.5L8 2.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 6.5v3M8 11.25h.01" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg></span>`
  }
  return `<span class="insight-status-icon insight-status-icon--ok" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.5"/><path d="M5.25 8.25l1.75 1.75 3.75-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`
}

function computeProjectInsights(milestones, rfGlobal) {
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

function renderAlcanceModulosSub(alcance) {
  if (!alcance.total) {
    return '<p class="header-metrics-sub">Sin módulos mapeados en milestones con RFs</p>'
  }
  const hint = ''
  if (alcance.atrasados.length) {
    const names = alcance.atrasados.map(i => i.name).join(', ')
    return `${hint}<p class="header-metrics-sub header-metrics-sub--late"><strong>Atrasados:</strong> ${names}</p>`
  }
  if (alcance.completados.length) {
    return `${hint}<p class="header-metrics-sub">${alcance.completados.map(i => i.name).join(', ')}</p>`
  }
  if (alcance.enProgreso.length) {
    return `${hint}<p class="header-metrics-sub">En curso: ${alcance.enProgreso.map(i => i.name).join(', ')}</p>`
  }
  return `${hint}<p class="header-metrics-sub">Pendientes: ${alcance.pendientes.map(i => i.name).join(', ')}</p>`
}

function renderExecutiveSection(insights, rfGlobal, completados, totalMilestones, alcance) {
  const { retrasoAcumulado, estadoGeneral, avanceGlobalPct, actual } = insights
  const msPct = totalMilestones ? Math.round((completados.length / totalMilestones) * 100) : 0
  const alcancePct = alcance.total ? Math.round((alcance.completados.length / alcance.total) * 100) : 0
  const entregaFinalStr = fmtDateLong(PROJECT_END)
  const fechaPrincipal = retrasoAcumulado > 0 ? fmtDateLong(insights.nuevaFecha) : entregaFinalStr
  const fechaSub = retrasoAcumulado > 0
    ? `<p class="header-metrics-sub">Contractual: ${entregaFinalStr} <span class="header-metrics-delta">(+${retrasoAcumulado} días)</span></p>`
    : ''

  const actualStats = actual ? computeRfStats(actual.requerimientos, actual) : null
  const actualPct = actualStats?.total
    ? Math.round((actualStats.completado / actualStats.total) * 100)
    : 0
  const days = activeMilestoneDaysInfo(actual)

  const trabajandoLeft = actual
    ? `
      <p class="trabajando-ahora-milestone">${renderTrabajandoMilestoneHeading(actual.codigo)}</p>
      <p class="trabajando-ahora-name">${actual.nombre}</p>
      <p class="trabajando-ahora-dates">${fmtDate(actual.fecha_inicio)} → ${fmtDate(actual.fecha_fin)}</p>
      ${days.label ? `<p class="trabajando-ahora-days${days.warn ? ' trabajando-ahora-days--warning' : ''}">${days.label}</p>` : ''}
    `
    : '<p class="header-metrics-empty">Sin milestone activo en curso.</p>'

  const trabajandoRight = actual && actualStats?.total
    ? `
      <p class="trabajando-ahora-rf-label">Avance de RFs</p>
      <p class="trabajando-ahora-rf-value text-success"><strong>${actualPct}%</strong></p>
      <p class="trabajando-ahora-rf-count">${actualStats.completado} de ${actualStats.total} completados</p>
      ${renderMiniProgressBar(actualPct, 'progress')}
    `
    : actual
      ? '<p class="header-metrics-empty">Sin RFs en este milestone</p>'
      : ''

  return `
    <section class="header-summary" aria-label="Resumen ejecutivo">
      <div class="header-metrics-card">
        <div class="header-metrics-cell">
          <p class="header-metrics-label">Avance global</p>
          <p class="header-metrics-value text-success"><strong>${avanceGlobalPct}%</strong></p>
          ${renderMiniProgressBar(avanceGlobalPct, 'done')}
        </div>
        <div class="header-metrics-cell">
          <p class="header-metrics-label">Milestones completadas</p>
          <p class="header-metrics-value text-success">
            <strong>${completados.length}</strong><span class="header-metrics-denom"> de ${totalMilestones}</span>
          </p>
          ${renderMiniProgressBar(msPct, 'done')}
          <p class="header-metrics-sub">${completados.map(m => m.codigo).join(', ') || '—'}</p>
        </div>
        <div class="header-metrics-cell">
          <p class="header-metrics-label">Módulos del sistema</p>
          <p class="header-metrics-value${alcance.atrasados.length ? '' : ' text-success'}">
            <strong>${alcance.completados.length}</strong><span class="header-metrics-denom"> de ${alcance.catalogoTotal}</span>
          </p>
          ${renderMiniProgressBar(alcancePct, alcance.atrasados.length ? 'atrasado' : 'done')}
          ${renderAlcanceModulosSub(alcance)}
        </div>
        <div class="header-metrics-cell">
          <p class="header-metrics-label">Fecha de entrega final</p>
          <p class="header-metrics-date${retrasoAcumulado > 0 ? ' header-metrics-date--late' : ''}">${fechaPrincipal}</p>
          ${fechaSub}
          <p class="header-metrics-status header-metrics-status--${estadoGeneral.key}">
            ${estadoGeneralIcon(estadoGeneral.key)}
            <span>${estadoGeneral.label}</span>
          </p>
        </div>
      </div>
      <article class="trabajando-ahora-card">
        <div class="trabajando-ahora-body">
          <div class="trabajando-ahora-left">
            <p class="trabajando-ahora-title">Trabajando ahora</p>
            ${trabajandoLeft}
          </div>
          <div class="trabajando-ahora-right">${trabajandoRight}</div>
        </div>
      </article>
    </section>
  `
}

/** Texto de avance en calendario (solo milestones activos). */
function renderMilestoneTimeInfo(ms, est) {
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

function allRfsCompletados(ms) {
  const s = computeRfStats(ms.requerimientos, ms)
  return s.total === 0 || s.completado === s.total
}

/** Estado derivado: fecha fin + avance de RFs (no solo el campo en BD). */
function computeMilestoneEstado(ms) {
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

function isRfCompletado(estado) {
  const e = (estado || '').toLowerCase()
  return e === 'completado' || e === 'entregado'
}

function isRfDeprecado(rf) {
  return (rf.nombre || '').toLowerCase().includes('deprecado')
}

function activeRequerimientos(rfs) {
  return (rfs || []).filter(rf => !isRfDeprecado(rf))
}

function milestoneIsAtrasado(ms) {
  return estadoKey(milestoneEstado(ms)) === 'atrasado'
}

/** RFs no completados heredan atraso del milestone padre. */
function classifyRf(rf, ms) {
  if (isRfCompletado(rf.estado)) return 'completado'
  if (milestoneIsAtrasado(ms)) return 'atrasado'
  const msEstado = (milestoneEstado(ms) || '').toLowerCase()
  if (msEstado === 'en progreso') return 'en-progreso'
  return 'pendiente'
}

function computeRfStats(rfs, ms) {
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

function rfBadgeClassFromEstado(rf, ms) {
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

function rfEstadoLabelFromEstado(rf, ms) {
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

function renderRfProgressBar(stats) {
  if (stats.total === 0) {
    return '<div class="rf-progress-wrap"><div class="rf-progress-summary">Sin RFs asignados</div></div>'
  }
  const pctRf = n => Math.round((n / stats.total) * 100)
  const segmentDefs = [
    stats.completado > 0 && { cls: 'rf-seg-completado', n: stats.completado, label: 'Completados' },
    stats.atrasado > 0 && { cls: 'rf-seg-atrasado', n: stats.atrasado, label: 'Atrasados' },
    stats.enProgreso > 0 && { cls: 'rf-seg-en-progreso', n: stats.enProgreso, label: 'En progreso' },
    stats.pendiente > 0 && { cls: 'rf-seg-pendiente', n: stats.pendiente, label: 'Pendientes' },
  ].filter(Boolean)

  const widths = segmentWidthsPercent(segmentDefs, stats.total)
  const segsHtml = segmentDefs
    .map((s, i) => {
      const w = widths[i]
      const showLabel = w >= 10
      return `<div class="rf-progress-seg ${s.cls}" style="width:${w}%" title="${s.label}: ${s.n} (${w}%)">${showLabel ? `<span>${w}%</span>` : ''}</div>`
    })
    .join('')

  const pctTotal = pctRf(stats.completado)
  const legend = segmentDefs
    .map(s => `<span class="rf-legend-item"><span class="rf-legend-swatch ${s.cls}"></span>${s.label} ${s.n} (${pctRf(s.n)}%)</span>`)
    .join('')

  return [
    '<div class="rf-progress-wrap rf-progress-wrap--enhanced">',
    '<div class="rf-progress-label">Avance de requerimientos funcionales</div>',
    `<div class="rf-progress-bar rf-progress-bar--tall">${segsHtml}</div>`,
    '<div class="rf-progress-summary">',
    `<strong>${stats.completado} de ${stats.total}</strong> RFs completados (${pctTotal}%)`,
    '</div>',
    `<div class="rf-progress-legend">${legend}</div>`,
    '</div>',
  ].join('')
}

function parseEntregables(entregablesStr) {
  if (!entregablesStr || !String(entregablesStr).trim()) return []
  return String(entregablesStr).split(',').map(e => e.trim()).filter(Boolean)
}


/** Estado agregado de un módulo que aparece en varios milestones. */
function mergeModuloEstadoKeys(keys) {
  if (keys.includes('atrasado')) return 'atrasado'
  if (keys.includes('progress')) return 'progress'
  if (keys.includes('pending')) return 'pending'
  if (keys.length && keys.every(k => k === 'done')) return 'done'
  return 'pending'
}

/**
 * Módulos del catálogo sin fila en milestones.entregables: heredan estado del milestone dueño.
 * Formato de dictamen es módulo (no entregable); sus RFs están en M8.
 */
function vincularModulosSinEntregable(milestones, byKey) {
  const vinculos = [{ id: 'formato_dictamen', milestoneCodigo: 'M8', nota: 'Módulo · M8' }]
  for (const { id, milestoneCodigo, nota } of vinculos) {
    const entry = byKey.get(id) ?? {
      id,
      name: canonicalModuloLabel(id),
      keys: [],
      sources: [],
    }
    if (entry.keys.length) continue
    const ms = milestones.find(m => m.codigo === milestoneCodigo && m.requerimientos?.length)
    if (!ms) continue
    entry.keys.push(estadoKey(milestoneEstado(ms)))
    if (!entry.sources.includes(nota)) entry.sources.push(nota)
    byKey.set(id, entry)
  }
}

/** Módulos del sistema: catálogo MODULOS_SISTEMA + vínculo desde milestones con RFs. */
function computeAlcanceModulos(milestones) {
  const byKey = new Map()
  const rawEntries = []
  const sinMapear = []
  const excluidosProyecto = []
  for (const ms of milestones) {
    if (!ms.requerimientos?.length) continue
    const estKey = estadoKey(milestoneEstado(ms))
    for (const raw of parseEntregables(ms.entregables)) {
      const original = raw.trim()
      if (!original) continue
      const lower = stripAccents(original.toLowerCase())
      const key = canonicalModuloKey(original)
      rawEntries.push({ original, key, milestone: ms.codigo, estKey })

      if (isEntregableProyecto(lower)) {
        excluidosProyecto.push({ original, milestone: ms.codigo })
        continue
      }
      if (!key) {
        sinMapear.push({ original, milestone: ms.codigo })
        continue
      }

      const entry = byKey.get(key)
      if (!entry) {
        byKey.set(key, {
          id: key,
          name: canonicalModuloLabel(key),
          keys: [estKey],
          sources: [original],
        })
      } else {
        entry.keys.push(estKey)
        if (!entry.sources.includes(original)) entry.sources.push(original)
      }
    }
  }

  vincularModulosSinEntregable(milestones, byKey)

  for (const mod of MODULOS_SISTEMA) {
    if (!byKey.has(mod.id)) {
      byKey.set(mod.id, {
        id: mod.id,
        name: mod.label,
        keys: [],
        sources: [],
      })
    }
  }

  const items = sortModuloItems(
    [...byKey.values()].map(({ id, name, keys }) => ({
      id,
      name,
      estKey: mergeModuloEstadoKeys(keys),
    })),
  )

  return {
    total: items.length,
    catalogoTotal: MODULOS_SISTEMA.length,
    completados: items.filter(i => i.estKey === 'done'),
    atrasados: items.filter(i => i.estKey === 'atrasado'),
    enProgreso: items.filter(i => i.estKey === 'progress'),
    pendientes: items.filter(i => i.estKey === 'pending'),
    _rawCount: rawEntries.length,
    _sinMapear: sinMapear,
    _excluidosProyecto: excluidosProyecto,
    _canonical: sortModuloItems(
      [...byKey.values()].map(v => ({
        id: v.id,
        label: v.name,
        sources: v.sources,
        estKey: mergeModuloEstadoKeys(v.keys),
      })),
    ),
  }
}

function logAlcanceModulosDebug(alcance) {
  console.group('[LEXMEL] Módulos del sistema')
  console.log(`Catálogo oficial: ${alcance.catalogoTotal} módulos`)
  console.log(`Entregables en milestones con RFs: ${alcance._rawCount}`)
  console.log(`En alcance (mapeados): ${alcance.total}`)
  console.table(
    alcance._canonical.map(c => ({
      modulo: c.label,
      id: c.id,
      estado: c.estKey,
      aparece_como: c.sources.join(' · '),
    })),
  )
  const sinDb = alcance._canonical.filter(c => !c.sources.length || c.sources.every(s => s.startsWith('Módulo ·')))
  if (sinDb.length) {
    console.log('Sin texto en milestones.entregables (solo catálogo / vínculo M8):', sinDb.map(c => c.label).join(', '))
  }
  if (alcance._sinMapear.length) {
    console.warn('Sin mapear (revisar reglas o actualizar DB):')
    console.table(alcance._sinMapear)
  }
  if (alcance._excluidosProyecto.length) {
    console.log('Excluidos (QA / diseño / despliegue):', alcance._excluidosProyecto.map(e => e.original).join(', '))
  }
  console.groupEnd()
}

function entregableBadgeClass(ms) {
  const key = estadoKey(milestoneEstado(ms))
  if (key === 'done') return 'badge badge-rf-completado'
  if (key === 'atrasado') return 'badge badge-rf-atrasado'
  if (key === 'progress') return 'badge badge-rf-en-progreso'
  return 'badge badge-rf-pendiente'
}

function entregableEstadoLabel(ms) {
  const key = estadoKey(milestoneEstado(ms))
  if (key === 'done') return 'Completado'
  if (key === 'atrasado') return 'Atrasado'
  if (key === 'progress') return 'En progreso'
  return 'Sin iniciar'
}

function entregableTagClass(ms) {
  const key = estadoKey(milestoneEstado(ms))
  if (key === 'done') return 'entregable-tag entregable-tag--done'
  if (key === 'atrasado') return 'entregable-tag entregable-tag--atrasado'
  if (key === 'progress') return 'entregable-tag entregable-tag--progress'
  return 'entregable-tag'
}

function renderEntregablesList(ms) {
  const items = parseEntregables(ms.entregables)
  if (!items.length) {
    return '<div class="rf-empty">Sin entregables registrados.</div>'
  }
  const list = items
    .map(
      e => `
      <li class="rf-item rf-item--entregable">
        <span class="rf-nombre">${e}</span>
        <span class="${entregableBadgeClass(ms)}">${entregableEstadoLabel(ms)}</span>
      </li>
    `,
    )
    .join('')
  return `<ul class="rf-list entregables-list">${list}</ul>`
}

function renderMilestoneItems(ms, { compact = false } = {}) {
  if (ms.requerimientos?.length) return renderRfList(ms.requerimientos, ms, { compact })
  return renderEntregablesList(ms)
}

function renderRfList(rfs, ms, { compact = false } = {}) {
  const active = activeRequerimientos(rfs)
  if (!active.length) {
    return '<div class="rf-empty">Ningún RF vinculado a este milestone.</div>'
  }
  const sorted = [...active].sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))
  const items = sorted.map(rf => {
    return `
      <li class="rf-item">
        <span class="rf-codigo">${rf.codigo}</span>
        <span class="rf-nombre">${rf.nombre}</span>
        <span class="${rfBadgeClassFromEstado(rf, ms)}">${rfEstadoLabelFromEstado(rf, ms)}</span>
      </li>
    `
  }).join('')
  return `<ul class="rf-list ${compact ? 'rf-list-compact' : ''}">${items}</ul>`
}

function attachRequerimientos(milestones, requerimientos) {
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

function openModal(ms) {
  const stats = computeRfStats(ms.requerimientos, ms)
  const est = milestoneEstado(ms)
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = (`
    <div class="modal" role="dialog" aria-modal="true" aria-label="Detalle ${ms.codigo}">
      <div class="modal-header">
        <div class="modal-header-top">
          <div class="modal-code">${ms.codigo}</div>
          <button type="button" class="modal-close" aria-label="Cerrar">✕</button>
        </div>
        <div class="modal-title">${ms.nombre}</div>
      </div>
      <div class="modal-body">
        <div class="modal-row">
          <div class="modal-field">
            <div class="modal-field-label">Estado</div>
            <div class="modal-field-value">
              <span class="${badgeClass(est)}">${est || '—'}</span>
            </div>
          </div>
          <div class="modal-field">
            <div class="modal-field-label">Porcentaje de pago</div>
            <div class="modal-field-value">${ms.pago ?? '—'}%</div>
          </div>
          <div class="modal-field">
            <div class="modal-field-label">Inicio</div>
            <div class="modal-field-value">${fmtDate(ms.fecha_inicio)}</div>
          </div>
          <div class="modal-field">
            <div class="modal-field-label">Fin</div>
            <div class="modal-field-value">${fmtDate(ms.fecha_fin)}</div>
          </div>
          <div class="modal-field">
            <div class="modal-field-label">Duración</div>
            <div class="modal-field-value">${ms.semanas ?? '—'} semanas</div>
          </div>
        </div>
        <hr class="modal-divider" />
        ${ms.requerimientos.length ? `
          <div class="modal-section-label">Requerimientos (${ms.requerimientos.length})</div>
          ${renderModalRfProgress(stats)}
          ${renderRfList(ms.requerimientos, ms)}
        ` : `
          <div class="modal-section-label">Entregables (${parseEntregables(ms.entregables).length})</div>
          ${renderEntregablesList(ms)}
        `}
        ${ms.objetivo ? `
          <hr class="modal-divider" />
          <div class="modal-section-label">Objetivo</div>
          <div class="modal-objetivo">${ms.objetivo}</div>
        ` : ''}
        ${ms.entregables && ms.requerimientos.length ? `
          <hr class="modal-divider" />
          <div class="modal-section-label">Alcance en módulos de este milestone</div>
          <div class="modal-entregables">
            ${parseEntregables(ms.entregables).map(e => `<span class="${entregableTagClass(ms)}">${e}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `)
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove())
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc) }
  })
  document.body.appendChild(overlay)
}

const MVP_MILESTONE_CODIGO = 'M7'
const MVP_FECHA_FIN = '2026-09-04'
const MVP_MARKER_LABEL = 'Primera versión usable del sistema'

function positionGanttMarkerLabel(el, pct) {
  el.style.left = `${pct}%`
  el.classList.remove('gantt-marker-label--start', 'gantt-marker-label--end')
  if (pct < 14) el.classList.add('gantt-marker-label--start')
  else if (pct > 86) el.classList.add('gantt-marker-label--end')
}

function mvpMilestoneBadgeHtml(codigo) {
  return codigo === MVP_MILESTONE_CODIGO
    ? '<span class="ms-mvp-badge">MVP</span>'
    : ''
}

function ganttInfoIconSvg() {
  return `<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.5"/><path d="M8 7v4M8 5h.01" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>`
}

function appendGanttSectionHeader(parent, retrasoDias, nuevaFecha) {
  const header = document.createElement('div')
  header.className = 'gantt-section-header'

  const title = document.createElement('div')
  title.className = 'section-label section-label--timeline'
  title.textContent = retrasoDias > 0
    ? `Timeline del proyecto · plan contractual + ${retrasoDias} días de atraso`
    : 'Timeline del proyecto · Ene – Nov 2026'
  header.appendChild(title)

  if (retrasoDias > 0) {
    const info = document.createElement('button')
    info.className = 'gantt-header-info'
    info.type = 'button'
    info.setAttribute('aria-label', 'Detalle del desplazamiento del cronograma')

    const tooltip = document.createElement('div')
    tooltip.className = 'gantt-header-tooltip'
    tooltip.setAttribute('role', 'tooltip')
    tooltip.innerHTML = `Cronograma desplazado <strong>+${retrasoDias} días</strong> por atrasos acumulados. Barras punteadas = plan contractual · barras sólidas = fechas reprogramadas. Entrega proyectada: <strong>${fmtDate(nuevaFecha)}</strong>.`

    info.innerHTML = ganttInfoIconSvg()
    info.appendChild(tooltip)
    header.appendChild(info)
  }

  parent.appendChild(header)
}

function renderGantt(milestones, milestoneActual, insights = null) {
  const wrap = document.createElement('div')
  wrap.className = 'gantt-wrap gantt-wrap--large'

  const retrasoDias = insights?.retrasoAcumulado ?? computeRetrasoAcumulado(milestones)
  const timeline = getGanttTimeline(retrasoDias)
  const monthTicks = buildMonthTicksFor(timeline.end)
  const hasDelay = retrasoDias > 0

  const today = getToday()
  const todayPct = ganttPct(today, timeline)
  const mvpFechaProyectada = hasDelay ? addCalendarDays(MVP_FECHA_FIN, retrasoDias) : MVP_FECHA_FIN
  const mvpPct = ganttPct(mvpFechaProyectada, timeline)
  const mvpPlanPct = hasDelay ? ganttPct(MVP_FECHA_FIN, timeline) : null
  const entregaProyectadaPct = hasDelay ? ganttPct(timeline.nuevaFecha, timeline) : null
  const todayLabelText = `hoy · ${today.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`


  const chartBody = document.createElement('div')
  chartBody.className = 'gantt-chart-body'

  const labelsRow = document.createElement('div')
  labelsRow.className = 'gantt-markers-labels'
  labelsRow.appendChild(document.createElement('div'))
  const labelsTrack = document.createElement('div')
  labelsTrack.className = 'gantt-markers-labels-track'

  const todayLabel = document.createElement('div')
  todayLabel.className = 'gantt-marker-label gantt-marker-label--today'
  todayLabel.textContent = todayLabelText
  positionGanttMarkerLabel(todayLabel, todayPct)

  const mvpLabel = document.createElement('div')
  mvpLabel.className = 'gantt-marker-label gantt-marker-label--mvp'
  mvpLabel.textContent = hasDelay ? `${MVP_MARKER_LABEL} (reprog.)` : MVP_MARKER_LABEL
  positionGanttMarkerLabel(mvpLabel, mvpPct)

  labelsTrack.appendChild(todayLabel)
  labelsTrack.appendChild(mvpLabel)

  if (hasDelay && entregaProyectadaPct != null) {
    const entregaLabel = document.createElement('div')
    entregaLabel.className = 'gantt-marker-label gantt-marker-label--projected-end'
    entregaLabel.textContent = `Entrega +${retrasoDias}d`
    positionGanttMarkerLabel(entregaLabel, entregaProyectadaPct)
    labelsTrack.appendChild(entregaLabel)
  }

  labelsRow.appendChild(labelsTrack)
  chartBody.appendChild(labelsRow)

  const monthsRow = document.createElement('div')
  monthsRow.className = 'gantt-months'
  monthsRow.appendChild(document.createElement('div'))
  const monthsTrack = document.createElement('div')
  monthsTrack.className = 'gantt-months-track'
  monthTicks.forEach(tick => {
    const el = document.createElement('div')
    el.className = 'month-tick'
    el.style.left = tick.centerPct + '%'
    el.textContent = tick.label
    monthsTrack.appendChild(el)
  })
  monthsRow.appendChild(monthsTrack)
  chartBody.appendChild(monthsRow)

  const rowsTrack = document.createElement('div')
  rowsTrack.className = 'gantt-rows'

  milestones.forEach(ms => {
    const est = milestoneEstado(ms)
    const vis = visualClass(est)
    const isActual = milestoneActual?.id === ms.id
    const isDone = vis === 'done'
    const dates = getGanttMilestoneDates(ms, retrasoDias)

    const row = document.createElement('div')
    row.className = [
      'gantt-row',
      isDone ? 'gantt-row--done' : '',
      isActual ? 'gantt-row--current' : '',
    ].filter(Boolean).join(' ')

    const label = document.createElement('div')
    label.className = 'gantt-label'
    label.innerHTML = `<strong>${ms.codigo}</strong><span class="gantt-label-name">${ms.nombre}</span>${isActual ? '<span class="gantt-actual-tag">Actual</span>' : ''}`

    const gTrack = document.createElement('div')
    gTrack.className = 'gantt-track gantt-track--large'
    appendMonthGridLines(gTrack, monthTicks)

    if (dates.planInicio && dates.planFin) {
      const plan = ganttBarRange(dates.planInicio, dates.planFin, timeline)
      const planBar = document.createElement('div')
      planBar.className = 'gantt-bar gantt-bar--plan-ghost'
      planBar.style.left = plan.left + '%'
      planBar.style.width = plan.width + '%'
      planBar.setAttribute('aria-hidden', 'true')
      gTrack.appendChild(planBar)
    }

    const { left, width } = ganttBarRange(dates.inicio, dates.fin, timeline)
    const bar = document.createElement('div')
    bar.className = `gantt-bar gantt-bar--${vis}${isActual ? ' gantt-bar--current' : ''}${hasDelay && dates.planFin ? ' gantt-bar--shifted' : ''}`
    bar.style.left = left + '%'
    bar.style.width = width + '%'
    bar.textContent = width > 5 ? ms.codigo : ''
    bar.addEventListener('click', () => openModal(ms))
    gTrack.appendChild(bar)

    row.appendChild(label)
    row.appendChild(gTrack)
    rowsTrack.appendChild(row)
  })

  const markersOverlay = document.createElement('div')
  markersOverlay.className = 'gantt-markers-overlay'

  const todayLine = document.createElement('div')
  todayLine.className = 'gantt-marker-line gantt-marker-line--today'
  todayLine.style.left = `${todayPct}%`
  markersOverlay.appendChild(todayLine)

  if (hasDelay && mvpPlanPct != null) {
    const mvpPlanLine = document.createElement('div')
    mvpPlanLine.className = 'gantt-marker-line gantt-marker-line--mvp-plan'
    mvpPlanLine.style.left = `${mvpPlanPct}%`
    markersOverlay.appendChild(mvpPlanLine)
  }

  const mvpLine = document.createElement('div')
  mvpLine.className = 'gantt-marker-line gantt-marker-line--mvp'
  mvpLine.style.left = `${mvpPct}%`
  markersOverlay.appendChild(mvpLine)

  if (hasDelay && entregaProyectadaPct != null) {
    const entregaLine = document.createElement('div')
    entregaLine.className = 'gantt-marker-line gantt-marker-line--projected-end'
    entregaLine.style.left = `${entregaProyectadaPct}%`
    markersOverlay.appendChild(entregaLine)
  }

  chartBody.appendChild(rowsTrack)
  chartBody.appendChild(markersOverlay)
  wrap.appendChild(chartBody)

  const legend = document.createElement('div')
  legend.className = 'legend'
  legend.innerHTML = `
    <div class="legend-item"><div class="legend-dot bg-success"></div>Entregado / Completado</div>
    <div class="legend-item"><div class="legend-dot bg-lexmel-secondary"></div>En progreso</div>
    <div class="legend-item"><div class="legend-dot bg-lexmel-accent"></div>Atrasada</div>
    <div class="legend-item"><div class="legend-dot bg-muted-foreground/35"></div>Sin iniciar</div>
    <div class="legend-item"><div class="legend-dot w-0.5 rounded-sm bg-destructive"></div>Hoy</div>
    <div class="legend-item"><div class="legend-dot legend-dot--mvp-line"></div>${MVP_MARKER_LABEL}${hasDelay ? ' (reprogramado)' : ' (fin M7)'}</div>
    ${hasDelay ? '<div class="legend-item"><div class="legend-dot legend-dot--plan-ghost"></div>Plan contractual</div>' : ''}
    ${hasDelay ? '<div class="legend-item"><div class="legend-dot legend-dot--projected-end"></div>Entrega proyectada</div>' : ''}
  `.replace(/div/g, 'div')

  wrap.appendChild(legend)
  return wrap
}

function appendMilestoneRow(container, ms, { isActual = false } = {}) {
  const stats = computeRfStats(ms.requerimientos, ms)
  const est = milestoneEstado(ms)
  const vis = visualClass(est)
  const entregables = parseEntregables(ms.entregables)
  const rfSummary = stats.total
    ? `${stats.completado}/${stats.total} RFs`
    : entregables.length
      ? `${entregables.length} entregables`
      : 'Sin ítems'
  const timeInfo = renderMilestoneTimeInfo(ms, est)

  const row = document.createElement('details')
  row.className = `ms-row ms-row--${vis}${isActual ? ' ms-row--actual' : ''}`
  row.dataset.estado = estadoKey(est)

  row.innerHTML = `
    <summary class="ms-row-summary">
      <span class="ms-row-chevron" aria-hidden="true"></span>
      <div class="ms-row-main">
        <div class="ms-row-ident">
          ${milestoneStatusIcon(est)}
          <div class="ms-row-title">
            <span class="ms-code">${ms.codigo}</span>
            ${mvpMilestoneBadgeHtml(ms.codigo)}
            <span class="ms-name">${ms.nombre}</span>
          </div>
          ${isActual ? '<span class="ms-actual-tag">Actual</span>' : ''}
        </div>
        <span class="${badgeClass(est)}">${est || 'Sin iniciar'}</span>
      </div>
      <div class="ms-row-mid">
        <span class="ms-dates">${fmtDate(ms.fecha_inicio)} → ${fmtDate(ms.fecha_fin)}</span>
        <span class="ms-rf-pill">${rfSummary}</span>
      </div>
      ${timeInfo ? `<div class="ms-row-time">${timeInfo}</div>` : ''}
      <div class="ms-meta">
        <span>${ms.semanas ?? '—'} sem</span>
        <span>${ms.pago ?? '—'}% pago</span>
      </div>
      <button type="button" class="ms-detail-btn">Ver milestone</button>
    </summary>
    <div class="ms-row-body">
      ${renderMilestoneItems(ms)}
    </div>
  `

  row.querySelector('.ms-detail-btn')?.addEventListener('click', e => {
    e.preventDefault()
    e.stopPropagation()
    openModal(ms)
  })

  container.appendChild(row)
}

function renderMilestoneList(milestones) {
  const wrap = document.createElement('div')
  wrap.className = 'milestones-list-wrap'

  const actual = findMilestoneActual(milestones)
  const counts = countMilestonesByFilter(milestones)
  let activeFilter = 'all'

  const filters = document.createElement('div')
  filters.className = 'ms-filters'
  filters.setAttribute('role', 'tablist')
  filters.innerHTML = MILESTONE_FILTER_OPTIONS.map(
    opt => `
      <button
        type="button"
        class="ms-filter${opt.id === activeFilter ? ' ms-filter--active' : ''}"
        data-filter="${opt.id}"
        role="tab"
        aria-selected="${opt.id === activeFilter}"
      >${opt.label} <span class="ms-filter-count">${counts[opt.id]}</span></button>
    `,
  ).join('')

  const list = document.createElement('div')
  list.className = 'milestones-list'

  function paintList() {
    list.replaceChildren()
    const filtered = milestones.filter(ms => milestoneMatchesFilter(ms, activeFilter))
    if (!filtered.length) {
      const empty = document.createElement('p')
      empty.className = 'ms-filter-empty'
      empty.textContent = 'Ningún milestone en esta categoría.'
      list.appendChild(empty)
      return
    }
    for (const ms of filtered) {
      appendMilestoneRow(list, ms, { isActual: actual?.id === ms.id })
    }
  }

  filters.addEventListener('click', e => {
    const btn = e.target.closest('[data-filter]')
    if (!btn) return
    activeFilter = btn.dataset.filter
    filters.querySelectorAll('[data-filter]').forEach(b => {
      const on = b.dataset.filter === activeFilter
      b.classList.toggle('ms-filter--active', on)
      b.setAttribute('aria-selected', on ? 'true' : 'false')
    })
    paintList()
  })

  paintList()
  wrap.appendChild(filters)
  wrap.appendChild(list)
  return wrap
}

function computeGlobalRfStats(milestones) {
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

function render(milestones) {
  const completados = milestones.filter(m => estadoKey(milestoneEstado(m)) === 'done')
  const rfGlobal = computeGlobalRfStats(milestones)
  const insights = computeProjectInsights(milestones, rfGlobal)

  const app = document.getElementById('app')
  app.innerHTML = ''
  app.className = 'min-h-screen'

  const hdr = document.createElement('header')
  hdr.className = 'app-header'
  hdr.innerHTML = `
    <div>
      <h1 class="page-header-title text-sidebar-primary">LEXMEL</h1>
      <p class="page-header-desc text-sidebar-foreground/80">Progreso del proyecto</p>
    </div>
    <div class="text-right text-xs tracking-widest text-sidebar-foreground/70 uppercase">
      Actualizado
      <strong id="last-updated" class="mt-0.5 block text-sm font-medium tracking-normal text-sidebar-primary normal-case">—</strong>
    </div>
  `
  app.appendChild(hdr)

  const main = document.createElement('main')
  main.className = 'app-main bg-background'

  const executive = document.createElement('div')
  const alcance = computeAlcanceModulos(milestones)
  if (new URLSearchParams(window.location.search).get('debugModulos') === '1') {
    logAlcanceModulosDebug(alcance)
  }
  executive.innerHTML = renderExecutiveSection(insights, rfGlobal, completados, milestones.length, alcance)
  main.appendChild(executive)

  appendGanttSectionHeader(main, insights.retrasoAcumulado, insights.nuevaFecha)
  main.appendChild(renderGantt(milestones, insights.actual, insights))

  const bottomRf = document.createElement('section')
  bottomRf.className = 'bottom-rf card-padded'
  bottomRf.innerHTML = renderRfProgressBar(rfGlobal)
  main.appendChild(bottomRf)

  const listLabel = document.createElement('div')
  listLabel.className = 'section-label'
  listLabel.textContent = 'Milestones — filtra por estado o expande para ver RFs'
  main.appendChild(listLabel)
  main.appendChild(renderMilestoneList(milestones))

  app.appendChild(main)

  document.getElementById('last-updated').textContent =
    new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

async function init() {
  try {
    const [msRes, rfRes] = await Promise.all([
      supabase.from('milestones').select('*').order('id', { ascending: true }),
      supabase.from('requerimientos').select('*').order('codigo', { ascending: true }),
    ])

    if (msRes.error) throw msRes.error
    if (rfRes.error) throw rfRes.error

    const milestones = attachRequerimientos(msRes.data, rfRes.data)
    render(milestones)
  } catch (err) {
    document.getElementById('app').innerHTML = `
      <div class="error-state">
        <div>No se pudo cargar la información del proyecto.</div>
        <div class="mt-2 text-xs opacity-60">${err.message || 'Error de conexión'}</div>
      </div>
    `
  }
}

init()
