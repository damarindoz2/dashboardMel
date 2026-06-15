import { stripAccents } from '../utils/text.js'
import {
  MODULOS_SISTEMA,
  canonicalModuloKey,
  canonicalModuloLabel,
  sortModuloItems,
  isEntregableProyecto,
  parseEntregables,
} from '../config/modulos.js'
import { estadoKey, milestoneEstado } from './estado.js'

/** Estado agregado de un módulo que aparece en varios milestones. */
function mergeModuloEstadoKeys(keys) {
  if (keys.includes('atrasado')) return 'atrasado'
  if (keys.includes('progress')) return 'progress'
  if (keys.includes('pending')) return 'pending'
  if (keys.length && keys.every(k => k === 'done')) return 'done'
  return 'pending'
}

/**
 * Módulos del catálogo sin fila en milestones.entregables: heredan estado del milestone dueño.
 * Formato de dictamen es módulo (no entregable); sus RFs están en M8.
 */
function vincularModulosSinEntregable(milestones, byKey) {
  const vinculos = [{ id: 'formato_dictamen', milestoneCodigo: 'M8', nota: 'Módulo · M8' }]
  for (const { id, milestoneCodigo, nota } of vinculos) {
    const entry = byKey.get(id) ?? {
      id,
      name: canonicalModuloLabel(id),
      keys: [],
      sources: [],
    }
    if (entry.keys.length) continue
    const ms = milestones.find(m => m.codigo === milestoneCodigo && m.requerimientos?.length)
    if (!ms) continue
    entry.keys.push(estadoKey(milestoneEstado(ms)))
    if (!entry.sources.includes(nota)) entry.sources.push(nota)
    byKey.set(id, entry)
  }
}

/** Módulos del sistema: catálogo MODULOS_SISTEMA + vínculo desde milestones con RFs. */
export function computeAlcanceModulos(milestones) {
  const byKey = new Map()
  const rawEntries = []
  const sinMapear = []
  const excluidosProyecto = []
  for (const ms of milestones) {
    if (!ms.requerimientos?.length) continue
    const estKey = estadoKey(milestoneEstado(ms))
    for (const raw of parseEntregables(ms.entregables)) {
      const original = raw.trim()
      if (!original) continue
      const lower = stripAccents(original.toLowerCase())
      const key = canonicalModuloKey(original)
      rawEntries.push({ original, key, milestone: ms.codigo, estKey })

      if (isEntregableProyecto(lower)) {
        excluidosProyecto.push({ original, milestone: ms.codigo })
        continue
      }
      if (!key) {
        sinMapear.push({ original, milestone: ms.codigo })
        continue
      }

      const entry = byKey.get(key)
      if (!entry) {
        byKey.set(key, {
          id: key,
          name: canonicalModuloLabel(key),
          keys: [estKey],
          sources: [original],
        })
      } else {
        entry.keys.push(estKey)
        if (!entry.sources.includes(original)) entry.sources.push(original)
      }
    }
  }

  vincularModulosSinEntregable(milestones, byKey)

  for (const mod of MODULOS_SISTEMA) {
    if (!byKey.has(mod.id)) {
      byKey.set(mod.id, {
        id: mod.id,
        name: mod.label,
        keys: [],
        sources: [],
      })
    }
  }

  const items = sortModuloItems(
    [...byKey.values()].map(({ id, name, keys }) => ({
      id,
      name,
      estKey: mergeModuloEstadoKeys(keys),
    })),
  )

  return {
    total: items.length,
    catalogoTotal: MODULOS_SISTEMA.length,
    completados: items.filter(i => i.estKey === 'done'),
    atrasados: items.filter(i => i.estKey === 'atrasado'),
    enProgreso: items.filter(i => i.estKey === 'progress'),
    pendientes: items.filter(i => i.estKey === 'pending'),
    _rawCount: rawEntries.length,
    _sinMapear: sinMapear,
    _excluidosProyecto: excluidosProyecto,
    _canonical: sortModuloItems(
      [...byKey.values()].map(v => ({
        id: v.id,
        label: v.name,
        sources: v.sources,
        estKey: mergeModuloEstadoKeys(v.keys),
      })),
    ),
  }
}

export function logAlcanceModulosDebug(alcance) {
  console.group('[LEXMEL] Módulos del sistema')
  console.log(`Catálogo oficial: ${alcance.catalogoTotal} módulos`)
  console.log(`Entregables en milestones con RFs: ${alcance._rawCount}`)
  console.log(`En alcance (mapeados): ${alcance.total}`)
  console.table(
    alcance._canonical.map(c => ({
      modulo: c.label,
      id: c.id,
      estado: c.estKey,
      aparece_como: c.sources.join(' · '),
    })),
  )
  const sinDb = alcance._canonical.filter(c => !c.sources.length || c.sources.every(s => s.startsWith('Módulo ·')))
  if (sinDb.length) {
    console.log('Sin texto en milestones.entregables (solo catálogo / vínculo M8):', sinDb.map(c => c.label).join(', '))
  }
  if (alcance._sinMapear.length) {
    console.warn('Sin mapear (revisar reglas o actualizar DB):')
    console.table(alcance._sinMapear)
  }
  if (alcance._excluidosProyecto.length) {
    console.log('Excluidos (QA / diseño / despliegue):', alcance._excluidosProyecto.map(e => e.original).join(', '))
  }
  console.groupEnd()
}
