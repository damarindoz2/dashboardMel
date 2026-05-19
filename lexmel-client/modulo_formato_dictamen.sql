-- =============================================
-- Módulo: Formato de dictamen → milestone M8
--
-- REQUISITO: la tabla public.milestones debe existir en el MISMO
-- proyecto Supabase que usa el dashboard (.env → VITE_SUPABASE_URL).
--
-- Si ves "relation milestones does not exist":
--   1) Abre ese proyecto en Supabase → SQL Editor
--   2) Ejecuta primero supabase_setup.sql (crea milestones)
--   3) Ejecuta requerimientos_setup.sql (crea requerimientos)
--   4) Vuelve a ejecutar este archivo
-- =============================================

-- Asegura schema public (por si search_path no lo incluye)
set search_path to public, extensions;

-- ---------- Diagnóstico (ejecuta esto primero) ----------
select current_database() as base_actual, current_schema() as schema_actual;

select table_schema, table_name
from information_schema.tables
where table_name ilike '%milestone%'
order by table_schema, table_name;

-- Si la consulta anterior no devuelve public | milestones,
-- NO sigas: estás en el proyecto equivocado o falta el setup.

-- ---------- Ver M8 ----------
select codigo, entregables
from public.milestones
where codigo = 'M8';

-- ---------- Actualizar (idempotente) ----------
update public.milestones
set entregables = trim(both ', ' from coalesce(entregables, '') || ', Formato de dictamen')
where codigo = 'M8'
  and coalesce(entregables, '') not ilike '%formato de dictamen%';

-- ---------- Confirmar ----------
select codigo, entregables
from public.milestones
where codigo = 'M8';
