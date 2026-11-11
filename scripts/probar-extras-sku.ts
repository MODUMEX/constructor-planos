/**
 * Los extras que se cobran por m² también tienen que llegar a Odoo.
 *
 * Una puerta suelta, un panel, una pilastra, una costilla o una mampara de
 * mingitorio son piezas del mismo catálogo que las de la modulación. Antes no
 * se les armaba ningún código y la cotización entera se trababa con
 * "el extra ... no tiene código de artículo", sin forma de arreglarlo desde
 * la pantalla.
 *
 * Acá se comprueba que cada uno salga con su SKU, que la variante que se
 * elige mande, y —lo más importante— que cuando la variante NO está elegida
 * no se invente ninguna: mandar a fabricar una puerta de la mano equivocada
 * es peor que no mandarla.
 *
 *   npm run probar-extras-sku
 */
import { lineasParaOdoo } from '../src/odoo/enviar'
import { subTipoDeExtra, pideVariante, VARIANTES_EXTRA } from '../src/extras'
import type { Config, Extra, Proyecto } from '../src/types'

let mal = 0
const ok = (b: boolean, t: string) => { if (!b) mal++; console.log(`${b ? '✓' : '✕'} ${t}`) }

const config = {
  tipologia: 'E', modelo: 'ESTANDAR', linea: 'LEEDER',
  claroCm: 300, profundidadCm: 150, cantidad: 2, alturaCm: 200,
  puertaCm: 62, anchoPilastraCm: 24, orinales: 0, anchoOrinalCm: 60,
  montaje: 'PISO_HEADRAIL', color: 'BLANCO', acabado: 'Laminado Compacto',
  terminacion: 'ZOCLO', espesorMm: 12,
  mgAnchoCm: 45, mgAlturaCm: 120, mamparasMG: [],
} as unknown as Config

function proyectoCon(extras: Extra[]): Proyecto {
  return {
    numero: '1000',
    areas: [{ nombre: 'Área 1', tramos: [], config }],
    extras,
  } as unknown as Proyecto
}

const precios = { moneda: 'CRC', tipoCambio: 512, tarifas: undefined, pais: 'CR' } as never

function lineaDe(extras: Extra[]) {
  const r = lineasParaOdoo(proyectoCon(extras), precios)
  return { linea: r.lineas[0], faltan: r.faltan }
}

console.log('— el caso que trajo Dayanna: la mampara de mingitorio')
{
  const { linea, faltan } = lineaDe([
    { tipo: 'mingitorio', cantidad: 1, anchoCm: 60, altoCm: 150 },
  ])
  ok(faltan.length === 0, 'ya no falta nada')
  ok(!!linea && linea.sku.includes('-MG-'), `sale como pieza MG: ${linea?.sku}`)
  ok(!!linea && linea.sku.includes('060x150'), 'con la medida que se pidió')
}

console.log('\n— las otras familias, con su variante elegida')
{
  const casos: { extra: Extra; espera: string; que: string }[] = [
    { extra: { tipo: 'puerta', cantidad: 1, anchoCm: 60, altoCm: 150, subTipo: 'PTADER' },
      espera: '-PT-060x150-DER-N-', que: 'puerta derecha' },
    { extra: { tipo: 'puerta', cantidad: 1, anchoCm: 60, altoCm: 150, subTipo: 'PTAIZQ-AM' },
      espera: '-PT-060x150-IZQ-M-', que: 'puerta izquierda contra muro' },
    { extra: { tipo: 'panel', cantidad: 1, anchoCm: 150, altoCm: 150, subTipo: 'PNCEN' },
      espera: '-PN-150x150-CEN-', que: 'panel central' },
    { extra: { tipo: 'pilastra', cantidad: 1, anchoCm: 24, altoCm: 200, subTipo: 'PLLATMUR' },
      espera: '-PI-024x200-LATM-ZOC-', que: 'pilastra lateral contra muro' },
    { extra: { tipo: 'costilla', cantidad: 1, anchoCm: 19, altoCm: 200 },
      espera: '-PI-019x200-COS-ZOC-', que: 'costilla, que no pregunta nada' },
  ]
  for (const c of casos) {
    const { linea, faltan } = lineaDe([c.extra])
    ok(!!linea && linea.sku.includes(c.espera),
      `${c.que}: ${linea?.sku ?? faltan.join(' / ')}`)
  }
}

console.log('\n— lo que NO se debe adivinar')
{
  for (const tipo of ['puerta', 'panel', 'pilastra'] as const) {
    const { linea, faltan } = lineaDe([{ tipo, cantidad: 1, anchoCm: 60, altoCm: 150 }])
    ok(!linea && faltan.some((f) => f.includes('variante')),
      `${tipo} sin variante no se manda, y el aviso dice qué falta`)
  }

  const { linea } = lineaDe([
    { tipo: 'puerta', cantidad: 1, anchoCm: 60, altoCm: 150, subTipo: 'INVENTADA' },
  ])
  ok(!linea, 'una variante que no está en la lista tampoco pasa')

  ok(subTipoDeExtra({ tipo: 'herraje', cantidad: 1, codigo: 'H-001' }) === null,
    'un herraje no tiene variante: su código sale de la lista de artículos')
}

console.log('\n— qué se pregunta y qué no')
{
  ok(pideVariante('puerta') && pideVariante('panel') && pideVariante('pilastra'),
    'puerta, panel y pilastra preguntan la variante')
  ok(!pideVariante('mingitorio') && !pideVariante('costilla'),
    'mingitorio y costilla no: no hay nada que elegir')
  ok(!pideVariante('herraje') && !pideVariante('grabado'),
    'herraje y grabado tampoco: van por código de la lista')

  const sueltas = Object.values(VARIANTES_EXTRA).flat().map((v) => v!.valor)
  ok(new Set(sueltas).size === sueltas.length, 'no hay variantes repetidas en la tabla')
}

console.log(mal === 0 ? '\nTodo cuadra.' : `\n${mal} caso(s) mal.`)
process.exit(mal === 0 ? 0 : 1)
