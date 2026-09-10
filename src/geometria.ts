import type { Cabina, Config, Tramo } from './types'
import { GRUESO_PILASTRA } from './catalog'
import { anchoTotal } from './modulacion'

/** espesor con el que se dibuja la pared, en cm */
export const ESPESOR_MURO = 12

/**
 * Cuánto sobresale la pared de las piezas, en cm. Vale para los tres lados: el
 * muro de fondo se pasa de la primera y la última pieza, y los muros laterales
 * se corren esa misma medida hacia el frente, para que la pared no termine al
 * ras de la cabina.
 */
export const SOBRA_MURO_CM = 8

/** fondo de una mampara de orinal: no llega hasta el frente de una cabina */
export const PROF_ORINAL_CM = 60

/** un tramo de puros orinales se dibuja con el fondo de la mampara, no con el de la cabina */
export function profundidadDeTramo(tramo: Tramo, profundidadCm: number): number {
  const soloOrinales = tramo.cabinas.length > 0 && tramo.cabinas.every((c) => c.tipo === 'orinal')
  return soloOrinales ? PROF_ORINAL_CM : profundidadCm
}

/**
 * El fondo con el que se dibuja el divisor que va a la DERECHA de la cabina i.
 *
 * Entre dos orinales no va un panel de cabina sino una mampara, que es mucho
 * menos honda: la ficha la da como "fondo × alto" (45 × 120, 60 × 120…).
 * Dibujarla con los 150 del panel la hacía parecer una cabina cerrada.
 */
export function profundidadDeDivisor(
  tramo: Tramo,
  i: number,
  profundidadCm: number,
  mgAnchoCm?: number,
): number {
  const izq = tramo.cabinas[i]
  const der = tramo.cabinas[i + 1]
  if (izq?.tipo === 'orinal' && der?.tipo === 'orinal') return mgAnchoCm && mgAnchoCm > 0 ? mgAnchoCm : 60
  return profundidadCm
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

/**
 * La caja que hay que encuadrar. `profExtraCm` es para el cuarto PMR, que llega
 * más hondo que las cabinas: sin eso el cuarto se dibuja fuera del recorte.
 */
export function cajaDelPlano(tramos: Tramo[], marcos: Marco[], prof: number, pad = 62, profExtraCm = 0): Caja {
  let minX = 0
  let minY = 0
  let maxX = 0
  let maxY = 0
  tramos.forEach((t, i) => {
    const m = marcos[i]
    if (!m) return
    const largo = Math.max(anchoTotal(t.cabinas), t.claroCm)
    const profT = Math.max(profundidadDeTramo(t, prof), profExtraCm)
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

// ---------------------------------------------------------------------------
// Cuarto PMR
// ---------------------------------------------------------------------------

/**
 * Una pieza del divisor del cuarto, medida SOBRE LA PROFUNDIDAD del lugar.
 *
 * El cuarto accesible no es una cabina más ancha: es un cuarto que llega hasta
 * el fondo del lugar, y lo que lo separa de las cabinas es una tira modulada a
 * lo largo de esa profundidad. Por eso el PMR se modula en las dos direcciones:
 * a lo ancho sobre el claro, como cualquier cabina, y a lo hondo acá.
 *
 * La puerta del cuarto va en esa tira, no en el frente: se entra por el
 * costado. Es lo que hace que el inodoro quede girado.
 */
export interface PiezaDivisorPmr {
  tipo: 'panel' | 'puerta' | 'frente'
  desdeCm: number
  hastaCm: number
}

export interface CuartoPmr {
  /** la cabina que es el cuarto; la modulación la pone siempre primera */
  indice: number
  /** lo que ocupa sobre el claro. Sale de la modulación, no del dato pedido */
  desdeCm: number
  hastaCm: number
  anchoCm: number
  /** hasta acá llega el cuarto: la profundidad del LUGAR */
  profCm: number
  /** hasta acá llegan las cabinas normales, que es menos */
  profCabinasCm: number
  /** con muro (P+) o con panel (PP) del lado de afuera */
  cierre: 'muros' | 'panel'
  divisor: PiezaDivisorPmr[]
}

/** la profundidad del lugar, que nunca puede ser menor que la de la cabina */
export function profundidadDelLugar(config: Config): number {
  return Math.max(config.profundidadLugarCm ?? config.profundidadCm, config.profundidadCm)
}

/**
 * El cuarto PMR de este tramo, o null si el área no lo lleva.
 *
 * El ancho se toma de la cabina que la modulación armó, no del ancho pedido:
 * si el claro no dio para los 162 cm, el plano tiene que mostrar lo que de
 * verdad se va a fabricar.
 */
export function cuartoPmr(tramo: Tramo, config: Config): CuartoPmr | null {
  if (config.tipologia !== 'PMR') return null
  const i = tramo.cabinas.findIndex((c) => c.tipo === 'accesible')
  if (i < 0) return null

  const cab = tramo.cabinas[i]
  const desde = acumulado(tramo.cabinas)[i]
  const prof = profundidadDelLugar(config)

  const panel = Math.max(0, config.anchoPanelDivisorPmrCm ?? 100)
  const puerta = Math.max(0, config.puertaAccesibleCm ?? cab.puerta.anchoCm ?? 90)
  // el frente cierra lo que sobra; si el panel y la puerta ya se pasan del
  // fondo no se inventa una pieza negativa: queda en cero y el aviso lo da la
  // configuración, que es donde el vendedor puede corregirlo
  const frente = Math.max(0, Math.round((prof - panel - puerta) * 10) / 10)

  const divisor: PiezaDivisorPmr[] = []
  let v = 0
  for (const [tipo, largo] of [['panel', panel], ['puerta', puerta], ['frente', frente]] as const) {
    if (largo <= 0) continue
    divisor.push({ tipo, desdeCm: v, hastaCm: Math.min(v + largo, prof) })
    v += largo
  }

  return {
    indice: i,
    desdeCm: desde,
    hastaCm: desde + cab.anchoCm,
    anchoCm: cab.anchoCm,
    profCm: prof,
    profCabinasCm: config.profundidadCm,
    cierre: config.cierrePmr ?? 'muros',
    divisor,
  }
}
