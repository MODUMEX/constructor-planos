import type { Cabina, Tramo } from './types'
import { GRUESO_PILASTRA } from './catalog'
import { anchoTotal } from './modulacion'

/** espesor con el que se dibuja la pared, en cm */
export const ESPESOR_MURO = 12

/** cuánto sobresale el muro de fondo del último panel o pilastra, en cm */
export const SOBRA_MURO_CM = 1

/** fondo de una mampara de orinal: no llega hasta el frente de una cabina */
export const PROF_ORINAL_CM = 60

/** un tramo de puros orinales se dibuja con el fondo de la mampara, no con el de la cabina */
export function profundidadDeTramo(tramo: Tramo, profundidadCm: number): number {
  const soloOrinales = tramo.cabinas.length > 0 && tramo.cabinas.every((c) => c.tipo === 'orinal')
  return soloOrinales ? PROF_ORINAL_CM : profundidadCm
}

/**
 * Cada tramo se dibuja en su propio marco: un origen más dos direcciones,
 * `a` a lo largo del muro y `p` hacia el frente de las cabinas. La pantalla
 * y el PDF usan el mismo marco, así que dibujan exactamente el mismo plano.
 *
 * Hoy todas las tipologías son tiras rectas, así que todos los marcos son el
 * mismo. El marco existe igual porque es lo que permitiría volver a dibujar
 * tramos en ángulo sin tocar los dos dibujantes.
 */
export interface Marco {
  ox: number
  oy: number
  ax: number
  ay: number
  px: number
  py: number
}

export function marcosDe(tramos: Tramo[]): Marco[] {
  return tramos.map(() => ({ ox: 0, oy: 0, ax: 1, ay: 0, px: 0, py: 1 }))
}

export function pt(m: Marco, u: number, v: number): { x: number; y: number } {
  return { x: m.ox + m.ax * u + m.px * v, y: m.oy + m.ay * u + m.py * v }
}

/** posición de arranque de cada cabina a lo largo del muro */
export function acumulado(cabinas: Cabina[]): number[] {
  const acum: number[] = []
  let u = 0
  for (const c of cabinas) {
    acum.push(u)
    u += c.anchoCm
  }
  return acum
}

export interface Caja {
  x: number
  y: number
  w: number
  h: number
}

export function cajaDelPlano(tramos: Tramo[], marcos: Marco[], prof: number, pad = 62): Caja {
  let minX = 0
  let minY = 0
  let maxX = 0
  let maxY = 0
  tramos.forEach((t, i) => {
    const m = marcos[i]
    if (!m) return
    const largo = Math.max(anchoTotal(t.cabinas), t.claroCm)
    const profT = profundidadDeTramo(t, prof)
    for (const [u, v] of [
      [0, -ESPESOR_MURO],
      [largo, -ESPESOR_MURO],
      [0, profT],
      [largo, profT],
    ]) {
      const p = pt(m, u, v)
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y)
      maxY = Math.max(maxY, p.y)
    }
  })
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 }
}

export const GRUESO = GRUESO_PILASTRA
