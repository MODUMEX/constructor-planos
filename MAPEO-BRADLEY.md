# Bradley Quōtable — el mapeo, y qué falta para igualarlo

Este documento es la referencia de diseño del Constructor de Planos 2.0: qué hace
la herramienta de Bradley, qué se decidió copiar, y en qué estado está cada cosa.

Vive acá, versionado con el proyecto, **a propósito**. El mapeo original existió
solo dentro de una conversación de Claude en otra máquina, y al cambiar de PC se
perdió: las sesiones son por máquina y no sincronizan. Se recuperó el 2026-08-25
del transcript de la sesión del 14–15 de agosto y del comparativo que se publicó
entonces. Si se vuelve a mapear algo de Bradley, va en este archivo.

## Qué es Quōtable

| | |
|---|---|
| Producto | Bradley **Quōtable** – Partition Design Tool, v2.7.59 (QT-WEB) |
| Plataforma | .NET Framework 4.7.2, **WinForms** (VB.NET, `BradleyQuoteSystem`) |
| Instalación | `.exe` por PC en `%LocalAppData%\BradleyQuotable`, con autoactualizador |
| Backend | Web services **SOAP** contra `quotable.bradleycorp.com`, más un servicio **AS400** (el ERP viejo) y uno de **Epicor** |
| Motores | `ConfiguratorLibrary.dll` + `ConfiguratorShared.dll` (reglas), `GraphicsEngine.dll` (dibujo), `PDFBuilder.dll` + `PdfSharp`, `GemBox.Spreadsheet` |
| Idioma | Inglés, pulgadas, un solo mercado |

Hace lo mismo que el Constructor —configurar el baño, dibujar el plano, sacar
lista de materiales y cotizar— pero llega más lejos por el lado comercial:
termina colocando el pedido contra el ERP. El diseño funciona sin red; la
cotización no.

Pantalla de entrada: *Quote Lookup*, con búsqueda por número de cotización,
cliente, obra, ciudad/estado/país, representante, fechas de creación y
vencimiento, cantidad de layouts, Status y **Outcome** (ganada o perdida).
Barra: Create Quote · Open Quote · Copy Quote · Revise Quote · Export a Excel ·
PDF de Quote / BOM / Drawing · Logout.

## El asistente, paso por paso

Once pasos. Lo importante del orden: **todo lo que afecta el herraje se fija
antes de tocar la geometría**, así no quedan combinaciones imposibles de
fabricar.

1. **Product Selection** — nombre del layout, hombres o mujeres (mujeres elimina la pregunta de urinales), y cuántas copias del layout crear.
2. **Material** — fenólico No-Site, acero inoxidable, y tres materiales descontinuados que siguen listados. Fabricante del laminado (Arborite, Formica, Fundermax, Nevamar, Pionite, Trespa, Wilsonart) y unos 100 colores con código. Casilla para paneles y puertas de 69/72" (69 para ADA).
3. **Mount** — Series 400 piso con riel superior, 500 anclada a piso, 600 colgada de techo, 700 piso a techo. Riel de 120" o sin riel.
4. **Hinge** — tipo de bisagra.
5. **Latch** — cerrojo con indicador libre/ocupado.
6. **Bracket** — estribo o continuo, y si van 3 brackets por conexión.
7. **Urinal Screen** — cuántas mamparas de urinal.
8. **Sight Screen** — cuántas mamparas de privacidad.
9. **Basic Layout** — las 12 tipologías, con vista previa del arreglo elegido.
10. **Stall Configuration** — cuántas cabinas, ancho total, y ancho y profundidad de cada una. **Las medidas son a ejes de panel, no a caras.**
11. **Finished** — resumen de todo, con botones para ver el BOM, editar el dibujo o encadenar la siguiente área.

Las 12 tipologías del paso 9: Corner Left/Right, Between Wall ADA Left/Right,
Free Standing, Alcove Left/Right, Alcove con cabinas, Alcove con cabinas entre
muros, y Alcove izquierda-derecha.

## El plano es la interfaz de edición

Esto fue el hallazgo que más pesó en el diseño del V2. El dibujo no es la
salida: es donde se edita. Se hace de dos maneras.

**Arrastrar el panel divisor reparte el ancho.** Al pasar el mouse sobre un panel
el cursor cambia a ↔. Se arrastra y las dos cabinas vecinas se reparten el
espacio en el acto: el ancho total de la tira no se mueve y las medidas caen
redondeadas a la media pulgada. Medido en el recorrido:

| | Cabina 1 | Cabina 2 | Cabina 3 | Cabina 4 | Total |
|---|---|---|---|---|---|
| Al abrir el dibujo | 60 1/2" | 36" | 36" | 36" | 168 1/2" |
| Tras mover el primer panel | 66" | 30 1/2" | 36" | 36" | 168 1/2" |

El cursor ↔ aparece **solo** sobre los paneles divisores, en el tramo entre la
pared y el frente. Sobre pilastras, puertas e inodoros sigue siendo flecha: esas
piezas se cambian por menú.

**Todo lo demás, con clic derecho**, y lo que ofrece el menú depende de la pieza:

- **Sobre la cabina** — *Door*: tamaño, apertura adentro o afuera, mano de la bisagra, y puerta / cortina de baño / ninguna. *Door Size*: de 22" a 36", y **los que no caben salen en gris, no ocultos**. *Toilet*: poner o quitar el inodoro, centrarlo en su cabina o centrar todos de un golpe. *Stall Type*: regular o ambulatoria, cabina por cabina.
- **Sobre el panel** — refuerzo para barra de apoyo, y recortes simple o doble.
- **Sobre el área vacía** — Add Note y Add Drain.

Detalle de CAD: la barra de estado sigue el cursor con dos lecturas a la vez,
`Document: (96 3/4",55")` y `Layout: (72 3/4",31")`.

Rareza a tener presente: si se cierra el dibujo y se vuelve al asistente, el
botón *Edit Drawing* queda gris. Hay que terminar el asistente y reabrirlo desde
la cotización para que el arrastre vuelva a funcionar.

## El BOM

Sale con el número de parte real y el tipo de pieza, y el herraje **se deriva
solo**. Renglones del ejemplo recorrido:

| Número de parte | Descripción | Qué muestra |
|---|---|---|
| `C440-62-XXXX` | PNL 59X58 | El panel lleva su medida en el código y el color va al final, sin definir. |
| `C480-07NSALH-XXXX` | PIL FMOB 7X80-15/16", NO-SITE ALCOVE, LEFT LATCH IN / RIGHT LATCH OUT | La pilastra codifica serie, medida, tipología y la mano de cada cerrojo. |
| `HDWC-S0451-07` | HDWR KIT FMOB SHOE KIT 7" | El kit de zapata sale del ancho de la pilastra, sin que nadie lo pida. |
| `HDWC-SD1-S0567` | HDWR KIT DR INSWING, SURF HINGE ANY HAND, 2-HINGE SET, INDICATOR | El kit de puerta sale del sentido de apertura y del cerrojo del paso 5. |
| `HW101030` | T-25 TORX HEAD BIT TAMPERPRUF | Hasta la punta del destornillador antivandálico entra sola. |

Es la misma idea que el CIP resolvió para LEEDER, Superior y SCUDO, con una
diferencia: el BOM de Bradley es **comercial** —lo que se le vende al cliente— y
**no baja al despiece de corte ni al aprovechamiento de hojas**. Ahí el CIP les
lleva ventaja clara.

## La cotización

Seis etapas: encabezado → partes y layouts → flete e impuestos → finalizar →
paquete de documentos → **Place Order** contra AS400 / Epicor.

## Las cinco cosas que se decidió copiar, y su estado

| | Recomendación | Estado en el V2 |
|---|---|---|
| 01 | **Tipologías en catálogo con vista previa.** Bradley no tiene editor libre multi-tramo: resuelve esquina y nicho eligiendo de una lista de 12 arreglos cerrados, no dibujando. | **Hecho.** Once tipologías en el paso 5 con dibujo de cómo queda (`PreviewTipologia.tsx`), incluidas esquina, nicho y U, que el Constructor viejo no podía armar. |
| 02 | **Clonar áreas.** "Create [N] Layout(s) THUS" para obras de varios pisos con baños idénticos, y "Next Layout / Same Material" al terminar. | **A medias.** El botón *Siguiente área, misma configuración* ya crea la siguiente área heredando todo. Falta el navegador de áreas, la agrupación de homónimas y el "crear N iguales de una vez". |
| 03 | **Configuración global antes que geometría.** Material → montaje → bisagra → cerrojo → brackets → urinales, y la geometría recién al final. | **Hecho.** Los ocho pasos del V2 siguen ese orden: línea → acabado → herrajes → tipología → medidas → plano → cotización. |
| 04 | **Resultado de la cotización: ganada o perdida.** Filtro por Outcome, revisiones, vencidas, canal y territorio. Información que el Constructor hoy genera y tira. | **Pendiente.** No existe. Depende de guardar proyectos, que también está pendiente. |
| 05 | **Editar sobre el plano, no en un formulario.** Arrastre de paneles y menú contextual por pieza. | **Hecho.** `EditorPlano.tsx` arrastra paneles repartiendo el ancho con tope de 62 cm (150 en accesible), y el clic derecho da ancho de puerta con los que no caben tachados, apertura, mano, tipo de cabina, puerta/cortina/ninguna, inodoro, y recortes y refuerzo del panel. |

## Lo que Bradley tiene y el V2 todavía no

- **Guardar y abrir cotizaciones**, con buscador tipo *Quote Lookup*, revisiones A/B/C y consecutivo de plano.
- **Place Order real contra el ERP**: en el V2 el envío existe pero es un stub, y sin `VITE_ERP_URL` responde local con un número simulado.
- **Flete** como etapa propia de la cotización, con flete al Ship To.
- **Add Note** y **Add Drain** sobre el dibujo.
- **Export a Excel** de la cotización.
- Kits de herraje derivados con código propio: el V2 manda `Herraje` en el CSV, pero el CIP calcula el mismo código para inoxidable y negro.

## Dónde gana cada uno

| Capacidad | Quōtable | Constructor |
|---|---|---|
| Baños en esquina y nicho | 12 tipologías con vista previa | El V2 ya trae once |
| Editar el plano | Arrastrar paneles + clic derecho | Igualado en el V2 |
| Modulación automática | Hay que dar los anchos | Sugiere el reparto desde el claro |
| Centros de descarga | Dibuja el inodoro, no modula por él | Centra cada cabina en su descarga |
| Varias áreas por proyecto | Una cotización, varios layouts | Áreas con hoja propia y homónimas agrupadas |
| Corte y aprovechamiento | No llega ahí | CIP: hojas, sobrantes de almacén, despiece |
| Flete e impuestos | Etapa propia | IVA por distribuidor, sin flete |
| Pedido al ERP | Place Order contra AS400 / Epicor | Termina en PDF y CSV |
| Revisiones | Revise / Revert / Copy | Revisiones A/B/C al descargar |
| Instalación | `.exe` por PC con autoactualizador | Web, se publica y ya |
| Idioma y moneda | Inglés, pulgadas, un mercado | Español, colones y dólares, LATAM |

## Cómo se hizo el recorrido, y qué quedó tocado

Tres recorridos, 14 y 15 de agosto de 2026, con configuraciones de prueba: 3
cabinas con 2 mamparas de urinal, y dos de 4 cabinas, todas en esquina
izquierda. Se le mandaron los clics directo a los controles de la ventana y se
capturó la pantalla aunque quedara detrás. No se tocó ningún archivo de la
instalación ni se abrió ninguna cotización de clientes reales.

**Quedaron cuatro números de cotización reservados en producción: 376601,
376603, 376604 y 376606.** Al abrir *Create Quote* la aplicación le pide número
al servidor antes de que uno escriba nada. Se cerraron todas las ventanas
rechazando el guardado, así que no quedó ninguna cotización ni layout guardado,
pero esos cuatro números salieron del consecutivo y conviene que lo sepa quien
lleve el control. Ojo con los dos avisos, que preguntan al revés: el de la
cotización es "¿desea guardar los cambios?" y el del dibujo, "¿desea salir sin
guardar?".

## Fuentes

- Transcript de la sesión del 14–15 ago 2026: `b17a7347-170f-4f85-baf2-8b5235b8d117.jsonl`, en la carpeta `.claude` de la PC anterior.
- Comparativo publicado entonces: <https://claude.ai/code/artifact/15bbf47d-bac7-449b-a559-fe13d5acbd39>
