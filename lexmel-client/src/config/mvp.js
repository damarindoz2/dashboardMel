/** Fin de M6 = primera versión usable del sistema (fecha contractual desde DB). */
export const MVP_MILESTONE_CODIGO = 'M6'
export const MVP_FECHA_FIN_FALLBACK = '2026-08-07'
export const MVP_MARKER_LABEL = 'Primera versión usable del sistema'

export function mvpFechaFinFromMilestones(milestones) {
  const ms = milestones.find(m => m.codigo === MVP_MILESTONE_CODIGO)
  return ms?.fecha_fin || MVP_FECHA_FIN_FALLBACK
}

export function mvpMilestoneBadgeHtml(codigo) {
  return codigo === MVP_MILESTONE_CODIGO
    ? '<span class="ms-mvp-badge">MVP</span>'
    : ''
}
