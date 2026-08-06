/**
 * Primera versión usable/estable del sistema.
 * Fecha contractual desacoplada del fin de M6 (reprogramada ≥1 semana).
 * Cae dentro de M7 (Visualización, Cartera y Timeline).
 */
export const MVP_MILESTONE_CODIGO = 'M7'
export const MVP_FECHA_FIN = '2026-08-18'
export const MVP_FECHA_FIN_FALLBACK = MVP_FECHA_FIN
export const MVP_MARKER_LABEL = 'Primera versión estable del sistema'

export function mvpFechaFinFromMilestones(_milestones) {
  return MVP_FECHA_FIN
}

export function mvpMilestoneBadgeHtml(codigo) {
  return codigo === MVP_MILESTONE_CODIGO
    ? '<span class="ms-mvp-badge">MVP</span>'
    : ''
}
