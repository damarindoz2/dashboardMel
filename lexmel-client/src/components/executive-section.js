import { fmtDate, fmtDateLong } from '../utils/dates.js'
import { PROJECT_END } from '../config/project.js'
import { computeRfStats } from '../domain/requerimientos.js'
import {
  activeMilestoneDaysInfo,
  renderTrabajandoMilestoneHeading,
} from '../domain/milestones.js'
import { renderMiniProgressBar } from '../ui/progress.js'
import { estadoGeneralIcon } from '../ui/icons.js'

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

export function renderExecutiveSection(insights, rfGlobal, completados, totalMilestones, alcance) {
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
