-- =============================================
-- Marcar M1, M2, M3 y sus requerimientos como completados
-- Ejecutar en Supabase SQL Editor (después de supabase_setup + requerimientos_setup)
-- =============================================

-- Milestones
-- M1 usa "Entregado" (como en el seed); M2 y M3 usan "Completado"
update milestones
set estado = 'Entregado'
where codigo = 'M1';

update milestones
set estado = 'Completado'
where codigo in ('M2', 'M3');

-- Requerimientos ligados a esos milestones (M1 no tiene RFs en el catálogo)
update requerimientos r
set estado = 'Completado'
from milestones m
where r.milestone_id = m.id
  and m.codigo in ('M2', 'M3');

-- Verificación
select codigo, nombre, estado
from milestones
where codigo in ('M1', 'M2', 'M3')
order by codigo;

select m.codigo as milestone, count(*) as rfs_completados
from requerimientos r
join milestones m on m.id = r.milestone_id
where m.codigo in ('M2', 'M3')
  and r.estado = 'Completado'
group by m.codigo
order by m.codigo;
