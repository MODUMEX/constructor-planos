# Constructor de Planos 2.0

Reescritura del Constructor de Planos con lo que aprendimos de Bradley Quōtable:
wizard de configuración con vista previa de la tipología, edición sobre el dibujo
(arrastre de paneles y menú contextual por pieza) y etapa de pedido al ERP.

Corre en el navegador y se empaqueta como aplicación de escritorio de Windows con
la misma base de código.

## Arrancar

```bash
npm install
npm run dev
```

Abre en <http://localhost:5183>.

## Cuentas

El login usa **las cuentas reales de Supabase**, las mismas del Constructor que
está en producción. Se entra con el correo completo y su contraseña; no hay
usuario "admin" ni cuentas sueltas.

Replica el mismo flujo que el Constructor actual (`src/auth.ts`):

1. `auth/v1/token?grant_type=password` valida el correo y la contraseña.
2. La tabla **`profiles`** da `nombre`, `rol` y `distribuidor_id`, y si
   `activo = false` no deja entrar.
3. Si el perfil tiene distribuidor, la tabla **`distribuidor`** aporta su
   `descuento` y su `iva`, que es lo que usa la cotización.

Roles reconocidos: `Super Admin`, `Administrador`, `Vendedor` y `Distribuidor`.

Las credenciales viven en `.env` (que no va al repositorio):

```
VITE_SUPABASE_URL=https://…supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_…
```

La llave *publishable* es pública por diseño —viaja al cliente, igual que en la
app actual— y lo que realmente protege los datos son las políticas RLS de las
tablas. Si se borra el `.env`, la app cae en tres cuentas locales de respaldo
(`dlizano@modumex.com` / `modumex`, `vendedor@modumex.com` / `demo`,
`distribuidor@demo.cr` / `demo`) para poder trabajar sin red.

**Ojo con el `.exe`:** Vite mete las variables del `.env` dentro del binario al
compilar, así que después de cambiar el `.env` hay que volver a correr
`npm run exe`.

Atajo para revisar una pantalla sin pasar por el wizard, solo en desarrollo:

```
http://localhost:5183/?demo=1&paso=7&tipo=ESQUINA_IZQ&tema=claro
```

`paso` va de 1 a 8, `tipo` es cualquier tipología de `src/catalog.ts`.

## Tarifas por m²

El precio de cada pieza sale de la tabla **`tarifa_m2`** de Supabase, con la
misma mecánica que `calcularPrecioPieza()` del Constructor (`src/tarifas.ts`):

- `m² = ancho × alto ÷ 10 000`, y las puertas de **62, 64, 92 y 94 se cobran
  como 70, 70, 100 y 100**.
- El juego de tarifas lo elige el **tier del color**: `linea` o `especiales`,
  más `aceroInox` y `antigrafiti` en Superior.
- En colones se usa la columna en colones (`lineaCRC`, `especialesCRC`); los
  modelos marcados **`usdOnly`** cotizan en dólares y convierten con el tipo de
  cambio, tomando `lineaCR` para el precio de línea.
- Un modelo que no esté en la tabla cae en `ESTANDAR`, igual que hoy.

Al entrar se llama a `tarifa_m2` y cada fila pisa el valor de respaldo que
corresponda. Las tarifas de respaldo están en `src/datos/tarifas-base.ts`, y se
regeneran desde el Constructor con:

```bash
npm run tarifas          # copia el bloque preciosPorM2 del Constructor
npm run probar-tarifas   # 9 casos: anchos cobrados, tiers, monedas, usdOnly
```

### Editar la lista de precios

El **Super Admin** ve el botón *Lista de precios* en la barra de arriba. Abre una
ventana con dos tablas —modelos × familias— editables celda por celda:

- **LEEDER y Touchless**: se elige tier (Línea o Especiales) y moneda, porque
  tienen tarifa propia en dólares y en colones.
- **Superior 2.0**: solo dólares, con sus cinco tiers (Línea, Línea Costa Rica,
  Especiales, Acero inoxidable, Antigrafiti).

Editar una celda recalcula la cotización al instante, sin guardar. *Guardar en la
nube* pide confirmación y hace un **upsert por
`(modelo_codigo, tier, moneda, familia)`** —el mismo `on_conflict` que usa el
Constructor—, así que lo que quede ahí lo usan todos. *Descartar y recargar*
vuelve a leer la tabla y tira los cambios sin guardar.

El botón solo aparece para Super Admin, pero lo que de verdad protege la tabla
son las políticas RLS de Supabase: el rol en pantalla es comodidad, no
seguridad.

La pantalla de cotización dice de dónde vinieron las tarifas y cuántas filas
llegaron. **Todos los renglones salen de `tarifa_m2`**: puerta, panel, pilastra y
divisor de orinal. El herraje y el riel de amarre NO se cotizan aparte porque ya
van dentro de esa tarifa; hasta la v2.0.10 se sumaban como kits con precio
inventado ($26 por cabina y $14.50 el metro de riel) y toda cotización salía
inflada. Las piezas de herraje que de verdad lleva el pedido las calcula el CIP,
ya con el plano y la cotización hechos.

**Los modelos se guardan por código** (`ESTANDAR`, `SUP_REFORZADO`, `TL_S3`…)
porque así los conoce la tabla de tarifas; el CSV, el cajetín y el pedido llevan
el nombre para leer (`Estándar`, `Reforzado`).

## Colores

Todo sale del azul del logo, **#15274B**. Como ese azul es muy oscuro para leerse
sobre el fondo grafito, el tema oscuro usa una versión aclarada del mismo tono
(#5F92DD); el tema claro usa el azul puro. Los tokens están arriba de
`src/styles.css`: `--marca` guarda el azul del logo, `--accent` es el que cambia
por tema y `--accent-texto` es el color del texto encima del acento.

En el plano los azules están repartidos para que no compitan entre sí:

| Elemento | Color |
|---|---|
| Cotas | gris azulado `#4A5A72` |
| Hoja de puerta | azul marino medio `#2A4C8F` |
| Panel que se está arrastrando | azul brillante `#2E6FD9` + halo |
| Paneles, pilastras y muros | tinta y grises |

## Colores: la lista depende del país

En el paso 1 se elige **dónde se fabrica**, y eso decide qué colores se ofrecen:

- **Costa Rica** — los diez del catálogo del Constructor actual (`COLORES` en
  `src/catalog.ts`), con su nombre viejo al lado y su tier de precio.
- **México** — la lista de materia prima de la planta, que es la que trae el
  **código**. Sale de "colores x codigo.xlsx" y la importa
  `scripts/importar-colores-mx.mjs` a `src/datos/colores-mx.ts`:

```bash
node scripts/importar-colores-mx.mjs "<ruta del xlsx>"
```

El importador abre el xlsx sin librería (un xlsx es un zip con XML adentro) y
agrupa por proveedor · color · espesor: **78 combinaciones** de seis
proveedores. Cada una guarda todas sus presentaciones, porque el código cambia
con la medida de lámina — `7964-3-1` es 5x12, `7964-3-2` es 4x10 y `7964-3-3`
es 4x8. Lo que viaja al CSV es el tronco (`7964-3`), que identifica el material
sin comprometer la lámina: la medida la elige el CIP al optimizar el corte.

La lista la manda la **línea**, no el campo de espesor: los de **3 mm son solo
para Superior 2.0** y los de **12 mm para LEEDER** (y Touchless, que es un
LEEDER reforzado). Quedan 24 colores para Superior y 29 para LEEDER. Los otros
espesores de la hoja (6 mm, 9 mm y EX2) son de otros productos y no entran acá.
Cambiar de línea con México elegido reelige el color, porque la lista es otra.

Dos cosas salen de los comentarios y las notas de la hoja:

- **Descontinuados** (5: Grey Nebula y Champaña metalizado en los dos espesores,
  y Almendra Estándar) — no se ofrecen.
- **Apartados** (13: *Exclusivo Liverpool*, *Exclusivo BBVA*, *Exclusivo Smart
  Fit*, *Compra única*, *No utilizar solo con autorización*…) — sí aparecen,
  marcados en amarillo con el texto de la lista. Bloquearlos sería inventar una
  regla que la hoja no dice; marcarlos deja la decisión donde va.

**Todos los de esa lista son de línea**, no especiales: es la materia prima que
la planta maneja. Por eso `tierDeColor()` recibe el país — un nombre que no está
en el catálogo de Costa Rica pero sí en la lista de México cotiza como línea. La
diferencia no es menor: el mismo baño de cuatro cabinas en Alumina da **$3 649**
como línea contra **$4 325** si se tomara como especial.

## Renders de mercadeo

Los renders con marca de agua se ven al elegir: en el paso 2 cada modelo es una
tarjeta con su foto, en el paso 3 la foto cambia al tocar cada color, y en el
plano queda una miniatura en el panel de la derecha.

Con la lista de México quedó claro de dónde salían tres renders de Superior 2.0
que no tenían color en el catálogo: **Blanco Antiguo, Holly Berry y Lapiz Blue**
son materiales de la planta de México, de 3 mm. Ahora se ven con su foto propia
cuando el proyecto se fabrica allá.

Los originales pesan 473 MB en PNG de 1920 px, así que no van al repositorio.
`scripts/importar-renders.mjs` los baja a webp de 1100 px (5,9 MB en total, unos
35 KB cada uno), los deja en `public/renders/` y arma el índice
`src/datos/renders.ts`:

```bash
node scripts/importar-renders.mjs "<carpeta de renders>"
```

De los 169 archivos entran **168**; el que sobra es una copia repetida de la
regadera Superior en alumina. La clave del índice es
`linea|modelo|acabado|color`, donde el acabado es `lam`, `esm` o `inox` y el
color es el slug del catálogo. Los orinales y las regaderas tienen render propio
aunque no sean un modelo aparte en la tabla de tarifas: van como `__ORINAL` y
`__REGADERA`.

`src/renders.ts` resuelve la foto y **avisa cuando no es exacta**. Dos casos
reales: Imperial no tiene render propio (es el estándar con tubing ornamental,
así que muestra el del estándar) y NEUTRAL OAK no vino en el paquete. En los dos
la tarjeta dice *foto de referencia* y explica qué se cambió, para que nadie le
enseñe al cliente una foto que no es la que va a recibir.

**Lo que sigue sin color asignado** son los dos tonos del esmalte antigrafiti
(beige y blanco): el catálogo tiene una sola entrada *Esmaltada Antigrafiti* y
la pantalla muestra la del gris oscuro, que es la que coincide con su hex.
Quedan importados y listados en `COLORES_FUERA_DE_CATALOGO`.

## Herrajes: inoxidable o negro

El juego va completo en un solo acabado: si el cliente pide negro, **todas** las
piezas son negras. No se elige pieza por pieza. Se decide en el paso 4 y las
fotos del juego se ven ahí mismo.

**Las fotos del inoxidable van por línea**, porque cada una tiene piezas
propias: LEEDER usa bisagra de gravedad y su escuadra U, y Superior 2.0 va con
bisagra de autorretorno y la escuadra U S3. **Las negras no llevan línea**: son
las mismas piezas de siempre en negro y sirven para las tres.

La elección viaja en tres lados: el cajetín del PDF la anota bajo el cuadro de
piezas, el CSV la lleva en una columna nueva `Herraje` al final, y el pedido del
ERP en el campo `herraje` de cada área.

### Importar las fotos

```bash
npm run herrajes                        # usa ../Herrajes/HERRAJES
npm run herrajes -- "<otra carpeta>"
```

El importador (`scripts/importar-herrajes.mjs`) lee la carpeta que manda
mercadeo tal como viene, sin reacomodar nada:

| Carpeta | Sale como |
|---|---|
| `LEEDER/` | juego inoxidable de LEEDER |
| `SUPERIOR/` | juego inoxidable de Superior 2.0 |
| `NEGROS LEEDER/` | juego negro, para todas las líneas |

La pieza se reconoce por el nombre del archivo, no por el orden, así que se
pueden agregar fotos sin tocar el código. Los originales pesan hasta 6 MB, así
que salen en webp a 420 px y solo eso va al repo. Cuando una foto está dos veces
gana la que no tiene fondo, y lo que no se reconoce se lista al final para no
perderlo en silencio.

El resultado queda en `src/datos/herrajes.ts`, que es **generado**: si hay que
corregir un nombre de pieza se corrige en el script y se vuelve a correr.

**Lo que falta:** las fotos del juego inoxidable de **Touchless S3** no vinieron
en el paquete, así que esa combinación sigue mostrando el aviso en pantalla en
vez de un hueco. Del zoclo de LEEDER llegaron dos tomas y se queda la de tres
cuartos, que es como están fotografiadas las demás piezas; la otra está en la
lista `IGNORAR` del script.

**Lo que falta confirmar:** el CIP hoy no distingue el acabado del herraje —
calcula el mismo código para todo. La columna `Herraje` la ignora sin romperse
(busca las columnas por nombre y solo exige SKU, Cantidad y SubTipo), así que el
CSV sigue sirviendo tal cual. Para que el CIP pida las piezas negras hacen falta
los códigos del juego negro, que todavía no tengo.

## Los ocho pasos

1. **Proyecto** — número de plano, obra, cliente, ubicación, área y piso.
2. **Línea** — LEEDER, Superior 2.0 o Touchless S3, y el modelo, cada uno con su render.
3. **Acabado** — el color se filtra según el acabado, igual que la lista de precios,
   y la foto cambia con el color elegido.
4. **Herrajes** — bisagra, cerrojo, acabado del juego de herrajes, altura y
   profundidad. Todo lo que afecta el herraje queda fijado antes de la geometría,
   así no quedan combinaciones imposibles de fabricar. El montaje ya no se
   elige: queda fijo en el estándar (pilastra a piso con riel de amarre arriba).
5. **Tipología** — once arreglos con dibujo de cómo queda. Esquina, nicho y U son
   los que el Constructor viejo no podía armar.
6. **Medidas** — claro y cantidad de cabinas; el reparto lo hace la app.
7. **Plano** — se ajusta sobre el dibujo (ver abajo).
8. **Cotización** — precio por pieza, moneda, y envío del pedido al ERP.

## Cómo se edita el plano

- **Arrastrar un panel divisor** reparte el ancho entre las dos cabinas vecinas.
  El claro total no se mueve y las medidas caen a la media pulgada más cercana
  (`SNAP_CM`). No deja bajar de 62 cm en una cabina normal ni de 150 en una
  accesible.
- **Clic derecho sobre una cabina**: ancho de puerta (los que no caben salen
  tachados), apertura hacia adentro o afuera, mano de la bisagra, tipo de cabina
  (normal, accesible, ambulatoria, regadera), puerta / cortina / sin puerta,
  dibujar o no el inodoro, y partir o quitar la cabina.
- **Clic derecho sobre un panel**: centrarlo entre las dos cabinas, recorte simple
  o doble, y refuerzo para barra de apoyo.
- Interruptores de pulgadas, cotas y sanitarios en la barra de herramientas.

## PDF del plano y CSV para el CIP

Los dos botones están en la barra del paso **Plano** y también en **Cotización**.
En la aplicación de escritorio abren el **"Guardar como" de Windows** y avisan
en qué ruta quedó el archivo; en el navegador bajan como descarga normal. Esa
bifurcación vive en `src/exportar/guardar.ts`.

**PDF** (`src/exportar/pdf.ts`) — una hoja carta horizontal por área, con el
plano a escala, cotas por cabina y cota total, el cuadro de piezas a la derecha
y el cajetín abajo con obra, cliente, ubicación, área, piso, tipología, línea,
modelo, acabado, color, alturas, sistema, número de plano, quién dibujó y la
fecha. Usa la misma geometría que la pantalla (`src/geometria.ts`), así que lo
que se ve en el editor es lo que sale impreso.

**CSV** (`src/exportar/csv.ts`) — el archivo que se arrastra a la pestaña
*Capturar* del CIP. Mismo encabezado y mismo SKU largo que emite el Constructor
de hoy, porque el CIP busca las columnas por nombre y saca las medidas del SKU:

```
Codigo,Obra,Distribuidor,SKU,Cantidad,SubTipo,Orientacion,Area,Modelo,Sistema,Color,KAP,Linea,Acabado,Herraje,Pais,CodigoColor
1042,Torre Escazú,Modumex Costa Rica,LM1LCRFPT95150GPZ,4,PTADER,,Baño de hombres,Estándar,Zoclo,Gris Perla,NO,LEEDER,Laminado Compacto,NEGRO,CR,
```

Las tres últimas columnas son nuevas y van al final: `Herraje` (INOX o NEGRO),
`Pais` (CR o MX) y `CodigoColor` (el código de materia prima, que solo llevan
los colores de México). El CIP de hoy las ignora sin romperse.

`LM1LCRFPT95150GPZ` = familia PT, ancho 95, alto 150 (los últimos tres dígitos
del bloque numérico siempre son el alto), color GP, sistema Z de zoclo.
Los SubTipos son los que el CIP usa para el herraje: `PTAIZQ` / `PTADER`
(con `-AM` cuando abre hacia adentro en una cabina contra muro), `PNCEN` /
`PNLAT`, `PLCEN` / `PLLAT` / `PLLATMUR`, `MG120` / `MG150`.

### Los sanitarios

El inodoro y el orinal se dibujan con **wc.png y orinal.png**, los mismos
archivos que usa el Constructor actual (están en la carpeta *Constructor de
planos*). Van embebidos en base64 en `src/assets/sanitarios.ts`, así que el
plano sale igual sin conexión y dentro de la aplicación de escritorio; para
cambiarlos, se reemplazan los PNG y se vuelve a generar ese archivo.

Los dos dibujos vienen con la pared arriba, que es como se arma cada tramo:
el sanitario se apoya contra el muro, centrado en su cabina, y gira con el
tramo, así que en una esquina o una U el fluxómetro siempre queda contra su
propia pared.

Una cabina de tipo **orinal** (las que crea la tipología *Solo orinales*, o
cualquiera que se cambie por clic derecho) usa el dibujo del orinal, no lleva
puerta, y su divisor es una mampara **MG** de 60 cm de fondo en vez de un panel
de cabina.

### Espesor del material

Puertas, paneles y pilastras van en **3 mm en Superior 2.0** y en **12 mm en
laminado compacto** (LEEDER y Touchless). El valor se pone solo al elegir la
línea, se puede corregir a mano en el paso *Herrajes*, y aparece en tres lados:

- en el **cajetín** del PDF (`ESPESOR · ALTO · PROF · SISTEMA`),
- en cada renglón del **cuadro de piezas** (`Panel 3mm`),
- en el **grueso con que se dibujan** panel y pilastra en planta.

El CSV no lleva columna de espesor a propósito: el CIP lo deduce de la columna
`Linea` (`espesorProyectoSobrante()` hace `includes('SUPERIOR') ? 3 : 12`), y
por eso la línea se emite como `Superior 2.0`, no como `SUPERIOR`.

### Probar los archivos sin abrir el navegador

```bash
npm run muestra                      # genera un PDF y un CSV de tres áreas
npm run inspeccionar Plano-1042-*.pdf   # textos y coordenadas, hoja por hoja
node scripts/validar-csv.mjs OC-1042-*.csv   # lo valida con las reglas del CIP
```

`validar-csv.mjs` aplica el mismo regex y la misma búsqueda de columnas que
`importarOCConstructorPlanos` del CIP, así que si pasa ahí, el CIP lo lee.

`verificar-pdf.html?src=/archivo.pdf` muestra el PDF en pantalla con pdf.js,
pero necesita la pestaña visible: si queda en segundo plano, el render se
detiene porque pdf.js espera cuadros de animación.

## Guardar y abrir proyectos

El botón **Proyectos** de la barra de arriba abre las dos cosas: la lista de lo
guardado y el guardado del proyecto que está en pantalla.

Van a la tabla `proyecto` de Supabase, **la misma que usa el Constructor
actual**. El proyecto completo viaja en la columna `app_json`, que la base ya
tenía justo para esto, y al abrirlo se reconstruye igual: áreas, tramos,
cabinas, puertas y configuración.

### Revisiones A/B/C

Cada revisión es **su propia fila**, así que sacar la B no borra la A y el
histórico del plano queda completo. La revisión va dentro del código:

| `codigo` | `numero_plano` | `revision` |
|---|---|---|
| `1042-A` | `1042` | `A` |
| `1042-B` | `1042` | `B` |

Se hace así, y no partiendo el `unique` de `codigo` en `(codigo, revision)`,
porque **el Constructor actual guarda con `upsert(row, { onConflict: "codigo" })`**:
si se le quita ese unique, la app en producción deja de guardar. La migración es
solo aditiva por esa razón.

Guardar dos veces la misma revisión la reemplaza —la pantalla lo avisa antes—, y
el botón *Usar el siguiente número libre* mira **todos** los códigos de la
tabla, no solo los del 2.0, porque `codigo` es unique para las dos apps.

### Quién ve qué

No lo decide la app sino la base, con las políticas RLS que ya existían:

| Rol | Qué proyectos ve |
|---|---|
| Super Admin · Administrador · Vendedor | todos |
| Distribuidor | solo los de su distribuidor |

El dueño del proyecto es `distribuidor_id`; `creado_por` guarda quién lo hizo.
Con una cuenta local de respaldo no se puede guardar: la RLS necesita una sesión
de verdad, y la pantalla lo dice en vez de fallar en silencio.

### Los proyectos del Constructor anterior

Están en la misma tabla, pero la estructura de su `app_json` es otra y el 2.0 no
la puede reconstruir. Por eso el 2.0 marca los suyos con `app: 'cv2'` adentro
del `app_json` y **lista solo esos**: mostrar los viejos sería ofrecer algo que
al abrirlo falla. Si abrís uno por id de todas formas, el aviso lo explica.

Cuando el 2.0 reemplace al actual habrá que decidir qué se hace con ese
histórico: convertirlo con un traductor de `app_json`, o dejarlo como archivo
consultable desde la app vieja.

### Antes de que funcione: correr la migración

Hace falta correr **una vez** `Supabase/19_proyecto_revision.sql` en el editor
SQL de Supabase. Agrega `revision`, `numero_plano`, `cliente` y `ubicacion`, y
tres índices. No toca ninguna columna ni constraint que ya existiera. Sin eso, el
guardado responde 400 porque las columnas no están.

## Aplicación de escritorio

```bash
npm run app    # abre la app de escritorio en modo desarrollo
npm run exe    # genera el instalador
```

Si `cargo` se queja de que no puede escribir en `src-tauri/target` (pasa cuando
el antivirus o una instancia abierta bloquean un archivo), se compila en otra
carpeta:

```bash
set CARGO_TARGET_DIR=%TEMP%\cv2-target
npm run exe
```

Sale todo en `src-tauri/target/release/`:

| Archivo | Tamaño | Para qué |
|---|---|---|
| `constructor-de-planos.exe` | 7,4 MB | Portable: se copia y se ejecuta, sin instalar |
| `bundle/nsis/…-setup.exe` | 1,9 MB | Instalador con accesos directos y desinstalador |
| `bundle/msi/…_en-US.msi` | 2,7 MB | El mismo instalador en MSI, para repartir por política de dominio |

Pesa tan poco porque usa el WebView2 que ya trae Windows, no un Chromium propio.
La primera compilación toma unos 4 minutos; las siguientes, segundos.

Lo que necesita la máquina que compila, una sola vez:

| | |
|---|---|
| **Rust** | `winget install Rustlang.Rustup` — toolchain `stable-x86_64-pc-windows-msvc` |
| **Compilador de C++** | `winget install Microsoft.VisualStudio.2022.BuildTools --override "--quiet --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"` — hacen falta **MSVC** y el **Windows SDK**, que es lo que trae `--includeRecommended` |
| **WebView2** | Ya viene con Windows 10/11 al día |

Los iconos ya están generados en `src-tauri/icons/` a partir del símbolo del
logo. Para rehacerlos con otra imagen: `npm run tauri icon ruta/al/logo.png`
(pide un PNG cuadrado de 1024).

La ventana se declara con la etiqueta `main` y sus permisos viven en
`src-tauri/capabilities/default.json`, que es como Tauri 2 controla lo que la
app puede hacer: la ventana, el diálogo de guardado y escribir archivos en
Descargas, Documentos, Escritorio y la carpeta del usuario. Nada más.

Dentro de la app el login sigue siendo el mismo: sin `.env` con Supabase entra
con las cuentas locales, y el atajo `?demo=1` **no** funciona porque solo existe
en modo desarrollo.

## Conectar los servicios

Crear un archivo `.env` en la raíz:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_ERP_URL=https://.../pedidos
```

- Con las dos primeras, el login pasa a validarse contra Supabase y las cuentas
  locales quedan solo como respaldo (`src/auth.ts`).
- Con `VITE_ERP_URL`, el botón *Enviar pedido al ERP* hace un POST real con el
  payload de `PedidoERP`. Sin esa variable responde local con un número simulado
  y no sale nada de la máquina (`src/erp.ts`).

## Qué falta para reemplazar al Constructor actual

- Validar los conteos del CSV contra una OC real ya fabricada: las cantidades
  de pilastras y paneles siguen la regla general (divisores internos, cierre en
  extremo libre, nada contra muro, una sola pilastra en la esquina compartida),
  pero conviene cruzarlas con un expediente conocido antes de mandar a producir.
- Confirmar contra una cotización real que las tarifas de `tarifa_m2` dan el
  mismo total que el Constructor: la fórmula está probada, pero nunca se leyó la
  tabla con una sesión de verdad.
- Probar el guardado del editor de tarifas con una sesión real: el payload y el
  upsert están armados, pero nunca se escribió en la tabla desde acá.
- Extras de cotización: grabados y herrajes de las tablas `grabado` y `herraje`,
  que hoy son los renglones marcados como estimados.
- Códigos del juego de herrajes negro para el CIP: la app ya manda `Herraje` en
  el CSV y en el pedido, pero el CIP calcula el mismo herraje para los dos
  acabados.
- Fotos del juego inoxidable de Touchless S3: llegaron las de LEEDER y las de
  Superior 2.0, pero esa no vino en el paquete y el paso 4 sigue avisando.
- Confirmar con mercadeo los dos tonos de esmalte antigrafiti (beige y blanco)
  que vinieron en los renders y no están en el catálogo.
- De dónde sale el país: hoy se elige a mano en el paso 1. Lo natural sería que
  lo trajera el distribuidor, como el IVA y la moneda.
- Guardar y abrir proyectos: **hecho** (ver arriba), pendiente probarlo con una
  sesión real y correr `Supabase/19_proyecto_revision.sql`. Falta el traductor
  del `app_json` del Constructor anterior para poder abrir su histórico.
- Reglas finas que ya viven en el Constructor actual: refuerzos del modelo
  Reforzado, antepecho SCUDO, tubing Imperial, color secundario por pieza,
  mingitorios y regaderas con sus alturas propias.
- Áreas múltiples: el botón *Siguiente área, misma configuración* ya las crea,
  pero todavía no hay navegador de áreas ni agrupación de homónimas.
