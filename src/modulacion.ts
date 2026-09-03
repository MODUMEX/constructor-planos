import {
  GRUESO_PILASTRA, MIN_ACCESIBLE_CM, MIN_CABINA_CM, SNAP_CM, ANCHOS_PUERTA, MARGEN_PUERTA_CM,
  LARGO_SECUNDARIO_CM,
} from './catalog'
import type { Cabina, Config, Moneda, Pais, Tramo, TipologiaId, RenglonBOM } from './types'
import { esReforzado, tipologia, tierDeColor } from './catalog'
import { modularTira } from './modulador'
import { precioPieza, type TablaTarifas } from './tarifas'

let seq = 0
export function nuevoId(prefijo: string): string {
  seq += 1
  return `${prefijo}-${seq}`
}

export function snap(valor: number): number {
  return Math.round(valor / SNAP_CM) * SNAP_CM
}

export function minimoDe(cabina: Cabina): number {
  if (cabina.tipo === 'accesible') return MIN_ACCESIBLE_CM
  if (cabina.tipo === 'ambulatoria') return 90
  return MIN_CABINA_CM
}

/** ancho de puerta más grande que entra en una cabina de este ancho */
export function puertaSugerida(anchoCm: number): number {
  const max = anchoCm - MARGEN_PUERTA_CM
  const posibles = ANCHOS_PUERTA.filter((a) => a <= max)
  return posibles.length ? posibles[posibles.length - 1] : ANCHOS_PUERTA[0]
}

export function nuevaCabina(anchoCm: number, tipo: Cabina['tipo'] = 'normal'): Cabina {
  return {
    id: nuevoId('cab'),
    anchoCm: snap(anchoCm),
    tipo,
    inodoro: true,
    puerta: {
      anchoCm: puertaSugerida(anchoCm),
      apertura: anchoCm < 135 ? 'afuera' : 'adentro',
      mano: 'der',
      tipo: 'puerta',
    },
    panel: { recorte: 'ninguno', refuerzoBarra: false },
  }
}

export function anchoTotal(cabinas: Cabina[]): number {
  return cabinas.reduce((s, c) => s + c.anchoCm, 0)
}

/**
 * Modula un tramo con PIEZAS DE CATÁLOGO: elige el ancho de puerta y el de cada
 * pilastra de las medidas que existen, en vez de estirar las cabinas para que
 * cuadren. Devuelve además la canaleta de relleno si las piezas quedan cortas.
 *
 * El ancho de cada cabina se reparte a partir de las piezas: cada cabina se
 * queda con su puerta más media pilastra de cada lado (las de los extremos van
 * enteras a la primera y a la última). Así la suma de las cabinas sigue dando
 * el largo del tramo y los límites entre cabinas caen justo en el centro de
 * cada pilastra, que es donde se dibujan.
 */
export function modularConCatalogo(
  claroCm: number,
  cantidad: number,
  murosPilastra: number,
  extremoAbierto: boolean,
  fijar?: { pilInterna?: number; pilExtremo?: number; puerta?: number },
): { cabinas: Cabina[]; pilastras: number[]; canaletaCm: number } | null {
  const m = modularTira({
    claroCm,
    puertas: cantidad,
    murosPilastra,
    extremoAbierto,
    puertaFija: fijar?.puerta,
    pilInternaFija: fijar?.pilInterna,
    pilExtremoFija: fijar?.pilExtremo,
  })
  if (!m) return null

  const cabinas: Cabina[] = []
  for (let i = 0; i < cantidad; i++) {
    const izq = i === 0 ? m.pilastras[0] : m.pilastras[i] / 2
    const der = i === cantidad - 1 ? m.pilastras[cantidad] : m.pilastras[i + 1] / 2
    const c = nuevaCabina(izq + m.anchoPuerta + der)
    c.puerta.anchoCm = m.anchoPuerta
    cabinas.push(c)
  }
  return { cabinas, pilastras: m.pilastras, canaletaCm: m.canaleta?.anchoCm ?? 0 }
}

/**
 * Reparte el claro del tramo entre N cabinas, dejando el ancho de la accesible fijo.
 * Se usa todavía en el caso PMR, que tiene su propia modulación sin portar.
 */
export function modular(claroCm: number, cantidad: number, anchoAccesibleCm = 0): Cabina[] {
  if (cantidad <= 0) return []
  const conAccesible = anchoAccesibleCm > 0
  const resto = conAccesible ? claroCm - anchoAccesibleCm : claroCm
  const normales = conAccesible ? cantidad - 1 : cantidad
  const cabinas: Cabina[] = []
  if (conAccesible) cabinas.push(nuevaCabina(anchoAccesibleCm, 'accesible'))
  if (normales > 0) {
    const base = snap(resto / normales)
    for (let i = 0; i < normales; i++) cabinas.push(nuevaCabina(base))
    // la última absorbe el redondeo para que el total cierre exacto
    const sobra = snap(claroCm - anchoTotal(cabinas))
    const ultima = cabinas[cabinas.length - 1]
    ultima.anchoCm = snap(ultima.anchoCm + sobra)
    ultima.puerta.anchoCm = puertaSugerida(ultima.anchoCm)
  }
  return cabinas
}

/**
 * Mueve el panel divisor que está a la derecha de la cabina `indice`.
 * Reparte el delta entre esa cabina y la siguiente: el claro total no cambia.
 * Devuelve las cabinas nuevas, o las mismas si el movimiento no es posible.
 */
export function moverDivisor(cabinas: Cabina[], indice: number, deltaCm: number): Cabina[] {
  const izq = cabinas[indice]
  const der = cabinas[indice + 1]
  if (!izq || !der) return cabinas
  const minIzq = minimoDe(izq)
  const minDer = minimoDe(der)
  let delta = snap(deltaCm)
  if (izq.anchoCm + delta < minIzq) delta = minIzq - izq.anchoCm
  if (der.anchoCm - delta < minDer) delta = der.anchoCm - minDer
  delta = snap(delta)
  if (delta === 0) return cabinas
  return cabinas.map((c, i) => {
    if (i === indice) return conAnchoNuevo(c, c.anchoCm + delta)
    if (i === indice + 1) return conAnchoNuevo(c, c.anchoCm - delta)
    return c
  })
}

function conAnchoNuevo(c: Cabina, anchoCm: number): Cabina {
  const ancho = snap(anchoCm)
  const puertaCabe = c.puerta.anchoCm <= ancho - MARGEN_PUERTA_CM
  return {
    ...c,
    anchoCm: ancho,
    puerta: puertaCabe ? c.puerta : { ...c.puerta, anchoCm: puertaSugerida(ancho) },
  }
}

/** cuántas pilastras lleva un tramo: una por divisor interno y una en cada extremo */
export function pilastrasDe(tramo: Tramo): number {
  const n = tramo.cabinas.length
  if (n === 0) return 0
  return n - 1 + 2
}

export function panelesDe(tramo: Tramo): number {
  const n = tramo.cabinas.length
  if (n === 0) return 0
  let paneles = n - 1
  if (!tramo.muroInicio) paneles += 1
  if (!tramo.muroFin) paneles += 1
  return paneles
}

/** área de solo orinales: cada "cabina" es un orinal de 60 cm, sin puerta */
function orinales(cantidad: number): Cabina[] {
  return Array.from({ length: Math.max(1, cantidad) }, () => {
    const c = nuevaCabina(60, 'orinal')
    c.puerta = { ...c.puerta, tipo: 'ninguna' }
    return c
  })
}

export function crearTramos(tipologiaId: TipologiaId, claroCm: number, cantidad: number, config: Config): Tramo[] {
  const tipo = tipologia(tipologiaId)
  const conAccesible = tipologiaId === 'PMR'
  const soloOrinales = tipologiaId === 'ORINALES'
  return tipo.tramos.map((t, i) => {
    // el claro y la cantidad que dio el vendedor van al tramo principal;
    // los secundarios arrancan con una medida de partida que después se arrastra
    const esPrincipal = i === tipo.principal
    const cant = esPrincipal ? cantidad : 2
    const claroTramo = soloOrinales ? cant * 60 : esPrincipal ? claroCm : LARGO_SECUNDARIO_CM
    const base = {
      id: nuevoId('tramo'),
      nombre: t.nombre,
      orientacion: t.orientacion,
      claroCm: claroTramo,
      muroInicio: t.muroInicio,
      muroFin: t.muroFin,
    }
    if (soloOrinales) return { ...base, cabinas: orinales(cant) }
    // el PMR conserva la modulación vieja: su rama no está portada todavía
    if (conAccesible && esPrincipal) {
      return { ...base, cabinas: modular(claroTramo, cant, config.anchoAccesibleCm) }
    }
    const muros = (t.muroInicio ? 1 : 0) + (t.muroFin ? 1 : 0)
    const conCatalogo = modularConCatalogo(claroTramo, cant, muros, muros < 2)
    if (!conCatalogo) return { ...base, cabinas: modular(claroTramo, cant) }
    return {
      ...base,
      cabinas: conCatalogo.cabinas,
      pilastras: conCatalogo.pilastras,
      canaletaCm: conCatalogo.canaletaCm,
    }
  })
}

export function bom(
  tramos: Tramo[],
  config: Config,
  precios: { moneda: Moneda; tipoCambio: number; tarifas?: TablaTarifas; pais?: Pais } = {
    moneda: 'USD',
    tipoCambio: 1,
  },
): RenglonBOM[] {
  const renglones: RenglonBOM[] = []
  const opciones = {
    modeloCodigo: config.modelo,
    // el país importa: los colores de la planta de México son de línea
    tier: tierDeColor(config.color, precios.pais),
    moneda: precios.moneda,
    tipoCambio: precios.tipoCambio,
    tarifas: precios.tarifas,
  }
  const puertas = new Map<number, number>()
  let pilastras = 0
  let paneles = 0

  for (const tramo of tramos) {
    pilastras += pilastrasDe(tramo)
    paneles += panelesDe(tramo)
    for (const cab of tramo.cabinas) {
      if (cab.puerta.tipo === 'puerta') {
        puertas.set(cab.puerta.anchoCm, (puertas.get(cab.puerta.anchoCm) ?? 0) + 1)
      }
    }
  }

  const codigoLinea = config.linea === 'SUPERIOR' ? 'SUP' : config.linea === 'TOUCHLESS' ? 'TL' : 'LDR'

  const altoPil = esReforzado(config.modelo) ? 210 : config.alturaCm + 30

  for (const [ancho, cantidad] of [...puertas.entries()].sort((a, b) => a[0] - b[0])) {
    renglones.push({
      sku: `${codigoLinea}-PT${ancho}`,
      descripcion: `Puerta ${ancho} × ${config.alturaCm} cm`,
      tipo: 'Puerta',
      cantidad,
      precioUnit: precioPieza({ familia: 'PT', anchoCm: ancho, altoCm: config.alturaCm }, opciones),
      tarifaReal: true,
    })
  }
  if (paneles > 0) {
    renglones.push({
      sku: `${codigoLinea}-PN${config.profundidadCm}`,
      descripcion: `Panel divisor ${config.profundidadCm} × ${config.alturaCm} cm`,
      tipo: 'Panel',
      cantidad: paneles,
      precioUnit: precioPieza(
        { familia: 'PN', anchoCm: config.profundidadCm, altoCm: config.alturaCm },
        opciones,
      ),
      tarifaReal: true,
    })
  }
  if (pilastras > 0) {
    renglones.push({
      sku: `${codigoLinea}-PI${config.montaje === 'PISO_TECHO' ? 'PT' : 'STD'}`,
      descripcion: `Pilastra ${config.anchoPilastraCm} × ${altoPil} cm`,
      tipo: 'Pilastra',
      cantidad: pilastras,
      precioUnit: precioPieza(
        { familia: 'PL', anchoCm: config.anchoPilastraCm, altoCm: altoPil },
        opciones,
      ),
      tarifaReal: true,
    })
  }
  // El riel de amarre tampoco se cotiza aparte: va dentro de la tarifa por m²,
  // igual que el herraje. Antes se sumaba un "Riel superior de aluminio" a
  // $14.50 el metro, un precio inventado que no existe en la lista.
  // El herraje NO se cotiza aparte: ya viene dentro de la tarifa por m² de las
  // piezas. Antes se agregaba un "Kit de herraje por cabina" de $26 (o $38) que
  // no existe en la lista de precios y que cobraba dos veces lo mismo.
  // Si hay que cobrar herraje EXTRA, va como renglón aparte con su código real
  // (KBDL, KCL, KTL…), no automático por cabina. Las piezas que de verdad lleva
  // el pedido las calcula el CIP, ya con el plano y la cotización hechos.
  if (config.orinales > 1) {
    renglones.push({
      sku: `${codigoLinea}-MG60${config.mgAlturaCm}`,
      descripcion: `Divisor de orinal 60 × ${config.mgAlturaCm} cm`,
      tipo: 'Divisor',
      cantidad: config.orinales - 1,
      precioUnit: precioPieza({ familia: 'MG', anchoCm: 60, altoCm: config.mgAlturaCm }, opciones),
      tarifaReal: true,
    })
  }
  return renglones
}

export function totalBOM(renglones: RenglonBOM[]): number {
  return renglones.reduce((s, r) => s + r.cantidad * r.precioUnit, 0)
}

export const GRUESO = GRUESO_PILASTRA
