import { GRABADOS, HERRAJES, type ArticuloSuelto } from './datos/articulos'
import { precioPieza, type OpcionesPrecio } from './tarifas'
import type { Extra, RenglonBOM } from './types'

/**
 * Piezas extra de la cotización: lo que se agrega a mano y no sale de la
 * modulación. Una puerta de repuesto, una pilastra suelta, un herraje, un
 * grabado láser.
 *
 * De dónde sale cada precio:
 *
 *   · puerta, panel, pilastra y mingitorio se cobran POR M², con la misma
 *     tarifa, tier y moneda que el resto del proyecto. Se piden las medidas
 *     porque el precio depende del área de la pieza.
 *   · herraje y grabado se cobran POR UNIDAD y están en las dos listas: la de
 *     LATAM en dólares y la de México en pesos. Para Costa Rica se toma el de
 *     dólares y se pasa a colones con el tipo de cambio, que es la misma regla
 *     que ya usan los modelos `usdOnly`.
 *
 * Un precio escrito a mano SIEMPRE manda sobre el del catálogo: es la salida
 * para un artículo que no está en la lista o para un precio negociado.
 */

export const FAMILIAS_EXTRA = [
  { tipo: 'puerta', etiqueta: 'Puerta', familia: 'PT', porM2: true },
  { tipo: 'panel', etiqueta: 'Panel', familia: 'PN', porM2: true },
  { tipo: 'pilastra', etiqueta: 'Pilastra', familia: 'PL', porM2: true },
  { tipo: 'mingitorio', etiqueta: 'Mampara de mingitorio', familia: 'MG', porM2: true },
  { tipo: 'herraje', etiqueta: 'Herraje', familia: null, porM2: false },
  { tipo: 'grabado', etiqueta: 'Grabado láser', familia: null, porM2: false },
] as const

export type TipoExtra = (typeof FAMILIAS_EXTRA)[number]['tipo']

export function esPorM2(tipo: TipoExtra): boolean {
  return FAMILIAS_EXTRA.find((f) => f.tipo === tipo)?.porM2 ?? false
}

export function etiquetaExtra(tipo: TipoExtra): string {
  return FAMILIAS_EXTRA.find((f) => f.tipo === tipo)?.etiqueta ?? tipo
}

/** el catálogo por unidad que le corresponde al tipo; vacío si se cobra por m² */
export function catalogoDe(tipo: TipoExtra): ArticuloSuelto[] {
  if (tipo === 'herraje') return HERRAJES
  if (tipo === 'grabado') return GRABADOS
  return []
}

export function articuloDe(tipo: TipoExtra, codigo: string): ArticuloSuelto | undefined {
  const c = (codigo || '').trim().toUpperCase()
  return catalogoDe(tipo).find((a) => a.codigo.toUpperCase() === c)
}

/**
 * Precio unitario de un extra. Devuelve también si salió de una lista o si
 * hubo que inventarlo, para poder avisarlo en la cotización en vez de que pase
 * por un precio firme.
 */
export function precioDeExtra(extra: Extra, o: OpcionesPrecio): { precio: number; deLista: boolean } {
  // lo escrito a mano manda siempre
  if (extra.precioUnit != null && extra.precioUnit > 0) return { precio: extra.precioUnit, deLista: true }

  const fam = FAMILIAS_EXTRA.find((f) => f.tipo === extra.tipo)
  if (fam?.porM2 && fam.familia) {
    const ancho = Number(extra.anchoCm) || 0
    const alto = Number(extra.altoCm) || 0
    if (ancho <= 0 || alto <= 0) return { precio: 0, deLista: false }
    return { precio: precioPieza({ familia: fam.familia, anchoCm: ancho, altoCm: alto }, o), deLista: true }
  }

  const art = articuloDe(extra.tipo, extra.codigo ?? '')
  if (!art) return { precio: 0, deLista: false }
  if (o.moneda === 'MXN') {
    return art.mxn != null ? { precio: art.mxn, deLista: true } : { precio: 0, deLista: false }
  }
  if (art.usd == null) return { precio: 0, deLista: false }
  // Costa Rica factura en colones pero la lista está en dólares: se convierte
  // con el tipo de cambio, igual que las tarifas de los modelos usdOnly
  if (o.moneda === 'CRC') return { precio: art.usd * (o.tipoCambio || 0), deLista: (o.tipoCambio || 0) > 0 }
  return { precio: art.usd, deLista: true }
}

/** los extras como renglones de cotización, listos para sumarse al resto */
export function renglonesDeExtras(extras: Extra[], o: OpcionesPrecio): RenglonBOM[] {
  return extras
    .filter((x) => (Number(x.cantidad) || 0) > 0)
    .map((x) => {
      const { precio, deLista } = precioDeExtra(x, o)
      const medidas = esPorM2(x.tipo) && x.anchoCm && x.altoCm ? ` ${x.anchoCm} × ${x.altoCm} cm` : ''
      return {
        sku: (x.codigo || '').trim() || `EXTRA-${x.tipo.toUpperCase()}`,
        descripcion: (x.descripcion || '').trim() || `${etiquetaExtra(x.tipo)}${medidas}`,
        tipo: etiquetaExtra(x.tipo),
        cantidad: Number(x.cantidad) || 0,
        precioUnit: precio,
        tarifaReal: deLista,
      }
    })
}
