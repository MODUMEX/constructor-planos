/**
 * Buscador de modulación: arma una tira con piezas que EXISTEN en el catálogo.
 *
 * Es el port del caso general de `sugerirModulacion()` del Constructor actual,
 * que es el que lleva años fabricando bien. Se probó contra los despieces reales
 * de abril 2026 (ver `scripts/probar-modulacion.mjs`).
 *
 * La tira es `PILASTRA · PUERTA · PILASTRA · PUERTA … PILASTRA`: N puertas
 * llevan N+1 pilastras. Las de los extremos salen del grupo chico (≤24) y las
 * internas del grande (≥24).
 *
 * No cubre todavía PMR, cabina accesible ni mingitorios: esos casos tienen su
 * propia rama en el Constructor actual y se portan aparte.
 */

import {
  ANCHOS_PILASTRA,
  ANCHOS_PUERTA,
  CANALETA_MAX_CM,
  claroAjustado as calcularClaroAjustado,
} from './catalog'

/** las internas son las gruesas; las de extremo, las delgadas */
export const PILASTRAS_INTERNAS = ANCHOS_PILASTRA.filter((a) => a >= 24)
export const PILASTRAS_EXTREMO = ANCHOS_PILASTRA.filter((a) => a <= 24)

/** la puerta que se prefiere cuando varias combinaciones empatan */
const PUERTA_PREFERIDA = 60
const PENALIZA_PUERTA = 0.05
/** pasarse del claro entre dos muros es mucho peor que quedarse corto */
const PENALIZA_PASARSE = 100

export type TipoAjuste = 'exacto' | 'canaleta' | 'sobra' | 'falta'

export interface Modulacion {
  anchoPuerta: number
  anchoPilInterna: number
  anchoPilExtremo1: number
  anchoPilExtremo2: number
  /** anchos de las N+1 pilastras, en orden */
  pilastras: number[]
  /** lo que suman las piezas */
  total: number
  /** lo que deberían sumar: claro − 1·muros + 1,5·puertas */
  claroAjustado: number
  diferencia: number
  ajuste: TipoAjuste
  mensaje: string
  /** pieza de relleno contra la pared, cuando el hueco es de 5 cm o menos */
  canaleta: { anchoCm: number; codigo: string } | null
}

export interface OpcionesModulacion {
  claroCm: number
  /** cuántas puertas lleva la tira */
  puertas: number
  /** pilastras que topan contra un muro: 0, 1 o 2 */
  murosPilastra: number
  /** L y E dejan el extremo abierto y toleran hasta 5 cm sin canaleta */
  extremoAbierto?: boolean
  /** si el cliente pide una medida concreta de puerta */
  puertaFija?: number
  /**
   * Fija el ancho de las pilastras internas y deja que el buscador reacomode
   * el resto. Es lo que pasa al arrastrar una pilastra: se elige su medida y
   * las demás piezas se adaptan para que la tira siga cuadrando.
   */
  pilInternaFija?: number
  /** lo mismo para las pilastras de los extremos */
  pilExtremoFija?: number
}

/** la medida de catálogo más cercana a `cm`, dentro de las opciones dadas */
export function medidaCercana(opciones: number[], cm: number): number {
  return opciones.reduce((a, b) => (Math.abs(b - cm) < Math.abs(a - cm) ? b : a), opciones[0])
}

export function modularTira(o: OpcionesModulacion): Modulacion | null {
  const n = o.puertas
  if (n < 1) return null
  const internas = n - 1
  const objetivo = calcularClaroAjustado(o.claroCm, o.murosPilastra, n)
  const dosMuros = o.murosPilastra >= 2

  const puertas = o.puertaFija ? [o.puertaFija] : ANCHOS_PUERTA
  const opInternas = internas > 0 ? (o.pilInternaFija ? [o.pilInternaFija] : PILASTRAS_INTERNAS) : [0]
  const opExtremos = o.pilExtremoFija ? [o.pilExtremoFija] : PILASTRAS_EXTREMO

  let mejor: { ap: number; api: number; ae1: number; ae2: number; total: number; score: number } | null = null
  for (const ap of puertas) {
    for (const api of opInternas) {
      for (const ae1 of opExtremos) {
        for (const ae2 of opExtremos) {
          const total = n * ap + internas * api + ae1 + ae2
          const dif = objetivo - total
          const score =
            Math.abs(dif) +
            Math.abs(ap - PUERTA_PREFERIDA) * PENALIZA_PUERTA +
            (dosMuros && total > objetivo ? (total - objetivo) * PENALIZA_PASARSE : 0)
          if (!mejor || score < mejor.score) mejor = { ap, api, ae1, ae2, total, score }
        }
      }
    }
  }
  if (!mejor) return null

  const diferencia = objetivo - mejor.total
  const abs = Math.abs(diferencia)
  // el herraje de cada pilastra a muro absorbe medio centímetro; un extremo
  // abierto (L o E) se come hasta 5 cm sin necesidad de canaleta
  const tolerancia = o.extremoAbierto ? 5 : 0.5 * o.murosPilastra

  let ajuste: TipoAjuste
  let mensaje: string
  if (abs <= tolerancia) {
    ajuste = 'exacto'
    mensaje = abs > 0.5 ? `Calza; ${abs.toFixed(1)} cm los absorbe la instalación` : 'Calza exacto'
  } else if (diferencia > 0 && abs <= CANALETA_MAX_CM) {
    ajuste = 'canaleta'
    mensaje = `Calza con canaleta de ${abs.toFixed(1)} cm (rellena el hueco)`
  } else if (diferencia > 0) {
    ajuste = 'sobra'
    mensaje = `Falta material: hueco de ${abs.toFixed(1)} cm, más de lo que rellena una canaleta`
  } else {
    ajuste = 'falta'
    mensaje = `Las piezas se pasan ${abs.toFixed(1)} cm: la canaleta rellena, no recorta. Reduce una pieza`
  }

  const canaleta =
    ajuste === 'canaleta'
      ? (() => {
          const ancho = Math.max(1, Math.min(CANALETA_MAX_CM, Math.ceil(abs)))
          return { anchoCm: ancho, codigo: `CN0${ancho}` }
        })()
      : null

  const pilastras = [mejor.ae1, ...Array(internas).fill(mejor.api), mejor.ae2]

  return {
    anchoPuerta: mejor.ap,
    anchoPilInterna: mejor.api,
    anchoPilExtremo1: mejor.ae1,
    anchoPilExtremo2: mejor.ae2,
    pilastras,
    total: mejor.total,
    claroAjustado: objetivo,
    diferencia,
    ajuste,
    mensaje,
    canaleta,
  }
}
