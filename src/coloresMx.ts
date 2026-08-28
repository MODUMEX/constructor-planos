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
 * ofrece; los apartados para un cliente sí aparecen, pero marcados, porque la
 * decisión de usarlos no es de la app.
 */
export function coloresMxPara(linea: Linea): ColorMX[] {
  const mm = espesorDeLinea(linea)
  return COLORES_MX.filter((c) => !c.descontinuado && c.espesorMm === mm)
}

export function descontinuadosMx(): ColorMX[] {
  return COLORES_MX.filter((c) => c.descontinuado)
}

export function proveedoresMx(colores: ColorMX[]): string[] {
  return [...new Set(colores.map((c) => c.proveedor))].sort()
}
