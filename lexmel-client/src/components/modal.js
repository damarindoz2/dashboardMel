import { fmtDate } from '../utils/dates.js'
import { parseEntregables } from '../config/modulos.js'
import { badgeClass, milestoneEstado } from '../domain/estado.js'
import { computeRfStats, splitRequerimientosByAlcance } from '../domain/requerimientos.js'
import { renderModalRfProgress } from '../ui/progress.js'
import { entregableTagClass } from '../ui/entregables.js'
import { renderEntregablesList } from '../ui/entregables.js'
import { renderRfList } from './rf-list.js'

export function openModal(ms) {
  const { planificados, adicionales } = splitRequerimientosByAlcance(ms.requerimientos)
  const statsPlan = computeRfStats(planificados, ms)
  const statsAdd = computeRfStats(adicionales, ms)
  const est = milestoneEstado(ms)
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = (`
    <div class="modal" role="dialog" aria-modal="true" aria-label="Detalle ${ms.codigo}">
      <div class="modal-header">
        <div class="modal-header-top">
          <div class="modal-code">${ms.codigo}</div>
          <button type="button" class="modal-close" aria-label="Cerrar">✕</button>
        </div>
        <div class="modal-title">${ms.nombre}</div>
      </div>
      <div class="modal-body">
        <div class="modal-row">
          <div class="modal-field">
            <div class="modal-field-label">Estado</div>
            <div class="modal-field-value">
              <span class="${badgeClass(est)}">${est || '—'}</span>
            </div>
          </div>
          <div class="modal-field">
            <div class="modal-field-label">Porcentaje de pago</div>
            <div class="modal-field-value">${ms.pago ?? '—'}%</div>
          </div>
          <div class="modal-field">
            <div class="modal-field-label">Inicio</div>
            <div class="modal-field-value">${fmtDate(ms.fecha_inicio)}</div>
          </div>
          <div class="modal-field">
            <div class="modal-field-label">Fin</div>
            <div class="modal-field-value">${fmtDate(ms.fecha_fin)}</div>
          </div>
          <div class="modal-field">
            <div class="modal-field-label">Duración</div>
            <div class="modal-field-value">${ms.semanas ?? '—'} semanas</div>
          </div>
        </div>
        <hr class="modal-divider" />
        ${ms.requerimientos.length ? `
          ${planificados.length ? `
            <div class="modal-section-label">Requerimientos planificados (${planificados.length})</div>
            ${renderModalRfProgress(statsPlan)}
            ${renderRfList(planificados, ms)}
          ` : ''}
          ${adicionales.length ? `
            ${planificados.length ? '<hr class="modal-divider" />' : ''}
            <div class="modal-section-label modal-section-label--adicional">Trabajo no presupuestado (${adicionales.length})</div>
            <p class="modal-section-hint">Fuera del alcance contractual: OneDrive, archivos en la nube y sincronización de agenda con Microsoft 365.</p>
            ${renderModalRfProgress(statsAdd)}
            ${renderRfList(adicionales, ms)}
          ` : ''}
        ` : `
          <div class="modal-section-label">Entregables (${parseEntregables(ms.entregables).length})</div>
          ${renderEntregablesList(ms)}
        `}
        ${ms.objetivo ? `
          <hr class="modal-divider" />
          <div class="modal-section-label">Objetivo</div>
          <div class="modal-objetivo">${ms.objetivo}</div>
        ` : ''}
        ${ms.entregables && ms.requerimientos.length ? `
          <hr class="modal-divider" />
          <div class="modal-section-label">Alcance en módulos de este milestone</div>
          <div class="modal-entregables">
            ${parseEntregables(ms.entregables).map(e => `<span class="${entregableTagClass(ms)}">${e}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `)
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove())
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc) }
  })
  document.body.appendChild(overlay)
}
