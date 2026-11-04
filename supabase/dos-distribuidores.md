# Un correo con dos empresas

La migración de verdad **no vive acá**: vive con las demás del Constructor, en

    DESCARGAS/CIP/Supabase/35_dos_distribuidores.sql

junto a `01_schema.sql`, `02_rls.sql` y las otras treinta y cuatro. Acá hubo un
rato cuatro archivos sueltos escritos a ciegas, antes de encontrar esa carpeta;
se borraron para no dejar dos versiones de lo mismo.

En esa misma carpeta está la Edge Function `gestion-usuarios`, que también se
toca: es la que escribe `profiles` al admitir una solicitud.

## El orden

1. Correr `35_dos_distribuidores.sql` en el SQL Editor de Supabase.
2. Desplegar `functions/gestion-usuarios`.
3. Listo: la aplicación ya está publicada y se acomoda sola.

Los tres pasos aguantan cualquier orden —el login y `listar_cuentas` piden la
columna nueva y vuelven a pedir sin ella si todavía no está—, pero así es como
menos ruido hace.
