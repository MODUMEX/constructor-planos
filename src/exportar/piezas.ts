import type { Area, Cabina, Config, Tramo } from '../types'
import { alturasDe, esSoloOrinales, esVariacionPanel, familiaDelFrente, llevaAccesibleSiempre, mamparaDe, nombreModelo, tipologia } from '../catalog'
import { arrancaConMingitorio } from '../modulacion'
import { cierraConMingitorio, fronteraDeOrinal } from '../modulacion'
import { cuartoPmr } from '../geometria'

/**
 * Piezas del proyecto con el SubTipo que espera el CIP.
 *
 * El CIP no lee medidas de columnas aparte: las saca del SKU largo
 * `LM1LCRF<FAM><ancho><alto><color><sistema>`, donde el alto son siempre los
 * últimos tres dígitos. El SubTipo es lo que usa para el herraje, y su
 * orientación (CENTRAL / LATERAL / MURO) sale del propio SubTipo.
 */

export type Familia = 'PT' | 'PN' | 'PL' | 'MG'

export interface Pieza {
  familia: Familia
  anchoCm: number
  altoCm: number
  subTipo: string
  area: string
}

const COLOR_ABREV: Record<string, string> = {
  'FASHION WHITE': 'FW',
  'ALUMINA 2103': 'A2',
  'GRIS METALIZADO MT 240': 'GM',
  'NEGRO EBANO 2110': 'NE',
  'INOX SATIN': 'IS',
  'SKYLINE WALNUT': 'SW',
  'NEUTRAL OAK 1266T14': 'NO',
}

export function colorAbreviado(nombre: string): string {
  const key = (nombre || '').toUpperCase().trim()
  if (COLOR_ABREV[key]) return COLOR_ABREV[key]
  const letras = (nombre || '')
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return letras || 'XX'
}

export function nombreLinea(linea: Config['linea']): string {
  if (linea === 'SUPERIOR') return 'Superior 2.0'
  if (linea === 'TOUCHLESS') return 'Touchless'
  return 'LEEDER'
}

export function nombreSistema(config: Config): string {
  return config.terminacion === 'PATAS' ? 'Pata' : 'Zoclo'
}

/** el alto de la pilastra lo pone el modelo, no la altura de la puerta */
export function altoPilastra(config: Config): number {
  return alturasDe(config.modelo).pilastra
}

/** el CSV y el cajetín llevan el nombre del modelo, no su código de tarifa */
export function modeloParaCsv(config: Config): string {
  return nombreModelo(config.linea, config.modelo)
}

export function sku(pieza: Pieza, config: Config): string {
  const color = colorAbreviado(config.color)
  const sistema = config.terminacion === 'PATAS' ? 'P' : 'Z'
  return `LM1LCRF${pieza.familia}${pieza.anchoCm}${pieza.altoCm}${color}${sistema}`
}

/** PTAIZQ / PTADER, con -AM cuando abre hacia adentro en una cabina contra muro */
function subTipoPuerta(cab: Cabina, contraMuro: boolean): string {
  const adentro = cab.puerta.apertura === 'adentro'
  // el CIP nombra la mano ya volteada cuando la puerta abre hacia adentro
  const mano = adentro ? (cab.puerta.mano === 'der' ? 'izq' : 'der') : cab.puerta.mano
  const base = mano === 'der' ? 'PTADER' : 'PTAIZQ'
  return adentro && contraMuro ? `${base}-AM` : base
}

export function orientacionDeSubTipo(subTipo: string): string {
  if (subTipo === 'PLCEN') return 'CENTRAL'
  if (subTipo === 'PLLAT' || subTipo === 'PLCOS') return 'LATERAL'
  if (subTipo === 'PLLATMUR' || subTipo === 'PLCOSMUR') return 'MURO'
  return ''
}

function piezasDeTramo(tramo: Tramo, config: Config, area: string, omitirPilastraInicial = false): Pieza[] {
  const piezas: Pieza[] = []
  const n = tramo.cabinas.length
  // cada familia lleva la altura que le da el modelo; solo en SCUDO el panel
  // es más alto que la puerta
  const alturas = alturasDe(config.modelo)
  const alto = alturas.puerta
  const altoPanel = alturas.panel
  const altoPil = altoPilastra(config)
  /**
   * Qué número de mampara va saliendo. Se cuenta aparte del índice de cabina
   * porque en un baño mixto los orinales arrancan después de las cabinas, y la
   * lista de medidas que llena el vendedor va numerada desde la primera
   * mampara, no desde la primera cabina.
   */
  let nMg = 0

  tramo.cabinas.forEach((cab, i) => {
    const contraMuro = (i === 0 && tramo.muroInicio) || (i === n - 1 && tramo.muroFin)

    if (cab.puerta.tipo === 'puerta' && cab.tipo !== 'orinal') {
      piezas.push({
        familia: 'PT',
        anchoCm: cab.puerta.anchoCm,
        altoCm: alto,
        subTipo: subTipoPuerta(cab, contraMuro),
        area,
      })
    }

    // divisor a la derecha de esta cabina; contra el muro no lleva nada.
    // Entre orinales el divisor es una mampara MG, no un panel de cabina.
    const esUltima = i === n - 1
    // Entre dos orinales va mingitorio. Y si la tira TERMINA en orinal contra un
    // extremo sin muro, ese lado cierra con otro mingitorio y no con panel de
    // cierre: N orinales contra un extremo abierto llevan N mingitorios.
    const cierraMG = cierraConMingitorio(tramo)
    // El campo de orinales puede quedar al PRINCIPIO —área invertida—, y ahí la
    // mampara de cierre va del otro lado: es la del primer orinal.
    const arrancaMG = arrancaConMingitorio(tramo)
    const llevaDivisor =
      cab.tipo === 'orinal'
        ? tramo.cabinas[i + 1]?.tipo === 'orinal' || (esUltima && cierraMG) || (i === 0 && arrancaMG)
        : !esUltima || !tramo.muroFin
    if (llevaDivisor) {
      if (cab.tipo === 'orinal') {
        const mg = mamparaDe(config, nMg++)
        piezas.push({
          familia: 'MG',
          anchoCm: mg.anchoCm,
          altoCm: mg.altoCm,
          subTipo: mg.altoCm >= 150 ? 'MG150' : 'MG120',
          area,
        })
      } else {
        // El panel del divisor del cuarto PMR tampoco divide dos cabinas: es la
        // pared del cuarto, así que va LATERAL, igual que la pilastra que lo
        // acompaña.
        // Vale igual para las "variación panel": el panel que separa la cabina
        // accesible de la tira es su pared, y es más hondo que los demás.
        //
        // Cada cabina emite el divisor que tiene A SU DERECHA, así que el de la
        // accesible lo emite ella cuando arranca la tira y la cabina ANTERIOR
        // cuando la cierra —el área invertida—. Mirando solo la propia, al
        // invertir el panel hondo se perdía y salía uno normal en su lugar.
        const esDelCuarto =
          llevaAccesibleSiempre(config.tipologia) &&
          (cab.tipo === 'accesible' || tramo.cabinas[i + 1]?.tipo === 'accesible')
        // El del cuarto es más largo que los demás: el cuarto es más hondo y su
        // panel se estira hasta cerrar el divisor.
        const delCuarto = esDelCuarto ? cuartoPmr(tramo, config) : null
        piezas.push({
          familia: 'PN',
          anchoCm: delCuarto && delCuarto.panelCm > 0 ? delCuarto.panelCm : config.profundidadCm,
          altoCm: altoPanel,
          subTipo: esUltima || esDelCuarto ? 'PNLAT' : 'PNCEN',
          area,
        })
      }
    }
  })

  // La mampara que CIERRA el campo de orinales cuando el campo arranca la tira
  // —área invertida— no la puede emitir el recorrido: cada cabina emite el
  // divisor que tiene A SU DERECHA, y esta va a la izquierda de la primera.
  if (arrancaConMingitorio(tramo)) {
    const mg = mamparaDe(config, nMg++)
    piezas.push({
      familia: 'MG',
      anchoCm: mg.anchoCm,
      altoCm: mg.altoCm,
      subTipo: mg.altoCm >= 150 ? 'MG150' : 'MG120',
      area,
    })
  }

  // Panel de cierre al inicio cuando el tramo no arranca contra pared.
  //
  // Si quien arranca es la cabina accesible de una "variación panel", el suyo
  // NO mide esto: es más honda, y ese panel lo pone `piezasDelFrente` con su
  // propia medida. Sin esta salvedad salían los dos.
  const arrancaLaAccesible =
    llevaAccesibleSiempre(config.tipologia) && tramo.cabinas[0]?.tipo === 'accesible'
  if (n > 0 && !tramo.muroInicio && !arrancaLaAccesible) {
    piezas.push({ familia: 'PN', anchoCm: config.profundidadCm, altoCm: altoPanel, subTipo: 'PNLAT', area })
  }

  // pilastras: una en cada extremo y una por divisor interno.
  // En esquina, nicho y U la pilastra del arranque es la misma que ya puso el
  // tramo anterior, así que ahí se omite para no contarla dos veces.
  if (n > 0) {
    // Cada pilastra lleva SU ancho de catálogo, que la modulación eligió por
    // posición. Los tramos guardados antes de eso no traen la lista: ahí se cae
    // en el ancho único de la configuración, como se hacía antes.
    const anchoDe = (i: number) => tramo.pilastras?.[i] ?? config.anchoPilastraCm
    /**
     * La pieza del frente no siempre es pilastra: pasado el tope del catálogo
     * —120 cm— es un PANEL, porque no hay pilastra tan ancha. Cambia la familia
     * y con ella el subtipo, que es lo que el CIP lee para saber qué está
     * cortando.
     */
    const familiaDe = (i: number) => familiaDelFrente(anchoDe(i), config.modelo)
    const subTipoDe = (i: number, lateral: boolean) =>
      familiaDe(i) === 'PN' ? (lateral ? 'PNLAT' : 'PNCEN') : lateral ? 'PLLAT' : 'PLCEN'
    // En el campo de orinales no hay pilastras: solo los espacios y los
    // mingitorios que los separan. La pilastra de arranque solo va si esa
    // frontera no es del campo.
    // El cuarto PMR arranca contra el muro y lo cierra ese muro, no una
    // pilastra: la que lleva es la del divisor, contra el muro del fondo.
    // Vale igual para las "variación panel": la accesible se planta y su
    // frontera 0 no tiene pilastra de tira, sale del frente.
    const arrancaElCuarto = llevaAccesibleSiempre(config.tipologia) && tramo.cabinas[0]?.tipo === 'accesible'
    // Al invertir el área el cuarto se va a la otra punta: ahí la pilastra que
    // no va es la del FINAL. Sin esto salía una pilastra de 0 cm en el despiece.
    const cierraElCuarto = llevaAccesibleSiempre(config.tipologia) && n > 1 && tramo.cabinas[n - 1]?.tipo === 'accesible'
    if (!omitirPilastraInicial && !fronteraDeOrinal(tramo, 0) && !arrancaElCuarto) {
      piezas.push({
        familia: familiaDe(0),
        anchoCm: anchoDe(0),
        altoCm: altoPil,
        // contra el muro la pilastra tiene su propio subtipo; un panel no
        subTipo: familiaDe(0) === 'PN' ? 'PNLAT' : tramo.muroInicio ? 'PLLATMUR' : 'PLLAT',
        area,
      })
    }
    for (let i = 0; i < n - 1; i++) {
      // entre dos orinales va el mingitorio, no pilastra
      if (fronteraDeOrinal(tramo, i + 1)) continue
      // Donde termina la tira de baños y empieza el campo de orinales, la pilastra
      // es LATERAL: cierra la tira, no divide dos cabinas.
      const cierraLaTira =
        tramo.cabinas[i].tipo !== 'orinal' && tramo.cabinas[i + 1].tipo === 'orinal'
      // La que sale del cuarto PMR tampoco divide dos cabinas: cierra el cuarto
      // y arranca la tira, así que es LATERAL.
      const salaDelCuarto =
        llevaAccesibleSiempre(config.tipologia) &&
        (tramo.cabinas[i].tipo === 'accesible' || tramo.cabinas[i + 1].tipo === 'accesible')
      piezas.push({
        familia: familiaDe(i + 1),
        anchoCm: anchoDe(i + 1),
        altoCm: altoPil,
        subTipo: subTipoDe(i + 1, cierraLaTira || salaDelCuarto),
        area,
      })
    }
    // el campo de orinales no lleva pilastra de punta: es el mingitorio de cierre,
    // o nada si el último orinal da contra la pared
    if (!fronteraDeOrinal(tramo, n) && !cierraElCuarto) {
      piezas.push({
        familia: familiaDe(n),
        anchoCm: anchoDe(n),
        altoCm: altoPil,
        subTipo: familiaDe(n) === 'PN' ? 'PNLAT' : tramo.muroFin ? 'PLLATMUR' : 'PLLAT',
        area,
      })
    }
  }

  return piezas
}

/**
 * Las piezas del FRENTE de la cabina accesible en las "variación panel": la
 * pilastra lateral y la pieza del frente.
 *
 * No salen de la tira: la cabina accesible se planta y su frente se reparte
 * aparte, igual que el divisor del Tipo C se reparte sobre el fondo. La puerta
 * no va acá —sale de la cabina, como todas—.
 */
function piezasDelFrente(area: Area): Pieza[] {
  if (!esVariacionPanel(area.config.tipologia)) return []
  const salida: Pieza[] = []
  for (const tramo of area.tramos) {
    const cuarto = cuartoPmr(tramo, area.config)
    if (!cuarto || cuarto.entrada !== 'frente') continue
    for (const pieza of cuarto.frente) {
      if (pieza.tipo === 'puerta') continue
      const ancho = Math.round((pieza.hastaCm - pieza.desdeCm) * 10) / 10
      if (ancho <= 0) continue
      const familia = familiaDelFrente(ancho, area.config.modelo)
      salida.push({
        familia,
        anchoCm: ancho,
        altoCm: altoPilastra(area.config),
        // La lateral topa contra el muro o contra el panel de cierre; la del
        // frente cierra la cabina, así que también es lateral. El muro que le
        // toca es el de SU punta: al invertir el área la cabina se va al otro
        // extremo y el muro que tiene al lado es el otro.
        subTipo: familia === 'PN'
          ? 'PNLAT'
          : pieza.tipo === 'pilastra' && (cuarto.lado === 'inicio' ? tramo.muroInicio : tramo.muroFin)
            ? 'PLLATMUR'
            : 'PLLAT',
        area: area.nombre,
      })
    }
    // Sin muro de ese lado —el Tipo E— la cabina accesible cierra con un panel
    // suyo, y es más hondo que los de las demás cabinas porque ella lo es.
    //
    // Solo hace falta cuando la accesible ARRANCA la tira: ese panel le queda a
    // la izquierda y el recorrido de cabinas, que emite el de la derecha, no lo
    // puede sacar. Cuando cierra la tira —área invertida— ella misma lo emite.
    const sinMuro = cuarto.lado === 'inicio' && !tramo.muroInicio
    if (sinMuro) {
      salida.push({
        familia: 'PN',
        anchoCm: cuarto.profCm,
        altoCm: alturasDe(area.config.modelo).panel,
        subTipo: 'PNLAT',
        area: area.nombre,
      })
    }
  }
  return salida
}

/**
 * La pilastra con la que el divisor del cuarto PMR cierra contra el muro del
 * fondo. No sale de la tira sino de la profundidad: el divisor es panel +
 * puerta + esta pilastra, y sin ella el despiece no cierra el cuarto.
 */
function pilastraDelDivisor(area: Area): Pieza[] {
  if (area.config.tipologia !== 'PMR') return []
  const salida: Pieza[] = []
  for (const tramo of area.tramos) {
    const cuarto = cuartoPmr(tramo, area.config)
    if (!cuarto || cuarto.pilastraCm <= 0) continue
    salida.push({
      familia: 'PL',
      anchoCm: cuarto.pilastraCm,
      altoCm: altoPilastra(area.config),
      subTipo: 'PLLATMUR',
      area: area.nombre,
    })
  }
  return salida
}

export function piezasDeArea(area: Area): Pieza[] {
  const tipo = tipologia(area.config.tipologia)
  const piezas = area.tramos.flatMap((t, i) =>
    piezasDeTramo(t, area.config, area.nombre, tipo.esquinaCompartida && i !== tipo.principal),
  )
  piezas.push(...pilastraDelDivisor(area))
  piezas.push(...piezasDelFrente(area))

  // orinales sueltos de un baño mixto: N orinales llevan N−1 divisores.
  // En un área de solo orinales los divisores ya salieron de las propias cabinas.
  const soloOrinales = esSoloOrinales(area.config.tipologia)
  // Desde que los orinales entran en la tira, sus mamparas ya salieron con ellos.
  // Esta suma queda SOLO para los proyectos guardados antes de eso, que traen la
  // cantidad en la configuración pero no los orinales dibujados.
  const enLaTira = area.tramos.reduce(
    (t, tr) => t + tr.cabinas.filter((c) => c.tipo === 'orinal').length,
    0,
  )
  const divisores = soloOrinales || enLaTira > 0 ? 0 : Math.max(0, area.config.orinales - 1)
  for (let i = 0; i < divisores; i++) {
    const mg = mamparaDe(area.config, i)
    piezas.push({
      familia: 'MG',
      anchoCm: mg.anchoCm,
      altoCm: mg.altoCm,
      subTipo: mg.altoCm >= 150 ? 'MG150' : 'MG120',
      area: area.nombre,
    })
  }
  return piezas
}

export interface RenglonAgrupado {
  sku: string
  subTipo: string
  orientacion: string
  area: string
  cantidad: number
  familia: Familia
  anchoCm: number
  altoCm: number
}

/** junta piezas iguales, igual que hace la OC del Constructor actual */
export function agrupar(piezas: Pieza[], config: Config): RenglonAgrupado[] {
  const mapa = new Map<string, RenglonAgrupado>()
  for (const p of piezas) {
    const codigo = sku(p, config)
    const clave = `${codigo}|${p.subTipo}|${p.area}`
    const previo = mapa.get(clave)
    if (previo) previo.cantidad += 1
    else
      mapa.set(clave, {
        sku: codigo,
        subTipo: p.subTipo,
        orientacion: orientacionDeSubTipo(p.subTipo),
        area: p.area,
        cantidad: 1,
        familia: p.familia,
        anchoCm: p.anchoCm,
        altoCm: p.altoCm,
      })
  }
  return [...mapa.values()]
}
