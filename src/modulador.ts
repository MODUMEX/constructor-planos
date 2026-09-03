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
 * Cubre cabinas normales, cabina accesible (que es una cabina con puerta ancha,
 * no otra geometría) y orinales. Falta el PMR de cuarto, que en el Constructor
 * actual tiene su propia rama porque el cuarto va perpendicular a la tira.
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
  /** ancho de la puerta de la cabina accesible, si la hay */
  anchoPuertaAccesible: number | null
  /** ancho de cada orinal: 60 cm mas lo que le toque del sobrante */
  anchoOrinal: number | null
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
  /** orinales de 60 cm; entre dos va una mampara MG, no una pilastra */
  mingitorios?: number
  /** una cabina accesible: es una cabina con puerta ancha, no otra geometría */
  accesible?: boolean
}

/** ancho de un orinal y grueso de la mampara que los separa, en cm */
const ANCHO_ORINAL = 60
const GRUESO_MG = 1.27
/** la puerta de una cabina accesible nunca baja de esta medida */
const PUERTA_ACCESIBLE_MIN = 85

/** la medida de catálogo más cercana a `cm`, dentro de las opciones dadas */
export function medidaCercana(opciones: number[], cm: number): number {
  return opciones.reduce((a, b) => (Math.abs(b - cm) < Math.abs(a - cm) ? b : a), opciones[0])
}

export function modularTira(o: OpcionesModulacion): Modulacion | null {
  const nEst = o.puertas
  const nAcc = o.accesible ? 1 : 0
  const nMing = o.mingitorios ?? 0
  const cabinas = nEst + nAcc + nMing
  if (cabinas < 1) return null

  const internas = Math.max(0, cabinas - 1)
  // los orinales no llevan puerta, así que no suman holgura de bisagra
  const objetivo = calcularClaroAjustado(o.claroCm, o.murosPilastra, nEst + nAcc)
  const dosMuros = o.murosPilastra >= 2
  const grosorMG = Math.max(0, nMing - 1) * GRUESO_MG
  const fijoMG = nMing * ANCHO_ORINAL + grosorMG

  const puertas = o.puertaFija ? [o.puertaFija] : ANCHOS_PUERTA
  const puertasAcc = nAcc > 0 ? ANCHOS_PUERTA.filter((a) => a >= PUERTA_ACCESIBLE_MIN) : [0]
  const opInternas = internas > 0 ? (o.pilInternaFija ? [o.pilInternaFija] : PILASTRAS_INTERNAS) : [0]
  const opExtremos = o.pilExtremoFija ? [o.pilExtremoFija] : PILASTRAS_EXTREMO

  let mejor:
    | { ap: number; acc: number; api: number; ae1: number; ae2: number; total: number; score: number }
    | null = null
  for (const acc of puertasAcc.length ? puertasAcc : [0]) {
    for (const ap of nEst > 0 ? puertas : [0]) {
      for (const api of opInternas) {
        for (const ae1 of opExtremos) {
          for (const ae2 of opExtremos) {
            const total = nEst * ap + nAcc * acc + fijoMG + internas * api + ae1 + ae2
            const dif = objetivo - total
            const score =
              Math.abs(dif) +
              (nEst > 0 ? Math.abs(ap - PUERTA_PREFERIDA) * PENALIZA_PUERTA : 0) +
              (dosMuros && total > objetivo ? (total - objetivo) * PENALIZA_PASARSE : 0)
            if (!mejor || score < mejor.score) mejor = { ap, acc, api, ae1, ae2, total, score }
          }
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

  // Con orinales, el sobrante NO va a canaleta: se reparte ensanchandolos, que es
  // lo que hace el Constructor actual. La canaleta queda para cuando no los hay.
  let anchoOrinal = ANCHO_ORINAL
  let ajusteFinal = ajuste
  let mensajeFinal = mensaje
  let canaletaFinal = canaleta
  if (nMing > 0 && diferencia > 0.5) {
    anchoOrinal = ANCHO_ORINAL + diferencia / nMing
    ajusteFinal = "exacto"
    mensajeFinal = `Calza; los ${abs.toFixed(1)} cm de sobra se reparten entre los ${nMing} orinales`
    canaletaFinal = null
  }

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
    ajuste: ajusteFinal,
    mensaje: mensajeFinal,
    canaleta: canaletaFinal,
    anchoPuertaAccesible: mejor.acc || null,
    anchoOrinal: nMing > 0 ? anchoOrinal : null,
  }
}
