import { estadoKey, milestoneEstado } from '../domain/estado.js'
import { computeGlobalRfStats } from '../domain/requerimientos.js'
import { computeProjectInsights } from '../domain/milestones.js'
import { computeAlcanceModulos, logAlcanceModulosDebug } from '../domain/alcance.js'
import { renderExecutiveSection } from '../components/executive-section.js'
import { appendGanttSectionHeader, renderGantt } from '../components/gantt.js'
import { renderRfProgressBar } from '../components/rf-progress.js'
import { renderMilestoneList } from '../components/milestone-list.js'

export function render(milestones) {
  const completados = milestones.filter(m => estadoKey(milestoneEstado(m)) === 'done')
  const rfGlobal = computeGlobalRfStats(milestones)
  const insights = computeProjectInsights(milestones, rfGlobal)

  const app = document.getElementById('app')
  app.innerHTML = ''
  app.className = 'min-h-screen'

  const hdr = document.createElement('header')
  hdr.className = 'app-header'
  hdr.innerHTML = `
    <div>
      <h1 class="page-header-title text-sidebar-primary">LEXMEL</h1>
      <p class="page-header-desc text-sidebar-foreground/80">Progreso del proyecto</p>
    </div>
    <div class="text-right text-xs tracking-widest text-sidebar-foreground/70 uppercase">
      Actualizado
      <strong id="last-updated" class="mt-0.5 block text-sm font-medium tracking-normal text-sidebar-primary normal-case">—</strong>
    </div>
  `
  app.appendChild(hdr)

  const main = document.createElement('main')
  main.className = 'app-main bg-background'

  const executive = document.createElement('div')
  const alcance = computeAlcanceModulos(milestones)
  if (new URLSearchParams(window.location.search).get('debugModulos') === '1') {
    logAlcanceModulosDebug(alcance)
  }
  executive.innerHTML = renderExecutiveSection(insights, rfGlobal, completados, milestones.length, alcance)
  main.appendChild(executive)

  appendGanttSectionHeader(main, insights.retrasoAcumulado, insights.nuevaFecha)
  main.appendChild(renderGantt(milestones, insights.actual, insights))

  const bottomRf = document.createElement('section')
  bottomRf.className = 'bottom-rf card-padded'
  bottomRf.innerHTML = renderRfProgressBar(rfGlobal)
  main.appendChild(bottomRf)

  const listLabel = document.createElement('div')
  listLabel.className = 'section-label'
  listLabel.textContent = 'Milestones — filtra por estado o expande para ver RFs'
  main.appendChild(listLabel)
  main.appendChild(renderMilestoneList(milestones))

  app.appendChild(main)

  document.getElementById('last-updated').textContent =
    new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}
