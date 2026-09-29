import { COLORES_MX, type ColorMX } from './datos/colores-mx'
import type { Linea } from './types'

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
  [/gris\s*metalic/i, 2],
  [/skyline/i, 2],
  // El "^walnut" es para el nombre con el que se juntan —"Walnut" a secas—.
  // Va anclado a propósito: el "Italian Walnut" es OTRO color y no entra acá.
  [/^walnut(\s|$)|walnut\s*(heights|premium|std)/i, 2],
]

const GRUPOS_SUPERIOR: [RegExp, 1 | 2][] = [
  [/alumina|aluminak|alumink|aluminav/i, 1],
  [/grafito\s*nocturno/i, 1],
  [/gris\s*metalic/i, 1],
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
 * FOTO, no de precio: solo se mapea cuando el nombre del material y el del
 * render son el mismo. Lo que no está acá se queda sin foto propia y la
 * pantalla lo avisa como foto de referencia.
 */
const RENDER_POR_NOMBRE: [RegExp, string][] = [
  [/gris\s*metalic/i, 'inox-satin'],
  [/alumina|aluminak|alumink|aluminav/i, 'gris'],
  [/ebano|negro|black\s*premium/i, 'negro'],
  [/fashion\s*white|whitec|^blanco(\s|$)|blanco\s*1571/i, 'blanco'],
  [/^walnut(\s|$)|walnut\s*(heights|premium|std)/i, 'ambar-wood'],
  [/skyline/i, 'nogal-grafito'],
  [/grafito\s*nocturno/i, 'grafito-nocturno'],
  [/blanco\s*antiguo/i, 'blanco-antiguo'],
  [/holly/i, 'holly'],
  [/lapiz\s*blue/i, 'lapis'],
]

export function slugRenderMx(nombre: string): string | undefined {
  // "Blanco Antiguo" tiene que ganarle a "Blanco", así que se busca de atrás
  const orden = [...RENDER_POR_NOMBRE].sort((a, b) => b[0].source.length - a[0].source.length)
  return orden.find(([re]) => re.test(pelado(nombre)))?.[1]
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
/**
 * Colores que la lista de precios NO reconoce en Superior 2.0. Están en la
 * materia prima pero no en ninguno de los dos grupos de esa línea, así que
 * ofrecerlos ahí los cotizaría como especiales sin serlo. Dayanna lo confirmó
 * el 22-sep-2026.
 */
const FUERA_DE_SUPERIOR = /ebano|fashion\s*white/i

export function coloresMxPara(linea: Linea, conReservados = true): ColorMX[] {
  const mm = espesorDeLinea(linea)
  return COLORES_MX.filter(
    (c) =>
      !c.descontinuado &&
      c.espesorMm === mm &&
      (conReservados || !c.reservado) &&
      !(linea === 'SUPERIOR' && FUERA_DE_SUPERIOR.test(c.color)),
  )
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
  [/^negro|black\s*premium/i, 'Negro'],
  [/^blanco(\s|$)|blanco\s*157/i, 'Blanco'],
  [/whitec/i, 'Whitec'],
  [/gris\s*metalic/i, 'Gris metálico'],
  [/skyline/i, 'Skyline'],
  [/walnut\s*(heights|premium|std)/i, 'Walnut'],
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
  return delMismo.find((c) => !apellido.test(c.color)) ?? delMismo[0]
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
export function coloresMxAgrupados(linea: Linea, conReservados = true): ColorMxAgrupado[] {
  const lista = coloresMxPara(linea, conReservados)
  const porFamilia = new Map<string, ColorMX[]>()
  for (const c of lista) {
    const f = familiaMx(c.color)
    const ya = porFamilia.get(f)
    if (ya) ya.push(c)
    else porFamilia.set(f, [c])
  }
  return [...porFamilia.entries()].map(([nombre, delMismo]) => {
    const referencia = materialDeLaFamilia(delMismo)
    const unaSola = delMismo.length === 1
    return {
      ...referencia,
      // Si la familia tiene uno solo no hay nada que juntar, así que se deja el
      // nombre con el que viene: renombrarlo sería cambiar por cambiar.
      nombre: unaSola ? referencia.color : nombre,
      // con varias láminas no se manda ninguna: la elige el CIP
      codigoBase: unaSola ? referencia.codigoBase : '',
      tambien: delMismo.filter((c) => c !== referencia).map((c) => c.color),
    }
  })
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
