import type { Proyecto, RenglonBOM, Tramo } from './types'
import { anchoTotal } from './modulacion'
import { nombreModelo } from './catalog'

/**
 * Contrato del pedido que sale hacia el ERP.
 * Mientras no estén las credenciales, `enviarPedido` responde local
 * con un número simulado. El día que IT confirme el ERP solo se cambia
 * el cuerpo de esa función: el payload ya queda definido acá.
 */
export interface PedidoERP {
  origen: 'constructor-de-planos'
  version: string
  numeroPlano: string
  cliente: { nombre: string; ubicacion: string }
  obra: string
  creadoPor: string
  moneda: 'CRC' | 'USD'
  /** dónde se fabrica: CR o MX */
  paisFabricacion: string
  areas: {
    nombre: string
    piso: string
    linea: string
    /** código de tarifa, p. ej. SUP_REFORZADO */
    modelo: string
    /** el nombre para leer, p. ej. Reforzado */
    modeloNombre: string
    acabado: string
    color: string
    /** código de materia prima; solo lo llevan los colores de México */
    colorCodigo?: string
    /** acabado del juego completo de herrajes: INOX o NEGRO */
    herraje: string
    montaje: string
    alturaCm: number
    profundidadCm: number
    tipologia: string
    tramos: { nombre: string; claroCm: number; anchos: number[] }[]
    cabinas: number
    orinales: number
  }[]
  renglones: { sku: string; descripcion: string; cantidad: number; precioUnit: number; total: number }[]
  totales: { neto: number; descuento: number; iva: number; total: number }
}

export function armarPedido(
  proyecto: Proyecto,
  renglones: RenglonBOM[],
  totales: PedidoERP['totales'],
  moneda: 'CRC' | 'USD',
): PedidoERP {
  return {
    origen: 'constructor-de-planos',
    version: '2.0.0',
    numeroPlano: proyecto.numero,
    cliente: { nombre: proyecto.cliente, ubicacion: proyecto.ubicacion },
    obra: proyecto.obra,
    creadoPor: proyecto.creadoPor,
    moneda,
    paisFabricacion: proyecto.paisFabricacion,
    areas: proyecto.areas.map((a) => ({
      nombre: a.nombre,
      piso: a.piso,
      linea: a.config.linea,
      modelo: a.config.modelo,
      modeloNombre: nombreModelo(a.config.linea, a.config.modelo),
      acabado: a.config.acabado,
      color: a.config.color,
      colorCodigo: a.config.colorCodigo,
      herraje: a.config.herrajeAcabado,
      montaje: a.config.montaje,
      alturaCm: a.config.alturaCm,
      profundidadCm: a.config.profundidadCm,
      tipologia: a.config.tipologia,
      tramos: a.tramos.map((t: Tramo) => ({
        nombre: t.nombre,
        claroCm: anchoTotal(t.cabinas),
        anchos: t.cabinas.map((c) => c.anchoCm),
      })),
      cabinas: a.tramos.reduce((s, t) => s + t.cabinas.length, 0),
      orinales: a.config.orinales,
    })),
    renglones: renglones.map((r) => ({
      sku: r.sku,
      descripcion: r.descripcion,
      cantidad: r.cantidad,
      precioUnit: Number(r.precioUnit.toFixed(2)),
      total: Number((r.cantidad * r.precioUnit).toFixed(2)),
    })),
    totales,
  }
}

export interface RespuestaERP {
  ok: boolean
  numeroPedido?: string
  mensaje: string
}

const URL_ERP = import.meta.env.VITE_ERP_URL as string | undefined

export async function enviarPedido(pedido: PedidoERP): Promise<RespuestaERP> {
  if (URL_ERP) {
    try {
      const r = await fetch(URL_ERP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedido),
      })
      if (!r.ok) return { ok: false, mensaje: `El ERP respondió ${r.status}. El pedido no se registró.` }
      const data = await r.json()
      return { ok: true, numeroPedido: data.numeroPedido ?? '—', mensaje: 'Pedido registrado en el ERP.' }
    } catch {
      return { ok: false, mensaje: 'No se pudo contactar al ERP. Revisá la conexión o avisale a IT.' }
    }
  }

  await new Promise((r) => setTimeout(r, 700))
  const suf = String(pedido.numeroPlano).replace(/\D/g, '').slice(-4) || '0001'
  return {
    ok: true,
    numeroPedido: `SIM-${suf}`,
    mensaje: 'Simulado: todavía no hay ERP configurado, así que el pedido no salió de esta máquina.',
  }
}

export const erpConectado = Boolean(URL_ERP)
