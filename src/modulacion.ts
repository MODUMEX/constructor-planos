import {
  GRUESO_PILASTRA, MIN_ACCESIBLE_CM, MIN_CABINA_CM, SNAP_CM, anchosPuerta, MARGEN_PUERTA_CM,
  LARGO_SECUNDARIO_CM,
} from './catalog'
import type { Cabina, Config, Moneda, Pais, Tramo, TipologiaId, RenglonBOM } from './types'
import { alturasDe, tipologia, tierDeColor } from './catalog'
import { ajustarPilastras, GRUESO_MG_PIEZA, modularTira } from './modulador'
import { precioPieza, type TablaTarifas } from './tarifas'

let seq = 0
export function nuevoId(prefijo: string): string {
  seq += 1
  return `${prefijo}-${seq}`
}

/** grueso de la mampara que separa dos orinales, en cm */
const GRUESO_MG_CM = 1.27

export function snap(valor: number): number {
  return Math.round(valor / SNAP_CM) * SNAP_CM
}

export function minimoDe(cabina: Cabina): number {
  if (cabina.tipo === 'accesible') return MIN_ACCESIBLE_CM
  if (cabina.tipo === 'vacia') return MIN_CABINA_CM
  return MIN_CABINA_CM
}

/** ancho de puerta más grande que entra en una cabina de este ancho */
export function puertaSugerida(anchoCm: number, pais: Pais = 'CR'): number {
  const lista = anchosPuerta(pais)
  const max = anchoCm - MARGEN_PUERTA_CM
  const posibles = lista.filter((a) => a <= max)
  return posibles.length ? posibles[posibles.length - 1] : lista[0]
}

export function nuevaCabina(anchoCm: number, tipo: Cabina['tipo'] = 'normal'): Cabina {
  return {
    id: nuevoId('cab'),
    anchoCm: snap(anchoCm),
    tipo,
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
  fijar?: {
    pilInterna?: number
    pilExtremo?: number
    puerta?: number
    puertaAccesible?: number
    /** cuál pilastra movió el vendedor: solo esa queda clavada */
    pilastraIndice?: number
    /** las que el cliente ya eligió, por posición de frontera (null = libre) */
    pilastras?: (number | null | undefined)[]
  },
  extra?: { accesible?: boolean; anchoAccesibleMinCm?: number; mingitorios?: number; anchoOrinalCm?: number; pais?: Pais },
): { cabinas: Cabina[]; pilastras: number[]; canaletaCm: number; ajuste: Tramo['ajuste']; mensaje: string; avisoAccesible?: string } | null {
  const conAcc = extra?.accesible === true
  const nMing = extra?.mingitorios ?? 0
  const anchoOrinal = extra?.anchoOrinalCm && extra.anchoOrinalCm > 0 ? extra.anchoOrinalCm : 60
  // la accesible va primera y los orinales al final, como en el Constructor actual
  const normales = cantidad - (conAcc ? 1 : 0) - nMing
  if (normales < 0) return null

  const m = modularTira({
    claroCm,
    puertas: normales,
    accesible: conAcc,
    mingitorios: nMing,
    anchoOrinal: extra?.anchoOrinalCm,
    catalogoPuertas: anchosPuerta(extra?.pais ?? 'CR'),
    anchoAccesibleCm: extra?.anchoAccesibleMinCm,
    murosPilastra,
    extremoAbierto,
    puertaFija: fijar?.puerta,
    puertaAccesibleFija: fijar?.puertaAccesible,
    pilInternaFija: fijar?.pilInterna,
    pilExtremoFija: fijar?.pilExtremo,
    pilastraFijaIndice: fijar?.pilastraIndice,
    // La lista del tramo trae una entrada por frontera, incluidas las de
    // mampara entre orinales, que no consumen pilastra: hay que comprimirla a
    // las posiciones que el buscador conoce.
    pilastrasFijas: fijar?.pilastras
      ? (() => {
          const salida: (number | null | undefined)[] = [fijar.pilastras[0]]
          for (let i = 1; i <= cantidad - 1; i++) {
            const entreOrinales = i > cantidad - 1 - nMing && i >= cantidad - nMing
            if (!entreOrinales) salida.push(fijar.pilastras[i])
          }
          salida.push(fijar.pilastras[cantidad])
          return salida
        })()
      : undefined,
  })
  if (!m) return null

  // Entre dos orinales no hay pilastra sino mampara, así que en esas fronteras
  // la lista lleva el grueso de la mampara. El dibujo y las cotas leen esta
  // lista por posición, por eso tiene que traer una entrada por cada frontera.
  // Cada frontera se lleva SU pilastra, no la primera repetida: el buscador las
  // devuelve de medidas distintas y aplanarlas acá era lo que las emparejaba y
  // hacía que la tira se pasara del claro.
  const pilastras: number[] = [m.pilastras[0]]
  let k = 1
  for (let i = 1; i <= cantidad - 1; i++) {
    const izqOrinal = i > cantidad - 1 - nMing
    const derOrinal = i >= cantidad - nMing
    // entre dos orinales va mampara, y esa frontera no consume pilastra
    pilastras.push(izqOrinal && derOrinal ? GRUESO_MG_CM : (m.pilastras[k++] ?? m.anchoPilInterna))
  }
  pilastras.push(m.pilastras[m.pilastras.length - 1])

  const cabinas: Cabina[] = []
  for (let i = 0; i < cantidad; i++) {
    const izq = i === 0 ? pilastras[0] : pilastras[i] / 2
    const der = i === cantidad - 1 ? pilastras[cantidad] : pilastras[i + 1] / 2
    const esAcc = conAcc && i === 0
    const esOrinal = i >= cantidad - nMing
    const puerta = esAcc ? (m.anchoPuertaAccesible ?? m.anchoPuerta) : m.anchoPuerta
    const cuerpo = esOrinal ? (m.anchoOrinal ?? anchoOrinal) : puerta
    const c = nuevaCabina(izq + cuerpo + der, esAcc ? 'accesible' : esOrinal ? 'orinal' : 'normal')
    if (esOrinal) c.puerta = { ...c.puerta, tipo: 'ninguna' }
    else c.puerta.anchoCm = puerta
    cabinas.push(c)
  }

  // La cabina accesible se pide de un ancho concreto (150 cm por norma). El
  // buscador lo persigue eligiendo pilastras más anchas a su lado, pero no
  // siempre lo alcanza con las piezas que existen. ANTES eso devolvía null y
  // la app se caía en la modulación vieja, que reparte anchos libres: el área
  // entera terminaba SIN piezas de catálogo —cabinas de 86,5 cm y pilastras
  // inventadas— y nadie se enteraba. Ahora se entrega la tira de catálogo y se
  // avisa cuánto le faltó a la accesible.
  const minAcc = extra?.anchoAccesibleMinCm ?? MIN_ACCESIBLE_CM
  const anchoAcc = conAcc && cabinas[0] ? cabinas[0].anchoCm : 0
  const avisoAccesible =
    conAcc && anchoAcc < minAcc - 0.5
      ? `La cabina accesible queda de ${anchoAcc.toFixed(1)} cm y se pidió de ${minAcc}: faltan ${(minAcc - anchoAcc).toFixed(1)} cm. Con las piezas del catálogo no da; ampliá el claro o bajá una cabina.`
      : undefined

  return {
    cabinas,
    pilastras,
    canaletaCm: m.canaleta?.anchoCm ?? 0,
    ajuste: m.ajuste,
    mensaje: m.mensaje,
    avisoAccesible,
  }
}

/**
 * Reparte el claro del tramo entre N cabinas, dejando el ancho de la accesible fijo.
 * Se usa todavía en el caso PMR, que tiene su propia modulación sin portar.
 */
/**
 * Qué ancho se le pide a la cabina accesible sobre el claro.
 *
 * En el PMR no es la cabina accesible normal: es el CUARTO, que tiene su propia
 * medida (el Constructor viejo arranca en 162). En las demás tipologías la
 * accesible es una cabina con puerta ancha y vale el ancho de siempre.
 */
export function anchoAccesibleDe(config: Config): number {
  if (config.tipologia === 'PMR') return config.anchoPmrCuartoCm ?? 162
  return config.anchoAccesibleCm
}

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
 * Vuelve a repartir la tira cuando las PUERTAS ya están decididas: se quedan
 * como están y se buscan las pilastras que hagan cerrar el claro. Es lo que
 * corre al elegir una medida de puerta en el menú o al arrastrar un panel.
 *
 * Devuelve las cabinas con su ancho recalculado —puerta más lo que le toca de
 * cada pilastra— y el aviso de cómo cerró, para poder mostrarlo en el plano.
 */
export function reajustarConPuertas(
  cabinas: Cabina[],
  claroCm: number,
  murosPilastra: number,
  extremoAbierto: boolean,
): { cabinas: Cabina[]; pilastras: number[]; canaletaCm: number; ajuste: Tramo['ajuste']; mensaje: string } | null {
  const n = cabinas.length
  if (n === 0) return null

  const cuerpos = cabinas.map((c) => (c.tipo === 'orinal' ? c.anchoCm : c.puerta.anchoCm))
  const conPuerta = cabinas.filter((c) => c.tipo !== 'orinal').length
  // entre dos orinales va mampara, no pilastra
  let internas = 0
  let grosorMG = 0
  for (let i = 0; i < n - 1; i++) {
    if (cabinas[i].tipo === 'orinal' && cabinas[i + 1].tipo === 'orinal') grosorMG += GRUESO_MG_PIEZA
    else internas += 1
  }

  const r = ajustarPilastras({
    claroCm,
    cuerpos: [...cuerpos, grosorMG],
    conPuerta,
    internas,
    murosPilastra,
    extremoAbierto,
  })
  if (!r) return null

  // la lista lleva una entrada por frontera: donde va mampara, su grueso
  const pilastras: number[] = [r.pilastras[0]]
  let k = 1
  for (let i = 0; i < n - 1; i++) {
    const entreOrinales = cabinas[i].tipo === 'orinal' && cabinas[i + 1].tipo === 'orinal'
    pilastras.push(entreOrinales ? GRUESO_MG_PIEZA : r.pilastras[k++])
  }
  pilastras.push(r.pilastras[r.pilastras.length - 1])

  const nuevas = cabinas.map((c, i) => {
    const izq = i === 0 ? pilastras[0] : pilastras[i] / 2
    const der = i === n - 1 ? pilastras[n] : pilastras[i + 1] / 2
    const cuerpo = c.tipo === 'orinal' ? c.anchoCm : c.puerta.anchoCm
    return { ...c, anchoCm: izq + cuerpo + der }
  })

  return {
    cabinas: nuevas,
    pilastras,
    canaletaCm: r.canaleta?.anchoCm ?? 0,
    ajuste: r.ajuste,
    mensaje: r.mensaje,
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

export function crearTramos(tipologiaId: TipologiaId, claroCm: number, cantidad: number, config: Config, pais: Pais = 'CR'): Tramo[] {
  const tipo = tipologia(tipologiaId)
  // Antes la accesible salía de la tipología. Ahora es una pregunta aparte: el
  // vendedor dice si el área la lleva. Los proyectos viejos no traen el dato,
  // así que ahí se sigue deduciendo de la tipología.
  // En el PMR el cuarto accesible ES la tipología: no es una pregunta aparte,
  // va siempre. En las demás lo decide el vendedor.
  const conAccesible = tipologiaId === 'PMR' || config.llevaAccesible === true
  const soloOrinales = tipologiaId === 'ORINALES'
  return tipo.tramos.map((t, i) => {
    // el claro y la cantidad que dio el vendedor van al tramo principal;
    // los secundarios arrancan con una medida de partida que después se arrastra
    const esPrincipal = i === tipo.principal
    const cant = esPrincipal ? cantidad : 2
    // En un área de solo orinales el vendedor da la cantidad, no el claro: la
    // tira mide los orinales, las mamparas que los separan y las dos pilastras
    // de los extremos, que también son piezas de catálogo.
    const murosT = (t.muroInicio ? 1 : 0) + (t.muroFin ? 1 : 0)
    const anchoOrinal = config.anchoOrinalCm && config.anchoOrinalCm > 0 ? config.anchoOrinalCm : 60
    const claroOrinales = cant * anchoOrinal + Math.max(0, cant - 1) * GRUESO_MG_CM + 2 * 10 + murosT
    const claroTramo = soloOrinales ? claroOrinales : esPrincipal ? claroCm : LARGO_SECUNDARIO_CM
    const base = {
      id: nuevoId('tramo'),
      nombre: t.nombre,
      orientacion: t.orientacion,
      claroCm: claroTramo,
      muroInicio: t.muroInicio,
      muroFin: t.muroFin,
    }
    const muros = murosT
    // La cabina accesible ya no tiene camino aparte: es una cabina con puerta
    // ancha, así que sale del mismo buscador que las demás.
    // Si el cliente pidió una medida de puerta, esa manda: el buscador solo
    // puede mover las pilastras. Es la regla del negocio, no una preferencia.
    const conCatalogo = modularConCatalogo(claroTramo, cant, muros, muros < 2, { puerta: config.puertaCm, puertaAccesible: config.puertaAccesibleCm }, {
      accesible: conAccesible && esPrincipal,
      anchoAccesibleMinCm: anchoAccesibleDe(config),
      mingitorios: soloOrinales ? cant : 0,
      anchoOrinalCm: config.anchoOrinalCm,
      pais,
    })
    if (!conCatalogo) {
      return {
        ...base,
        cabinas: soloOrinales
          ? orinales(cant)
          : modular(claroTramo, cant, conAccesible && esPrincipal ? anchoAccesibleDe(config) : 0),
      }
    }
    return {
      ...base,
      cabinas: conCatalogo.cabinas,
      pilastras: conCatalogo.pilastras,
      canaletaCm: conCatalogo.canaletaCm,
      ajuste: conCatalogo.ajuste,
      mensaje: conCatalogo.mensaje,
      avisoAccesible: conCatalogo.avisoAccesible,
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
  // Las pilastras ya no son todas del mismo ancho: la modulación elige la
  // medida de catálogo que le toca a cada posición, así que se cuentan por
  // ancho para que la cotización cobre los m² de verdad.
  const pilastrasPorAncho = new Map<number, number>()
  let paneles = 0

  for (const tramo of tramos) {
    const n = pilastrasDe(tramo)
    for (let i = 0; i < n; i++) {
      const ancho = tramo.pilastras?.[i] ?? config.anchoPilastraCm
      pilastrasPorAncho.set(ancho, (pilastrasPorAncho.get(ancho) ?? 0) + 1)
    }
    paneles += panelesDe(tramo)
    for (const cab of tramo.cabinas) {
      if (cab.puerta.tipo === 'puerta') {
        puertas.set(cab.puerta.anchoCm, (puertas.get(cab.puerta.anchoCm) ?? 0) + 1)
      }
    }
  }

  const codigoLinea = config.linea === 'SUPERIOR' ? 'SUP' : config.linea === 'TOUCHLESS' ? 'TL' : 'LDR'

  // las alturas las manda el modelo, no el vendedor
  const alturas = alturasDe(config.modelo)
  const altoPil = alturas.pilastra

  for (const [ancho, cantidad] of [...puertas.entries()].sort((a, b) => a[0] - b[0])) {
    renglones.push({
      sku: `${codigoLinea}-PT${ancho}`,
      descripcion: `Puerta ${ancho} × ${alturas.puerta} cm`,
      tipo: 'Puerta',
      cantidad,
      precioUnit: precioPieza({ familia: 'PT', anchoCm: ancho, altoCm: alturas.puerta }, opciones),
      tarifaReal: true,
    })
  }
  if (paneles > 0) {
    renglones.push({
      sku: `${codigoLinea}-PN${config.profundidadCm}`,
      descripcion: `Panel divisor ${config.profundidadCm} × ${alturas.panel} cm`,
      tipo: 'Panel',
      cantidad: paneles,
      precioUnit: precioPieza(
        { familia: 'PN', anchoCm: config.profundidadCm, altoCm: alturas.panel },
        opciones,
      ),
      tarifaReal: true,
    })
  }
  const sufijoPil = config.montaje === 'PISO_TECHO' ? 'PT' : 'STD'
  for (const [ancho, cantidad] of [...pilastrasPorAncho.entries()].sort((a, b) => a[0] - b[0])) {
    renglones.push({
      sku: `${codigoLinea}-PI${sufijoPil}${ancho}`,
      descripcion: `Pilastra ${ancho} × ${altoPil} cm`,
      tipo: 'Pilastra',
      cantidad,
      precioUnit: precioPieza({ familia: 'PL', anchoCm: ancho, altoCm: altoPil }, opciones),
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
      sku: `${codigoLinea}-MG${config.mgAnchoCm ?? 60}${config.mgAlturaCm}`,
      descripcion: `Divisor de orinal ${config.mgAnchoCm ?? 60} × ${config.mgAlturaCm} cm`,
      tipo: 'Divisor',
      cantidad: config.orinales - 1,
      precioUnit: precioPieza({ familia: 'MG', anchoCm: config.mgAnchoCm ?? 60, altoCm: config.mgAlturaCm }, opciones),
      tarifaReal: true,
    })
  }
  return renglones
}

export function totalBOM(renglones: RenglonBOM[]): number {
  return renglones.reduce((s, r) => s + r.cantidad * r.precioUnit, 0)
}

export const GRUESO = GRUESO_PILASTRA

