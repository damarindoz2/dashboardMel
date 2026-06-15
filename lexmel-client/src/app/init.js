import { supabase } from '../lib/supabase.js'
import { attachRequerimientos } from '../domain/milestones.js'
import { render } from './render.js'

export async function init() {
  try {
    const [msRes, rfRes] = await Promise.all([
      supabase.from('milestones').select('*').order('id', { ascending: true }),
      supabase.from('requerimientos').select('*').order('codigo', { ascending: true }),
    ])

    if (msRes.error) throw msRes.error
    if (rfRes.error) throw rfRes.error

    const milestones = attachRequerimientos(msRes.data, rfRes.data)
    render(milestones)
  } catch (err) {
    document.getElementById('app').innerHTML = `
      <div class="error-state">
        <div>No se pudo cargar la información del proyecto.</div>
        <div class="mt-2 text-xs opacity-60">${err.message || 'Error de conexión'}</div>
      </div>
    `
  }
}
