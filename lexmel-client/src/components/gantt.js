import { getToday, addCalendarDays, fmtDate } from '../utils/dates.js'
import {
  buildMonthTicksFor,
  appendMonthGridLines,
  getGanttTimeline,
  ganttPct,
  ganttBarRange,
} from '../config/project.js'
import {
  MVP_MILESTONE_CODIGO,
  MVP_MARKER_LABEL,
  mvpFechaFinFromMilestones,
} from '../config/mvp.js'
import { estadoKey, milestoneEstado, visualClass } from '../domain/estado.js'
import { computeRetrasoAcumulado } from '../domain/milestones.js'
import { groupTrabajoAdicionalByInsertAfter } from '../domain/trabajo-adicional.js'
import { ganttInfoIconSvg } from '../ui/icons.js'
import { openModal } from './modal.js'

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

function positionGanttMarkerLabel(el, pct) {
  el.style.left = `${pct}%`
  el.classList.remove('gantt-marker-label--start', 'gantt-marker-label--end')
  if (pct < 14) el.classList.add('gantt-marker-label--start')
  else if (pct > 86) el.classList.add('gantt-marker-label--end')
}

function appendTrabajoAdicionalGanttRow(rowsTrack, trabajo, timeline, monthTicks) {
  const row = document.createElement('div')
  row.className = 'gantt-row gantt-row--adicional'

  const rango = `${trabajo.milestoneInicio}–${trabajo.milestoneFin}`
  const fechas = `${fmtDate(trabajo.fechaInicio)} → ${fmtDate(trabajo.fechaFin)}`
  const tooltipHtml = [
    `<strong>${trabajo.label}</strong>`,
    trabajo.descripcion || trabajo.nota || '',
    `<span class="gantt-adicional-tooltip-meta">${rango} · Fin estimado: ${fmtDate(trabajo.fechaFin)}</span>`,
  ].filter(Boolean).join('<br />')

  const label = document.createElement('div')
  label.className = 'gantt-label gantt-label--adicional'
  label.innerHTML = `
    <div class="gantt-adicional-label-wrap" tabindex="0" aria-describedby="gantt-tip-${trabajo.id}">
      <span class="gantt-adicional-tag">${trabajo.badge}</span>
      <strong>${trabajo.label}</strong>
      <span class="gantt-label-name">${trabajo.nota || `Desde ${trabajo.milestoneInicio}`}</span>
      <div class="gantt-adicional-tooltip" id="gantt-tip-${trabajo.id}" role="tooltip">${tooltipHtml}</div>
    </div>
  `

  const gTrack = document.createElement('div')
  gTrack.className = 'gantt-track gantt-track--large gantt-track--adicional'
  appendMonthGridLines(gTrack, monthTicks)

  const { left, width } = ganttBarRange(trabajo.fechaInicio, trabajo.fechaFin, timeline)
  const bar = document.createElement('div')
  bar.className = 'gantt-bar gantt-bar--adicional'
  bar.style.left = `${left}%`
  bar.style.width = `${width}%`
  bar.title = `${trabajo.label} (${fechas}): ${trabajo.descripcion || trabajo.nota || ''}`

  gTrack.appendChild(bar)
  row.appendChild(label)
  row.appendChild(gTrack)
  rowsTrack.appendChild(row)
}

export function appendGanttSectionHeader(parent, retrasoDias, nuevaFecha) {
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

export function renderGantt(milestones, milestoneActual, insights = null) {
  const wrap = document.createElement('div')
  wrap.className = 'gantt-wrap gantt-wrap--large'

  const retrasoDias = insights?.retrasoAcumulado ?? computeRetrasoAcumulado(milestones)
  const timeline = getGanttTimeline(retrasoDias)
  const monthTicks = buildMonthTicksFor(timeline.end)
  const hasDelay = retrasoDias > 0

  const today = getToday()
  const todayPct = ganttPct(today, timeline)
  const mvpFechaContractual = mvpFechaFinFromMilestones(milestones)
  const mvpFechaProyectada = hasDelay ? addCalendarDays(mvpFechaContractual, retrasoDias) : mvpFechaContractual
  const mvpPct = ganttPct(mvpFechaProyectada, timeline)
  const mvpPlanPct = hasDelay ? ganttPct(mvpFechaContractual, timeline) : null
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
  const trabajosByAfter = groupTrabajoAdicionalByInsertAfter(milestones)
  const hasTrabajoAdicional = trabajosByAfter.size > 0

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

    for (const trabajo of trabajosByAfter.get(ms.codigo) || []) {
      appendTrabajoAdicionalGanttRow(rowsTrack, trabajo, timeline, monthTicks)
    }
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
    <div class="legend-item"><div class="legend-dot legend-dot--mvp-line"></div>${MVP_MARKER_LABEL}${hasDelay ? ' (reprogramado)' : ` (fin ${MVP_MILESTONE_CODIGO})`}</div>
    ${hasDelay ? '<div class="legend-item"><div class="legend-dot legend-dot--plan-ghost"></div>Plan contractual</div>' : ''}
    ${hasDelay ? '<div class="legend-item"><div class="legend-dot legend-dot--projected-end"></div>Entrega proyectada</div>' : ''}
    ${hasTrabajoAdicional ? '<div class="legend-item"><div class="legend-dot legend-dot--adicional"></div>Trabajo no presupuestado</div>' : ''}
  `

  wrap.appendChild(legend)
  return wrap
}
