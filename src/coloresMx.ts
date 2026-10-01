import { COLORES_MX, type ColorMX } from './datos/colores-mx'
import type { Acabado, Linea } from './types'

/**
 * La lista de colores depende del país donde se fabrica: Costa Rica trabaja con
 * los diez del catálogo (`COLORES` en catalog.ts) y México con la lista de
 * materia prima de la planta, que es la que trae el código.
 */

export { COLORES_MX }
export type { ColorMX }

/**
 * A qué grupo de precio pertenece cada color de México.
 *
 * Sale de las notas de "LISTA DE PRECIOS MÉXICO.xlsx" (hoja Inicio). OJO: los
 * grupos NO son los mismos en las dos líneas. El Gris Metalizado es Grupo 2 en
 * LEEDER y Grupo 1 en Superior 2.0, así que el grupo se pregunta siempre con la
 * línea en la mano.
 *
 * Lo que no cae en ningún grupo es especial: así lo dice la lista de precios.
 *
 * Se compara por expresión regular porque los nombres de la lista de materia
 * prima no coinciden letra por letra con los de la lista de precios: ahí dice
 * "Alumina 2103" y en el catálogo hay "Alumina", "ALUMINAK 2108" y
 * "ALUMINAV V2106 PREMIUM".
 */
/**
 * Sin tildes, para comparar.
 *
 * El nombre que se guarda ahora puede ser el de la FAMILIA —"Gris metálico"— y
 * las reglas de grupo y de foto están escritas sin tilde, como viene la lista
 * de materia prima. Sin esto, ese color caía como especial y se cobraba mal.
 */
function pelado(s: string): string {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const GRUPOS_LEEDER: [RegExp, 1 | 2][] = [
  [/alumina|aluminak|alumink|aluminav/i, 1],
  [/ebano/i, 1],
  [/fashion\s*white/i, 1],
  [/grafito\s*nocturno/i, 1],
  // la lista de materia prima escribe "Gris metalic" y la comercial "Gris
  // Metalizado": son el mismo color
  [/gris\s*metali[cz]/i, 2],
  [/skyline/i, 2],
  // El "^walnut" es para el nombre con el que se juntan —"Walnut" a secas—.
  // Va anclado a propósito: el "Italian Walnut" es OTRO color y no entra acá.
  [/^walnut(\s|$)|walnut\s*(heights|premium|std)/i, 2],
]

const GRUPOS_SUPERIOR: [RegExp, 1 | 2][] = [
  [/alumina|aluminak|alumink|aluminav/i, 1],
  [/grafito\s*nocturno/i, 1],
  [/gris\s*metali[cz]/i, 1],
  // el antiguo va ANTES que el blanco pelado, si no se lo come la otra regla
  [/blanco\s*antiguo/i, 2],
  [/^blanco|blanco\s*157|whitec/i, 2],
  [/holly/i, 2],
  [/lapi[sz]/i, 2],
  [/negro/i, 2],
  [/skyline/i, 2],
  // igual que en LEEDER: "Walnut" a secas sí, "Italian Walnut" no
  [/^walnut(\s|$)|walnut\s*(heights|premium|std)/i, 2],
]

/** 1, 2 o null (= especial) para un color de la planta de México */
export function grupoMx(nombre: string, linea: Linea): 1 | 2 | null {
  const n = pelado(nombre).trim()
  if (!n) return null
  // un bicolor no es un color de lista por más que uno de sus dos lo sea
  if (/bicolor/i.test(n)) return null
  const tabla = linea === 'SUPERIOR' ? GRUPOS_SUPERIOR : GRUPOS_LEEDER
  for (const [re, grupo] of tabla) if (re.test(n)) return grupo
  return null
}

/**
 * Qué render le corresponde a un color de México. Es una equivalencia de
 * FOTO, no de precio: solo se mapea cuando hay una foto de ese color. Lo que
 * no está acá se queda sin foto propia y la pantalla lo avisa como foto de
 * referencia.
 *
 * El ORDEN manda: la regla más específica va primero, igual que en las
 * familias. Antes se ordenaba por el largo de la expresión, y con eso el
 * "Blanco Antiguo" lo agarraba la regla del blanco y salía con la foto
 * equivocada teniendo la suya.
 */
const RENDER_POR_NOMBRE: [RegExp, string][] = [
  [/blanco\s*antiguo/i, 'blanco-antiguo'],
  [/gris\s*metali[cz]/i, 'inox-satin'],
  [/alumina|aluminak|alumink|aluminav/i, 'gris'],
  [/ebano|negro|black\s*premium/i, 'negro'],
  [/fashion\s*white|whitec|^blanco(\s|$)|blanco\s*1571/i, 'blanco'],
  [/^walnut(\s|$)|walnut\s*(heights|premium|std)/i, 'ambar-wood'],
  [/skyline/i, 'nogal-grafito'],
  [/grafito\s*nocturno/i, 'grafito-nocturno'],
  [/holl?y\s*berry|holly/i, 'holly'],
  [/lapi[sz]\s*blue/i, 'lapis'],
]

/**
 * La esmaltada tiene sus propias fotos: el mismo "Blanco" no se ve igual
 * laminado que pintado, y el render se llama distinto.
 */
const RENDER_ESMALTE: [RegExp, string][] = [
  [/^blanco/i, 'esmalte-blanco'],
  [/beige/i, 'esmalte-beige'],
]

export function slugRenderMx(nombre: string, acabado?: Acabado): string | undefined {
  const n = pelado(nombre)
  if (acabado === 'Esmaltada Antigrafiti') return RENDER_ESMALTE.find(([re]) => re.test(n))?.[1]
  if (acabado === 'Acero Inoxidable') return 'acero-inoxidable'
  return RENDER_POR_NOMBRE.find(([re]) => re.test(n))?.[1]
}

/**
 * Todo lo que está en la lista de la planta de México es color de LÍNEA: es la
 * materia prima que se maneja allá, no un pedido especial.
 */
export function esColorMx(nombre: string): boolean {
  const n = (nombre || '').trim().toUpperCase()
  if (!n) return false
  // el nombre con el que se MUESTRA un color juntado no está en la lista de
  // materia prima, pero es igual de color de línea que los que lo componen
  return (
    COLORES_MX.some((c) => c.color.toUpperCase() === n) ||
    FAMILIAS.some(([, familia]) => familia.toUpperCase() === n)
  )
}

/** un color de México se identifica por su nombre y su espesor */
export function claveMx(c: ColorMX): string {
  return `${c.color} · ${c.espesor}`
}

export function buscarColorMx(clave: string): ColorMX | undefined {
  return COLORES_MX.find((c) => claveMx(c) === clave)
}

/**
 * El espesor de lámina que le toca a cada línea: los de 3 mm son solo para
 * Superior 2.0 y los de 12 mm para LEEDER. Touchless es un LEEDER reforzado,
 * así que va con los de 12.
 */
export function espesorDeLinea(linea: Linea): number {
  return linea === 'SUPERIOR' ? 3 : 12
}

/**
 * Los colores que se pueden usar en esa línea. El material descontinuado no se
 * ofrece nunca.
 *
 * Los apartados o especificados para un cliente solo se muestran adentro de
 * Modumex: a un distribuidor no se le enseña material comprometido con otro.
 */
export function coloresMxPara(linea: Linea, conReservados = true): ColorMX[] {
  const mm = espesorDeLinea(linea)
  return COLORES_MX.filter(
    (c) => !c.descontinuado && c.espesorMm === mm && (conReservados || !c.reservado),
  )
}

// ---------------------------------------------------------------------------
// Qué se OFRECE en México
// ---------------------------------------------------------------------------
//
// La lista de materia prima dice lo que la planta COMPRA, que no es lo mismo
// que lo que se le vende al distribuidor: ahí hay material de una sola compra,
// restos y cosas que no están en la carta. Lo que se ofrece es esta lista, que
// la dio Dayanna el 1-oct-2026 y manda sobre la materia prima.

/** el laminado compacto de 12,7 de LEEDER */
const LAMINADO_LEEDER_MX = [
  'Alumina',
  'Fashion White',
  'Ebano',
  'Gris Metalizado',
  'Skyline Walnut',
  'Walnut Heights',
  'Grafito Nocturno',
  'Rosa Margenta',
  'Rosa',
]

/** y el de 3 mm de Superior 2.0, que lleva siete más */
const LAMINADO_SUPERIOR_MX = [
  'Alumina',
  'Fashion White',
  'Ebano',
  'Champaña Metalizado',
  'Gris Metalizado',
  'Skyline Walnut',
  'Walnut Heights',
  'Lapis Blue',
  'Holly Berry',
  'Negro',
  'Blanco',
  'Blanco Antiguo',
  'Grafito Nocturno',
]

/** la esmaltada antigrafiti de Superior 2.0: el acabado se pinta, no se lamina */
const ESMALTADA_MX = ['Blanco', 'Gris Claro', 'Beige']

/** y la fórmica, que son dos */
const FORMICA_MX = ['White', 'Folkstone']

/**
 * Si ese acabado tiene lista de colores en México.
 *
 * El acero inoxidable y el Arte son su propio color: ahí no hay nada que
 * elegir. La esmaltada antigrafiti y la fórmica SÍ tienen lista —tres y dos
 * colores— aunque el acabado mande sobre el precio.
 */
export function eligeColorMx(acabado: Acabado): boolean {
  return acabado !== 'Acero Inoxidable' && acabado !== 'Arte'
}

/**
 * Los colores que se ofrecen, por línea y acabado, en el orden de la carta.
 *
 * En acero inoxidable y en Arte el acabado ES el color, así que no hay lista
 * que elegir.
 */
export function ofrecidosMx(linea: Linea, acabado: Acabado): string[] {
  if (acabado === 'Esmaltada Antigrafiti') return ESMALTADA_MX
  if (acabado === 'Fórmica') return FORMICA_MX
  if (acabado === 'Acero Inoxidable' || acabado === 'Arte') return []
  return linea === 'SUPERIOR' ? LAMINADO_SUPERIOR_MX : LAMINADO_LEEDER_MX
}

/**
 * Colores que la lista de materia prima trae REPETIDOS.
 *
 * La planta compra el mismo color a varios proveedores y en varias calidades,
 * así que en la lista aparecen tres veces: "Alumina", "Aluminak premium" y
 * "ALUMINAV V2106 PREMIUM" son el mismo Alumina con tres láminas distintas. Al
 * distribuidor eso no le dice nada: él elige un COLOR.
 *
 * El criterio para juntarlos no es el parecido de los nombres sino lo que la
 * propia aplicación ya daba por sentado: son los que caen en el MISMO grupo de
 * precio y les toca la MISMA foto. O sea, lo que ya se cobraba y se mostraba
 * igual.
 *
 * El orden importa: "Blanco Antiguo" tiene que ganarle a "Blanco", así que va
 * primero.
 */
const FAMILIAS: [RegExp, string][] = [
  // "Blanco Antiguo" es OTRO color y va primero, o se lo come "Blanco"
  [/blanco\s*antiguo/i, 'Blanco Antiguo'],
  [/alumina|aluminak|alumink|aluminav/i, 'Alumina'],
  // El "Italian Walnut" va primero y aparte: NO es ninguno de los otros dos.
  // La carta lleva un solo skyline —"Skyline Walnut"—, así que el STD y el
  // PREMIUM de la planta son ese mismo color.
  [/italian\s*walnut/i, 'Italian Walnut'],
  [/skyline/i, 'Skyline Walnut'],
  [/walnut\s*(heights|premium|std)/i, 'Walnut Heights'],
  [/^negro|black\s*premium/i, 'Negro'],
  [/^blanco(\s|$)|blanco\s*157/i, 'Blanco'],
  [/gris\s*metali[cz]/i, 'Gris Metalizado'],
  [/champa/i, 'Champaña Metalizado'],
  [/grafito\s*nocturno/i, 'Grafito Nocturno'],
  [/^ebano/i, 'Ebano'],
  [/fashion\s*white/i, 'Fashion White'],
  [/holl?y\s*berry/i, 'Holly Berry'],
  [/lapi[sz]\s*blue/i, 'Lapis Blue'],
  // El lapislázuli y el Lapiz Blue quedan SEPARADOS: comparten grupo de precio
  // pero no la foto, así que no hay con qué decir que son el mismo color.
]

/**
 * Bajo qué nombre se muestra un color, juntando los repetidos. El que no está
 * en ninguna familia se muestra tal cual viene.
 */
export function familiaMx(nombre: string): string {
  const n = (nombre || '').trim()
  // en el orden en que están escritas: la específica va primero
  return FAMILIAS.find(([re]) => re.test(n))?.[1] ?? n
}

/**
 * Cuál de los materiales de una familia se usa de referencia.
 *
 * Solo sirve para cosas que son iguales en toda la familia —el espesor, si
 * está descontinuado—. Gana el que NO lleva apellido de calidad, que es la
 * lámina base.
 *
 * NO decide con qué lámina se fabrica: eso se elige en el CIP.
 */
function materialDeLaFamilia(delMismo: ColorMX[]): ColorMX {
  const apellido = /premium|std|est[áa]ndar|estandar|quality/i
  // Primero una lámina LIBRE: si una de las del color está apartada para un
  // cliente y la otra no, el color no está apartado y no tiene por qué salir
  // con esa nota. El Skyline Walnut salía marcado para Planet Fitness aunque
  // la planta tenga otra lámina igual sin comprometer.
  const libres = delMismo.filter((c) => !c.reservado)
  const donde = libres.length ? libres : delMismo
  return donde.find((c) => !apellido.test(c.color)) ?? donde[0]
}

/**
 * Un color como lo ve el vendedor: un nombre, y detrás las láminas que se ven
 * así.
 */
export interface ColorMxAgrupado extends ColorMX {
  /** el nombre con el que se muestra */
  nombre: string
  /** los otros materiales que se ven igual; vacío si no hay */
  tambien: string[]
}

/**
 * Los colores de una línea con los repetidos juntados en uno solo.
 *
 * **El código de materia prima viaja SOLO cuando no hay duda**, o sea cuando
 * ese color tiene una única lámina. Cuando tiene varias —Alumina son tres— la
 * app no elige ninguna: el distribuidor pide un COLOR y es el CIP el que
 * despliega las láminas de ese color y ahí se escoge cuál se da de baja. Un
 * código adivinado acá haría cortar la lámina equivocada.
 */
export function coloresMxAgrupados(
  linea: Linea,
  conReservados = true,
  acabado: Acabado = 'Laminado Compacto',
): ColorMxAgrupado[] {
  const porFamilia = new Map<string, ColorMX[]>()
  for (const c of coloresMxPara(linea, true)) {
    const f = familiaMx(c.color)
    const ya = porFamilia.get(f)
    if (ya) ya.push(c)
    else porFamilia.set(f, [c])
  }

  // La esmaltada se PINTA y la fórmica es otro material: sus colores no están
  // en la lista de laminado, y buscarlos ahí hacía que el "Negro" esmaltado se
  // llevara el código y el grupo de precio del laminado negro.
  const esLaminado = acabado === 'Laminado Compacto'

  const salida: ColorMxAgrupado[] = []
  for (const nombre of ofrecidosMx(linea, acabado)) {
    const todas = esLaminado ? (porFamilia.get(nombre) ?? []) : []
    const delMismo = todas.filter((c) => conReservados || !c.reservado)
    // tenía lámina pero toda apartada para otro cliente: a un distribuidor no
    // se le ofrece
    if (todas.length > 0 && delMismo.length === 0) continue
    if (delMismo.length === 0) {
      // Está en la carta pero todavía no en la lista de materia prima de esa
      // línea. Se ofrece igual —el color existe— y sale SIN código: con cuál
      // lámina se fabrica lo pregunta el CIP, que es donde se sabe.
      salida.push({
        color: nombre,
        espesor: '',
        espesorMm: espesorDeLinea(linea),
        codigoBase: '',
        nombre,
        tambien: [],
      })
      continue
    }
    const referencia = materialDeLaFamilia(delMismo)
    const unaSola = delMismo.length === 1
    salida.push({
      ...referencia,
      nombre,
      // con varias láminas no se manda ninguna: la elige el CIP
      codigoBase: unaSola ? referencia.codigoBase : '',
      tambien: delMismo.filter((c) => c !== referencia).map((c) => c.color),
    })
  }
  return salida
}

export function descontinuadosMx(): ColorMX[] {
  return COLORES_MX.filter((c) => c.descontinuado)
}

/**
 * De quién compramos cada material NO viaja en la aplicación: se sacó de los
 * datos, no solo de la pantalla. Lo mismo el código de materia prima y la
 * medida de lámina, que quedaron solo donde hacen falta —el CSV del CIP y la
 * columna `cp` de la base—, porque son de adentro de Modumex.
 */
