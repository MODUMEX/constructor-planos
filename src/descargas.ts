/**
 * Centros de carga: modular con las DESCARGAS que ya están en el piso.
 *
 * Un baño no siempre se dibuja sobre un claro limpio. Cuando la obra ya tiene
 * la plomería hecha —o el arquitecto la dejó dibujada—, lo que manda no es el
 * reparto parejo del claro sino dónde está cada descarga: el inodoro se instala
 * ahí y la mampara tiene que acomodarse alrededor.
 *
 * La regla es la del taller: el PANEL divisor queda lo más centrado posible
 * ENTRE descarga y descarga, no la cabina centrada en la descarga. Dicho de
 * otra forma, la frontera entre dos cabinas se va al punto medio de sus dos
 * centros, y lo que se elige son las puertas y las pilastras que dejan la
 * frontera ahí.
 *
 * Los centros se escriben como vienen en el plano del arquitecto: centímetros
 * desde el arranque del área —la cara interna del muro de la izquierda— hasta
 * el eje de la descarga, uno por cabina.
 */

import type { Cabina, Config, Pais, Tramo } from './types'
import { anchosPuerta, CANALETA_MAX_CM } from './catalog'
import { anchoTotal, esEspacioLibre, ladoDelCuarto, ladosDeCabina, lugaresDe } from './modulacion'
import { PILASTRAS_EXTREMO, PILASTRAS_INTERNAS, type TipoAjuste } from './modulador'

/**
 * Cuánto tiene que quedarle libre al inodoro a cada lado de su eje, en cm.
 *
 * Salen de los anchos mínimos de cabina con los que trabaja producción —62 cm
 * contra un muro y 54 entre paneles—: la mitad de cada uno es lo que le toca a
 * cada lado del eje cuando el inodoro está centrado. Si la descarga deja menos
 * que eso de un lado, el inodoro queda montado sobre la pieza.
 */
export const LIBRE_JUNTO_A_MURO_CM = 31
export const LIBRE_JUNTO_A_PANEL_CM = 27

/** la puerta y la pilastra que prefiere producción cuando la cuenta da igual */
const PUERTA_PREFERIDA = 60
const INTERNA_PREFERIDA = 24
/** cuánto pesa alejarse de esas medidas, en cm de error equivalente */
const PESO_PUERTA = 0.02
const PESO_INTERNA = 0.01

/**
 * Las internas que el buscador puede usar.
 *
 * Igual que en la modulación normal se prueba primero con las que pide
 * producción —de 24 para arriba— y solo si con esas el inodoro queda corrido se
 * vuelve a buscar con las delgadas, avisando.
 */
const INTERNAS = PILASTRAS_INTERNAS.filter((a) => a <= 50)
const INTERNAS_ANCHAS = INTERNAS.filter((a) => a >= INTERNA_PREFERIDA)
/** de cuántos centímetros para arriba vale la pena bajar a una pilastra delgada */
const DESVIO_QUE_MOLESTA_CM = 2.5
const AVISO_ANGOSTA = ' · Para calzar las descargas hicieron falta pilastras de menos de 24 cm'

/** los centros de un tramo, siempre con una entrada por cabina */
export function centrosDe(tramo: Tramo): (number | null)[] {
  const guardados = tramo.centrosCm ?? []
  return tramo.cabinas.map((_, i) => {
    const v = guardados[i]
    return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null
  })
}

/** si el área trae aunque sea un centro de carga escrito */
export function hayCentros(tramo: Tramo): boolean {
  return centrosDe(tramo).some((c) => c != null)
}

/**
 * De centímetros del PLANO a centímetros del dibujo.
 *
 * Una tira que calza exacto suma un poco más que el claro crudo, porque cada
 * puerta traslapa sobre sus pilastras y el herraje contra el muro se come lo
 * suyo. Los centros vienen medidos en el piso, sobre el claro de verdad, así
 * que hay que llevarlos a la escala con la que se dibujan las piezas o el
 * último inodoro sale corrido un par de centímetros.
 */
export function escalaDeTramo(tramo: Tramo): number {
  const largo = anchoTotal(tramo.cabinas)
  if (!tramo.claroCm || tramo.claroCm <= 0 || largo <= 0) return 1
  return largo / tramo.claroCm
}

/** dónde arranca cada cabina y dónde termina la tira, en cm de dibujo */
export function fronterasDe(tramo: Tramo): number[] {
  const f: number[] = []
  let u = 0
  for (const c of tramo.cabinas) {
    f.push(u)
    u += c.anchoCm
  }
  f.push(u)
  return f
}

export interface Descarga {
  /** qué cabina */
  indice: number
  /** lo que se escribió: cm del plano desde el arranque del área */
  realCm: number
  /** dónde cae en el dibujo */
  uCm: number
  /** cuánto le queda libre al eje hasta la frontera de la izquierda */
  izqCm: number
  /** y hasta la de la derecha */
  derCm: number
  /** cuánto se corrió del centro de su cabina; positivo es hacia la derecha */
  desvioCm: number
  /** por qué no sirve, si es que no sirve */
  aviso: string | null
}

/**
 * Dónde cae cada descarga sobre el dibujo y cuánto le queda libre a los lados.
 *
 * El eje se mide contra las FRONTERAS de la cabina, que es donde va el centro
 * de la pilastra y donde cuelga el panel: eso es lo que el inodoro tiene al
 * lado, no la cara de la puerta.
 */
export function descargasDe(tramo: Tramo, config: Config): Descarga[] {
  const esc = escalaDeTramo(tramo)
  const fr = fronterasDe(tramo)
  const centros = centrosDe(tramo)
  const cuarto = ladoDelCuarto(tramo, config)
  const salida: Descarga[] = []

  centros.forEach((real, i) => {
    if (real == null) return
    const cab = tramo.cabinas[i]
    if (!cab || cab.tipo === 'orinal' || esEspacioLibre(cab)) return
    const u = real * esc
    const izq = u - fr[i]
    const der = fr[i + 1] - u
    const centro = (fr[i] + fr[i + 1]) / 2

    // contra un muro hay que dejar más que contra un panel: del lado del muro
    // el inodoro no puede acercarse tanto
    const muroIzq = i === 0 && tramo.muroInicio && cuarto !== 'inicio'
    const muroDer = i === tramo.cabinas.length - 1 && tramo.muroFin && cuarto !== 'fin'
    const minIzq = muroIzq ? LIBRE_JUNTO_A_MURO_CM : LIBRE_JUNTO_A_PANEL_CM
    const minDer = muroDer ? LIBRE_JUNTO_A_MURO_CM : LIBRE_JUNTO_A_PANEL_CM

    let aviso: string | null = null
    if (izq < 0 || der < 0) {
      aviso = `La descarga de la cabina ${i + 1} cae fuera de su cabina.`
    } else if (izq < minIzq - 0.5) {
      aviso = `El inodoro de la cabina ${i + 1} queda a ${izq.toFixed(1)} cm de la pieza de la izquierda; hacen falta ${minIzq}.`
    } else if (der < minDer - 0.5) {
      aviso = `El inodoro de la cabina ${i + 1} queda a ${der.toFixed(1)} cm de la pieza de la derecha; hacen falta ${minDer}.`
    }

    salida.push({
      indice: i,
      realCm: real,
      uCm: u,
      izqCm: Math.round(izq * 10) / 10,
      derCm: Math.round(der * 10) / 10,
      desvioCm: Math.round((u - centro) * 10) / 10,
      aviso,
    })
  })

  return salida
}

/** lo que hay que avisarle al vendedor de los centros de este tramo */
export function avisosDeDescargas(tramo: Tramo, config: Config): string[] {
  return descargasDe(tramo, config)
    .map((d) => d.aviso)
    .filter((a): a is string => a != null)
}

/**
 * Qué cabinas entran en la modulación por centros, o por qué no se puede.
 *
 * Es la CORRIDA de cabinas normales: la cabina accesible de un cuarto PMR o de
 * una "variación panel" no negocia su ancho —se planta y el resto se acomoda—,
 * así que queda afuera aunque tenga su descarga dibujada.
 */
export function corridaDeCentros(
  tramo: Tramo,
  config: Config,
): { desde: number; hasta: number } | { problema: string } {
  if (tramo.cabinas.some((c) => c.tipo === 'orinal')) {
    return { problema: 'Un área con orinales todavía no se modula por centros de carga: las mamparas del campo llevan su propio reparto.' }
  }
  if (tramo.cabinas.some(esEspacioLibre)) {
    return { problema: 'Un área con espacio libre todavía no se modula por centros de carga: el hueco se lleva lo que sobra del claro.' }
  }
  const cuarto = ladoDelCuarto(tramo, config)
  const desde = cuarto === 'inicio' ? 1 : 0
  const hasta = cuarto === 'fin' ? tramo.cabinas.length - 1 : tramo.cabinas.length
  if (hasta - desde < 2) {
    return { problema: 'Hacen falta al menos dos cabinas con descarga para modular por centros.' }
  }
  const centros = centrosDe(tramo)
  for (let i = desde; i < hasta; i++) {
    if (centros[i] == null) {
      return { problema: `Falta el centro de carga de la cabina ${i + 1}.` }
    }
  }
  return { desde, hasta }
}

export interface Centrado {
  /** las N+1 pilastras de la tira entera, en orden */
  pilastras: number[]
  /** el ancho de puerta de cada cabina de la corrida */
  puertas: number[]
  /** cuánto quedó cada frontera del punto medio de sus dos descargas, en cm */
  desvios: number[]
  /** lo que sobró contra el cierre de la corrida */
  diferencia: number
  ajuste: TipoAjuste
  mensaje: string
}

/**
 * Elige puertas y pilastras para que cada frontera caiga en el punto medio de
 * sus dos descargas.
 *
 * Se camina de izquierda a derecha persiguiendo un objetivo ABSOLUTO —la
 * posición de la frontera, no el ancho de la cabina—, así que el error de una
 * pieza no se arrastra: la siguiente lo corrige sola. La última cabina no
 * persigue nada, cierra contra el final de la corrida.
 */
export function modularPorCentros(tramo: Tramo, config: Config, pais: Pais = 'CR'): Centrado | null {
  const anchas = mejorDe(tramo, config, pais, INTERNAS_ANCHAS)
  if (anchas && sirve(anchas)) return anchas
  const libre = mejorDe(tramo, config, pais, INTERNAS)
  if (!libre) return anchas
  if (!sirve(libre)) return libre
  return { ...libre, mensaje: libre.mensaje + AVISO_ANGOSTA }
}

/**
 * La pilastra con la que ARRANCA la corrida corre todo lo demás, así que se
 * prueban todas sus medidas y se queda la que deja los inodoros más centrados.
 *
 * Si el vendedor ya la eligió a mano no se toca: esa decisión manda sobre la
 * comodidad del reparto.
 */
function mejorDe(tramo: Tramo, config: Config, pais: Pais, internas: number[]): Centrado | null {
  const corrida = corridaDeCentros(tramo, config)
  if ('problema' in corrida) return null
  const k = corrida.desde
  const actual = tramo.pilastras?.[k] ?? config.anchoPilastraCm
  const candidatos = (tramo.pilastrasFijas ?? []).includes(k)
    ? [actual]
    : Array.from(new Set([actual, ...PILASTRAS_EXTREMO]))

  let mejor: Centrado | null = null
  let costo = Infinity
  for (const p of candidatos) {
    const r = buscar(tramo, config, pais, internas, p)
    if (!r) continue
    const c = r.desvios.reduce((s, d) => s + Math.abs(d), 0) + Math.abs(r.diferencia) + 0.05 * Math.abs(p - actual)
    if (c < costo) {
      costo = c
      mejor = r
    }
  }
  return mejor
}

/** si con esas piezas el inodoro queda donde tiene que quedar y la tira cierra */
function sirve(c: Centrado): boolean {
  if (c.ajuste === 'falta' || c.ajuste === 'sobra') return false
  return c.desvios.every((d) => Math.abs(d) <= DESVIO_QUE_MOLESTA_CM)
}

function buscar(tramo: Tramo, config: Config, pais: Pais, internas: number[], pilInicio: number): Centrado | null {
  const corrida = corridaDeCentros(tramo, config)
  if ('problema' in corrida) return null
  const { desde, hasta } = corrida

  const esc = escalaDeTramo(tramo)
  const fr = fronterasDe(tramo)
  const centros = centrosDe(tramo)
  const puertasPosibles = anchosPuertaDe(tramo, config, pais)
  const pilActual = (k: number) => tramo.pilastras?.[k] ?? config.anchoPilastraCm

  const pilastras = Array.from({ length: tramo.cabinas.length + 1 }, (_, k) => pilActual(k))
  pilastras[desde] = pilInicio
  const puertas: number[] = []
  const desvios: number[] = []

  const ini = fr[desde]
  const fin = fr[hasta]

  let x = ini + pilastras[desde]
  for (let i = desde; i < hasta - 1; i++) {
    const objetivo = ((centros[i] as number) + (centros[i + 1] as number)) / 2 * esc
    let mejorD = puertasPosibles[0]
    let mejorP = INTERNA_PREFERIDA
    let mejorCosto = Infinity
    for (const d of puertasPosibles) {
      for (const p of internas) {
        const error = Math.abs(x + d + p / 2 - objetivo)
        const costo = error + PESO_PUERTA * Math.abs(d - PUERTA_PREFERIDA) + PESO_INTERNA * Math.abs(p - INTERNA_PREFERIDA)
        if (costo < mejorCosto) {
          mejorCosto = costo
          mejorD = d
          mejorP = p
        }
      }
    }
    puertas.push(mejorD)
    pilastras[i + 1] = mejorP
    desvios.push(Math.round((x + mejorD + mejorP / 2 - objetivo) / esc * 10) / 10)
    x += mejorD + mejorP
  }

  // La última cabina no persigue ninguna descarga: cierra contra el final de la
  // corrida. Ahí se eligen puerta Y pilastra de cierre juntas, que es lo que
  // deja la tira calzada al centímetro en vez de dejar un hueco.
  const cierres = pilastraDeCierre(tramo, config, hasta)
  let mejorD = puertasPosibles[0]
  let mejorP = pilastras[hasta]
  let mejorCosto = Infinity
  for (const d of puertasPosibles) {
    for (const p of cierres) {
      const error = Math.abs(fin - (x + d + p))
      const costo = error + PESO_PUERTA * Math.abs(d - PUERTA_PREFERIDA)
      if (costo < mejorCosto) {
        mejorCosto = costo
        mejorD = d
        mejorP = p
      }
    }
  }
  puertas.push(mejorD)
  pilastras[hasta] = mejorP
  const diferencia = Math.round((fin - (x + mejorD + mejorP)) * 10) / 10

  const { ajuste, mensaje } = cierre(diferencia, tramo)
  return { pilastras, puertas, desvios, diferencia, ajuste, mensaje }
}

/**
 * Las medidas que puede tomar la pilastra con la que cierra la corrida.
 *
 * Contra un muro sale del grupo delgado, como en cualquier tira; contra el
 * panel de la cabina accesible se queda con la que ya tenía, porque esa pieza
 * la eligió el vendedor.
 */
function pilastraDeCierre(tramo: Tramo, config: Config, k: number): number[] {
  const actual = tramo.pilastras?.[k] ?? config.anchoPilastraCm
  if (k !== tramo.cabinas.length) return [actual]
  return PILASTRAS_EXTREMO
}

/** cómo cerró la corrida contra el claro */
function cierre(diferencia: number, tramo: Tramo): { ajuste: TipoAjuste; mensaje: string } {
  const abierto = !tramo.muroInicio || !tramo.muroFin
  if (Math.abs(diferencia) <= 0.5) return { ajuste: 'exacto', mensaje: 'Las piezas cierran el claro' }
  if (diferencia < 0) {
    return abierto && -diferencia <= 5
      ? { ajuste: 'exacto', mensaje: `Las piezas se pasan ${(-diferencia).toFixed(1)} cm del claro y el extremo abierto los absorbe` }
      : { ajuste: 'falta', mensaje: `Las piezas se pasan ${(-diferencia).toFixed(1)} cm del claro` }
  }
  if (diferencia <= CANALETA_MAX_CM) {
    return { ajuste: 'canaleta', mensaje: `Faltan ${diferencia.toFixed(1)} cm, que cierra la canaleta` }
  }
  return { ajuste: 'sobra', mensaje: `Quedan ${diferencia.toFixed(1)} cm sin pieza que los tape` }
}

/**
 * Las puertas que puede usar el buscador.
 *
 * Si el cliente pidió una medida concreta de puerta, la modulación por centros
 * NO la respeta: acá lo que manda es la descarga, y con una sola medida de
 * puerta casi nunca se llega al punto medio. La medida pedida se usa como
 * preferencia, no como candado.
 */
function anchosPuertaDe(tramo: Tramo, config: Config, pais: Pais): number[] {
  const propias = tramo.cabinas
    .filter((c) => c.tipo === 'normal' && c.puerta.tipo === 'puerta')
    .map((c) => c.puerta.anchoCm)
  const catalogo = anchosPuerta(pais, config.modelo)
  return Array.from(new Set([...catalogo, ...propias])).sort((a, b) => a - b)
}

/**
 * La tira ya armada con las piezas que dejan cada inodoro centrado.
 *
 * Devuelve lo mismo que `modularConCatalogo` para que quien llama no tenga que
 * saber de dónde salieron las medidas.
 */
export function tramoDesdeCentros(
  tramo: Tramo,
  config: Config,
  pais: Pais = 'CR',
): {
  cabinas: Cabina[]
  pilastras: number[]
  ajuste: Tramo['ajuste']
  mensaje: string
  desvios: number[]
  /** lo que sobró contra el cierre, en cm */
  diferencia: number
  /** las fronteras cuya medida decidió esta modulación, para que no se reparta sola */
  fijas: number[]
} | null {
  const r = modularPorCentros(tramo, config, pais)
  if (!r) return null
  const corrida = corridaDeCentros(tramo, config)
  if ('problema' in corrida) return null
  const { desde, hasta } = corrida

  const conPuertas = tramo.cabinas.map((c, i) => {
    if (i < desde || i >= hasta) return c
    const ancho = r.puertas[i - desde]
    return { ...c, puerta: { ...c.puerta, anchoCm: ancho } }
  })

  const lugares = lugaresDe(conPuertas)
  const arranca = ladoDelCuarto(tramo, config) === 'inicio'
  const cabinas = conPuertas.map((c, i) => {
    if (i < desde || i >= hasta) return c
    const { izq, der } = ladosDeCabina(lugares, (k) => r.pilastras[k] ?? 0, i, arranca)
    const ancho = Math.round((izq + c.puerta.anchoCm + der) * 10) / 10
    return { ...c, anchoCm: ancho }
  })

  const fijas: number[] = []
  for (let k = desde + 1; k <= hasta; k++) fijas.push(k)

  return {
    cabinas,
    pilastras: r.pilastras,
    ajuste: r.ajuste,
    mensaje: r.mensaje,
    desvios: r.desvios,
    diferencia: r.diferencia,
    fijas,
  }
}
