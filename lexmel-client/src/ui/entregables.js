import { estadoKey, milestoneEstado } from '../domain/estado.js'
import { parseEntregables } from '../config/modulos.js'

export function entregableBadgeClass(ms) {
  const key = estadoKey(milestoneEstado(ms))
  if (key === 'done') return 'badge badge-rf-completado'
  if (key === 'atrasado') return 'badge badge-rf-atrasado'
  if (key === 'progress') return 'badge badge-rf-en-progreso'
  return 'badge badge-rf-pendiente'
}

export function entregableEstadoLabel(ms) {
  const key = estadoKey(milestoneEstado(ms))
  if (key === 'done') return 'Completado'
  if (key === 'atrasado') return 'Atrasado'
  if (key === 'progress') return 'En progreso'
  return 'Sin iniciar'
}

export function entregableTagClass(ms) {
  const key = estadoKey(milestoneEstado(ms))
  if (key === 'done') return 'entregable-tag entregable-tag--done'
  if (key === 'atrasado') return 'entregable-tag entregable-tag--atrasado'
  if (key === 'progress') return 'entregable-tag entregable-tag--progress'
  return 'entregable-tag'
}

export function renderEntregablesList(ms) {
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
