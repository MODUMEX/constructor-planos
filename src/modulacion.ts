import {
  GRUESO_PILASTRA, MIN_ACCESIBLE_CM, MIN_CABINA_CM, SNAP_CM, anchosPuerta, MARGEN_PUERTA_CM,
  LARGO_SECUNDARIO_CM, PIEZA_PIDE_COSTILLA_CM,
} from './catalog'
import type { Cabina, Config, Moneda, Pais, Tramo, TipologiaId, RenglonBOM } from './types'
import {
  alturasDe, ANCHOS_PILASTRA, anchosPilastra, esEspecial, esSoloOrinales, esVariacionPanel, familiaDelFrente,
  llevaAccesibleSiempre, mamparaDe, tipologia, tierDeColor, type MedidaMG,
} from './catalog'
import { ajustarPilastras, GRUESO_MG_PIEZA, medidaCercana, modularTira, PILASTRAS_INTERNAS } from './modulador'
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

/**
 * A partir de qué medida de PANEL la puerta puede abrir hacia adentro.
 *
 * Es una regla de fabricación: con un panel más corto, la hoja abierta no cabe
 * dentro de la cabina. De 135 para arriba sí cabe, y ahí abrir hacia adentro es
 * lo que se pide casi siempre, porque la puerta no invade el pasillo.
 */
export const PANEL_MIN_ADENTRO_CM = 135

/**
 * Hacia dónde abre la puerta de una cabina recién armada.
 *
 * Lo decide el PANEL —el divisor, o sea el fondo de la cabina—, no el ancho de
 * la cabina. Antes se comparaba el ancho contra 135 y, como una cabina normal
 * mide 70 u 80, TODAS salían abriendo hacia afuera aunque el fondo fuera de 150.
 */
export function aperturaPorDefecto(panelCm: number | undefined): Cabina['puerta']['apertura'] {
  return (panelCm ?? 0) >= PANEL_MIN_ADENTRO_CM ? 'adentro' : 'afuera'
}

export function nuevaCabina(
  anchoCm: number,
  tipo: Cabina['tipo'] = 'normal',
  /** el panel de la cabina, que es lo que decide si la puerta puede abrir adentro */
  panelCm?: number,
): Cabina {
  return {
    id: nuevoId('cab'),
    anchoCm: snap(anchoCm),
    tipo,
    puerta: {
      anchoCm: puertaSugerida(anchoCm),
      apertura: aperturaPorDefecto(panelCm),
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
  extra?: {
    accesible?: boolean
    anchoAccesibleMinCm?: number
    mingitorios?: number
    anchoOrinalCm?: number
    /** el ancho pedido para cada orinal, en orden; no tienen que ser iguales */
    anchosOrinalCm?: (number | null | undefined)[]
    /** la tira termina en orinal y de ese lado no hay muro: cierra con mingitorio */
    cierreMingitorio?: boolean
    /** el cuarto PMR arranca la tira y cierra contra el muro, sin pilastra */
    sinPilastraInicio?: boolean
    /**
     * El ancho del CUARTO PMR. Si viene, el cuarto se planta en esa medida y
     * solo se modula el resto del claro.
     */
    cuartoPmrCm?: number
    /**
     * Si lo que se planta SE COME una pilastra a muro.
     *
     * El cuarto del Tipo C arranca pegado al muro sin pilastra, así que de ese
     * lado no hay centímetro de herraje que descontar y el resto de la tira
     * recibe uno menos. En las tipologías "variación panel" no es así: la
     * cabina accesible lleva su propia pilastra lateral contra el muro, y
     * además su panel hace de pared para la tira. Ahí el descuento entero —el
     * muro, el panel y el otro muro si lo hay— se lo lleva el resto.
     */
    cuartoComeMuro?: boolean
    /** la tira arranca en orinal sin muro de ese lado: también cierra con mingitorio */
    cierreMingitorioInicio?: boolean
    pais?: Pais
    /** el modelo, para que las piezas especiales que tenga entren en la tira */
    modelo?: string
    /** el panel de las cabinas: decide hacia dónde abre la puerta por defecto */
    profundidadCm?: number
  },
): { cabinas: Cabina[]; pilastras: number[]; canaletaCm: number; ajuste: Tramo['ajuste']; mensaje: string; avisoAccesible?: string } | null {
  // ------------------------------------------------------------------
  // El cuarto PMR no negocia su ancho.
  //
  // Va acá adentro y no en quien llama, porque la tira se vuelve a modular por
  // varios caminos —crear el área, cambiar una puerta, arrastrar una pilastra,
  // tocar un orinal— y la regla tiene que valer en todos. Cuando vivía solo en
  // crearTramos, bastaba con cambiar cualquier medida para que el cuarto
  // perdiera la suya y le reapareciera la pilastra contra el muro.
  // ------------------------------------------------------------------
  const cuartoCm = extra?.cuartoPmrCm ?? 0
  if (cuartoCm > 0) {
    const cuarto = nuevaCabina(cuartoCm, 'accesible', extra?.profundidadCm)
    if (fijar?.puertaAccesible) {
      cuarto.puerta = { ...cuarto.puerta, anchoCm: fijar.puertaAccesible }
    }
    const nResto = cantidad - 1
    if (nResto <= 0) {
      return { cabinas: [cuarto], pilastras: [0, 0], canaletaCm: 0, ajuste: 'exacto', mensaje: 'Solo el cuarto' }
    }
    // Las fronteras del resto están corridas una posición: la 0 de la tira
    // entera es el muro del cuarto, y ahí no va pilastra.
    const corrida = (l?: (number | null | undefined)[]) => (l ? l.slice(1) : undefined)
    const delResto = modularConCatalogo(
      claroCm - cuartoCm,
      nResto,
      // del lado del cuarto no hay muro sino la pilastra que lo cierra
      extra?.cuartoComeMuro === false ? murosPilastra : Math.max(0, murosPilastra - 1),
      extremoAbierto,
      {
        ...fijar,
        puertaAccesible: undefined,
        pilastraIndice: fijar?.pilastraIndice != null ? fijar.pilastraIndice - 1 : undefined,
        pilastras: corrida(fijar?.pilastras),
      },
      {
        ...extra,
        accesible: false,
        anchoAccesibleMinCm: undefined,
        cuartoPmrCm: 0,
        // "sin pilastra al inicio" es del MURO del cuarto, no del arranque del
        // resto: ahí va justo la pilastra que cierra el cuarto. Sin esto quedaba
        // en cero y la tira arrancaba pegada al cuarto.
        sinPilastraInicio: false,
      },
    )
    if (!delResto) return null
    return {
      cabinas: [cuarto, ...delResto.cabinas],
      pilastras: [0, ...delResto.pilastras],
      canaletaCm: delResto.canaletaCm,
      ajuste: delResto.ajuste,
      mensaje: delResto.mensaje,
      avisoAccesible: claroCm - cuartoCm < 0
        ? `El cuarto de ${cuartoCm} cm no cabe en un claro de ${claroCm}.`
        : undefined,
    }
  }

  const conAcc = extra?.accesible === true
  const nMing = extra?.mingitorios ?? 0
  const anchoOrinal = extra?.anchoOrinalCm && extra.anchoOrinalCm > 0 ? extra.anchoOrinalCm : 60
  // la accesible va primera y los orinales al final, como en el Constructor actual
  const normales = cantidad - (conAcc ? 1 : 0) - nMing
  if (normales < 0) return null

  // Hasta que frontera hay pilastra de verdad. Con orinales al final, la
  // ultima es la que separa la tira de banos del campo; de ahi en adelante
  // son mamparas de mingitorio, que no salen del catalogo de pilastras.
  const frontCampo = nMing > 0 ? cantidad - nMing : cantidad
  const fijable = fijar?.pilastraIndice == null || fijar.pilastraIndice <= frontCampo
  // Quien llama mira la tira ENTERA para decidir si la pilastra es de punta,
  // pero el buscador solo ve hasta frontCampo: con orinales al final, o con el
  // cuarto PMR adelante, la de punta para el no es la misma. Se decide aca, que
  // es donde se sabe. Sin esto el pedido llegaba como interna, el buscador lo
  // ignoraba y la pilastra no se movia.
  const pedidoPil = fijar?.pilInterna ?? fijar?.pilExtremo
  const dePunta = fijar?.pilastraIndice === 0 || fijar?.pilastraIndice === frontCampo

  const m = modularTira({
    claroCm,
    puertas: normales,
    accesible: conAcc,
    mingitorios: nMing,
    anchoOrinal: extra?.anchoOrinalCm,
    anchosOrinal: extra?.anchosOrinalCm,
    cierreMingitorio: extra?.cierreMingitorio,
    cierreMingitorioInicio: extra?.cierreMingitorioInicio,
    sinPilastraInicio: extra?.sinPilastraInicio,
    catalogoPuertas: anchosPuerta(extra?.pais ?? 'CR', extra?.modelo),
    anchoAccesibleCm: extra?.anchoAccesibleMinCm,
    murosPilastra,
    extremoAbierto,
    puertaFija: fijar?.puerta,
    puertaAccesibleFija: fijar?.puertaAccesible,
    pilInternaFija: !fijable ? undefined
      : fijar?.pilastraIndice == null ? fijar?.pilInterna
      : dePunta ? undefined : pedidoPil,
    pilExtremoFija: !fijable ? undefined
      : fijar?.pilastraIndice == null ? fijar?.pilExtremo
      : dePunta ? pedidoPil : undefined,
    pilastraFijaIndice: fijable ? fijar?.pilastraIndice : undefined,
    // La lista del tramo trae una entrada por frontera, incluidas las de
    // mampara entre orinales, que no consumen pilastra: hay que comprimirla a
    // las posiciones que el buscador conoce.
    pilastrasFijas: fijar?.pilastras
      ? (() => {
          const salida: (number | null | undefined)[] = [fijar.pilastras[0]]
          // La ULTIMA que conoce es la frontera donde arranca el campo de
          // orinales -la pilastra lateral de la tira de banos-, NO la punta
          // de la tira: ahi hay mampara o nada. Pasarle la punta hacia que
          // elegir a mano la del campo no hiciera nada, y que elegir la de
          // la punta moviera aquella.
          for (let i = 1; i < frontCampo; i++) {
            salida.push(fijar.pilastras[i])
          }
          salida.push(fijar.pilastras[frontCampo])
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
    // La frontera i separa la cabina i−1 de la cabina i.
    //
    // Entre dos orinales va el mingitorio, que no consume pilastra. Pero donde
    // termina la tira de baños y empieza el campo va la pilastra LATERAL de esa
    // tira: de ahí cuelga la puerta de la última cabina y ahí se amarra su panel.
    // Esa es la última que devuelve el buscador.
    const izqOrinal = i > cantidad - nMing
    const derOrinal = i >= cantidad - nMing
    if (izqOrinal && derOrinal) pilastras.push(GRUESO_MG_CM)
    else if (derOrinal) pilastras.push(m.pilastras[m.pilastras.length - 1])
    else pilastras.push(m.pilastras[k++] ?? m.anchoPilInterna)
  }
  // La punta: si ahí termina el campo de orinales es el mingitorio de cierre, o
  // nada contra la pared; si termina la tira de baños, su pilastra lateral.
  pilastras.push(
    nMing > 0 ? (extra?.cierreMingitorio ? GRUESO_MG_CM : 0) : m.pilastras[m.pilastras.length - 1],
  )

  const cabinas: Cabina[] = []
  for (let i = 0; i < cantidad; i++) {
    const { izq, der } = ladosDeCabina(
      Array.from({ length: cantidad }, (_, k) => ({ orinal: k >= cantidad - nMing, libre: false })),
      (k) => pilastras[k],
      i,
    )
    const esAcc = conAcc && i === 0
    const esOrinal = i >= cantidad - nMing
    const puerta = esAcc ? (m.anchoPuertaAccesible ?? m.anchoPuerta) : m.anchoPuerta
    // cada orinal con SU ancho: el buscador los devuelve en orden
    const cuerpo = esOrinal
      ? (m.anchosOrinal?.[i - (cantidad - nMing)] ?? m.anchoOrinal ?? anchoOrinal)
      : puerta
    const c = nuevaCabina(izq + cuerpo + der, esAcc ? 'accesible' : esOrinal ? 'orinal' : 'normal', extra?.profundidadCm)
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

export function modular(
  claroCm: number,
  cantidad: number,
  anchoAccesibleCm = 0,
  /** el panel de las cabinas: decide hacia dónde abre la puerta por defecto */
  profundidadCm?: number,
): Cabina[] {
  if (cantidad <= 0) return []
  const conAccesible = anchoAccesibleCm > 0
  const resto = conAccesible ? claroCm - anchoAccesibleCm : claroCm
  const normales = conAccesible ? cantidad - 1 : cantidad
  const cabinas: Cabina[] = []
  if (conAccesible) cabinas.push(nuevaCabina(anchoAccesibleCm, 'accesible', profundidadCm))
  if (normales > 0) {
    const base = snap(resto / normales)
    for (let i = 0; i < normales; i++) cabinas.push(nuevaCabina(base, 'normal', profundidadCm))
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
  /** el cuarto PMR, que se planta y deja modular solo el resto */
  cuartoPmrCm = 0,
  /**
   * Pilastras que el vendedor ya clavó a mano, por posición de frontera.
   *
   * Solo se respetan cuando la tira tiene un ESPACIO LIBRE: ahí el hueco
   * absorbe lo que sobre, así que cualquier juego de pilastras cierra y se
   * puede dejar la que él eligió. Sin hueco, las pilastras son justamente lo
   * único que puede cuadrar el claro y las decide el buscador.
   */
  fijas?: (number | null | undefined)[],
  /**
   * Las pilastras que la tira tiene AHORA MISMO.
   *
   * Hacen falta para sacarle a un orinal su medida limpia. El ancho guardado de
   * un orinal es el de su LUGAR: el orinal más lo que le toca de las piezas de
   * al lado. Si se vuelve a repartir tomando ese ancho como si fuera el orinal
   * pelado, en cada pasada se le suman otra vez esas piezas y el orinal crece
   * solo: 90 → 91,3 → 92,6… y el de la punta, que se lleva una pilastra entera,
   * ~10 cm por vez. Con eso la tira terminaba pasándose del claro por metros.
   */
  pilastrasActuales?: number[],
  /**
   * El ancho PEDIDO para cada orinal, por posición de cabina.
   *
   * El espacio entre orinales es una medida FIJA: la pone el vendedor y no se
   * negocia. Lo único que se mueve para cerrar el claro son las cabinas. Sin
   * esto, el orinal se quedaba con lo que tuviera de antes y cualquier sobrante
   * terminaba engordándolo.
   */
  orinalesPedidos?: (number | null | undefined)[],
  /**
   * Si lo que se planta se come una pilastra a muro. Ver `modularConCatalogo`:
   * el cuarto del Tipo C sí, la cabina accesible de las "variación panel" no.
   */
  cuartoComeMuro = true,
): { cabinas: Cabina[]; pilastras: number[]; canaletaCm: number; ajuste: Tramo['ajuste']; mensaje: string } | null {
  const n = cabinas.length
  if (n === 0) return null
  /** lo que le queda al resto de la tira después de plantar el cuarto */
  const murosDelResto = cuartoComeMuro ? Math.max(0, murosPilastra - 1) : murosPilastra

  // El cuarto PMR no entra en el reparto: se planta con su medida y se ajusta
  // el resto. Es la misma regla que en modularConCatalogo, y tiene que valer
  // también al cambiar una puerta.
  if (cuartoPmrCm > 0 && cabinas[0]?.tipo === 'accesible') {
    if (n === 1) {
      return { cabinas: [{ ...cabinas[0], anchoCm: cuartoPmrCm }], pilastras: [0, 0], canaletaCm: 0, ajuste: 'exacto', mensaje: 'Solo el cuarto' }
    }
    const resto = reajustarConPuertas(
      cabinas.slice(1), claroCm - cuartoPmrCm, murosDelResto, extremoAbierto,
      0, fijas ? fijas.slice(1) : undefined,
      pilastrasActuales ? pilastrasActuales.slice(1) : undefined,
      orinalesPedidos ? orinalesPedidos.slice(1) : undefined,
    )
    if (!resto) return null
    return {
      cabinas: [{ ...cabinas[0], anchoCm: cuartoPmrCm }, ...resto.cabinas],
      pilastras: [0, ...resto.pilastras],
      canaletaCm: resto.canaletaCm,
      ajuste: resto.ajuste,
      mensaje: resto.mensaje,
    }
  }

  // El ESPACIO LIBRE no es una cabina: no aporta cuerpo a la tira ni pide
  // puerta. Lo que mide sale al final, de lo que sobre del claro.
  const lugares = lugaresDe(cabinas)
  // Un hueco con medida pedida NO negocia: entra a la tira como un cuerpo más y
  // el claro lo cierran las pilastras. Los que se llevan el sobrante son solo
  // los que nadie midió.
  const absorbe = (c: Cabina) => esEspacioLibre(c) && !(c.libreCm && c.libreCm > 0)
  const libres = cabinas.filter(absorbe).length
  /**
   * El ORINAL guardado trae el ancho de su lugar, no el del orinal: hay que
   * descontarle lo que se lleva de las piezas de al lado con las pilastras que
   * la tira tiene ahora. Sin las pilastras a mano no se puede descontar nada y
   * se usa el ancho tal cual, que es como se hacía antes.
   */
  const cuerpoOrinal = (c: Cabina, i: number) => {
    // lo que pidió el vendedor manda: es una medida fija
    const pedido = orinalesPedidos?.[i]
    if (pedido != null && pedido > 0) return pedido
    if (!pilastrasActuales) return c.anchoCm
    const { izq, der } = ladosDeCabina(lugares, (k) => pilastrasActuales[k] ?? 0, i)
    return Math.max(0, Math.round((c.anchoCm - izq - der) * 10) / 10)
  }
  const cuerpoDe = (c: Cabina, i: number) =>
    esEspacioLibre(c) ? (c.libreCm ?? 0) : c.tipo === 'orinal' ? cuerpoOrinal(c, i) : c.puerta.anchoCm
  // El mismo trato cuando el cuarto CIERRA la tira, que es como queda al
  // invertir el área: se planta con su medida y se modula lo que va antes.
  if (cuartoPmrCm > 0 && cabinas[n - 1]?.tipo === 'accesible') {
    const resto = reajustarConPuertas(
      cabinas.slice(0, n - 1), claroCm - cuartoPmrCm, murosDelResto, extremoAbierto,
      0, fijas ? fijas.slice(0, n) : undefined,
      pilastrasActuales ? pilastrasActuales.slice(0, n) : undefined,
      orinalesPedidos ? orinalesPedidos.slice(0, n - 1) : undefined,
    )
    if (!resto) return null
    return {
      cabinas: [...resto.cabinas, { ...cabinas[n - 1], anchoCm: cuartoPmrCm }],
      pilastras: [...resto.pilastras, 0],
      canaletaCm: resto.canaletaCm,
      ajuste: resto.ajuste,
      mensaje: resto.mensaje,
    }
  }

  const cuerpos = cabinas.map(cuerpoDe)
  const conPuerta = cabinas.filter((c) => c.tipo !== 'orinal' && !esEspacioLibre(c)).length
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
    huecoLibre: libres > 0,
  })
  if (!r) return null

  // La lista lleva una entrada por frontera: donde va mampara, su grueso.
  //
  // Las PUNTAS del campo de orinales no llevan pilastra: llevan la mampara de
  // cierre, o nada si ese lado topa contra la pared. Poniéndoles la pilastra
  // que devuelve el buscador —que no sabe del campo— el último orinal se comía
  // esa pilastra entera y su cota saltaba de 90 a 110 y pico. Lo que había en
  // esa frontera es lo que vale, así que se conserva.
  const puntaDeOrinales = (i: number) => cabinas[i]?.tipo === 'orinal'
  const pilastras: number[] = [
    puntaDeOrinales(0) ? (pilastrasActuales?.[0] ?? GRUESO_MG_PIEZA) : r.pilastras[0],
  ]
  let k = 1
  for (let i = 0; i < n - 1; i++) {
    const entreOrinales = cabinas[i].tipo === 'orinal' && cabinas[i + 1].tipo === 'orinal'
    pilastras.push(entreOrinales ? GRUESO_MG_PIEZA : r.pilastras[k++])
  }
  pilastras.push(
    puntaDeOrinales(n - 1)
      ? (pilastrasActuales?.[n] ?? GRUESO_MG_PIEZA)
      : r.pilastras[r.pilastras.length - 1],
  )

  // Con un hueco en la tira, la pilastra que el vendedor clavó a mano se
  // respeta tal cual: lo que cambie de largo se lo come el espacio libre.
  if (libres > 0 && fijas) {
    for (let k = 0; k < pilastras.length; k++) {
      const f = fijas[k]
      // una frontera del campo de orinales no es una pilastra que se pueda
      // clavar: ahí va mampara, o la de cierre en las puntas
      const delCampo = entreDosOrinales(lugares, k) || (k === 0 && puntaDeOrinales(0)) || (k === n && puntaDeOrinales(n - 1))
      if (f != null && f > 0 && !delCampo) pilastras[k] = f
    }
  }

  const nuevas = cabinas.map((c, i) => {
    const { izq, der } = ladosDeCabina(lugares, (k) => pilastras[k], i)
    return { ...c, anchoCm: izq + cuerpos[i] + der }
  })

  // Lo que sobró del claro es, justamente, el ESPACIO LIBRE: se lo reparten los
  // huecos que haya. Con esto la tira cierra sola y las cabinas conservan su
  // medida natural —puerta más lo que les toca de pilastra— en vez de estirarse
  // para tapar el claro.
  if (libres > 0) {
    const piezas = cuerpos.reduce((s, x) => s + x, 0) + pilastras.reduce((s, x) => s + x, 0)
    const sobra = Math.max(0, snap((r.claroAjustado - piezas) / libres))
    for (let i = 0; i < nuevas.length; i++) {
      if (absorbe(cabinas[i])) nuevas[i] = { ...nuevas[i], anchoCm: snap(nuevas[i].anchoCm + sobra) }
    }
  }

  return {
    cabinas: nuevas,
    pilastras,
    canaletaCm: r.canaleta?.anchoCm ?? 0,
    ajuste: r.ajuste,
    mensaje: r.mensaje,
  }
}

/**
 * Cómo se reparte el FONDO en el divisor del cuarto accesible: panel, puerta y
 * la pilastra que cierra contra el muro.
 *
 * Quién se estira: la PILASTRA se elige —se arrastra igual que las de la tira—
 * y el PANEL se lleva lo que quede. Antes era al revés, con el panel clavado al
 * fondo de las demás cabinas y la pilastra redondeada a una medida de catálogo:
 * cuando no daba justo, el divisor no cerraba y solo quedaba un aviso. Así
 * cierra siempre, y el panel del cuarto queda más largo que los de los baños
 * normales, que es como se fabrica.
 *
 * Vive acá y no en el dibujo porque lo necesitan el plano, el despiece y la
 * cotización, y tienen que dar los tres el mismo número.
 */
export function divisorDelCuarto(
  cabina: Cabina,
  config: Config,
  profundidadLugarCm: number,
): { puerta: number; pilastra: number; panel: number } {
  const puerta = Math.max(0, cabina.puerta.anchoCm || config.puertaAccesibleCm || 90)
  const sobra = Math.round((profundidadLugarCm - config.profundidadCm - puerta) * 10) / 10
  /** la que salía antes: es el punto de partida de los planos ya guardados */
  const deAntes = sobra > 0 ? medidaCercana(ANCHOS_PILASTRA, sobra) : 0
  const pedida = config.pilastraPmrCm
  const pilastra = pedida != null && pedida > 0 ? pedida : deAntes
  return { puerta, pilastra, panel: Math.round((profundidadLugarCm - puerta - pilastra) * 10) / 10 }
}

/** la pilastra lateral con la que arranca el frente de la cabina accesible */
export const PILASTRA_LATERAL_MR_CM = 19

/**
 * Las medidas con las que puede salir una lateral del frente, de la que más se
 * usa a la que menos: la hoja de LEEDER las dibuja de 19, y de ahí para abajo
 * están las que permiten cerrar un frente angosto.
 */
const LATERALES_MR = [19, 24, 17, 15, 12, 10]

/** lo menos que puede quedarle a la pieza del FRENTE para que valga la pena */
const FRENTE_MR_MIN_CM = 10

/**
 * Qué medida les toca a las dos pilastras del frente de la accesible.
 *
 * NO se preguntan: las elige la modulación, igual que las de la tira. Se
 * arranca con las 19 de la hoja de LEEDER y solo se bajan cuando con esas la
 * pieza del frente quedaría demasiado angosta o no entraría. Si después no
 * calza, se cambian sobre el plano con clic derecho.
 */
export function lateralesDelFrente(anchoCm: number, puertaCm: number): number {
  const resto = anchoCm - puertaCm
  for (const minimo of [FRENTE_MR_MIN_CM, 0.1]) {
    for (const p of LATERALES_MR) {
      if (resto - 2 * p >= minimo) return p
    }
  }
  return Math.min(...LATERALES_MR)
}

/**
 * Cómo se reparte el FRENTE de la cabina de movilidad reducida en las
 * tipologías "variación panel": pilastra lateral, frente y puerta.
 *
 * Es el mismo reparto que el divisor del Tipo C, pero sobre el ANCHO en vez de
 * sobre el fondo, porque acá se entra por el frente. Quién se estira es el
 * FRENTE: la pilastra lateral y la puerta son medidas que se eligen, y lo que
 * quede es la pieza del frente —pilastra si entra en el catálogo del modelo, y
 * panel si se pasa—.
 *
 * La hoja de LEEDER lo dibuja como 19 + 85 + 100 sobre 204 de ancho.
 *
 * Vive acá y no en el dibujo porque lo necesitan el plano, el despiece y la
 * cotización, y los tres tienen que dar el mismo número.
 */
export function frenteAccesible(
  cabina: Cabina,
  config: Config,
): { pilastra: number; frente: number; puerta: number; cierre: number } {
  const puerta = Math.max(0, cabina.puerta.anchoCm || config.puertaAccesibleCm || 100)
  // La medida que salga de la modulación, salvo que el vendedor la haya
  // cambiado a mano sobre el plano.
  const automatica = lateralesDelFrente(cabina.anchoCm, puerta)
  const pedida = config.pilastraLateralMrCm
  const pilastra = pedida != null && pedida > 0 ? pedida : automatica
  // Una puerta NUNCA cierra contra un panel: cierra contra una pilastra. Así
  // que del lado del panel divisor va otra lateral, la de cierre, y la puerta
  // queda entre las dos. Sin ella, la hoja topaba contra el canto del panel.
  //
  // No tienen por qué medir lo mismo: la de cierre se elige aparte y, si no se
  // eligió, sale igual que la lateral.
  const pedidaCierre = config.pilastraCierreMrCm
  const cierre = pedidaCierre != null && pedidaCierre > 0 ? pedidaCierre : pilastra
  return {
    pilastra,
    puerta,
    cierre,
    frente: Math.round((cabina.anchoCm - puerta - pilastra - cierre) * 10) / 10,
  }
}

/**
 * El FONDO de la cabina de movilidad reducida. Nunca es menor que el de las
 * cabinas normales: el receso sería negativo.
 */
export function profundidadAccesible(config: Config): number {
  return Math.max(config.profundidadAccesibleCm ?? config.profundidadCm, config.profundidadCm)
}

/** el RECESO: cuánto más honda es la cabina accesible que las demás */
export function recesoDe(config: Config): number {
  return Math.round((profundidadAccesible(config) - config.profundidadCm) * 10) / 10
}

/**
 * Los números con los que se le pide una modulación a un tramo: cuántas
 * pilastras se apoyan en algo fijo, qué se planta sin negociar, y si eso que se
 * planta se come un muro.
 *
 * Vive en un solo lugar porque lo piden cuatro caminos distintos —crear el
 * área, cambiar una puerta, arrastrar una pilastra, tocar un orinal— y cuando
 * la cuenta estaba copiada en cada uno se desincronizaban.
 */
export function pedidoDeModulacion(
  tramo: { muroInicio: boolean; muroFin: boolean },
  config: Config,
  llevaAccesible: boolean,
): { murosPilastra: number; cuartoCm: number; cuartoComeMuro: boolean; extremoAbierto: boolean } {
  const muros = (tramo.muroInicio ? 1 : 0) + (tramo.muroFin ? 1 : 0)
  // Un extremo ABIERTO —sin muro— perdona que las piezas queden algo cortas:
  // ahí no hay nada contra lo que tengan que topar. Se mira la pared de verdad,
  // no el descuento: en una "variación panel" el descuento sube porque el panel
  // cuenta como pared, pero la punta de la tira sigue estando abierta o no
  // según haya muro.
  const extremoAbierto = muros < 2
  if (esVariacionPanel(config.tipologia)) {
    // El panel de la cabina accesible cuenta como una pared más: la tira le
    // apoya encima su pilastra lateral y se come el mismo centímetro de
    // herraje. Por eso en la U se descuentan 3 y no 2.
    // la accesible se planta en una punta, así que la que puede quedar abierta
    // es la otra: la del final de la tira
    return {
      murosPilastra: muros + 1,
      cuartoCm: anchoAccesibleDe(config),
      cuartoComeMuro: false,
      extremoAbierto: !tramo.muroFin,
    }
  }
  if (config.tipologia === 'PMR' && llevaAccesible) {
    return { murosPilastra: muros, cuartoCm: anchoAccesibleDe(config), cuartoComeMuro: true, extremoAbierto }
  }
  return { murosPilastra: muros, cuartoCm: 0, cuartoComeMuro: true, extremoAbierto }
}

/**
 * Mover UNA pilastra sin que se mueva toda la tira.
 *
 * Arrastrar una pilastra volvía a repartir TODAS: se tocaba una y se
 * reacomodaban las otras cuatro, así que el plano se desarmaba debajo de la
 * mano y había que rehacer lo ya ajustado. Acá se prueba primero lo que
 * cualquiera espera: que la diferencia la absorba UNA vecina y el resto quede
 * intacto.
 *
 * Se busca de adentro hacia afuera —primero la de al lado— y solo sirve una
 * medida que exista en el catálogo para esa posición. Devuelve null si ninguna
 * puede absorberla: ahí sí hay que volver a buscar toda la tira.
 *
 * Se queda afuera lo que no es una tira de puros baños —orinales o espacios
 * libres—, porque ahí el ancho de un lugar no sale de las pilastras y el
 * reparto es otro.
 */
export function compensarPilastra(
  tramo: Tramo,
  config: Config,
  indice: number,
  anchoCm: number,
  /** las que el vendedor ya clavó: esas no se tocan */
  fijas: number[] = [],
): { pilastras: number[]; cabinas: Cabina[] } | null {
  const actual = tramo.pilastras
  const n = tramo.cabinas.length
  if (!actual || actual.length !== n + 1) return null
  if (tramo.cabinas.some((c) => c.tipo === 'orinal' || esEspacioLibre(c))) return null
  if (indice < 0 || indice > n) return null

  const delta = Math.round((anchoCm - (actual[indice] ?? 0)) * 10) / 10
  if (delta === 0) return null

  /** las medidas de catálogo que se pueden poner en esa frontera */
  const posibles = (k: number): number[] => {
    const extremo = k === 0 || k === n
    return anchosPilastra(config.modelo).filter(
      (a) => extremo || PILASTRAS_INTERNAS.includes(a) || esEspecial('PL', a, config.modelo),
    )
  }

  // de adentro hacia afuera: la de al lado primero
  const orden: number[] = []
  for (let d = 1; d <= n; d++) {
    if (indice - d >= 0) orden.push(indice - d)
    if (indice + d <= n) orden.push(indice + d)
  }

  for (const j of orden) {
    if (j === indice || fijas.includes(j)) continue
    // la frontera de la cabina accesible plantada no lleva pilastra de tira
    if ((actual[j] ?? 0) <= 0) continue
    const quiere = Math.round(((actual[j] ?? 0) - delta) * 10) / 10
    if (quiere <= 0 || !posibles(j).includes(quiere)) continue

    const pilastras = [...actual]
    pilastras[indice] = anchoCm
    pilastras[j] = quiere
    return { pilastras, cabinas: anchosConPilastras(tramo, pilastras) }
  }
  return null
}

/**
 * El ancho de cada cabina con un juego de pilastras dado. No busca nada: las
 * medidas son las que se le pasan.
 *
 * La cabina accesible PLANTADA no se recalcula: su ancho no sale de las
 * pilastras de la tira —su frontera vale 0— sino de la medida que se le pidió.
 */
function anchosConPilastras(tramo: Tramo, pilastras: number[]): Cabina[] {
  const lugares = lugaresDe(tramo.cabinas)
  const arranca = tramo.cabinas[0]?.tipo === 'accesible' && (tramo.pilastras?.[0] ?? 0) === 0
  const pil = (k: number) => pilastras[k] ?? 0
  return tramo.cabinas.map((c, i) => {
    if (c.tipo === 'accesible' && (arranca || i === tramo.cabinas.length - 1)) return c
    const { izq, der } = ladosDeCabina(lugares, pil, i, arranca)
    return { ...c, anchoCm: snap(izq + c.puerta.anchoCm + der) }
  })
}

/**
 * Las piezas de FRENTE de un tramo que pasan de la medida en la que hay que
 * darles soporte.
 *
 * Devuelve una descripción por pieza para poder avisarlo mientras se modula.
 * No cambia nada del plano: qué soporte se usa —costilla, refuerzo o sándwich—
 * y de qué medida lo decide el cliente en la cotización.
 */
export function piezasQuePidenCostilla(tramo: Tramo, config: Config): string[] {
  const avisos: string[] = []
  const n = tramo.cabinas.length

  // las pilastras y paneles de frente de la tira
  ;(tramo.pilastras ?? []).forEach((ancho, k) => {
    if (!ancho || ancho <= PIEZA_PIDE_COSTILLA_CM) return
    const familia = familiaDelFrente(ancho, config.modelo)
    const donde = k === 0 ? 'de arranque' : k === n ? 'de cierre' : `entre la ${k} y la ${k + 1}`
    avisos.push(`${familia === 'PN' ? 'El panel' : 'La pilastra'} ${donde}, de ${ancho} cm`)
  })

  // y la pieza del frente de la cabina accesible, en las "variación panel"
  if (esVariacionPanel(config.tipologia)) {
    const acc = tramo.cabinas.find((c) => c.tipo === 'accesible')
    if (acc) {
      const f = frenteAccesible(acc, config)
      if (f.frente > PIEZA_PIDE_COSTILLA_CM) {
        const familia = familiaDelFrente(f.frente, config.modelo)
        avisos.push(`${familia === 'PN' ? 'El panel' : 'La pilastra'} del frente de la accesible, de ${f.frente} cm`)
      }
    }
  }
  return avisos
}

/** la profundidad del lugar, que nunca puede ser menor que la de la cabina */
export function profundidadDelLugar(config: Config): number {
  return Math.max(config.profundidadLugarCm ?? config.profundidadCm, config.profundidadCm)
}

/** cuántas pilastras lleva un tramo: una por divisor interno y una en cada extremo */
/**
 * Un lugar de la tira, visto desde las piezas que lo rodean.
 */
export interface Lugar {
  /** es un orinal: entre dos de ellos va mampara, no pilastra */
  orinal: boolean
  /** es un ESPACIO LIBRE: un hueco sin puerta, que no llega a ser cabina */
  libre: boolean
}

/**
 * Un lugar SIN PUERTA que no es orinal ni el cuarto accesible no es una cabina:
 * es un ESPACIO LIBRE. Se deja abierto a propósito —un paso, un lavamanos, una
 * columna que se respeta— y por eso no se modula como cabina: no pide puerta y
 * se lleva lo que sobre del claro.
 */
export function esEspacioLibre(c: Cabina): boolean {
  return c.tipo !== 'orinal' && c.tipo !== 'accesible' && c.puerta.tipo === 'ninguna'
}

/** la frontera k cae entre dos orinales: ahí va mampara, no pilastra */
function entreDosOrinales(lugares: Lugar[], k: number): boolean {
  return k > 0 && k < lugares.length && lugares[k - 1].orinal && lugares[k].orinal
}

export function lugaresDe(cabinas: Cabina[]): Lugar[] {
  return cabinas.map((c) => ({ orinal: c.tipo === 'orinal', libre: esEspacioLibre(c) }))
}

/**
 * De quién es la pilastra de la frontera `k`: entera de la cabina de la
 * IZQUIERDA, entera de la de la DERECHA, o media para cada una.
 *
 * Casi todas se parten por la mitad: son las CENTRALES, que el dibujo pone a
 * caballo del corte. Van enteras para un solo lado —son LATERALES— cuando del
 * otro lado no hay una cabina que las comparta:
 *
 *   · las dos de punta, que apoyan contra el muro;
 *   · la que cierra la tira de baños contra el campo de orinales, porque el
 *     campo empieza DESPUÉS de ella;
 *   · la que sale del CUARTO ACCESIBLE, que cierra con su propio divisor;
 *   · la que toca un ESPACIO LIBRE: ahí no hay cabina que se lleve la mitad,
 *     así que apoya entera del lado de la cabina que sí tiene puerta.
 *
 * Esta es la ÚNICA cuenta de laterales que hay: de acá salen tanto el ancho de
 * cada cabina como el centro con el que se dibuja la pilastra. Cuando estaba
 * copiada en el dibujo, en el PDF y en las cotas, se desincronizaron.
 */
export function ladoDePilastra(
  lugares: Lugar[],
  k: number,
  /** en qué lugar está el cuarto accesible, o -1 si el área no lo lleva */
  indiceCuarto = -1,
): 'izq' | 'der' | 'mitades' {
  const n = lugares.length
  if (k <= 0) return 'der'
  if (k >= n) return 'izq'
  if (!lugares[k - 1].orinal && lugares[k].orinal) return 'izq'
  // La que separa el cuarto de la tira es LATERAL, y apoya del lado de la
  // TIRA: si el cuarto arranca, hacia la derecha; si el cuarto cierra —área
  // invertida—, hacia la izquierda.
  if (indiceCuarto >= 0 && k === indiceCuarto + 1) return 'der'
  if (indiceCuarto >= 0 && k === indiceCuarto && indiceCuarto === n - 1) return 'izq'
  if (lugares[k - 1].libre && !lugares[k].libre) return 'der'
  if (lugares[k].libre && !lugares[k - 1].libre) return 'izq'
  return 'mitades'
}

/**
 * Lo que cada cabina se lleva de las piezas que tiene a los lados.
 *
 * Una pilastra central la comparten las dos cabinas vecinas, media para cada
 * una; una lateral va entera de un solo lado. Quién es cuál lo decide
 * `ladoDePilastra`.
 */
export function ladosDeCabina(
  lugares: Lugar[],
  pilastra: (k: number) => number,
  i: number,
  /**
   * La primera cabina es el CUARTO PMR. Su pilastra no se parte entre los dos
   * lados: cierra el cuarto y arranca la tira, así que va entera del lado de la
   * cabina. Partida, el dibujo se come media pilastra del cuarto y el cuarto
   * deja de medir lo que dice su cota.
   */
  arrancaElCuarto = false,
): { izq: number; der: number } {
  const cuarto = arrancaElCuarto ? 0 : -1
  const lado = (k: number) => ladoDePilastra(lugares, k, cuarto)
  // la frontera izquierda de la cabina es la i; si la pilastra es de la cabina
  // de la derecha, esa cabina es justamente esta
  const dIzq = lado(i)
  const izq = dIzq === 'der' ? pilastra(i) : dIzq === 'izq' ? 0 : pilastra(i) / 2
  const dDer = lado(i + 1)
  const der = dDer === 'izq' ? pilastra(i + 1) : dDer === 'der' ? 0 : pilastra(i + 1) / 2
  return { izq, der }
}

/** si la tira arranca con el cuarto PMR, que no comparte su pilastra */
export function arrancaElCuartoPmr(tramo: Tramo, config: Config): boolean {
  return llevaAccesibleSiempre(config.tipologia) && tramo.cabinas[0]?.tipo === 'accesible'
}

/**
 * El cuarto accesible cierra la tira en vez de arrancarla.
 *
 * Pasa al INVERTIR el área: el cuarto se va al otro extremo. Todo lo que vale
 * para el cuarto —que contra ese muro no va pilastra, que la que lo separa de
 * la tira es lateral, que su panel es el del divisor— sigue valiendo, pero
 * mirando hacia el otro lado.
 */
export function cierraElCuartoPmr(tramo: Tramo, config: Config): boolean {
  const n = tramo.cabinas.length
  return llevaAccesibleSiempre(config.tipologia) && n > 1 && tramo.cabinas[n - 1]?.tipo === 'accesible'
}

/** en qué punta está el cuarto accesible, o null si el área no lo lleva */
export function ladoDelCuarto(tramo: Tramo, config: Config): 'inicio' | 'fin' | null {
  if (arrancaElCuartoPmr(tramo, config)) return 'inicio'
  if (cierraElCuartoPmr(tramo, config)) return 'fin'
  return null
}

/**
 * Voltea un tramo como en un espejo: la última cabina pasa a ser la primera,
 * las puertas cambian de mano y los muros se intercambian.
 *
 * NO re-modula: son las mismas piezas en otro orden, así que el despiece tiene
 * que salir idéntico. El PANEL sí se corre una posición, porque cada cabina
 * guarda el divisor que tiene A SU DERECHA y al espejar ese divisor pasa a
 * quedarle a la izquierda, o sea que es el de la cabina anterior.
 */
export function invertirTramo(tramo: Tramo): Tramo {
  const alReves = [...tramo.cabinas].reverse()
  const paneles = alReves.map((_, i) => alReves[i + 1]?.panel ?? tramo.cabinas[0].panel)
  return {
    ...tramo,
    muroInicio: tramo.muroFin,
    muroFin: tramo.muroInicio,
    pilastras: tramo.pilastras ? [...tramo.pilastras].reverse() : undefined,
    cabinas: alReves.map((c, i) => ({
      ...c,
      puerta: { ...c.puerta, mano: c.puerta.mano === 'der' ? 'izq' : 'der' },
      panel: paneles[i],
    })),
  }
}

/** entre dos orinales va un mingitorio, no una pilastra ni un panel de cabina */
function entreOrinales(tramo: Tramo, i: number): boolean {
  return tramo.cabinas[i]?.tipo === 'orinal' && tramo.cabinas[i + 1]?.tipo === 'orinal'
}

/**
 * Si la frontera k cae DENTRO del campo de orinales, donde no hay pilastras: las
 * de entre dos orinales y las puntas del propio campo.
 *
 * La frontera entre el último baño y el primer orinal NO es del campo: ahí va la
 * pilastra lateral con la que cierra la tira de baños.
 */
export function fronteraDeOrinal(tramo: Tramo, k: number): boolean {
  const n = tramo.cabinas.length
  if (k <= 0) return tramo.cabinas[0]?.tipo === 'orinal'
  if (k >= n) return tramo.cabinas[n - 1]?.tipo === 'orinal'
  return tramo.cabinas[k - 1]?.tipo === 'orinal' && tramo.cabinas[k]?.tipo === 'orinal'
}

/**
 * Una tira que termina en orinal y no tiene muro de ese lado cierra con un
 * MINGITORIO, no con pilastra terminal más panel de cierre: es como lo arma el
 * Constructor viejo. Se reconoce por la pieza que quedó en esa frontera.
 */
export function cierraConMingitorio(tramo: Tramo): boolean {
  const n = tramo.cabinas.length
  if (n === 0 || tramo.muroFin) return false
  if (tramo.cabinas[n - 1].tipo !== 'orinal') return false
  const ultima = tramo.pilastras?.[n]
  return ultima === undefined || ultima <= GRUESO_MG_CM + 0.01
}

/**
 * Lo mismo que `cierraConMingitorio` pero del otro lado: el campo de orinales
 * ARRANCA la tira y ese extremo no topa contra pared, así que lleva mampara de
 * cierre. Pasa al invertir el área.
 */
export function arrancaConMingitorio(tramo: Tramo): boolean {
  const n = tramo.cabinas.length
  if (n === 0 || tramo.muroInicio) return false
  if (tramo.cabinas[0].tipo !== 'orinal') return false
  const primera = tramo.pilastras?.[0]
  return primera === undefined || primera <= GRUESO_MG_CM + 0.01
}

/**
 * El claro que ocupa un campo de solo orinales. Acá el claro NO se pide: lo
 * define la cantidad de orinales y su ancho, porque la tira no lleva pilastras
 * que puedan absorber una diferencia. Son los espacios, las mamparas que los
 * separan, la de cierre si ese lado no topa contra pared, y el herraje de los
 * muros que sí toca.
 */
export function claroDeOrinales(
  cantidad: number,
  anchoOrinalCm: number,
  muroInicio: boolean,
  muroFin: boolean,
): number {
  const muros = (muroInicio ? 1 : 0) + (muroFin ? 1 : 0)
  return (
    cantidad * anchoOrinalCm +
    Math.max(0, cantidad - 1) * GRUESO_MG_CM +
    (muroFin ? 0 : GRUESO_MG_CM) +
    (muroInicio ? 0 : GRUESO_MG_CM) +
    muros
  )
}

/**
 * La mampara que va a la DERECHA de la cabina `i`, o null si ahí no va ninguna.
 *
 * Va contando cuántas la preceden en la tira para poder pedir la medida que el
 * vendedor eligió para esa posición. La regla de cuándo lleva mampara es la
 * misma del despiece y de la cotización: entre dos orinales, y una más si la
 * tira termina en orinal contra un extremo sin muro. Se resuelve en un solo
 * lugar para que el plano, el PDF y el CSV no puedan discrepar.
 */
export function mamparaEn(tramo: Tramo, config: Config, i: number): MedidaMG | null {
  let n = 0
  for (let k = 0; k < tramo.cabinas.length; k++) {
    if (tramo.cabinas[k].tipo !== 'orinal') continue
    const esUltima = k === tramo.cabinas.length - 1
    const lleva =
      tramo.cabinas[k + 1]?.tipo === 'orinal' || (esUltima && cierraConMingitorio(tramo))
    if (!lleva) continue
    if (k === i) return mamparaDe(config, n)
    n++
  }
  return null
}

export function pilastrasDe(tramo: Tramo): number {
  const n = tramo.cabinas.length
  if (n === 0) return 0
  // una por frontera, menos las que caen en el campo de orinales
  let cuantas = 0
  for (let k = 0; k <= n; k++) if (!fronteraDeOrinal(tramo, k)) cuantas += 1
  return cuantas
}

export function panelesDe(tramo: Tramo): number {
  const n = tramo.cabinas.length
  if (n === 0) return 0
  let paneles = 0
  for (let i = 0; i < n - 1; i++) if (!entreOrinales(tramo, i)) paneles += 1
  if (!tramo.muroInicio) paneles += 1
  // un orinal contra el extremo abierto no lleva panel de cierre: da a la nada
  if (!tramo.muroFin && tramo.cabinas[n - 1]?.tipo !== 'orinal') paneles += 1
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
  const conAccesible = llevaAccesibleSiempre(tipologiaId) || config.llevaAccesible === true
  const soloOrinales = esSoloOrinales(tipologiaId)
  /**
   * Los orinales se suman APARTE de las cabinas y van a un costado, como en el
   * Constructor viejo: la cantidad que pidió el vendedor son baños cerrados, y
   * los orinales se agregan al final de la tira. Entre dos orinales va una
   * mampara, no una pilastra.
   */
  const nOrinales = soloOrinales ? 0 : Math.max(0, config.orinales ?? 0)
  return tipo.tramos.map((t, i) => {
    // el claro y la cantidad que dio el vendedor van al tramo principal;
    // los secundarios arrancan con una medida de partida que después se arrastra
    const esPrincipal = i === tipo.principal
    const cant = esPrincipal ? cantidad : 2
    // los orinales solo van en el tramo principal, al costado de los baños
    const ming = esPrincipal ? nOrinales : 0
    const total = cant + ming
    // En un área de solo orinales el vendedor da la cantidad, no el claro: la
    // tira mide los orinales, las mamparas que los separan y las dos pilastras
    // de los extremos, que también son piezas de catálogo.
    const murosT = (t.muroInicio ? 1 : 0) + (t.muroFin ? 1 : 0)
    const anchoOrinal = config.anchoOrinalCm && config.anchoOrinalCm > 0 ? config.anchoOrinalCm : 60
    // Un área de solo orinales no lleva pilastras: son los espacios y los
    // mingitorios que los separan, más el de cierre si ese lado no tiene muro.
    const claroOrinales = claroDeOrinales(cant, anchoOrinal, t.muroInicio, t.muroFin)
    const claroTramo = soloOrinales ? claroOrinales : esPrincipal ? claroCm : LARGO_SECUNDARIO_CM
    const base = {
      id: nuevoId('tramo'),
      nombre: t.nombre,
      orientacion: t.orientacion,
      claroCm: claroTramo,
      muroInicio: t.muroInicio,
      muroFin: t.muroFin,
    }
    // El cuarto PMR arranca contra el muro SIN pilastra: ese muro no se come el
    // medio centímetro de herraje, así que tampoco cuenta para el claro ajustado.
    // En una "variación panel" es al revés: el panel suma uno.
    const pedido = pedidoDeModulacion(t, config, conAccesible && esPrincipal)
    const planta = esPrincipal && pedido.cuartoCm > 0
    const sinPilastraInicio = planta && pedido.cuartoComeMuro
    // Cuando lo que se planta NO se come un muro —las "variación panel"— el
    // descuento entero se lo lleva el resto de la tira, panel incluido.
    const murosConPilastra = pedido.cuartoComeMuro
      ? Math.max(0, murosT - (sinPilastraInicio ? 1 : 0))
      : pedido.murosPilastra

    // La cabina accesible ya no tiene camino aparte: es una cabina con puerta
    // ancha, así que sale del mismo buscador que las demás.
    // Si el cliente pidió una medida de puerta, esa manda: el buscador solo
    // puede mover las pilastras. Es la regla del negocio, no una preferencia.
    const conCatalogo = modularConCatalogo(claroTramo, soloOrinales ? cant : total, murosConPilastra, pedido.extremoAbierto, { puerta: config.puertaCm, puertaAccesible: config.puertaAccesibleCm }, {
      modelo: config.modelo,
      profundidadCm: config.profundidadCm,
      accesible: conAccesible && esPrincipal,
      sinPilastraInicio,
      anchoAccesibleMinCm: anchoAccesibleDe(config),
      mingitorios: soloOrinales ? cant : ming,
      anchoOrinalCm: config.anchoOrinalCm,
      anchosOrinalCm: config.anchosOrinalCm,
      // si la tira termina en orinal y de ese lado no hay muro, cierra con mingitorio
      cierreMingitorio: !t.muroFin && (soloOrinales ? cant : ming) > 0,
      cierreMingitorioInicio: soloOrinales && !t.muroInicio,
      // el cuarto PMR, o la cabina accesible de una "variación panel", se
      // planta y solo se modula el resto
      cuartoPmrCm: planta ? pedido.cuartoCm : 0,
      cuartoComeMuro: pedido.cuartoComeMuro,
      pais,
    })
    if (!conCatalogo) {
      return {
        ...base,
        cabinas: soloOrinales
          ? orinales(cant)
          : modular(claroTramo, cant, conAccesible && esPrincipal ? anchoAccesibleDe(config) : 0, config.profundidadCm),
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
  precios: {
    moneda: Moneda
    tipoCambio: number
    tarifas?: TablaTarifas
    pais?: Pais
    /** cabinas de TODO el proyecto; México cambia de precio a partir de 10 */
    modulos?: number
  } = {
    moneda: 'USD',
    tipoCambio: 1,
  },
): RenglonBOM[] {
  const renglones: RenglonBOM[] = []
  const opciones = {
    modeloCodigo: config.modelo,
    // el país importa, y la línea también: en México un mismo color puede ser
    // Grupo 1 en Superior y Grupo 2 en LEEDER
    tier: tierDeColor(config.color, precios.pais, config.linea),
    moneda: precios.moneda,
    tipoCambio: precios.tipoCambio,
    tarifas: precios.tarifas,
    modulos: precios.modulos,
  }
  const puertas = new Map<number, number>()
  // Las pilastras ya no son todas del mismo ancho: la modulación elige la
  // medida de catálogo que le toca a cada posición, así que se cuentan por
  // ancho para que la cotización cobre los m² de verdad.
  const pilastrasPorAncho = new Map<number, number>()
  /**
   * Lo que va al frente pero NO es pilastra: pasado el tope del catálogo —120
   * cm de pilastra— la pieza que cierra es un PANEL. Se cuentan aparte porque
   * se cobran con la tarifa de panel y salen con su propio código.
   */
  const panelesDeFrentePorAncho = new Map<number, number>()
  let paneles = 0
  /** los paneles de cuarto PMR, que miden distinto que los de las cabinas normales */
  const panelesDelCuarto = new Map<number, number>()
  /**
   * Las mamparas se cuentan DESDE LA TIRA, igual que las pilastras y las
   * puertas, y agrupadas por medida porque ya no tienen por qué ser todas
   * iguales. Antes salían de `config.orinales - 1`, un contador que en un área
   * de solo orinales vale 0 —los orinales son las cabinas, no un extra al
   * costado—, así que esas áreas se cotizaban VACÍAS: cero renglones.
   */
  const mamparasPorMedida = new Map<string, number>()

  for (const tramo of tramos) {
    const n = pilastrasDe(tramo)
    for (let i = 0; i < n; i++) {
      const ancho = tramo.pilastras?.[i] ?? config.anchoPilastraCm
      const donde = familiaDelFrente(ancho, config.modelo) === 'PN' ? panelesDeFrentePorAncho : pilastrasPorAncho
      donde.set(ancho, (donde.get(ancho) ?? 0) + 1)
    }
    // El panel del cuarto PMR es más largo que los otros, así que se cuenta
    // aparte: cobrarlo con el fondo de las demás cabinas sería cobrar de menos.
    const acc = config.tipologia === 'PMR' ? tramo.cabinas.find((c) => c.tipo === 'accesible') : undefined
    const delCuarto = acc ? divisorDelCuarto(acc, config, profundidadDelLugar(config)) : null
    if (delCuarto && delCuarto.panel > 0 && delCuarto.panel !== config.profundidadCm) {
      panelesDelCuarto.set(delCuarto.panel, (panelesDelCuarto.get(delCuarto.panel) ?? 0) + 1)
      paneles += panelesDe(tramo) - 1
    } else {
      paneles += panelesDe(tramo)
    }
    let nMg = 0
    tramo.cabinas.forEach((cab, i) => {
      if (cab.puerta.tipo === 'puerta' && cab.tipo !== 'orinal') {
        puertas.set(cab.puerta.anchoCm, (puertas.get(cab.puerta.anchoCm) ?? 0) + 1)
      }
      if (cab.tipo !== 'orinal') return
      // misma regla que el despiece: mampara entre dos orinales, y una más si la
      // tira termina en orinal contra un extremo sin muro
      const esUltima = i === tramo.cabinas.length - 1
      const lleva =
        tramo.cabinas[i + 1]?.tipo === 'orinal' || (esUltima && cierraConMingitorio(tramo))
      if (!lleva) return
      const mg = mamparaDe(config, nMg++)
      const clave = `${mg.anchoCm}x${mg.altoCm}`
      mamparasPorMedida.set(clave, (mamparasPorMedida.get(clave) ?? 0) + 1)
    })
  }

  // Los orinales de los proyectos viejos no entraban en la tira: venían como un
  // contador aparte. Ahí se siguen contando así, pero solo si la tira no trae
  // ninguno, para no cobrarlos dos veces.
  if (mamparasPorMedida.size === 0 && config.orinales > 1) {
    const mg = mamparaDe(config, 0)
    mamparasPorMedida.set(`${mg.anchoCm}x${mg.altoCm}`, config.orinales - 1)
  }

  /**
   * Un proyecto de la planta de MEXICO vendido en otra moneda no tiene tarifa
   * exacta: sus colores salen del catalogo mexicano, con Grupo 1, Grupo 2,
   * Formica y Arte, y la lista en dolares o colones solo tiene linea y
   * especiales. El precio sale igual —los cuatro caen en especiales— pero se
   * marca como estimado para que se vea en la cotizacion en vez de pasar
   * callado.
   */
  const tarifaExacta = !(precios.pais === 'MX' && precios.moneda !== 'MXN')
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
      tarifaReal: tarifaExacta,
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
      tarifaReal: tarifaExacta,
    })
  }
  // Un panel de frente se cobra con la tarifa de PANEL, no de pilastra: es otra
  // pieza y otro precio por m².
  for (const [ancho, cantidad] of [...panelesDeFrentePorAncho.entries()].sort((a, b) => a[0] - b[0])) {
    renglones.push({
      sku: `${codigoLinea}-PN${ancho}`,
      descripcion: `Panel de frente ${ancho} × ${altoPil} cm`,
      tipo: 'Panel',
      cantidad,
      precioUnit: precioPieza({ familia: 'PN', anchoCm: ancho, altoCm: altoPil }, opciones),
      tarifaReal: tarifaExacta,
    })
  }
  for (const [ancho, cantidad] of [...panelesDelCuarto.entries()].sort((a, b) => a[0] - b[0])) {
    renglones.push({
      sku: `${codigoLinea}-PN${ancho}`,
      descripcion: `Panel del cuarto accesible ${ancho} × ${alturas.panel} cm`,
      tipo: 'Panel',
      cantidad,
      precioUnit: precioPieza({ familia: 'PN', anchoCm: ancho, altoCm: alturas.panel }, opciones),
      tarifaReal: tarifaExacta,
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
      tarifaReal: tarifaExacta,
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
  for (const [clave, cantidad] of [...mamparasPorMedida.entries()].sort()) {
    const [ancho, alto] = clave.split('x').map(Number)
    renglones.push({
      sku: `${codigoLinea}-MG${ancho}${alto}`,
      descripcion: `Mingitorio ${ancho} × ${alto} cm`,
      tipo: 'Mingitorio',
      cantidad,
      precioUnit: precioPieza({ familia: 'MG', anchoCm: ancho, altoCm: alto }, opciones),
      tarifaReal: tarifaExacta,
    })
  }
  return renglones
}

export function totalBOM(renglones: RenglonBOM[]): number {
  return renglones.reduce((s, r) => s + r.cantidad * r.precioUnit, 0)
}

export const GRUESO = GRUESO_PILASTRA


/**
 * Qué pilastras hay que poner para que una cabina mida EXACTAMENTE lo pedido.
 *
 * La cabina no es una pieza: es la puerta más lo que le toca de la pilastra de
 * cada lado —media si es central, entera si es lateral—. Con una sola pilastra
 * muchas medidas no se pueden armar: para una cabina de 92 con puerta de 60
 * hacen falta 32 cm repartidos y no existe la pilastra de 32. Con la PAREJA sí:
 * 17 y 15. Por eso se buscan las dos a la vez.
 *
 * Las de punta no se tocan: esas cierran contra el muro. Entre dos soluciones
 * igual de buenas gana la que mueva menos piezas.
 *
 * Vive acá y no en el plano porque es la cuenta que decide la medida de la
 * cabina, y la tienen que dar igual la pantalla y cualquier prueba.
 */
export function pilastrasParaAncho(
  tramo: Tramo,
  indice: number,
  pedidoCm: number,
  medidas: number[],
  anchoPilastra: (k: number) => number,
  arrancaElCuarto = false,
): { indice: number; anchoCm: number }[] {
  const n = tramo.cabinas.length
  const cab = tramo.cabinas[indice]
  if (!cab || n < 2) return []
  const lugares = lugaresDe(tramo.cabinas)
  const cuarto = arrancaElCuarto ? 0 : -1
  /** cuánto de la pilastra de la frontera k entra en ESTA cabina */
  const parte = (k: number, cabinaALaDerecha: boolean) => {
    const lado = ladoDePilastra(lugares, k, cuarto)
    if (lado === 'mitades') return 0.5
    return (lado === 'der') === cabinaALaDerecha ? 1 : 0
  }
  const fIzq = parte(indice, true)
  const fDer = parte(indice + 1, false)
  const cuerpo = cab.tipo === 'orinal' ? cab.anchoCm : cab.puerta.anchoCm
  const objetivo = pedidoCm - cuerpo
  const movible = (k: number) => k > 0 && k < n
  const aIzq = anchoPilastra(indice)
  const aDer = anchoPilastra(indice + 1)
  const revuelto = (izq: number, der: number) =>
    (fIzq > 0 && izq !== aIzq ? 1 : 0) + (fDer > 0 && der !== aDer ? 1 : 0)

  let mejor: { izq: number; der: number; dif: number } | null = null
  const opcionesIzq = fIzq > 0 && movible(indice) ? medidas : [aIzq]
  const opcionesDer = fDer > 0 && movible(indice + 1) ? medidas : [aDer]
  for (const izq of opcionesIzq) {
    for (const der of opcionesDer) {
      const dif = Math.abs(fIzq * izq + fDer * der - objetivo)
      if (!mejor) { mejor = { izq, der, dif }; continue }
      if (dif < mejor.dif - 0.001) { mejor = { izq, der, dif }; continue }
      if (Math.abs(dif - mejor.dif) <= 0.001 && revuelto(izq, der) < revuelto(mejor.izq, mejor.der)) {
        mejor = { izq, der, dif }
      }
    }
  }
  if (!mejor) return []
  const cambios: { indice: number; anchoCm: number }[] = []
  if (fIzq > 0 && movible(indice) && mejor.izq !== aIzq) cambios.push({ indice, anchoCm: mejor.izq })
  if (fDer > 0 && movible(indice + 1) && mejor.der !== aDer) cambios.push({ indice: indice + 1, anchoCm: mejor.der })
  return cambios
}
