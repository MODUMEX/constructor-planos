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

/**
 * Cualquier medida del catálogo puede ir entre dos puertas; las de extremo son
 * las delgadas.
 *
 * Antes las internas arrancaban en 24 y eso dejaba claros sin solución: con un
 * claro de 323 entre muros y puerta de 60 el objetivo son 327, y tres internas
 * de 24 más dos extremos de 10 dan 332 como MÍNIMO. El reparto no encontraba
 * nada y la tira salía pasada 5 cm. El despiece real de ese baño cierra con una
 * interna de 19, y el de CERVECERÍA Mujeres lleva una de 17: planta ya usa las
 * chicas adentro.
 */
export const PILASTRAS_INTERNAS = ANCHOS_PILASTRA
export const PILASTRAS_EXTREMO = ANCHOS_PILASTRA.filter((a) => a <= 24)

/**
 * Hasta dónde puede engordar SOLA una pilastra interna.
 *
 * Sin tope, el buscador cerraba el claro con pilastras de 100 o 120 y dejaba
 * la puerta en 60: cabinas de 180 cm con una entrada angosta, que gastan de
 * más en el poste. Pasa porque cerrar el claro vale 1 punto por cm y alejarse
 * de la puerta de 60 solo 0,05, así que ensanchar la pilastra siempre salia
 * "mas barato" que ensanchar la puerta.
 *
 * Las medidas grandes NO desaparecen: siguen en PILASTRAS_INTERNAS y se piden
 * a mano arrastrando sobre el plano, que es cuando de verdad se quieren.
 */
export const PILASTRA_INTERNA_AUTO_MAX = 50
const INTERNAS_AUTO = PILASTRAS_INTERNAS.filter((a) => a <= PILASTRA_INTERNA_AUTO_MAX)

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
  /**
   * El ancho de CADA orinal, en orden. No tienen que medir todos lo mismo: el
   * cliente decide la medida de cada uno, igual que con las pilastras. Cuando
   * no se pidió ninguna, los tres salen del ancho base.
   */
  anchosOrinal: number[] | null
  /** ancho que le quedó a la cabina accesible, para poder avisar si no llega */
  anchoCabinaAccesible: number | null
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
  /** la medida que se pidió para la puerta de la cabina accesible */
  puertaAccesibleFija?: number
  /**
   * Fija el ancho de las pilastras internas y deja que el buscador reacomode
   * el resto. Es lo que pasa al arrastrar una pilastra: se elige su medida y
   * las demás piezas se adaptan para que la tira siga cuadrando.
   */
  pilInternaFija?: number
  /** qué posición movió el vendedor: solo esa se clava, el resto se reparte */
  pilastraFijaIndice?: number
  /**
   * Las pilastras que el cliente ya eligió, una entrada por posición y null
   * donde todavía manda el buscador. Tiene prioridad sobre las dos opciones
   * de arriba: es lo que permite 30 · 40 · 50 en vez de tres iguales.
   */
  pilastrasFijas?: (number | null | undefined)[]
  /** lo mismo para las pilastras de los extremos */
  pilExtremoFija?: number
  /** las medidas de puerta que se pueden usar; por omisión, las de catálogo */
  catalogoPuertas?: number[]
  /** orinales; entre dos va una mampara MG, no una pilastra */
  mingitorios?: number
  /** ancho de cada orinal, en cm; por omisión los 60 de siempre */
  anchoOrinal?: number
  /**
   * Ancho pedido para cada orinal, en orden. Manda sobre `anchoOrinal` y
   * NO se toca: si el cliente pidió uno de 50 y otro de 70, la tira se cierra
   * moviendo las pilastras, no ensanchándole los orinales.
   */
  anchosOrinal?: (number | null | undefined)[]
  /**
   * La tira termina en orinal y de ese lado no hay muro: entonces cierra con un
   * MINGITORIO. Contra un muro no cierra con nada: el espacio del último orinal
   * llega hasta la pared.
   */
  cierreMingitorio?: boolean
  /** la tira ARRANCA en orinal y de ese lado no hay muro: también cierra con mingitorio */
  cierreMingitorioInicio?: boolean
  /**
   * El arranque de la tira NO lleva pilastra. Es el cuarto PMR: cierra contra
   * el muro, y la pilastra que lleva es la de su divisor, contra el fondo. Sin
   * esto la modulación reservaba un ancho que después no se fabricaba.
   */
  sinPilastraInicio?: boolean
  /** una cabina accesible: es una cabina con puerta ancha, no otra geometría */
  accesible?: boolean
  /**
   * Ancho que debería tener la cabina accesible, en cm. No es una pieza: sale de
   * su puerta más las pilastras que la rodean, así que el buscador lo persigue
   * eligiendo pilastras más anchas, no estirando nada.
   */
  anchoAccesibleCm?: number
}

/** ancho de un orinal y grueso de la mampara que los separa, en cm */
const ANCHO_ORINAL = 60
const GRUESO_MG = 1.27
/**
 * La puerta de una cabina accesible nunca baja de esta medida: la ficha de abril
 * 2026 marca con el símbolo de accesibilidad las de 85, 90 y 100 cm.
 */
export const PUERTA_ACCESIBLE_MIN = 85
/**
 * Cuánto pesa quedarse corto en el ancho de la cabina accesible: es una medida
 * de accesibilidad, no una preferencia, así que pesa más que el gusto por la
 * puerta de 60. No es un número afinado: de 0,5 para arriba el buscador elige
 * exactamente lo mismo, así que cualquier valor de ese orden sirve.
 */
const PENALIZA_ACCESIBLE = 1

/** la medida de catálogo más cercana a `cm`, dentro de las opciones dadas */
export function medidaCercana(opciones: number[], cm: number): number {
  return opciones.reduce((a, b) => (Math.abs(b - cm) < Math.abs(a - cm) ? b : a), opciones[0])
}

/**
 * Cuánto puede QUEDAR CORTA la tira sin que se note: el herraje de cada
 * pilastra contra muro se come medio centímetro, y un extremo abierto —el que
 * cierra con panel— tiene 5 cm de juego.
 */
function holguraHueco(extremoAbierto: boolean | undefined, murosPilastra: number): number {
  return extremoAbierto ? 5 : 0.5 * murosPilastra
}

/**
 * Si la tira cabe en el claro. Es asimétrico a propósito: entre dos muros el
 * claro es el que hay y las piezas NO se pueden pasar ni un centímetro —no hay
 * de dónde recortar—, mientras que quedarse corto lo rellena la canaleta. Con
 * un extremo abierto sí hay 5 cm de juego para los dos lados.
 */
function cabe(diferencia: number, extremoAbierto: boolean | undefined, murosPilastra: number): boolean {
  if (diferencia >= 0) return diferencia <= holguraHueco(extremoAbierto, murosPilastra)
  return -diferencia <= (extremoAbierto ? 5 : 0)
}

export function modularTira(o: OpcionesModulacion): Modulacion | null {
  const nEst = o.puertas
  const nAcc = o.accesible ? 1 : 0
  const nMing = o.mingitorios ?? 0
  const cabinas = nEst + nAcc + nMing
  if (cabinas < 1) return null

  /**
   * Dentro del campo de orinales no hay pilastras: son los espacios y los
   * mingitorios que los separan. Pero la tira de baños SÍ cierra con su pilastra
   * lateral, que es de donde cuelga la puerta de la última cabina y donde se
   * amarra su panel. El campo empieza después de esa pilastra.
   *
   * Entonces las pilastras son: las dos de punta de la tira de baños más sus
   * internas. Las fronteras del campo no cuentan.
   */
  const conCabinas = nEst + nAcc > 0
  const internas = conCabinas ? nEst + nAcc - 1 : 0
  // los orinales no llevan puerta, así que no suman holgura de bisagra
  const objetivo = calcularClaroAjustado(o.claroCm, o.murosPilastra, nEst + nAcc)
  const dosMuros = o.murosPilastra >= 2
  const anchoBaseOrinal = o.anchoOrinal && o.anchoOrinal > 0 ? o.anchoOrinal : ANCHO_ORINAL
  // Cada orinal con SU medida. Las que el cliente no pidió salen del ancho base.
  const anchosOrinal = Array.from({ length: nMing }, (_, i) => {
    const pedido = o.anchosOrinal?.[i]
    return pedido && pedido > 0 ? pedido : anchoBaseOrinal
  })
  // N orinales llevan N−1 mingitorios entre ellos, y uno más si cierran contra
  // un extremo sin muro.
  const cierreMG = o.cierreMingitorio === true && nMing > 0
  const grosorMG = Math.max(0, nMing - 1) * GRUESO_MG + (cierreMG ? GRUESO_MG : 0)
  const fijoMG = anchosOrinal.reduce((t, a) => t + a, 0) + grosorMG

  const deCatalogo = o.catalogoPuertas && o.catalogoPuertas.length ? o.catalogoPuertas : ANCHOS_PUERTA
  const puertas = o.puertaFija ? [o.puertaFija] : deCatalogo
  const accDeCatalogo = deCatalogo.filter((a) => a >= PUERTA_ACCESIBLE_MIN)
  const puertasAcc =
    nAcc > 0
      ? o.puertaAccesibleFija && accDeCatalogo.includes(o.puertaAccesibleFija)
        ? [o.puertaAccesibleFija]
        : accDeCatalogo
      : [0]
  // Si el vendedor movió UNA pilastra, solo esa queda clavada: las demás se
  // buscan libres. Forzar toda la clase era lo que emparejaba la tira entera.
  const unaClavada = o.pilastraFijaIndice !== undefined || (o.pilastrasFijas ?? []).some((v) => !!v)
  const opInternas =
    internas > 0 ? (o.pilInternaFija && !unaClavada ? [o.pilInternaFija] : INTERNAS_AUTO) : [0]
  const opExtremos = o.pilExtremoFija && !unaClavada ? [o.pilExtremoFija] : PILASTRAS_EXTREMO
  // Una tira de PUROS orinales no tiene pilastras: sus dos puntas son el
  // mingitorio de cierre, si de ese lado no hay muro, o nada si da contra la pared.
  const arranqueOrinal = nMing > 0 && !conCabinas
  const opExtremo1 = arranqueOrinal
    ? [o.cierreMingitorioInicio ? GRUESO_MG : 0]
    : o.sinPilastraInicio ? [0] : opExtremos
  const opExtremo2 = arranqueOrinal ? [cierreMG ? GRUESO_MG : 0] : opExtremos
  const objetivoAcc = nAcc > 0 ? (o.anchoAccesibleCm ?? 0) : 0

  type Candidato =
    { ap: number; acc: number; api: number; ae1: number; ae2: number; total: number; score: number; anchoAcc: number }
  let mejor: Candidato | null = null
  // el mejor de los que NO se pasan del claro: entre muros es el único válido
  let mejorCabe: Candidato | null = null
  for (const acc of puertasAcc.length ? puertasAcc : [0]) {
    for (const ap of nEst > 0 ? puertas : [0]) {
      for (const api of opInternas) {
        for (const ae1 of opExtremo1) {
          for (const ae2 of opExtremo2) {
            const total = nEst * ap + nAcc * acc + fijoMG + internas * api + ae1 + ae2
            const dif = objetivo - total
            // la accesible va primera: se lleva su pilastra de extremo entera y
            // la mitad de la interna que la separa de la cabina siguiente
            const anchoAcc = nAcc > 0 ? ae1 + acc + (internas > 0 ? api / 2 : ae2) : 0
            const score =
              Math.abs(dif) +
              (nEst > 0 ? Math.abs(ap - PUERTA_PREFERIDA) * PENALIZA_PUERTA : 0) +
              (dosMuros && total > objetivo ? (total - objetivo) * PENALIZA_PASARSE : 0) +
              (nAcc > 0 && objetivoAcc > 0 ? Math.max(0, objetivoAcc - anchoAcc) * PENALIZA_ACCESIBLE : 0)
            const cand = { ap, acc, api, ae1, ae2, total, score, anchoAcc }
            if (!mejor || score < mejor.score) mejor = cand
            if (total <= objetivo + (o.extremoAbierto ? 5 : 0) && (!mejorCabe || score < mejorCabe.score)) {
              mejorCabe = cand
            }
          }
        }
      }
    }
  }
  // Entre dos muros el claro es el que hay: se prefiere SIEMPRE una tira que
  // quepa, aunque cierre con canaleta, antes que una más pareja que se pase.
  // Solo si ninguna cabe se devuelve la pasada, para poder avisarlo.
  if (mejorCabe) mejor = mejorCabe
  if (!mejor) return null


  // Las pilastras no tienen que ser todas iguales. Si la tira ya cierra con
  // internas parejas se deja así —es como sale el despiece de planta—, pero si
  // no cierra se mezclan medidas del catálogo antes que dejar una canaleta.
  const cuerpos = nEst * mejor.ap + nAcc * mejor.acc + fijoMG
  const clavadas: (number | null)[] = Array(internas + 2).fill(null)
  // lo que el cliente ya eligió se copia primero y no se discute
  const yaElegidas = o.pilastrasFijas ?? []
  for (let i = 0; i < clavadas.length; i++) clavadas[i] = yaElegidas[i] ?? null
  const iFija = o.pilastraFijaIndice
  if (iFija !== undefined && iFija >= 0 && iFija < clavadas.length) {
    clavadas[iFija] = (iFija === 0 || iFija === clavadas.length - 1 ? o.pilExtremoFija : o.pilInternaFija) ?? null
  } else if (!yaElegidas.length && (o.pilInternaFija || o.pilExtremoFija)) {
    // sin saber cuál movió, se respeta la medida en todas las de su clase
    for (let i = 0; i < clavadas.length; i++) {
      const ext = i === 0 || i === clavadas.length - 1
      clavadas[i] = (ext ? o.pilExtremoFija : o.pilInternaFija) ?? null
    }
  }
  if (nAcc > 0 && objetivoAcc > 0 && clavadas[0] === null) clavadas[0] = mejor.ae1
  // en una tira de puros orinales las puntas no se negocian: mingitorio, o nada
  if (arranqueOrinal) {
    clavadas[0] = o.cierreMingitorioInicio ? GRUESO_MG : 0
    clavadas[clavadas.length - 1] = cierreMG ? GRUESO_MG : 0
  }
  if (o.sinPilastraInicio) clavadas[0] = 0
  // Con una pilastra clavada a mano el reparto manda: es la única forma de que
  // las otras se acomoden en vez de copiarle la medida.
  //
  // Se probó que el reparto mandara SIEMPRE, para imitar cómo arma planta —las
  // chicas contra el muro y las del medio acomodándose—, y rompió los dos
  // despieces reales: el reparto lleva los extremos a la medida mínima (10) y
  // planta no hace eso (en CERVECERÍA Hombres usó 24 y 12). La tendencia existe
  // pero es más suave que "las mínimas afuera", así que no se codifica.
  const uniformeCalza = !unaClavada && cabe(objetivo - mejor.total, o.extremoAbierto, o.murosPilastra)
  const repartidas = uniformeCalza
    ? null
    : repartirPilastras(objetivo - cuerpos, internas, INTERNAS_AUTO, PILASTRAS_EXTREMO, clavadas)
  const pilastras = repartidas ?? (() => {
    // sin reparto posible al menos se respeta la que ella movió
    const base = [mejor.ae1, ...Array(internas).fill(mejor.api), mejor.ae2]
    for (let i = 0; i < base.length; i++) if (clavadas[i]) base[i] = clavadas[i]!
    return base
  })()
  if (arranqueOrinal) {
    pilastras[0] = o.cierreMingitorioInicio ? GRUESO_MG : 0
    pilastras[pilastras.length - 1] = cierreMG ? GRUESO_MG : 0
  }
  if (o.sinPilastraInicio) pilastras[0] = 0

  // El total sale SIEMPRE de las pilastras que quedaron: el respaldo respeta la
  // que ella movió, así que el total del buscador ya no sirve.
  const totalReal = cuerpos + pilastras.reduce((x, y) => x + y, 0)
  const diferencia = objetivo - totalReal
  const abs = Math.abs(diferencia)

  let ajuste: TipoAjuste
  let mensaje: string
  if (cabe(diferencia, o.extremoAbierto, o.murosPilastra)) {
    ajuste = 'exacto'
    mensaje = abs > 0.5 ? `Calza; ${abs.toFixed(1)} cm los absorbe la instalación` : 'Calza exacto'
  } else if (diferencia > 0 && abs <= CANALETA_MAX_CM) {
    ajuste = 'canaleta'
    mensaje = `Calza con canaleta de ${abs.toFixed(1)} cm (rellena el hueco)`
  } else if (diferencia > 0) {
    ajuste = 'sobra'
    mensaje = `Falta material: hueco de ${abs.toFixed(1)} cm, más de lo que rellena una canaleta. Si no hay pilastra que lo cierre, poné un PANEL de frente desde el menú del divisor.`
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

  // EL ORINAL NO SE ENSANCHA.
  //
  // El Constructor viejo repartía el sobrante entre los orinales, y esta app
  // lo copió: con orinales pedidos de 90 salían de 105. La regla de Dayanna es
  // la contraria y es la que vale: el espacio entre orinales es una medida
  // FIJA —la escribe el vendedor— y lo único que se mueve para cerrar el claro
  // son las cabinas, o sea las pilastras. Si aun así sobra, se dice: mejor un
  // aviso que un orinal de 105 que nadie pidió.
  const anchoOrinal = anchoBaseOrinal
  const anchosFinal = anchosOrinal.slice()
  const ajusteFinal = ajuste
  const mensajeFinal = mensaje
  const canaletaFinal = canaleta


  return {
    anchoPuerta: mejor.ap,
    anchoPilInterna: pilastras[1] ?? mejor.api,
    anchoPilExtremo1: pilastras[0],
    anchoPilExtremo2: pilastras[pilastras.length - 1],
    pilastras,
    total: totalReal,
    claroAjustado: objetivo,
    diferencia,
    ajuste: ajusteFinal,
    mensaje: mensajeFinal,
    canaleta: canaletaFinal,
    anchoPuertaAccesible: mejor.acc || null,
    anchoOrinal: nMing > 0 ? anchoOrinal : null,
    anchosOrinal: nMing > 0 ? anchosFinal : null,
    anchoCabinaAccesible:
      nAcc > 0
        ? pilastras[0] + mejor.acc + (internas > 0 ? pilastras[1] / 2 : pilastras[pilastras.length - 1])
        : null,
  }
}

export interface OpcionesPilastras {
  claroCm: number
  /**
   * El cuerpo de cada cabina en orden: la puerta de las normales y de la
   * accesible, o los 60 cm del orinal. Es lo que el vendedor ya eligió y NO se
   * toca; lo que se busca son las pilastras que hagan cuadrar la tira.
   */
  cuerpos: number[]
  /** cuántos de esos cuerpos llevan puerta: cada una suma su holgura de bisagra */
  conPuerta: number
  /** cuántas fronteras internas llevan pilastra (entre dos orinales va mampara) */
  internas: number
  murosPilastra: number
  extremoAbierto?: boolean
  /** pilastras ya clavadas a mano, una entrada por posición (null = libre) */
  fijas?: (number | null | undefined)[]
  /**
   * La tira tiene un ESPACIO LIBRE que se lleva lo que sobre del claro.
   *
   * Cambia el criterio de la búsqueda: sin hueco hay que cerrar clavado, así
   * que gana la combinación que deje la diferencia más chica y las pilastras se
   * estiran hasta 50 cm con tal de llenar el claro. Con hueco eso no tiene
   * sentido —el espacio libre es lo que se está dejando a propósito—, así que
   * gana la tira más CORTA que entre: las piezas quedan de su medida natural y
   * todo el sobrante cae en el hueco.
   */
  huecoLibre?: boolean
}

export interface Pilastreo {
  pilastras: number[]
  total: number
  claroAjustado: number
  diferencia: number
  ajuste: TipoAjuste
  mensaje: string
  canaleta: { anchoCm: number; codigo: string } | null
}

/**
 * El camino inverso de `modularTira`: acá las PUERTAS ya están decididas —porque
 * el vendedor eligió una del menú o arrastró un panel— y lo que se busca son las
 * pilastras que hagan cerrar la tira contra el claro.
 *
 * Es lo que hace falta para que cambiar una puerta mueva el resto del dibujo. La
 * otra salida, repartir el sobrante entre las puertas vecinas, casi nunca tiene
 * solución: las puertas van de 5 en 5 cm y las pilastras internas ofrecen muchos
 * más escalones, así que por acá casi siempre hay con qué cuadrar.
 */
export function ajustarPilastras(o: OpcionesPilastras): Pilastreo | null {
  const internas = Math.max(0, o.internas)
  const objetivo = calcularClaroAjustado(o.claroCm, o.murosPilastra, o.conPuerta)
  const cuerpos = o.cuerpos.reduce((s, x) => s + x, 0)
  const dosMuros = o.murosPilastra >= 2

  const opInternas = internas > 0 ? INTERNAS_AUTO : [0]
  type Candidato = { api: number; ae1: number; ae2: number; total: number; score: number }
  let mejor: Candidato | null = null
  // el mejor de los que NO se pasan del claro: entre muros es el único válido
  let mejorCabe: Candidato | null = null
  for (const api of opInternas) {
    for (const ae1 of PILASTRAS_EXTREMO) {
      for (const ae2 of PILASTRAS_EXTREMO) {
        const total = cuerpos + internas * api + ae1 + ae2
        const dif = objetivo - total
        const score = o.huecoLibre
          ? total + (total > objetivo ? (total - objetivo) * PENALIZA_PASARSE : 0)
          : Math.abs(dif) + (dosMuros && total > objetivo ? (total - objetivo) * PENALIZA_PASARSE : 0)
        const cand = { api, ae1, ae2, total, score }
        if (!mejor || score < mejor.score) mejor = cand
        if (total <= objetivo + (o.extremoAbierto ? 5 : 0) && (!mejorCabe || score < mejorCabe.score)) {
          mejorCabe = cand
        }
      }
    }
  }
  if (mejorCabe) mejor = mejorCabe
  if (!mejor) return null


  // Si con internas parejas no cierra, se mezclan medidas antes de recurrir a
  // la canaleta: las pilastras no tienen por qué medir todas lo mismo.
  if (!o.huecoLibre && !cabe(objetivo - mejor.total, o.extremoAbierto, o.murosPilastra)) {
    const mezcla = repartirPilastras(
      objetivo - cuerpos, internas, INTERNAS_AUTO, PILASTRAS_EXTREMO, o.fijas,
    )
    if (mezcla) {
      const total = cuerpos + mezcla.reduce((x, y) => x + y, 0)
      const dif = objetivo - total
      const d = Math.abs(dif)
      if (cabe(dif, o.extremoAbierto, o.murosPilastra)) {
        return {
          pilastras: mezcla,
          total,
          claroAjustado: objetivo,
          diferencia: dif,
          ajuste: 'exacto',
          mensaje: d > 0.05 ? `Calza; ${d.toFixed(1)} cm los absorbe la instalación` : 'Calza exacto',
          canaleta: null,
        }
      }
    }
  }

  const diferencia = objetivo - mejor.total
  const abs = Math.abs(diferencia)

  let ajuste: TipoAjuste
  let mensaje: string
  if (o.huecoLibre && diferencia >= 0) {
    ajuste = 'exacto'
    mensaje = abs > 0.5
      ? `Calza; el espacio libre se lleva ${abs.toFixed(1)} cm`
      : 'Calza exacto'
  } else if (cabe(diferencia, o.extremoAbierto, o.murosPilastra)) {
    ajuste = 'exacto'
    mensaje = abs > 0.5 ? `Calza; ${abs.toFixed(1)} cm los absorbe la instalación` : 'Calza exacto'
  } else if (diferencia > 0 && abs <= CANALETA_MAX_CM) {
    ajuste = 'canaleta'
    mensaje = `Calza con canaleta de ${abs.toFixed(1)} cm (rellena el hueco)`
  } else if (diferencia > 0) {
    ajuste = 'sobra'
    mensaje = `Con esas puertas queda un hueco de ${abs.toFixed(1)} cm: más de lo que rellena una canaleta. Si no hay pilastra que lo cierre, poné un PANEL de frente desde el menú del divisor.`
  } else {
    ajuste = 'falta'
    mensaje = `Con esas puertas las piezas se pasan ${abs.toFixed(1)} cm del claro`
  }

  const canaleta =
    ajuste === 'canaleta'
      ? (() => {
          const ancho = Math.max(1, Math.min(CANALETA_MAX_CM, Math.ceil(abs)))
          return { anchoCm: ancho, codigo: `CN0${ancho}` }
        })()
      : null

  return {
    pilastras: [mejor.ae1, ...Array(internas).fill(mejor.api), mejor.ae2],
    total: mejor.total,
    claroAjustado: objetivo,
    diferencia,
    ajuste,
    mensaje,
    canaleta,
  }
}

/** el grueso de la mampara que separa dos orinales, en cm */
export const GRUESO_MG_PIEZA = GRUESO_MG

/**
 * Reparte una suma de pilastras entre N posiciones usando medidas de catálogo,
 * SIN obligarlas a ser todas iguales.
 *
 * Una tira no tiene por qué llevar la misma pilastra en todas las fronteras: en
 * los planos reales conviven una de 10 en un extremo con una de 24 en el otro, y
 * las internas cambian entre sí para que la tira cierre exacto. Antes el buscador
 * usaba una sola medida para todas las internas y por eso muchas tiras cerraban
 * con canaleta o con sobrante cuando sí había combinación exacta.
 *
 * Se resuelve por programación dinámica sobre la suma, que con 16 pilastras y
 * medio millar de centímetros es instantáneo. De todas las combinaciones que dan
 * la suma se elige la más PAREJA: en cada posición se prueban primero las
 * medidas más cercanas al reparto uniforme, así el resultado no sale caprichoso.
 */
export function repartirPilastras(
  totalCm: number,
  internas: number,
  opcionesInternas: number[] = PILASTRAS_INTERNAS,
  opcionesExtremo: number[] = PILASTRAS_EXTREMO,
  /** posiciones que el vendedor ya clavó a mano y no se pueden mover */
  fijas?: (number | null | undefined)[],
): number[] | null {
  const posiciones = internas + 2
  if (posiciones < 2) return null
  // hacia ABAJO, nunca hacia arriba: media pilastra de más no cabe entre muros,
  // y ese medio centímetro corto lo absorbe el herraje.
  const objetivo = Math.floor(totalCm + 1e-9)
  if (objetivo <= 0) return null

  // Se va abriendo la mano: primero se intenta con las medidas más parecidas
  // entre sí y solo si no hay combinación se admiten más distintas. Así la tira
  // sale lo más pareja que el catálogo permita, en vez de mezclar una de 24 con
  // una de 85 pudiendo cerrar con dos de 50.
  const sumaFija = (fijas ?? []).reduce<number>((s, v, i) => (v != null && i < posiciones ? s + v : s), 0)
  const libresInternas = internas - (fijas ?? []).filter((v, i) => v != null && i > 0 && i < posiciones - 1).length
  const centro =
    libresInternas > 0 ? (objetivo - sumaFija - 2 * opcionesExtremo[0]) / libresInternas : 0
  const internasOrden = [...opcionesInternas].sort((a, b) => Math.abs(a - centro) - Math.abs(b - centro))
  const extremosOrden = [...opcionesExtremo].sort((a, b) => a - b)

  // Primero la suma exacta. Si el catálogo no da para clavarla —pasa cuando el
  // vendedor fija una pilastra chica en el medio— se admite quedarse corto lo
  // que rellena una canaleta, antes que devolver nada y dejar un hueco enorme.
  for (let falta = 0; falta <= CANALETA_MAX_CM; falta++) {
    const meta = objetivo - falta
    if (meta <= 0) break
    for (let apertura = 1; apertura <= internasOrden.length; apertura++) {
      const permitidas = internasOrden.slice(0, apertura)
      const salida = armar(meta, posiciones, permitidas, extremosOrden, centro, fijas)
      if (salida) return salida
    }
  }
  return null
}

/** busca una combinación exacta para esa suma; null si no existe */
function armar(
  objetivo: number,
  posiciones: number,
  internas: number[],
  extremos: number[],
  centro: number,
  fijas?: (number | null | undefined)[],
): number[] | null {
  const opciones: number[][] = []
  for (let i = 0; i < posiciones; i++) {
    // ojo: una posición clavada en CERO también está clavada (la punta del campo
    // de orinales no lleva pieza), así que se compara contra null, no por verdadero
    const clavada = fijas?.[i]
    if (clavada != null) { opciones.push([clavada]); continue }
    const esExtremo = i === 0 || i === posiciones - 1
    opciones.push(esExtremo ? extremos : internas)
  }

  // alcanzable[i] = sumas que se pueden armar con las posiciones i..final
  const alcanzable: Set<number>[] = Array.from({ length: posiciones + 1 }, () => new Set<number>())
  alcanzable[posiciones].add(0)
  for (let i = posiciones - 1; i >= 0; i--) {
    for (const resto of alcanzable[i + 1]) {
      for (const v of opciones[i]) {
        const s = resto + v
        if (s <= objetivo) alcanzable[i].add(s)
      }
    }
  }
  if (!alcanzable[0].has(objetivo)) return null

  const salida: number[] = []
  let falta = objetivo
  for (let i = 0; i < posiciones; i++) {
    const esExtremo = i === 0 || i === posiciones - 1
    const meta = esExtremo ? extremos[0] : centro
    const orden = [...opciones[i]].sort((a, b) => Math.abs(a - meta) - Math.abs(b - meta))
    const elegida = orden.find((v) => v <= falta && alcanzable[i + 1].has(falta - v))
    if (elegida === undefined) return null
    salida.push(elegida)
    falta -= elegida
  }
  return salida
}
