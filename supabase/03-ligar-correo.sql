-- ============================================================
-- PASO 3 · Ligarle la segunda empresa a un correo
--
-- Esto va a mano por ahora. La pantalla de Usuarios no lo puede hacer porque
-- `profiles` solo se escribe desde la Edge Function `gestion-usuarios`, que
-- vive fuera del repo del Constructor y hoy ni siquiera manda el distribuidor.
--
-- Se corre una vez por cada correo que tenga que llevar dos empresas.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Buscar el correo y ver cómo está hoy
-- ------------------------------------------------------------
select p.id, p.nombre, p.rol, p.distribuidor_id, p.distribuidor_id_2
from public.profiles p
where p.nombre ilike '%PONÉ ACÁ PARTE DEL NOMBRE%'
order by p.nombre;


-- ------------------------------------------------------------
-- 2. Buscar el número de la empresa que se le quiere agregar
-- ------------------------------------------------------------
select distribuidor_id, nombre, region, descuento, iva, activo
from public.distribuidor
where nombre ilike '%PONÉ ACÁ PARTE DEL NOMBRE DE LA EMPRESA%'
order by nombre;


-- ------------------------------------------------------------
-- 3. Ligarlas
--
-- El uuid sale del punto 1 y el número del punto 2. Descomentá y corré.
--
-- La primera empresa (`distribuidor_id`) es la que manda: es la que sale por
-- omisión en el cajetín y de la que salen el descuento y el IVA mientras no
-- elija la otra. Si querés que mande la OTRA, cambialas de lugar.
-- ------------------------------------------------------------

-- update public.profiles
--    set distribuidor_id_2 = 0        -- el número del punto 2
--  where id = '00000000-0000-0000-0000-000000000000';   -- el uuid del punto 1


-- ------------------------------------------------------------
-- 4. Comprobar que quedó
-- ------------------------------------------------------------
select p.nombre as persona,
       d1.nombre as empresa_1,
       d2.nombre as empresa_2
from public.profiles p
left join public.distribuidor d1 on d1.distribuidor_id = p.distribuidor_id
left join public.distribuidor d2 on d2.distribuidor_id = p.distribuidor_id_2
where p.distribuidor_id_2 is not null
order by p.nombre;
