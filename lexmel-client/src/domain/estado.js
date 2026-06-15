export function estadoKey(estado) {
  const e = (estado || '').toLowerCase()
  if (e === 'entregado' || e === 'completado') return 'done'
  if (e === 'atrasada' || e === 'atrasado') return 'atrasado'
  if (e === 'en progreso') return 'progress'
  return 'pending'
}

export function badgeClass(estado) {
  const key = estadoKey(estado)
  if (key === 'done') return 'badge badge-success'
  if (key === 'atrasado') return 'badge badge-atrasado'
  if (key === 'progress') return 'badge badge-warning'
  return 'badge badge-secondary'
}

export function visualClass(estado) {
  const key = estadoKey(estado)
  if (key === 'done') return 'done'
  if (key === 'atrasado') return 'atrasado'
  if (key === 'progress') return 'progress'
  return 'pending'
}

export function milestoneEstado(ms) {
  return ms.estadoEfectivo ?? ms.estado
}
