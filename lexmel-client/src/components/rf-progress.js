import { segmentWidthsPercent } from '../ui/progress.js'

export function renderRfProgressBar(stats) {
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
