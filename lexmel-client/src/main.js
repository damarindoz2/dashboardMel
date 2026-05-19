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
function buildMonthTicks() {
  const ticks = []
  const startMs = PROJECT_START.getTime()
  const endMs = PROJECT_END.getTime()
  let y = PROJECT_START.getFullYear()
  let m = PROJECT_START.getMonth()
  const endY = PROJECT_END.getFullYear()
  const endM = PROJECT_END.getMonth()

  while (y < endY || (y === endY && m <= endM)) {
    const monthStart = new Date(y, m, 1, 12, 0, 0)
    const monthEnd = new Date(y, m + 1, 0, 12, 0, 0)
    const segStart = Math.max(monthStart.getTime(), startMs)
    const segEnd = Math.min(monthEnd.getTime(), endMs)
    if (segStart <= segEnd) {
      const centerMs = (segStart + segEnd) / 2
      ticks.push({
        label: monthStart.toLocaleDateString('es-MX', { month: 'short' }),
        centerPct: ((centerMs - startMs) / PROJECT_SPAN) * 100,
        startPct: ((segStart - startMs) / PROJECT_SPAN) * 100,
      })
    }
    m++
    if (m > 11) { m = 0; y++ }
  }
  return ticks
}

const MONTH_TICKS = buildMonthTicks()

function appendMonthGridLines(track) {
  MONTH_TICKS.forEach(tick => {
    if (tick.startPct <= 0) return
    const line = document.createElement('div')
    line.className = 'month-grid-line'
    line.style.left = tick.startPct + '%'
    track.appendChild(line)
  })
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
        <strong class="text-foreground">${stats.completado}/${stats.total}</strong> completados en este módulo
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

function renderExecutiveSection(insights, rfGlobal, completados, totalMilestones) {
  const { retrasoAcumulado, estadoGeneral, avanceGlobalPct, actual } = insights
  const modPct = totalMilestones ? Math.round((completados.length / totalMilestones) * 100) : 0
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
      <p class="trabajando-ahora-code">${actual.codigo}</p>
      <p class="trabajando-ahora-name">${actual.nombre}</p>
      <p class="trabajando-ahora-dates">${fmtDate(actual.fecha_inicio)} → ${fmtDate(actual.fecha_fin)}</p>
      ${days.label ? `<p class="trabajando-ahora-days${days.warn ? ' trabajando-ahora-days--warning' : ''}">${days.label}</p>` : ''}
    `
    : '<p class="header-metrics-empty">Sin módulo activo en curso.</p>'

  const trabajandoRight = actual && actualStats?.total
    ? `
      <p class="trabajando-ahora-rf-label">Avance de RFs</p>
      <p class="trabajando-ahora-rf-value text-success"><strong>${actualPct}%</strong></p>
      <p class="trabajando-ahora-rf-count">${actualStats.completado} de ${actualStats.total} completados</p>
      ${renderMiniProgressBar(actualPct, 'progress')}
    `
    : actual
      ? '<p class="header-metrics-empty">Sin RFs en este módulo</p>'
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
          <p class="header-metrics-label">Módulos completados</p>
          <p class="header-metrics-value text-success">
            <strong>${completados.length}</strong><span class="header-metrics-denom"> de ${totalMilestones}</span>
          </p>
          ${renderMiniProgressBar(modPct, 'done')}
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
        <p class="header-metrics-label">Trabajando ahora</p>
        <div class="trabajando-ahora-body">
          <div class="trabajando-ahora-left">${trabajandoLeft}</div>
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

function renderEntregablesList(ms) {
  const items = parseEntregables(ms.entregables)
  if (!items.length) {
    return '<div class="rf-empty">Sin entregables registrados.</div>'
  }
  const list = items
    .map(
      e => `
      <li class="rf-item rf-item--entregable">
        <span class="rf-nombre rf-nombre--full">${e}</span>
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
            <div class="modal-field-label">% de pago</div>
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
          <div class="modal-section-label">Entregables</div>
          <div class="modal-entregables">
            ${parseEntregables(ms.entregables).map(e => `<span class="entregable-tag">${e}</span>`).join('')}
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

function renderGantt(milestones, milestoneActual) {
  const wrap = document.createElement('div')
  wrap.className = 'gantt-wrap gantt-wrap--large'

  const today = getToday()
  const todayPct = projectPct(today)
  const todayLabelText = `hoy · ${today.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`

  const monthsRow = document.createElement('div')
  monthsRow.className = 'gantt-months'
  const labelSpacer = document.createElement('div')
  monthsRow.appendChild(labelSpacer)

  const monthsTrack = document.createElement('div')
  monthsTrack.className = 'gantt-months-track'
  MONTH_TICKS.forEach(tick => {
    const el = document.createElement('div')
    el.className = 'month-tick'
    el.style.left = tick.centerPct + '%'
    el.textContent = tick.label
    monthsTrack.appendChild(el)
  })

  const todayHeader = document.createElement('div')
  todayHeader.className = 'today-line -translate-x-1/2'
  todayHeader.style.left = todayPct + '%'
  const todayHeaderLabel = document.createElement('div')
  todayHeaderLabel.className = 'today-label'
  todayHeaderLabel.style.left = todayPct + '%'
  todayHeaderLabel.textContent = todayLabelText
  monthsTrack.appendChild(todayHeader)
  monthsTrack.appendChild(todayHeaderLabel)
  monthsRow.appendChild(monthsTrack)
  wrap.appendChild(monthsRow)

  const rowsTrack = document.createElement('div')
  rowsTrack.className = 'gantt-rows'

  milestones.forEach(ms => {
    const est = milestoneEstado(ms)
    const vis = visualClass(est)
    const isActual = milestoneActual?.id === ms.id
    const isDone = vis === 'done'

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
    appendMonthGridLines(gTrack)

    const { left, width } = milestoneBarRange(ms.fecha_inicio, ms.fecha_fin)

    const bar = document.createElement('div')
    bar.className = `gantt-bar gantt-bar--${vis}${isActual ? ' gantt-bar--current' : ''}`
    bar.style.left = left + '%'
    bar.style.width = width + '%'
    bar.textContent = width > 5 ? ms.codigo : ''
    bar.addEventListener('click', () => openModal(ms))

    gTrack.appendChild(bar)
    row.appendChild(label)
    row.appendChild(gTrack)
    rowsTrack.appendChild(row)
  })

  const todayOverlay = document.createElement('div')
  todayOverlay.className = 'gantt-today-overlay'
  todayOverlay.style.setProperty('--today-pct', todayPct + '%')
  const todayLine = document.createElement('div')
  todayLine.className = 'today-line gantt-today-line'
  const todayLabel = document.createElement('div')
  todayLabel.className = 'today-label gantt-today-label'
  todayLabel.textContent = 'hoy'
  todayOverlay.appendChild(todayLine)
  todayOverlay.appendChild(todayLabel)
  rowsTrack.appendChild(todayOverlay)

  wrap.appendChild(rowsTrack)

  const legend = document.createElement('div')
  legend.className = 'legend'
  legend.innerHTML = `
    <div class="legend-item"><div class="legend-dot bg-success"></div>Entregado / Completado</div>
    <div class="legend-item"><div class="legend-dot bg-lexmel-secondary"></div>En progreso</div>
    <div class="legend-item"><div class="legend-dot bg-lexmel-accent"></div>Atrasada</div>
    <div class="legend-item"><div class="legend-dot bg-muted-foreground/35"></div>Sin iniciar</div>
    <div class="legend-item"><div class="legend-dot w-0.5 rounded-sm bg-destructive"></div>Hoy</div>
  `
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
      <button type="button" class="ms-detail-btn">Ver módulo</button>
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
  executive.innerHTML = renderExecutiveSection(insights, rfGlobal, completados, milestones.length)
  main.appendChild(executive)

  const ganttLabel = document.createElement('div')
  ganttLabel.className = 'section-label section-label--timeline'
  ganttLabel.textContent = 'Timeline del proyecto · Ene – Nov 2026'
  main.appendChild(ganttLabel)
  main.appendChild(renderGantt(milestones, insights.actual))

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
