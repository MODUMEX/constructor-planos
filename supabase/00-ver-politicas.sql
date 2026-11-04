-- ============================================================
-- PASO 0 · Mirar, sin cambiar nada
--
-- Esto no toca la base: solo muestra lo que hay. Corrélo en el SQL Editor de
-- Supabase y guardá el resultado, porque el PASO 2 depende de lo que salga
-- acá: los nombres de las políticas de este proyecto no están en el repo.
-- ============================================================

-- 1. Las políticas de las dos tablas que importan.
--
-- Mirá la columna `qual`: las que hay que cambiar son las que dicen algo
-- parecido a
--     distribuidor_id = (select distribuidor_id from profiles where id = auth.uid())
-- o
--     distribuidor_id = (auth.jwt() ->> 'distribuidor_id')::int
--
-- Anotá el `policyname` y el `cmd` de cada una.
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('proyecto', 'distribuidor', 'profiles')
order by tablename, cmd, policyname;


-- 2. Cómo se llama de verdad la tabla de planos.
--
-- Acá se asume `proyecto`. Si en tu base se llama distinto, esta consulta lo
-- dice y hay que cambiarlo en los pasos siguientes.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('proyecto', 'proyectos', 'distribuidor', 'distribuidores', 'profiles')
order by table_name;


-- 3. Quién es distribuidor hoy y a qué empresa está ligado.
select p.id, p.nombre, p.rol, p.distribuidor_id
from public.profiles p
where p.rol = 'Distribuidor'
order by p.nombre;


-- 4. Las fichas, para tener a mano el número de cada empresa.
select distribuidor_id, nombre, region, descuento, iva, activo
from public.distribuidor
order by nombre;
