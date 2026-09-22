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
 * Lo que no cae en ningún grupo es especial: la lista dice que los Especiales
 * son "todos los colores de Wilsonart y Lamitech", o sea todo lo demás.
 *
 * Se compara por expresión regular porque los nombres de la lista de materia
 * prima no coinciden letra por letra con los de la lista de precios: ahí dice
 * "Alumina 2103" y en el catálogo hay "Alumina", "ALUMINAK 2108" y
 * "ALUMINAV V2106 PREMIUM".
 */
const GRUPOS_LEEDER: [RegExp, 1 | 2][] = [
  [/alumina|aluminak|alumink|aluminav/i, 1],
  [/ebano/i, 1],
  [/fashion\s*white/i, 1],
  [/grafito\s*nocturno/i, 1],
  [/gris\s*metalic/i, 2],
  [/skyline/i, 2],
  [/walnut\s*(heights|premium|std)/i, 2],
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
  [/walnut\s*(heights|premium|std)/i, 2],
]

/** 1, 2 o null (= especial) para un color de la planta de México */
export function grupoMx(nombre: string, linea: Linea): 1 | 2 | null {
  const n = (nombre || '').trim()
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
  [/walnut\s*heights|walnut\s*premium|walnut\s*std/i, 'ambar-wood'],
  [/skyline/i, 'nogal-grafito'],
  [/grafito\s*nocturno/i, 'grafito-nocturno'],
  [/blanco\s*antiguo/i, 'blanco-antiguo'],
  [/holly/i, 'holly'],
  [/lapiz\s*blue/i, 'lapis'],
]

export function slugRenderMx(nombre: string): string | undefined {
  // "Blanco Antiguo" tiene que ganarle a "Blanco", así que se busca de atrás
  const orden = [...RENDER_POR_NOMBRE].sort((a, b) => b[0].source.length - a[0].source.length)
  return orden.find(([re]) => re.test(nombre))?.[1]
}

/**
 * Todo lo que está en la lista de la planta de México es color de LÍNEA: es la
 * materia prima que se maneja allá, no un pedido especial.
 */
export function esColorMx(nombre: string): boolean {
  const n = (nombre || '').trim().toUpperCase()
  return !!n && COLORES_MX.some((c) => c.color.toUpperCase() === n)
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

export function descontinuadosMx(): ColorMX[] {
  return COLORES_MX.filter((c) => c.descontinuado)
}

export function proveedoresMx(colores: ColorMX[]): string[] {
  return [...new Set(colores.map((c) => c.proveedor))].sort()
}
