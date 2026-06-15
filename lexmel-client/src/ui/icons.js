import { estadoKey } from '../domain/estado.js'

export function milestoneStatusIcon(est) {
  const key = estadoKey(est)
  if (key === 'done') {
    return `<span class="ms-status-icon ms-status-icon--done" aria-hidden="true"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6l3 3 5-5"/></svg></span>`
  }
  if (key === 'atrasado') {
    return '<span class="ms-status-icon ms-status-icon--atrasado" aria-hidden="true"><span class="ms-status-dot"></span></span>'
  }
  if (key === 'progress') {
    return '<span class="ms-status-icon ms-status-icon--progress" aria-hidden="true"><span class="ms-status-dot"></span></span>'
  }
  return '<span class="ms-status-icon ms-status-icon--pending" aria-hidden="true"><span class="ms-status-dot"></span></span>'
}

export function estadoGeneralIcon(key) {
  if (key === 'atrasado') {
    return `<span class="insight-status-icon insight-status-icon--atrasado" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.75v4M8 11h.01" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg></span>`
  }
  if (key === 'riesgo') {
    return `<span class="insight-status-icon insight-status-icon--riesgo" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><path d="M8 2.5L13.5 12.5H2.5L8 2.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 6.5v3M8 11.25h.01" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg></span>`
  }
  return `<span class="insight-status-icon insight-status-icon--ok" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.5"/><path d="M5.25 8.25l1.75 1.75 3.75-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`
}

export function ganttInfoIconSvg() {
  return `<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.5"/><path d="M8 7v4M8 5h.01" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>`
}
