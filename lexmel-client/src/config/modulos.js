import { parseDay, addCalendarDays } from '../utils/dates.js'
import { stripAccents } from '../utils/text.js'

/**
 * Catálogo oficial de módulos del sistema (orden de presentación).
 * Los entregables en milestones se normalizan a estos ids vía canonicalModuloKey().
 */
export const MODULOS_SISTEMA = [
  { id: 'auth_acceso', label: 'Auth y acceso' },
  { id: 'layout', label: 'Layout' },
  { id: 'roles_permisos', label: 'Roles y permisos' },
  { id: 'despachos', label: 'Despachos' },
  { id: 'sedes', label: 'Sedes' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'catalogos', label: 'Catálogos' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'archivos', label: 'Archivos' },
  { id: 'tareas', label: 'Tareas' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'metricas', label: 'Métricas' },
  { id: 'garantias', label: 'Garantías' },
  { id: 'cartera', label: 'Cartera' },
  { id: 'juicio', label: 'Juicio' },
  { id: 'dictamenes', label: 'Dictámenes' },
  { id: 'formato_dictamen', label: 'Formato de dictamen' },
  { id: 'recordatorios', label: 'Recordatorios' },
  { id: 'notificaciones', label: 'Notificaciones' },
  { id: 'chat', label: 'Chat' },
  { id: 'busqueda', label: 'Búsqueda' },
  { id: 'papelera', label: 'Papelera' },
  { id: 'filtros', label: 'Filtros' },
  { id: 'migraciones', label: 'Migraciones' },
]

export const MODULO_LABEL_BY_ID = Object.fromEntries(MODULOS_SISTEMA.map(m => [m.id, m.label]))
export const MODULO_ORDER = Object.fromEntries(MODULOS_SISTEMA.map((m, i) => [m.id, i]))

/** Entregables de proyecto / QA: no son módulos del sistema. */
export function isEntregableProyecto(lower) {
  return (
    /\bqa\b/.test(lower)
    || lower.includes('correccion')
    || lower.includes('despliegue')
    || lower.includes('capacitacion')
    || lower.includes('documentacion final')
    || lower.includes('wireframe')
    || lower.includes('modelo de datos')
    || lower.includes('mapa de sitio')
    || lower.includes('diseno ui')
    || lower === 'ers'
  )
}

export function canonicalModuloKey(name) {
  const lower = stripAccents(name.trim().toLowerCase())
  if (!lower || isEntregableProyecto(lower)) return null

  if (lower.includes('formato') && lower.includes('dictamen')) return 'formato_dictamen'
  if (lower.includes('dictamen')) return 'dictamenes'

  if (lower.includes('import') || lower.includes('migrac')) return 'migraciones'

  if (lower.includes('login') || lower.includes('sso') || lower.includes('auth') || lower.includes('autentic')) {
    return 'auth_acceso'
  }
  if (lower.includes('layout') || lower.includes('navegacion') || lower.includes('encabezado')) {
    return 'layout'
  }
  if (lower.includes('cartera') || lower.includes('widget') || (lower.includes('dashboard') && lower.includes('widget'))) {
    return 'cartera'
  }
  if (lower.includes('rol') || lower.includes('permiso')) return 'roles_permisos'
  if (lower.includes('despacho')) return 'despachos'
  if (lower.includes('sede')) return 'sedes'
  if (lower.includes('usuario')) return 'usuarios'
  if (lower.includes('catalogo')) return 'catalogos'

  if (lower.includes('papelera')) return 'papelera'
  if (lower.includes('filtro')) return 'filtros'
  if (lower.includes('busqueda')) return 'busqueda'

  if (lower.includes('comentario') && lower.includes('documento')) return 'archivos'
  if (lower.includes('archivo') || lower.includes('documento') || lower.includes('carpeta')) return 'archivos'

  if (lower.includes('cliente')) return 'clientes'
  if (lower.includes('tarea')) return 'tareas'
  if (lower.includes('agenda')) return 'agenda'
  if (lower.includes('metrica')) return 'metricas'
  if (lower.includes('garant') || lower.includes('subgarant')) return 'garantias'

  if (lower.includes('recordatorio')) return 'recordatorios'
  if (lower.includes('notificacion') || lower.includes('alerta') || (lower.includes('correo') && lower.includes('notif'))) {
    return 'notificaciones'
  }

  if (lower.includes('chat')) return 'chat'

  if (
    lower.includes('juicio')
    || lower.includes('bitacora')
    || lower.includes('timeline')
    || (lower.includes('comentario') && !lower.includes('documento'))
    || (lower.includes('solicitud') && lower.includes('cambio'))
    || lower.includes('domicilio')
  ) {
    return 'juicio'
  }

  return null
}

export function canonicalModuloLabel(key) {
  return MODULO_LABEL_BY_ID[key] || key
}

export function sortModuloItems(items) {
  return [...items].sort((a, b) => (MODULO_ORDER[a.id] ?? 99) - (MODULO_ORDER[b.id] ?? 99))
}

export function parseEntregables(entregablesStr) {
  if (!entregablesStr || !String(entregablesStr).trim()) return []
  return String(entregablesStr).split(',').map(e => e.trim()).filter(Boolean)
}
