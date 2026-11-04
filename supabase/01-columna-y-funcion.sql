-- ============================================================
-- PASO 1 · La columna y la función
--
-- Esto se corre tal cual, sin cambiarle nada. Se puede correr dos veces sin
-- romper nada.
--
-- No hace falta parar la aplicación ni publicarla antes: mientras la columna
-- no exista, el login la pide, falla y vuelve a pedir el perfil sin ella, así
-- que todo sigue andando con una sola empresa.
-- ============================================================


-- ------------------------------------------------------------
-- La columna de la segunda empresa
--
-- Se copia el tipo de `distribuidor_id` en vez de escribirlo a mano, para que
-- las dos sean iguales pase lo que pase (integer, bigint o lo que tenga).
-- ------------------------------------------------------------
do $$
declare tipo text;
begin
  select format_type(a.atttypid, a.atttypmod) into tipo
  from pg_attribute a
  where a.attrelid = 'public.profiles'::regclass
    and a.attname = 'distribuidor_id'
    and a.attnum > 0;

  if tipo is null then
    raise exception 'profiles.distribuidor_id no existe: revisá el nombre de la tabla';
  end if;

  execute format(
    'alter table public.profiles add column if not exists distribuidor_id_2 %s', tipo
  );
end $$;

comment on column public.profiles.distribuidor_id_2 is
  'La SEGUNDA empresa del mismo correo. La primera sigue siendo distribuidor_id y es la que manda mientras el vendedor no elija la otra.';


-- ------------------------------------------------------------
-- Que apunte de verdad a una ficha, y que no sea la misma dos veces
-- ------------------------------------------------------------
alter table public.profiles
  drop constraint if exists profiles_distribuidor_id_2_fkey;
alter table public.profiles
  add constraint profiles_distribuidor_id_2_fkey
  foreign key (distribuidor_id_2) references public.distribuidor(distribuidor_id);

alter table public.profiles
  drop constraint if exists profiles_distribuidores_distintos;
alter table public.profiles
  add constraint profiles_distribuidores_distintos
  check (distribuidor_id_2 is null or distribuidor_id_2 is distinct from distribuidor_id);


-- ------------------------------------------------------------
-- Las empresas del que está conectado
--
-- Una sola función, para no repetir el OR en cada política. Devuelve una fila
-- por empresa, así las políticas pueden usar `in (select ...)`.
--
-- Va como SECURITY DEFINER porque consulta profiles, que por RLS solo lee el
-- Super Admin: sin esto, una política que la llame no vería nada. Es segura
-- porque no recibe parámetros y solo mira la fila de quien la llama.
-- ------------------------------------------------------------
create or replace function public.mis_distribuidores()
returns setof integer
language sql
stable
security definer
set search_path = public
as $$
  select x from (
    select distribuidor_id as x from public.profiles where id = auth.uid()
    union
    select distribuidor_id_2 from public.profiles where id = auth.uid()
  ) t where x is not null
$$;

revoke all on function public.mis_distribuidores() from public;
grant execute on function public.mis_distribuidores() to authenticated;


-- ------------------------------------------------------------
-- Comprobación: que la columna y la función existan
-- ------------------------------------------------------------
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'distribuidor_id_2') as columna_lista,
  (select count(*) from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'mis_distribuidores') as funcion_lista;
-- las dos tienen que dar 1
