import { estadoKey, milestoneEstado } from '../domain/estado.js'

export const MILESTONE_FILTER_OPTIONS = [
  { id: 'all', label: 'Todas' },
  { id: 'done', label: 'Completadas' },
  { id: 'atrasado', label: 'Atrasadas' },
  { id: 'progress', label: 'En progreso' },
  { id: 'pending', label: 'Sin iniciar' },
]

export function milestoneMatchesFilter(ms, filterId) {
  if (filterId === 'all') return true
  return estadoKey(milestoneEstado(ms)) === filterId
}

export function countMilestonesByFilter(milestones) {
  const counts = { all: milestones.length, done: 0, atrasado: 0, progress: 0, pending: 0 }
  for (const ms of milestones) {
    const key = estadoKey(milestoneEstado(ms))
    if (key in counts) counts[key]++
  }
  return counts
}
