-- =============================================
-- RFs de trabajo no presupuestado: integraciones Microsoft (M4)
-- Ejecutar en Supabase SQL Editor después de requerimientos_setup.sql
-- =============================================

alter table requerimientos
  add column if not exists fuera_alcance boolean not null default false;

insert into requerimientos (codigo, nombre, estado, milestone_codigo, fuera_alcance) values
('RF-INT-01', 'Integración con OneDrive (sincronización de archivos)', 'En progreso', 'M4', true),
('RF-INT-03', 'Vinculación documentos LEXMEL ↔ OneDrive', 'Pendiente', 'M4', true),
('RF-INT-04', 'Sincronización Agenda ↔ calendario Microsoft (tareas en ambos lados)', 'En progreso', 'M4', true)
on conflict (codigo) do update set
  nombre = excluded.nombre,
  estado = excluded.estado,
  milestone_codigo = excluded.milestone_codigo,
  fuera_alcance = excluded.fuera_alcance;

-- Quitar RF de auth Microsoft si se había cargado antes
delete from requerimientos where codigo = 'RF-INT-02';

update requerimientos r
set milestone_id = m.id
from milestones m
where r.milestone_codigo = m.codigo
  and r.codigo like 'RF-INT-%';

-- Verificación
select r.codigo, r.nombre, r.estado, r.fuera_alcance, m.codigo as milestone
from requerimientos r
join milestones m on m.id = r.milestone_id
where r.codigo like 'RF-INT-%'
order by r.codigo;
