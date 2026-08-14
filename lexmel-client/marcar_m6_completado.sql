-- =============================================
-- Marcar M6 (Alertas, Recordatorios y Notificaciones) y sus RFs como completados
-- Ejecutar en Supabase SQL Editor
--
-- RFs de M6 (9): RF49, RF50, RF168, RF170, RF171, RF172, RF173, RF962, RF990
-- =============================================

-- Requerimientos del milestone (por id y por código, por si alguno quedó sin ligar)
update requerimientos r
set estado = 'Completado'
where r.milestone_codigo = 'M6'
   or r.milestone_id = (select id from milestones where codigo = 'M6');

-- Milestone
update milestones
set estado = 'Completado'
where codigo = 'M6';

-- Verificación
select codigo, nombre, estado, fecha_inicio, fecha_fin
from milestones
where codigo = 'M6';

select codigo, nombre, estado
from requerimientos
where milestone_codigo = 'M6'
order by id;

select codigo, milestone_estado, total_rfs, rfs_completados, rfs_pendientes
from milestone_rf_summary
where codigo = 'M6';
