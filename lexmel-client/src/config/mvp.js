import { parseDay } from '../utils/dates.js'

/**
 * Primera versión usable/estable del sistema.
 * Fecha contractual desacoplada del fin de M6 (reprogramada 2 semanas: 11 ago → 18 ago → 25 ago).
 * Cae dentro de M7 (Visualización, Cartera y Timeline).
 */
export const MVP_MILESTONE_CODIGO = 'M7'
export const MVP_FECHA_FIN = '2026-08-25'
export const MVP_FECHA_FIN_FALLBACK = MVP_FECHA_FIN
export const MVP_MARKER_LABEL = 'Primera versión estable del sistema'

export function mvpFechaFinFromMilestones(_milestones) {
  return MVP_FECHA_FIN
}

/** Etiqueta corta de la fecha contractual: "25 ago · M7". */
export function mvpFechaCortaLabel() {
  const corta = parseDay(MVP_FECHA_FIN).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  return `${corta} · ${MVP_MILESTONE_CODIGO}`
}

export function mvpMilestoneBadgeHtml(codigo) {
  return codigo === MVP_MILESTONE_CODIGO
    ? '<span class="ms-mvp-badge">MVP</span>'
    : ''
}
