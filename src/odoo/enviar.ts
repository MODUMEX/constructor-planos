import type { Moneda, Pais, Proyecto, RenglonBOM } from '../types'
import type { Usuario } from '../auth'
import { tierDeColor } from '../catalog'
import { precioPieza, type TablaTarifas } from '../tarifas'
import { agrupar, piezasDeArea } from '../exportar/piezas'
import { esSku, skuOdoo } from './sku'

/**
 * Lo que hace falta para mandar una cotización a Odoo desde la app.
 *
 * A Odoo van las PIEZAS FÍSICAS, una por una, porque su código necesita saber
 * si la puerta es derecha o izquierda y si va contra muro — cosas que la
 * cotización de pantalla no distingue, porque ahí solo importa el precio.
 *
 * Los dos caminos tienen que dar la misma plata. Si no dan, no se manda:
 * mandarle a Odoo un monto distinto al que firmó el cliente es peor que no
 * mandar nada.
 */

const URL_SUPABASE = import.meta.env.VITE_SUPABASE_URL as string | undefined
const LLAVE_SUPABASE = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export interface Resultado<T> {
  ok: boolean
  dato?: T
  mensaje: string
}

export interface LineaOdoo {
  /** el código que se guarda en cotizacion_linea */
  codigo: string
  /** el código del producto en Odoo */
  sku: string
  descripcion: string
  cantidad: number
  precioUnit: number
}

export interface Precios {
  moneda: Moneda
  tipoCambio: number
  tarifas?: TablaTarifas
  pais?: Pais
}

/**
 * Las piezas del proyecto con su código de Odoo y su precio. `faltan` trae las
 * que Odoo no puede recibir, con el motivo, para poder decirlo en pantalla.
 */
export function lineasParaOdoo(
  proyecto: Proyecto,
  precios: Precios,
): { lineas: LineaOdoo[]; faltan: string[] } {
  const lineas: LineaOdoo[] = []
  const faltan = new Set<string>()

  for (const area of proyecto.areas) {
    const config = area.config
    const opciones = {
      modeloCodigo: config.modelo,
      tier: tierDeColor(config.color, precios.pais, config.linea),
      moneda: precios.moneda,
      tipoCambio: precios.tipoCambio,
      tarifas: precios.tarifas,
    }
    for (const r of agrupar(piezasDeArea(area), config)) {
      const traduccion = skuOdoo(
        { familia: r.familia, anchoCm: r.anchoCm, altoCm: r.altoCm, subTipo: r.subTipo, area: r.area },
        config,
      )
      if (!esSku(traduccion)) { faltan.add(traduccion.falta); continue }
      lineas.push({
        codigo: r.sku,
        sku: traduccion.sku,
        descripcion: `${r.subTipo} ${r.anchoCm} x ${r.altoCm} cm · ${area.nombre}`,
        cantidad: r.cantidad,
        precioUnit: precioPieza({ familia: r.familia, anchoCm: r.anchoCm, altoCm: r.altoCm }, opciones),
      })
    }
  }
  return { lineas, faltan: [...faltan] }
}

export const totalDe = (lineas: LineaOdoo[]) =>
  lineas.reduce((s, l) => s + l.cantidad * l.precioUnit, 0)

/**
 * Compara la plata de las piezas contra la de la cotización de pantalla. Un
 * colón de diferencia se perdona por el redondeo; más que eso es un desacuerdo
 * de verdad y hay que frenar.
 */
export function cuadran(lineas: LineaOdoo[], renglones: RenglonBOM[]): { ok: boolean; mensaje: string } {
  const piezas = totalDe(lineas)
  const pantalla = renglones.reduce((s, r) => s + r.cantidad * r.precioUnit, 0)
  const dif = Math.abs(piezas - pantalla)
  if (dif <= 1) return { ok: true, mensaje: '' }
  return {
    ok: false,
    mensaje:
      `El detalle por piezas suma ${piezas.toFixed(2)} y la cotización de pantalla ${pantalla.toFixed(2)}: `
      + `sobran ${dif.toFixed(2)}. No se manda hasta saber cuál está bien.`,
  }
}

// ---------- la base ----------

function cabeceras(token: string) {
  return {
    apikey: LLAVE_SUPABASE ?? '',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }
}

async function detalle(r: Response): Promise<string> {
  const t = await r.text().catch(() => '')
  return `Supabase respondió ${r.status}. ${t.slice(0, 200)}`
}

function sinNube<T>(): Resultado<T> {
  return { ok: false, mensaje: 'La app no tiene configurada la conexión con Supabase.' }
}

export interface CotizacionGuardada {
  cotizacionId: number
  numero: string
  estado: string
}

export interface DatosCotizacion {
  proyectoId: number
  numero: string
  distribuidorId: number | null
  moneda: Moneda
  tipoCambio: number
  descuentoPct: number
  ivaPct: number
  pais: string
  modelo: string
  tier: string
}

/**
 * Congela la cotización: la guarda tal como se autoriza, con sus partidas. Si
 * el proyecto ya tenía una Pendiente o Rechazada, se reemplaza; una Enviada no
 * se toca (la base tampoco lo deja).
 */
export async function guardarCotizacion(
  usuario: Usuario | null,
  datos: DatosCotizacion,
  lineas: LineaOdoo[],
): Promise<Resultado<CotizacionGuardada>> {
  if (!URL_SUPABASE || !LLAVE_SUPABASE) return sinNube()
  if (!usuario?.token) return { ok: false, mensaje: 'La sesión no tiene token: volvé a entrar.' }
  const h = cabeceras(usuario.token)

  const neto = totalDe(lineas)
  const descuento = neto * (datos.descuentoPct / 100)
  const gravable = neto - descuento
  const iva = gravable * (datos.ivaPct / 100)

  try {
    // ¿ya hay una cotización de este proyecto?
    const previa = await fetch(
      `${URL_SUPABASE}/rest/v1/cotizacion?select=cotizacion_id,estado&proyecto_id=eq.${datos.proyectoId}`,
      { headers: h },
    )
    if (!previa.ok) return { ok: false, mensaje: await detalle(previa) }
    const hay = (await previa.json()) as { cotizacion_id: number; estado: string }[]
    const enviada = hay.find((c) => c.estado === 'Enviada')
    if (enviada) {
      return { ok: false, mensaje: 'Este proyecto ya tiene una cotización enviada a Odoo: queda bloqueada.' }
    }
    // las que no se mandaron se rehacen: la que vale es la última
    for (const c of hay) {
      await fetch(`${URL_SUPABASE}/rest/v1/cotizacion?cotizacion_id=eq.${c.cotizacion_id}`,
        { method: 'DELETE', headers: h })
    }

    const cuerpo = {
      proyecto_id: datos.proyectoId,
      numero: datos.numero,
      producto_modelo: datos.modelo,
      tier: datos.tier,
      moneda: datos.moneda,
      tipo_cambio: datos.tipoCambio,
      distribuidor_id: datos.distribuidorId,
      pais: datos.pais,
      descuento_pct: datos.descuentoPct,
      iva_pct: datos.ivaPct,
      subtotal_fab: Number(neto.toFixed(2)),
      total_sin_iva: Number(gravable.toFixed(2)),
      iva_monto: Number(iva.toFixed(2)),
      gran_total: Number((gravable + iva).toFixed(2)),
    }
    const r = await fetch(`${URL_SUPABASE}/rest/v1/cotizacion`, {
      method: 'POST', headers: h, body: JSON.stringify(cuerpo),
    })
    if (!r.ok) return { ok: false, mensaje: await detalle(r) }
    const [creada] = (await r.json()) as { cotizacion_id: number; numero: string; estado: string }[]

    const partidas = lineas.map((l) => ({
      cotizacion_id: creada.cotizacion_id,
      codigo: l.codigo,
      descripcion: l.descripcion,
      cantidad: l.cantidad,
      precio_unit: Number(l.precioUnit.toFixed(4)),
      subtotal: Number((l.cantidad * l.precioUnit).toFixed(2)),
    }))
    const rl = await fetch(`${URL_SUPABASE}/rest/v1/cotizacion_linea`, {
      method: 'POST', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify(partidas),
    })
    if (!rl.ok) {
      // sin partidas la cotización no sirve: mejor no dejarla a medias
      await fetch(`${URL_SUPABASE}/rest/v1/cotizacion?cotizacion_id=eq.${creada.cotizacion_id}`,
        { method: 'DELETE', headers: h })
      return { ok: false, mensaje: await detalle(rl) }
    }

    return {
      ok: true,
      dato: { cotizacionId: creada.cotizacion_id, numero: creada.numero, estado: creada.estado },
      mensaje: `Cotización ${creada.numero} guardada con ${partidas.length} partida(s).`,
    }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'No se pudo guardar la cotización.' }
  }
}

export interface EnvioOdoo {
  odooOrderId: number
  odooOrderName: string
}

/** Llama a la Edge Function, que es la única que conoce la llave de Odoo. */
async function llamarFuncion(
  usuario: Usuario | null,
  cuerpo: Record<string, unknown>,
): Promise<Resultado<Record<string, unknown>>> {
  if (!URL_SUPABASE || !LLAVE_SUPABASE) return sinNube()
  if (!usuario?.token) return { ok: false, mensaje: 'La sesión no tiene token: volvé a entrar.' }
  try {
    const r = await fetch(`${URL_SUPABASE}/functions/v1/enviar-odoo`, {
      method: 'POST',
      headers: {
        apikey: LLAVE_SUPABASE,
        Authorization: `Bearer ${usuario.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cuerpo),
    })
    const datos = (await r.json().catch(() => null)) as Record<string, unknown> | null
    if (!r.ok || !datos?.ok) {
      return { ok: false, mensaje: String(datos?.error ?? `La función respondió ${r.status}.`) }
    }
    return { ok: true, dato: datos, mensaje: '' }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'No se pudo llamar a la función.' }
  }
}

export async function autorizar(
  usuario: Usuario | null,
  cotizacionId: number,
  lineas: LineaOdoo[],
): Promise<Resultado<EnvioOdoo>> {
  const skus = lineas.map((l) => ({ codigo: l.codigo, sku: l.sku }))
  const r = await llamarFuncion(usuario, { accion: 'autorizar', cotizacion_id: cotizacionId, skus })
  if (!r.ok) return { ok: false, mensaje: r.mensaje }
  const nombre = String(r.dato?.odoo_order_name ?? '')
  return {
    ok: true,
    dato: { odooOrderId: Number(r.dato?.odoo_order_id ?? 0), odooOrderName: nombre },
    mensaje: `Presupuesto ${nombre} creado en Odoo.`,
  }
}

export async function rechazar(
  usuario: Usuario | null,
  cotizacionId: number,
  motivo: string,
): Promise<Resultado<null>> {
  const r = await llamarFuncion(usuario, { accion: 'rechazar', cotizacion_id: cotizacionId, motivo })
  return { ok: r.ok, mensaje: r.ok ? 'Cotización rechazada.' : r.mensaje }
}

export interface EstadoCotizacion {
  proyectoId: number
  cotizacionId: number
  estado: string
  odooOrderName: string | null
  venceEl: string | null
}

/** El estado de la cotización de cada proyecto, para pintarlo en la lista. */
export async function estadosDeCotizacion(usuario: Usuario | null): Promise<Resultado<EstadoCotizacion[]>> {
  if (!URL_SUPABASE || !LLAVE_SUPABASE) return sinNube()
  if (!usuario?.token) return { ok: false, mensaje: 'La sesión no tiene token: volvé a entrar.' }
  try {
    const campos = 'cotizacion_id,proyecto_id,estado,odoo_order_name,vence_el'
    const r = await fetch(`${URL_SUPABASE}/rest/v1/cotizacion?select=${campos}`, {
      headers: cabeceras(usuario.token),
    })
    if (!r.ok) return { ok: false, mensaje: await detalle(r) }
    const filas = (await r.json()) as {
      cotizacion_id: number; proyecto_id: number; estado: string
      odoo_order_name: string | null; vence_el: string | null
    }[]
    return {
      ok: true,
      mensaje: `${filas.length} cotización(es).`,
      dato: filas.map((f) => ({
        proyectoId: f.proyecto_id,
        cotizacionId: f.cotizacion_id,
        estado: f.estado,
        odooOrderName: f.odoo_order_name,
        venceEl: f.vence_el,
      })),
    }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'No se pudo consultar.' }
  }
}
