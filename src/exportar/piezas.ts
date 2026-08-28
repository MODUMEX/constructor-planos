import type { Area, Cabina, Config, Tramo } from '../types'
import { esReforzado, nombreModelo, tipologia } from '../catalog'

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

/** el alto de la pilastra depende del modelo: los reforzados van a 210 */
export function altoPilastra(config: Config): number {
  if (esReforzado(config.modelo)) return 210
  return config.alturaCm + 30
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
  const alto = config.alturaCm
  const altoPil = altoPilastra(config)

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
    const llevaDivisor = !esUltima || !tramo.muroFin
    if (llevaDivisor) {
      if (cab.tipo === 'orinal') {
        piezas.push({
          familia: 'MG',
          anchoCm: 60,
          altoCm: config.mgAlturaCm,
          subTipo: config.mgAlturaCm >= 150 ? 'MG150' : 'MG120',
          area,
        })
      } else {
        piezas.push({
          familia: 'PN',
          anchoCm: config.profundidadCm,
          altoCm: alto,
          subTipo: esUltima ? 'PNLAT' : 'PNCEN',
          area,
        })
      }
    }
  })

  // pilastra de cierre al inicio cuando el tramo no arranca contra pared
  if (n > 0 && !tramo.muroInicio) {
    piezas.push({ familia: 'PN', anchoCm: config.profundidadCm, altoCm: alto, subTipo: 'PNLAT', area })
  }

  // pilastras: una en cada extremo y una por divisor interno.
  // En esquina, nicho y U la pilastra del arranque es la misma que ya puso el
  // tramo anterior, así que ahí se omite para no contarla dos veces.
  if (n > 0) {
    if (!omitirPilastraInicial) {
      piezas.push({
        familia: 'PL',
        anchoCm: config.anchoPilastraCm,
        altoCm: altoPil,
        subTipo: tramo.muroInicio ? 'PLLATMUR' : 'PLLAT',
        area,
      })
    }
    for (let i = 0; i < n - 1; i++) {
      piezas.push({ familia: 'PL', anchoCm: config.anchoPilastraCm, altoCm: altoPil, subTipo: 'PLCEN', area })
    }
    piezas.push({
      familia: 'PL',
      anchoCm: config.anchoPilastraCm,
      altoCm: altoPil,
      subTipo: tramo.muroFin ? 'PLLATMUR' : 'PLLAT',
      area,
    })
  }

  return piezas
}

export function piezasDeArea(area: Area): Pieza[] {
  const tipo = tipologia(area.config.tipologia)
  const piezas = area.tramos.flatMap((t, i) =>
    piezasDeTramo(t, area.config, area.nombre, tipo.esquinaCompartida && i !== tipo.principal),
  )

  // orinales sueltos de un baño mixto: N orinales llevan N−1 divisores.
  // En un área de solo orinales los divisores ya salieron de las propias cabinas.
  const soloOrinales = area.config.tipologia === 'ORINALES'
  const divisores = soloOrinales ? 0 : Math.max(0, area.config.orinales - 1)
  for (let i = 0; i < divisores; i++) {
    piezas.push({
      familia: 'MG',
      anchoCm: 60,
      altoCm: area.config.mgAlturaCm,
      subTipo: area.config.mgAlturaCm >= 150 ? 'MG150' : 'MG120',
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
