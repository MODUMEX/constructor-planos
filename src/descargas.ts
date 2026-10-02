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
import { anchosPuerta, CANALETA_MAX_CM, claroAjustado } from './catalog'
import { anchoTotal, esEspacioLibre, ladoDelCuarto, ladosDeCabina, lugaresDe } from './modulacion'
import {
  PILASTRA_MINIMA_CM, PILASTRAS_INTERNAS, pilastrasDePunta, type TipoAjuste,
} from './modulador'

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
/**
 * Y el orinal el suyo, que es más chico: no es un cuarto donde hay que entrar
 * y darse vuelta, es un lugar con una mampara al costado.
 */
export const LIBRE_JUNTO_A_MAMPARA_CM = 20

/** la puerta y la pilastra que prefiere producción cuando la cuenta da igual */
const PUERTA_PREFERIDA = 60
const INTERNA_PREFERIDA = 24
/** cuánto pesa alejarse de esas medidas, en cm de error equivalente */
const PESO_PUERTA = 0.02
const PESO_INTERNA = 0.01

/**
 * Las internas que el buscador puede usar: las MISMAS que la modulación
 * normal, de 24 para arriba.
 *
 * Una pilastra de menos de 24 no carga panel, y acá cargan: son las que
 * separan dos cabinas. Antes esto tenía su propia lista con una segunda pasada
 * que bajaba a 19 o a 10 para calzar mejor la descarga, y por ahí se colaban
 * centrales angostas aunque el buscador normal ya no las usara.
 */
const INTERNAS = PILASTRAS_INTERNAS.filter(
  (a) => a >= PILASTRA_MINIMA_CM && a <= 50,
)

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
  const claro = tramo.claroCm
  if (!claro || claro <= 0) return 1
  // Con ORINALES el ancho de cada lugar es libre —no sale de ninguna pieza de
  // catálogo—, así que la tira SIEMPRE puede cerrar el claro y la escala es la
  // que le tocaría cerrando: si se tomara el largo de hoy, una tira que quedó
  // corta achicaría todas las descargas de paso.
  if (tramo.cabinas.some((c) => c.tipo === 'orinal')) {
    const puertas = tramo.cabinas.filter((c) => c.tipo !== 'orinal' && c.puerta.tipo === 'puerta').length
    const muros = (tramo.muroInicio ? 1 : 0) + (tramo.muroFin ? 1 : 0)
    return claroAjustado(claro, muros, puertas) / claro
  }
  const largo = anchoTotal(tramo.cabinas)
  return largo > 0 ? largo / claro : 1
}

/**
 * Hasta dónde llega la tira, en cm de dibujo.
 *
 * Sin orinales es lo que hoy suman las piezas: las medidas salen del catálogo y
 * no hay de dónde sacar los centímetros que falten. Con orinales es el CLARO,
 * porque el campo se estira lo que haga falta para llegar a la pared.
 */
export function largoDeTramo(tramo: Tramo): number {
  if (tramo.cabinas.some((c) => c.tipo === 'orinal') && tramo.claroCm > 0) {
    return tramo.claroCm * escalaDeTramo(tramo)
  }
  return anchoTotal(tramo.cabinas)
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
    if (!cab || esEspacioLibre(cab)) return
    const u = real * esc
    const izq = u - fr[i]
    const der = fr[i + 1] - u
    const centro = (fr[i] + fr[i + 1]) / 2

    // contra un muro hay que dejar más que contra un panel: del lado del muro
    // el inodoro no puede acercarse tanto
    const muroIzq = i === 0 && tramo.muroInicio && cuarto !== 'inicio'
    const muroDer = i === tramo.cabinas.length - 1 && tramo.muroFin && cuarto !== 'fin'
    const junto = cab.tipo === 'orinal' ? LIBRE_JUNTO_A_MAMPARA_CM : LIBRE_JUNTO_A_PANEL_CM
    const minIzq = muroIzq ? LIBRE_JUNTO_A_MURO_CM : junto
    const minDer = muroDer ? LIBRE_JUNTO_A_MURO_CM : junto

    // el orinal se nombra solo; el inodoro y la regadera, por su cabina
    const quien = cab.tipo === "orinal" ? `El orinal ${i + 1}`
      : cab.tipo === "regadera" ? `La regadera de la cabina ${i + 1}`
      : `El inodoro de la cabina ${i + 1}`
    const suLugar = cab.tipo === "orinal" ? `del orinal ${i + 1}` : `de la cabina ${i + 1}`
    let aviso: string | null = null
    if (izq < 0 || der < 0) {
      aviso = `La descarga ${suLugar} cae fuera de su lugar.`
    } else if (izq < minIzq - 0.5) {
      aviso = `${quien} queda a ${izq.toFixed(1)} cm de la pieza de la izquierda; hacen falta ${minIzq}.`
    } else if (der < minDer - 0.5) {
      aviso = `${quien} queda a ${der.toFixed(1)} cm de la pieza de la derecha; hacen falta ${minDer}.`
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
 * Qué entra en la modulación por centros, o por qué no se puede.
 *
 * Son dos corridas: la de CABINAS normales, donde hay puertas y pilastras que
 * elegir, y el CAMPO DE ORINALES, donde no hay ninguna de las dos —entre dos
 * orinales va una mampara de 1,27 y nada más—, así que ahí el ancho de cada
 * lugar sale directo de las descargas.
 *
 * La cabina accesible de un cuarto PMR o de una "variación panel" no negocia su
 * ancho —se planta y el resto se acomoda—, así que queda afuera de las dos
 * aunque tenga su descarga dibujada.
 */
export interface Corrida {
  /** la corrida de cabinas normales, o null si el área es de puros orinales */
  banos: { desde: number; hasta: number } | null
  /** el campo de orinales, o null si el área no lleva */
  orinales: { desde: number; hasta: number } | null
}

export function corridaDeCentros(tramo: Tramo, config: Config): Corrida | { problema: string } {
  if (tramo.cabinas.some(esEspacioLibre)) {
    return { problema: 'Un área con espacio libre todavía no se modula por centros de carga: el hueco se lleva lo que sobra del claro.' }
  }
  const n = tramo.cabinas.length
  const cuarto = ladoDelCuarto(tramo, config)
  const plantada = cuarto === 'inicio' ? 0 : cuarto === 'fin' ? n - 1 : -1

  const corrida = (esDeLos: (c: Cabina) => boolean) => {
    const i = tramo.cabinas.findIndex((c, k) => k !== plantada && esDeLos(c))
    if (i < 0) return null
    let j = i
    while (j < n && j !== plantada && esDeLos(tramo.cabinas[j])) j++
    return { desde: i, hasta: j }
  }

  const banos = corrida((c) => c.tipo !== 'orinal')
  const orinales = corrida((c) => c.tipo === 'orinal')

  // las dos tienen que ser corridas de verdad: si quedó una cabina suelta del
  // otro lado del campo, esto no es una tira que la app sepa modular
  const cuenta = (banos ? banos.hasta - banos.desde : 0) + (orinales ? orinales.hasta - orinales.desde : 0)
  if (cuenta !== n - (plantada >= 0 ? 1 : 0)) {
    return { problema: 'Los orinales tienen que ir todos juntos a un costado para modular por centros de carga.' }
  }
  if (cuenta < 2) {
    return { problema: 'Hacen falta al menos dos lugares con descarga para modular por centros.' }
  }

  const centros = centrosDe(tramo)
  for (const tramoDe of [banos, orinales]) {
    if (!tramoDe) continue
    for (let i = tramoDe.desde; i < tramoDe.hasta; i++) {
      if (centros[i] == null) return { problema: `Falta el centro de carga del lugar ${i + 1}.` }
    }
  }
  return { banos, orinales }
}

export interface Centrado {
  /** las N+1 pilastras de la tira entera, en orden */
  pilastras: number[]
  /** el ancho de puerta de cada cabina de la corrida de baños */
  puertas: number[]
  /** dónde queda cada frontera de la tira, en cm de dibujo */
  bordes: number[]
  /** cuánto quedó cada frontera del punto medio de sus dos descargas, en cm */
  desvios: number[]
  /** lo que sobró contra el cierre */
  diferencia: number
  ajuste: TipoAjuste
  mensaje: string
}

/**
 * Elige las piezas para que cada frontera caiga en el punto medio de sus dos
 * descargas.
 *
 * Se camina de izquierda a derecha persiguiendo un objetivo ABSOLUTO —la
 * posición de la frontera, no el ancho del lugar—, así que el error de una
 * pieza no se arrastra: la siguiente lo corrige sola.
 */
export function modularPorCentros(tramo: Tramo, config: Config, pais: Pais = 'CR'): Centrado | null {
  return mejorDe(tramo, config, pais, INTERNAS)
}

/**
 * La pilastra con la que ARRANCA la corrida de baños corre todo lo demás, así
 * que se prueban todas sus medidas y se queda la que deja los sanitarios más
 * centrados.
 *
 * Si el vendedor ya la eligió a mano no se toca: esa decisión manda sobre la
 * comodidad del reparto.
 */
function mejorDe(tramo: Tramo, config: Config, pais: Pais, internas: number[]): Centrado | null {
  const corrida = corridaDeCentros(tramo, config)
  if ('problema' in corrida) return null
  if (!corrida.banos) return buscar(tramo, config, pais, internas, 0)

  const k = corrida.banos.desde
  const actual = tramo.pilastras?.[k] ?? config.anchoPilastraCm
  // contra pared puede ser chica; de esquina no baja de 24, igual que en el
  // buscador normal. Y si arranca después de algo plantado, no es punta.
  const candidatos = (tramo.pilastrasFijas ?? []).includes(k)
    ? [actual]
    : k === 0
      ? Array.from(new Set([actual, ...pilastrasDePunta(tramo.muroInicio)]))
      : [actual]

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

function buscar(tramo: Tramo, config: Config, pais: Pais, internas: number[], pilInicio: number): Centrado | null {
  const corrida = corridaDeCentros(tramo, config)
  if ('problema' in corrida) return null
  const { banos, orinales } = corrida

  const n = tramo.cabinas.length
  const esc = escalaDeTramo(tramo)
  const fr = fronterasDe(tramo)
  const largo = largoDeTramo(tramo)
  const centros = centrosDe(tramo)
  const puertasPosibles = anchosPuertaDe(tramo, config, pais)
  const pilActual = (k: number) => tramo.pilastras?.[k] ?? config.anchoPilastraCm

  /**
   * Dónde tiene que quedar el CENTRO de la pieza de la frontera k: en el punto
   * medio de las dos descargas que separa.
   */
  const objetivo = (k: number): number | null => {
    const a = centros[k - 1]
    const b = centros[k]
    return a != null && b != null ? ((a + b) / 2) * esc : null
  }

  const pilastras = Array.from({ length: n + 1 }, (_, k) => pilActual(k))
  const bordes = fr.slice()
  const puertas: number[] = []
  const desvios: number[] = []
  let diferencia = 0

  // ------------------------------------------------------------------
  // La corrida de baños: acá sí hay puerta y pilastra que elegir.
  // ------------------------------------------------------------------
  if (banos) {
    pilastras[banos.desde] = pilInicio
    // Si de ese lado hay orinales, la frontera con el campo también sale de las
    // descargas; si hay muro o la cabina accesible plantada, se queda donde está.
    const antesOrinal = banos.desde > 0 && tramo.cabinas[banos.desde - 1]?.tipo === 'orinal'
    const ini = (antesOrinal ? objetivo(banos.desde) : null) ?? fr[banos.desde]
    bordes[banos.desde] = ini
    const despuesOrinal = banos.hasta < n && tramo.cabinas[banos.hasta]?.tipo === 'orinal'

    let x = ini + pilastras[banos.desde]
    const elegir = (meta: number, opciones: number[]) => {
      let mejorD = puertasPosibles[0]
      let mejorP = opciones[0]
      let mejorCosto = Infinity
      for (const d of puertasPosibles) {
        for (const p of opciones) {
          const error = Math.abs(x + d + p / 2 - meta)
          const costo = error + PESO_PUERTA * Math.abs(d - PUERTA_PREFERIDA) + PESO_INTERNA * Math.abs(p - INTERNA_PREFERIDA)
          if (costo < mejorCosto) {
            mejorCosto = costo
            mejorD = d
            mejorP = p
          }
        }
      }
      return { d: mejorD, p: mejorP }
    }

    for (let i = banos.desde; i < banos.hasta - 1; i++) {
      const meta = objetivo(i + 1) as number
      const { d, p } = elegir(meta, internas)
      puertas.push(d)
      pilastras[i + 1] = p
      bordes[i + 1] = x + d + p / 2
      desvios.push(Math.round(((x + d + p / 2 - meta) / esc) * 10) / 10)
      x += d + p
    }

    // La última cabina de la corrida. Contra el campo de orinales persigue la
    // descarga como las demás —solo que su pilastra es LATERAL y va entera del
    // lado de los baños—; contra un muro no persigue nada y cierra el claro.
    const metaFinal = despuesOrinal ? objetivo(banos.hasta) : null
    if (metaFinal != null) {
      // Esta pilastra es LATERAL: va entera del lado de los baños y el panel se
      // amarra en su cara de afuera, no en su centro. Así que lo que tiene que
      // caer en el punto medio es la FRONTERA, no el centro de la pieza.
      let mejorD = puertasPosibles[0]
      let mejorP = internas[0]
      let mejorCosto = Infinity
      for (const d of puertasPosibles) {
        for (const pi of internas) {
          const costo = Math.abs(x + d + pi - metaFinal) +
            PESO_PUERTA * Math.abs(d - PUERTA_PREFERIDA) + PESO_INTERNA * Math.abs(pi - INTERNA_PREFERIDA)
          if (costo < mejorCosto) { mejorCosto = costo; mejorD = d; mejorP = pi }
        }
      }
      puertas.push(mejorD)
      pilastras[banos.hasta] = mejorP
      bordes[banos.hasta] = x + mejorD + mejorP
      desvios.push(Math.round(((x + mejorD + mejorP - metaFinal) / esc) * 10) / 10)
      x += mejorD + mejorP
    } else {
      const fin = banos.hasta === n ? largo : fr[banos.hasta]
      const cierres = pilastraDeCierre(tramo, config, banos.hasta)
      let mejorD = puertasPosibles[0]
      let mejorP = pilastras[banos.hasta]
      let mejorCosto = Infinity
      for (const d of puertasPosibles) {
        for (const p of cierres) {
          const costo = Math.abs(fin - (x + d + p)) + PESO_PUERTA * Math.abs(d - PUERTA_PREFERIDA)
          if (costo < mejorCosto) {
            mejorCosto = costo
            mejorD = d
            mejorP = p
          }
        }
      }
      puertas.push(mejorD)
      pilastras[banos.hasta] = mejorP
      bordes[banos.hasta] = fin
      diferencia = Math.round((fin - (x + mejorD + mejorP)) * 10) / 10
    }
  }

  // ------------------------------------------------------------------
  // El campo de orinales: acá no hay pieza que elegir. Entre dos orinales va
  // una mampara de 1,27 y el lugar se lleva todo lo que queda entre frontera y
  // frontera, así que el ancho de cada uno sale DIRECTO de las descargas.
  // ------------------------------------------------------------------
  if (orinales) {
    for (let k = orinales.desde + 1; k < orinales.hasta; k++) {
      const meta = objetivo(k)
      if (meta == null) continue
      bordes[k] = meta
      desvios.push(0)
    }
    // las puntas del campo: contra el muro se quedan donde están; contra los
    // baños ya la puso la corrida de arriba
    if (orinales.desde === 0) bordes[0] = 0
    if (orinales.hasta === n) bordes[n] = largo
  }

  const { ajuste, mensaje } = cierre(diferencia, tramo, bordes, orinales)
  return { pilastras, puertas, bordes, desvios, diferencia, ajuste, mensaje }
}

/**
 * Las medidas que puede tomar la pilastra con la que cierra la corrida.
 *
 * Contra un muro puede ser chica y de esquina no baja de 24, como en cualquier
 * tira; contra el panel de la cabina accesible se queda con la que ya tenía,
 * porque esa pieza la eligió el vendedor.
 */
function pilastraDeCierre(tramo: Tramo, config: Config, k: number): number[] {
  const actual = tramo.pilastras?.[k] ?? config.anchoPilastraCm
  if (k !== tramo.cabinas.length) return [actual]
  return pilastrasDePunta(tramo.muroFin)
}

/** el ancho libre más chico que puede quedarle a un orinal */
const ORINAL_MIN_CM = 40

/** cómo cerró la tira contra el claro */
function cierre(
  diferencia: number,
  tramo: Tramo,
  bordes: number[],
  orinales: { desde: number; hasta: number } | null,
): { ajuste: TipoAjuste; mensaje: string } {
  // un orinal aplastado es tan grave como una tira que no cierra: las descargas
  // están demasiado juntas para meter una mampara entre medio
  if (orinales) {
    for (let i = orinales.desde; i < orinales.hasta; i++) {
      const ancho = bordes[i + 1] - bordes[i]
      if (ancho < ORINAL_MIN_CM) {
        return {
          ajuste: 'falta',
          mensaje: `Con esas descargas el orinal ${i + 1} queda de ${ancho.toFixed(1)} cm y no entra la mampara`,
        }
      }
    }
  }
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
 * La tira ya armada con las piezas que dejan cada sanitario centrado.
 *
 * Devuelve lo mismo que `modularConCatalogo`, más el ancho pedido de cada
 * orinal: ese no es una pieza de la tira sino un dato de la configuración del
 * área, así que lo tiene que guardar quien llama.
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
  /** el ancho pedido de cada orinal, en orden, o null si el área no lleva */
  anchosOrinal: number[] | null
} | null {
  const r = modularPorCentros(tramo, config, pais)
  if (!r) return null
  const corrida = corridaDeCentros(tramo, config)
  if ('problema' in corrida) return null
  const { banos, orinales } = corrida

  const enBanos = (i: number) => banos != null && i >= banos.desde && i < banos.hasta
  const enCampo = (i: number) => orinales != null && i >= orinales.desde && i < orinales.hasta

  const conPuertas = tramo.cabinas.map((c, i) => {
    if (!enBanos(i)) return c
    const ancho = r.puertas[i - (banos as { desde: number }).desde]
    return ancho == null ? c : { ...c, puerta: { ...c.puerta, anchoCm: ancho } }
  })

  const lugares = lugaresDe(conPuertas)
  const arranca = ladoDelCuarto(tramo, config) === 'inicio'
  const pil = (k: number) => r.pilastras[k] ?? 0
  const cabinas = conPuertas.map((c, i) => {
    if (enBanos(i)) {
      const { izq, der } = ladosDeCabina(lugares, pil, i, arranca)
      return { ...c, anchoCm: Math.round((izq + c.puerta.anchoCm + der) * 10) / 10 }
    }
    // el orinal se lleva TODO lo que hay entre sus dos fronteras: acá no hay
    // pieza que elegir, la descarga decide sola
    if (enCampo(i)) {
      return { ...c, anchoCm: Math.round((r.bordes[i + 1] - r.bordes[i]) * 10) / 10 }
    }
    return c
  })

  // el ancho PEDIDO de cada orinal es el libre, sin lo que le toca de las
  // mamparas de al lado: es el número que se guarda en la configuración
  const anchosOrinal = orinales
    ? Array.from({ length: orinales.hasta - orinales.desde }, (_, j) => {
        const i = orinales.desde + j
        const { izq, der } = ladosDeCabina(lugares, pil, i, arranca)
        return Math.round((cabinas[i].anchoCm - izq - der) * 2) / 2
      })
    : null

  const fijas: number[] = []
  if (banos) for (let k = banos.desde + 1; k <= banos.hasta; k++) fijas.push(k)

  return {
    cabinas,
    pilastras: r.pilastras,
    ajuste: r.ajuste,
    mensaje: r.mensaje,
    desvios: r.desvios,
    diferencia: r.diferencia,
    fijas,
    anchosOrinal,
  }
}
