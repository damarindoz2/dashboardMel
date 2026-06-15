export function renderMiniProgressBar(pct, vis = 'progress') {
  const w = Math.min(100, Math.max(0, pct))
  return `<div class="ms-progress ms-progress--mini"><div class="ms-progress-fill ms-progress-fill--${vis}" style="width:${w}%"></div></div>`
}

/** Ajusta anchos de segmentos para que sumen 100% (evita hueco al final de la barra). */
export function segmentWidthsPercent(segmentDefs, total) {
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

export function renderModalRfProgress(stats) {
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
