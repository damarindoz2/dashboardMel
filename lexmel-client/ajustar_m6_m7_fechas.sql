-- =============================================
-- Redistribuir 4 días: M6 (+4) ← M7 (−4)
-- + MVP: primera versión estable → 18 ago (M7), ≥1 semana después del fin original de M6
--
-- M6 Alertas/Recordatorios: fin 7 ago → 11 ago
-- M7 Visualización/Cartera: inicio 10 ago → 12 ago (misma fecha fin 4 sep)
-- MVP contractual en app: 2026-08-18 (config/mvp.js), badge en M7
-- Ejecutar en Supabase SQL Editor
-- =============================================

update milestones
set
  fecha_fin = '2026-08-11',
  semanas = 4
where codigo = 'M6';

update milestones
set
  fecha_inicio = '2026-08-12',
  fecha_fin = '2026-09-04',
  semanas = 3
where codigo = 'M7';

-- Verificación
select codigo, nombre, fecha_inicio, fecha_fin, semanas
from milestones
where codigo in ('M6', 'M7')
order by codigo;
