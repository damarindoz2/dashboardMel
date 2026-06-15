/**
 * Trabajo transversal no presupuestado (fila aparte en el Gantt).
 * finEnDias: fin estimado desde hoy (si fechaFin es null).
 * descripcion: texto completo en tooltip al pasar el cursor.
 */
export const TRABAJO_ADICIONAL = [
  {
    id: 'integraciones-ms365',
    label: 'Integraciones Microsoft 365',
    badge: 'No presupuestado',
    milestoneInicio: 'M4',
    milestoneFin: 'M5',
    insertAfter: 'M4',
    fechaInicio: null,
    fechaFin: null,
    finEnDias: 4,
    nota: 'OneDrive · agenda y tareas en ambos lados',
    descripcion:
      'Trabajo transversal desde M4: integración con OneDrive (archivos en la nube) y sincronización bidireccional de agenda/tareas con Outlook — lo creado en LEXMEL se refleja en Microsoft 365 y viceversa.',
  },
]
