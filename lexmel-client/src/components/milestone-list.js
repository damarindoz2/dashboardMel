import { fmtDate } from '../utils/dates.js'
import { parseEntregables } from '../config/modulos.js'
import { mvpMilestoneBadgeHtml } from '../config/mvp.js'
import {
  MILESTONE_FILTER_OPTIONS,
  milestoneMatchesFilter,
  countMilestonesByFilter,
} from '../config/filters.js'
import { estadoKey, badgeClass, milestoneEstado, visualClass } from '../domain/estado.js'
import { computeRfStats, splitRequerimientosByAlcance } from '../domain/requerimientos.js'
import { findMilestoneActual, renderMilestoneTimeInfo } from '../domain/milestones.js'
import { milestoneStatusIcon } from '../ui/icons.js'
import { renderMilestoneItems } from './rf-list.js'
import { openModal } from './modal.js'

function appendMilestoneRow(container, ms, { isActual = false } = {}) {
  const { planificados, adicionales } = splitRequerimientosByAlcance(ms.requerimientos)
  const statsPlan = computeRfStats(planificados, ms)
  const statsAdd = computeRfStats(adicionales, ms)
  const est = milestoneEstado(ms)
  const vis = visualClass(est)
  const entregables = parseEntregables(ms.entregables)
  let rfSummary = statsPlan.total
    ? `${statsPlan.completado}/${statsPlan.total} RFs`
    : entregables.length
      ? `${entregables.length} entregables`
      : 'Sin ítems'
  if (statsAdd.total) {
    rfSummary += ` · ${statsAdd.total} adicional${statsAdd.total === 1 ? '' : 'es'}`
  }
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

export function renderMilestoneList(milestones) {
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
