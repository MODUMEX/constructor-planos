-- ============================================================
-- PASO 2 · Las políticas
--
-- ESTE ES EL ÚNICO QUE HAY QUE TOCAR A MANO. Los nombres de las políticas de
-- este proyecto no están en el repo, así que acá va el molde y vos le ponés
-- los nombres que salieron en el PASO 0.
--
-- Si no sabés cuáles cambiar, mandame el resultado del PASO 0 y te devuelvo
-- este archivo ya escrito.
--
-- Lo que hay que hacer es cambiar, en cada política que filtre por el
-- distribuidor del perfil, esto:
--
--     distribuidor_id = (select distribuidor_id from profiles where id = auth.uid())
--
-- por esto:
--
--     distribuidor_id in (select public.mis_distribuidores())
--
-- OJO CON DOS COSAS:
--
--  1. Hay que BORRAR la política vieja, no solo crear una nueva. Si quedan las
--     dos, la vieja sigue limitando a una sola empresa.
--  2. Las de los otros roles no se tocan. Un Vendedor, un Administrador y el
--     Super Admin ya ven todo y así tiene que seguir.
-- ============================================================


-- ------------------------------------------------------------
-- A. Los PLANOS: que vea, guarde y regrabe los de las dos empresas
--
-- Son cuatro políticas (select, insert, update, delete). Si tu base no tiene
-- alguna, salteá ese bloque.
-- ------------------------------------------------------------

-- ---- ver ----
-- drop policy if exists "PONÉ ACÁ EL NOMBRE DEL PASO 0" on public.proyecto;
-- create policy "proyecto_distribuidor_ve_los_suyos"
--   on public.proyecto for select to authenticated
--   using (distribuidor_id in (select public.mis_distribuidores()));

-- ---- crear ----
-- drop policy if exists "PONÉ ACÁ EL NOMBRE DEL PASO 0" on public.proyecto;
-- create policy "proyecto_distribuidor_crea_los_suyos"
--   on public.proyecto for insert to authenticated
--   with check (distribuidor_id in (select public.mis_distribuidores()));

-- ---- regrabar ----
-- drop policy if exists "PONÉ ACÁ EL NOMBRE DEL PASO 0" on public.proyecto;
-- create policy "proyecto_distribuidor_regraba_los_suyos"
--   on public.proyecto for update to authenticated
--   using (distribuidor_id in (select public.mis_distribuidores()))
--   with check (distribuidor_id in (select public.mis_distribuidores()));

-- ---- borrar ----
-- drop policy if exists "PONÉ ACÁ EL NOMBRE DEL PASO 0" on public.proyecto;
-- create policy "proyecto_distribuidor_borra_los_suyos"
--   on public.proyecto for delete to authenticated
--   using (distribuidor_id in (select public.mis_distribuidores()));


-- ------------------------------------------------------------
-- B. Las FICHAS: que vea las dos empresas en la lista
--
-- Sin esto la aplicación igual funciona —el nombre, el descuento y el IVA de
-- la segunda viajan en la sesión— pero el selector del paso 1 es lo único que
-- las muestra, y la lista de Distribuidores le sale con una sola.
-- ------------------------------------------------------------

-- drop policy if exists "PONÉ ACÁ EL NOMBRE DEL PASO 0" on public.distribuidor;
-- create policy "distribuidor_ve_sus_fichas"
--   on public.distribuidor for select to authenticated
--   using (distribuidor_id in (select public.mis_distribuidores()));


-- ------------------------------------------------------------
-- Comprobación: que ninguna política siga comparando con un solo id
--
-- Lo que salga acá es lo que todavía quedó limitado a una empresa.
-- ------------------------------------------------------------
select tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename in ('proyecto', 'distribuidor')
  and qual like '%distribuidor_id%'
  and qual not like '%mis_distribuidores%'
order by tablename, policyname;
