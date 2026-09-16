import type { Config } from '../types'
import type { Familia, Pieza } from '../exportar/piezas'
import { buscarColor } from '../catalog'

/**
 * Traductor del despiece del Constructor al SKU de Odoo.
 *
 * Odoo arma el código por partes, igual que nosotros, pero con otras letras:
 *
 *     LIN - PZ - AAAxHHH - variantes - color - espesor - acabado
 *     STD - PT - 055x150 - DER-N     - 2048  - 12      - 1ST
 *
 * El ancho y el alto van en centímetros con tres dígitos; las últimas tres
 * partes son el código de la materia prima (sólido fenólico de 12.7 mm), que
 * lo manda el color y no se elige aparte.
 */

/** un SKU listo para Odoo, o el motivo por el que esa pieza no existe allá */
export type Traduccion = { sku: string } | { falta: string }

export function esSku(t: Traduccion): t is { sku: string } {
  return 'sku' in t
}

/** los modelos del Constructor que Odoo sí fabrica, con su prefijo */
const LINEA_ODOO: Record<string, string> = {
  ESTANDAR: 'STD',
  ESTANDAR170: 'STD',
  REFORZADO: 'REF',
  REFORZADO170: 'REF',
  IMPERIAL: 'IMP',
  KIDS: 'KID',
  SCUDO: 'SCU',
  COLGANTE: 'COL',
}

const PIEZA_ODOO: Record<Familia, string> = { PT: 'PT', PN: 'PN', PL: 'PI', MG: 'MG' }

/**
 * La materia prima de Odoo: nueve colores de 12.7 mm. El último dígito es
 * parte del código del sólido, no una opción.
 */
export interface ColorOdoo {
  codigo: string
  acabado: string
  nombre: string
}

export const COLORES_ODOO: ColorOdoo[] = [
  { codigo: '2048', acabado: '1ST', nombre: 'Gris Metálico 2048' },
  { codigo: '2108', acabado: '1', nombre: 'Alumina 2108' },
  { codigo: '1598', acabado: '1ST', nombre: 'Negro 1598' },
  { codigo: '8801', acabado: '1ST', nombre: 'White 8801' },
  { codigo: '2005', acabado: '1', nombre: 'Walnut 2005' },
  { codigo: '2004', acabado: '1', nombre: 'Skyline 2004' },
  { codigo: '8002', acabado: '1', nombre: 'Grafito Nocturno 8002' },
  { codigo: '1266', acabado: '1', nombre: 'Neutral Oak 1266' },
  { codigo: '8054', acabado: '3', nombre: 'Azul Standard 8054' },
]

/**
 * Qué color de la app es cuál en Odoo. Se compara por el slug del catálogo y
 * por los nombres viejos, que son los que la gente sigue usando.
 */
const COLOR_ODOO: Record<string, string> = {
  'inox-satin': '2048',
  'gris': '2108',
  'negro': '1598',
  'blanco': '8801',
  'ambar-wood': '2005',
  'nogal-grafito': '2004',
  'grafito-nocturno': '8002',
  'neutral-oak': '1266',
  'azul-standard': '8054',
}

const ALIAS_COLOR: Record<string, string> = {
  'GRIS METALIC': '2048',
  'GRIS METALIZADO MT 240': '2048',
  'INOX SATIN': '2048',
  'INOX SATÍN': '2048',
  'ALUMINAK': '2108',
  'ALUMINA 2103': '2108',
  'GRIS': '2108',
  'NEGRO STD': '1598',
  'NEGRO EBANO 2110': '1598',
  'NEGRO ÉBANO 2110': '1598',
  'NEGRO': '1598',
  'WHITEC': '8801',
  'FASHION WHITE': '8801',
  'BLANCO': '8801',
  'WALNUT': '2005',
  'ÁMBAR WOOD': '2005',
  'AMBAR WOOD': '2005',
  'SKYLINE': '2004',
  'NOGAL GRAFITO': '2004',
  'GRAFITO NOCTURNO': '8002',
  'NEUTRAL OAK': '1266',
  'NEUTRAL OAK 1266T14': '1266',
  'AZUL STANDARD': '8054',
}

export function colorOdoo(nombre: string): ColorOdoo | null {
  const slug = buscarColor(nombre)?.slug
  const codigo = (slug && COLOR_ODOO[slug]) ?? ALIAS_COLOR[(nombre || '').toUpperCase().trim()]
  return COLORES_ODOO.find((c) => c.codigo === codigo) ?? null
}

/** 55 -> "055", 210 -> "210" */
function tresDigitos(cm: number): string {
  return String(Math.round(cm)).padStart(3, '0')
}

/**
 * Las variantes que Odoo pone en medio del código. Salen del SubTipo que ya
 * lleva cada pieza, más la terminación del área para las pilastras.
 *
 * En Scudo las pilastras se llaman distinto: no hay central ni costado, solo
 * intermedia y a muro.
 */
function variantes(pieza: Pieza, config: Config, linea: string): string[] | null {
  const zoclo = config.terminacion === 'PATAS' ? 'PATA' : 'ZOC'

  if (pieza.familia === 'PT') {
    const mano = pieza.subTipo.startsWith('PTADER') ? 'DER' : 'IZQ'
    // "-AM" es la puerta que abre hacia adentro contra el muro: en Odoo es "M"
    const tope = pieza.subTipo.endsWith('-AM') ? 'M' : 'N'
    // Scudo y Colgante solo tienen puerta normal
    if (tope === 'M' && (linea === 'SCU' || linea === 'COL')) return [mano, 'N']
    return [mano, tope]
  }

  if (pieza.familia === 'PN') {
    // Scudo no tiene panel central: todos son laterales. El "a muro" de Odoo
    // no se usa porque contra la pared el Constructor no pone panel.
    if (linea === 'SCU') return ['LAT']
    return [pieza.subTipo === 'PNLAT' ? 'LAT' : 'CEN']
  }

  if (pieza.familia === 'PL') {
    if (linea === 'SCU') return [pieza.subTipo.endsWith('MUR') ? 'MUR' : 'INT', zoclo]
    const posicion = {
      PLCEN: 'CEN',
      PLLAT: 'LAT',
      PLCOS: 'COS',
      PLLATMUR: 'LATM',
      PLCOSMUR: 'COSM',
    }[pieza.subTipo]
    if (!posicion) return null
    // Colgante cuelga: no lleva pata
    return [posicion, linea === 'COL' ? 'ZOC' : zoclo]
  }

  return []
}

/**
 * El SKU de Odoo para una pieza del despiece, o el motivo por el que no lo
 * hay. Nunca inventa un código: si la medida o la línea no están en el
 * catálogo de Odoo, lo dice.
 */
export function skuOdoo(pieza: Pieza, config: Config): Traduccion {
  const modelo = (config.modelo || '').toUpperCase()
  const linea = LINEA_ODOO[modelo]
  if (!linea) return { falta: `Odoo no tiene la línea ${config.linea} / ${modelo}` }

  const color = colorOdoo(config.color)
  if (!color) return { falta: `el color "${config.color}" no está en la lista de Odoo` }

  const vars = variantes(pieza, config, linea)
  if (!vars) return { falta: `no se sabe traducir el subtipo ${pieza.subTipo}` }

  const medida = `${tresDigitos(pieza.anchoCm)}x${tresDigitos(pieza.altoCm)}`
  const partes = [linea, PIEZA_ODOO[pieza.familia], medida, ...vars, color.codigo, '12', color.acabado]
  return { sku: partes.join('-') }
}
