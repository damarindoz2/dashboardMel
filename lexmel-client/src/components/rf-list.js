import {
  activeRequerimientos,
  isRfFueraAlcance,
  rfBadgeClassFromEstado,
  rfEstadoLabelFromEstado,
  splitRequerimientosByAlcance,
} from '../domain/requerimientos.js'
import { renderEntregablesList } from '../ui/entregables.js'

function renderRfListItem(rf, ms) {
  const adicionalBadge = isRfFueraAlcance(rf)
    ? '<span class="badge badge-adicional">Adicional</span>'
    : ''
  return `
    <li class="rf-item${isRfFueraAlcance(rf) ? ' rf-item--adicional' : ''}">
      <span class="rf-codigo">${rf.codigo}</span>
      <span class="rf-nombre">${rf.nombre}</span>
      <span class="rf-item-badges">
        ${adicionalBadge}
        <span class="${rfBadgeClassFromEstado(rf, ms)}">${rfEstadoLabelFromEstado(rf, ms)}</span>
      </span>
    </li>
  `
}

export function renderRfList(rfs, ms, { compact = false } = {}) {
  const active = activeRequerimientos(rfs)
  if (!active.length) {
    return '<div class="rf-empty">Ningún RF vinculado a este milestone.</div>'
  }
  const sorted = [...active].sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))
  const items = sorted.map(rf => renderRfListItem(rf, ms)).join('')
  return `<ul class="rf-list ${compact ? 'rf-list-compact' : ''}">${items}</ul>`
}

export function renderMilestoneRfContent(ms, { compact = false } = {}) {
  const { planificados, adicionales } = splitRequerimientosByAlcance(ms.requerimientos)
  if (!planificados.length && !adicionales.length) {
    return '<div class="rf-empty">Ningún RF vinculado a este milestone.</div>'
  }

  const parts = []
  if (planificados.length) {
    parts.push(renderRfList(planificados, ms, { compact }))
  }
  if (adicionales.length) {
    parts.push(`
      <div class="rf-section-adicional">
        <p class="rf-section-adicional-label">Trabajo no presupuestado</p>
        ${renderRfList(adicionales, ms, { compact })}
      </div>
    `)
  }
  return parts.join('')
}

export function renderMilestoneItems(ms, { compact = false } = {}) {
  if (ms.requerimientos?.length) return renderMilestoneRfContent(ms, { compact })
  return renderEntregablesList(ms)
}
