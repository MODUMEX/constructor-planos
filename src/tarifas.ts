import type { Moneda, TierColor } from './types'
import { TARIFAS_BASE } from './datos/tarifas-base'
import { LLAVE_SUPABASE, URL_SUPABASE } from './entorno'

/**
 * Precio por m² de cada pieza, con la misma mecánica que el Constructor actual
 * (`calcularPrecioPieza`). Las tarifas salen de la tabla `tarifa_m2` de
 * Supabase; si no hay nube, se usan las de respaldo extraídas del Constructor.
 */

export type FamiliaTarifa = 'puerta' | 'panel' | 'pilastra' | 'mingitorio' | 'antepecho'

export interface JuegoTarifas {
  puerta?: number
  panel?: number
  pilastra?: number
  mingitorio?: number
  antepecho?: number
}

export interface ModeloTarifas {
  /** el modelo cotiza en dólares y convierte a colones con el tipo de cambio */
  usdOnly?: boolean
  linea?: JuegoTarifas
  especiales?: JuegoTarifas
  aceroInox?: JuegoTarifas
  antigrafiti?: JuegoTarifas
  lineaCRC?: JuegoTarifas
  especialesCRC?: JuegoTarifas
  /** precio de línea en Costa Rica, para los modelos usdOnly */
  lineaCR?: JuegoTarifas
  [juego: string]: JuegoTarifas | boolean | undefined
}

export type TablaTarifas = Record<string, ModeloTarifas>

export function familiaTarifa(familia: 'PT' | 'PN' | 'PL' | 'MG' | 'AN'): FamiliaTarifa {
  switch (familia) {
    case 'PT':
      return 'puerta'
    case 'PN':
      return 'panel'
    case 'PL':
      return 'pilastra'
    case 'MG':
      return 'mingitorio'
    default:
      return 'antepecho'
  }
}

/** las puertas de 62, 64, 92 y 94 se cobran como la medida de arriba */
export function anchoCobradoPuerta(anchoCm: number): number {
  return ({ 62: 70, 64: 70, 92: 100, 94: 100 } as Record<number, number>)[anchoCm] ?? anchoCm
}

/** el tier del color, con el nombre que usa la tabla de tarifas */
function juegoDeTier(tier: TierColor): string {
  return tier === 'especial' ? 'especiales' : tier
}

export interface Pieza {
  familia: 'PT' | 'PN' | 'PL' | 'MG' | 'AN'
  anchoCm: number
  altoCm: number
}

export interface OpcionesPrecio {
  modeloCodigo: string
  tier: TierColor
  moneda: Moneda
  /** tipo de cambio para los modelos que solo tienen precio en dólares */
  tipoCambio: number
  tarifas?: TablaTarifas
}

/** precio de una pieza, ya en la moneda pedida */
export function precioPieza(pieza: Pieza, o: OpcionesPrecio): number {
  const tabla = o.tarifas ?? TARIFAS_BASE
  const modelo = tabla[o.modeloCodigo] ?? tabla.ESTANDAR
  if (!modelo) return 0

  const m2 = ((pieza.familia === 'PT' ? anchoCobradoPuerta(pieza.anchoCm) : pieza.anchoCm) * pieza.altoCm) / 1e4
  const fam = familiaTarifa(pieza.familia)
  const juego = juegoDeTier(o.tier)

  const leer = (nombre: string): number | undefined => {
    const j = modelo[nombre]
    if (!j || typeof j === 'boolean') return undefined
    const v = j[fam]
    // el antepecho, si no tiene tarifa propia, se cobra como puerta
    return v != null ? v : fam === 'antepecho' ? j.puerta : undefined
  }

  if (modelo.usdOnly) {
    const valido = ['linea', 'especiales', 'aceroInox', 'antigrafiti'].includes(juego)
    const clave = valido ? juego : 'especiales'
    let usd = leer(clave) ?? 0
    if (o.moneda === 'CRC') {
      if (clave === 'linea') usd = leer('lineaCR') ?? usd
      return m2 * usd * (o.tipoCambio || 0)
    }
    return m2 * usd
  }

  const claveTier = juego === 'linea' ? 'linea' : 'especiales'
  const clave = o.moneda === 'CRC' ? `${claveTier}CRC` : claveTier
  const tarifa = leer(clave) ?? leer(claveTier) ?? leer('especiales') ?? leer('linea') ?? 0
  return m2 * tarifa
}

// ---------- carga desde Supabase ----------

interface FilaTarifa {
  modelo_codigo: string
  tier: string
  moneda: string
  familia: string
  tarifa: number | string
}

/** las cinco familias que tiene la tabla de tarifas */
export const FAMILIAS: { key: FamiliaTarifa; label: string }[] = [
  { key: 'puerta', label: 'Puerta' },
  { key: 'panel', label: 'Panel' },
  { key: 'pilastra', label: 'Pilastra' },
  { key: 'mingitorio', label: 'Mingitorio' },
  { key: 'antepecho', label: 'Antepecho' },
]

/**
 * Los modelos que cotizan en dólares (Superior y Touchless) llevan un juego de
 * tarifas por tier, todos en USD; el resto tiene línea y especiales en cada
 * moneda. Es la misma separación que hace el Constructor con `usdOnly`.
 */
export const TIERS_USD_ONLY = ['linea', 'lineaCR', 'especiales', 'aceroInox', 'antigrafiti'] as const

/** los cuatro juegos del resto de modelos: tier + moneda → nombre del juego */
export const COMBOS_NORMALES: { tier: string; moneda: Moneda; juego: string }[] = [
  { tier: 'linea', moneda: 'USD', juego: 'linea' },
  { tier: 'especiales', moneda: 'USD', juego: 'especiales' },
  { tier: 'linea', moneda: 'CRC', juego: 'lineaCRC' },
  { tier: 'especiales', moneda: 'CRC', juego: 'especialesCRC' },
]

export function esUsdOnly(tabla: TablaTarifas, modelo: string): boolean {
  return Boolean(tabla[modelo]?.usdOnly)
}

export function modelosNormales(tabla: TablaTarifas): string[] {
  return Object.keys(tabla).filter((m) => !esUsdOnly(tabla, m))
}

export function modelosUsdOnly(tabla: TablaTarifas): string[] {
  return Object.keys(tabla).filter((m) => esUsdOnly(tabla, m))
}

export interface FilaParaGuardar {
  modelo_codigo: string
  tier: string
  moneda: Moneda
  familia: FamiliaTarifa
  tarifa: number
}

/** arma las filas de `tarifa_m2` a partir de la tabla en memoria */
export function filasParaGuardar(tabla: TablaTarifas): FilaParaGuardar[] {
  const filas: FilaParaGuardar[] = []
  const leer = (modelo: string, juego: string): JuegoTarifas | undefined => {
    const j = tabla[modelo]?.[juego]
    return j && typeof j !== 'boolean' ? j : undefined
  }

  for (const modelo of modelosNormales(tabla)) {
    for (const c of COMBOS_NORMALES) {
      const set = leer(modelo, c.juego)
      if (!set) continue
      for (const f of FAMILIAS) {
        const v = set[f.key]
        if (v == null) continue
        filas.push({ modelo_codigo: modelo, tier: c.tier, moneda: c.moneda, familia: f.key, tarifa: Number(v) })
      }
    }
  }
  // los usdOnly guardan todos sus tiers en dólares
  for (const modelo of modelosUsdOnly(tabla)) {
    for (const tier of TIERS_USD_ONLY) {
      const set = leer(modelo, tier)
      if (!set) continue
      for (const f of FAMILIAS) {
        const v = set[f.key]
        if (v == null) continue
        filas.push({ modelo_codigo: modelo, tier, moneda: 'USD', familia: f.key, tarifa: Number(v) })
      }
    }
  }
  return filas
}

export interface ResultadoGuardado {
  ok: boolean
  filas: number
  mensaje: string
}

/**
 * Escribe las tarifas en Supabase. Es un upsert por
 * (modelo_codigo, tier, moneda, familia), igual que el Constructor:
 * lo que se guarde acá lo usa todo el mundo al cotizar.
 */
export async function guardarTarifas(token: string, tabla: TablaTarifas): Promise<ResultadoGuardado> {
  const filas = filasParaGuardar(tabla)
  if (!URL_SUPABASE || !LLAVE_SUPABASE) {
    return { ok: false, filas: filas.length, mensaje: 'Sin Supabase configurado: no hay dónde guardar.' }
  }
  try {
    const r = await fetch(
      `${URL_SUPABASE}/rest/v1/tarifa_m2?on_conflict=modelo_codigo,tier,moneda,familia`,
      {
        method: 'POST',
        headers: {
          apikey: LLAVE_SUPABASE,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          // merge-duplicates es lo que convierte el insert en upsert
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(filas),
      },
    )
    if (!r.ok) {
      const detalle = await r.text()
      return { ok: false, filas: filas.length, mensaje: `Supabase respondió ${r.status}. ${detalle.slice(0, 200)}` }
    }
    return { ok: true, filas: filas.length, mensaje: `${filas.length} tarifas guardadas. Ya las usa todo el mundo.` }
  } catch (e) {
    return { ok: false, filas: filas.length, mensaje: e instanceof Error ? e.message : 'No se pudo guardar.' }
  }
}

export interface ResultadoTarifas {
  tabla: TablaTarifas
  /** cuántas tarifas llegaron de la nube */
  filas: number
  deLaNube: boolean
  error?: string
}

/**
 * Trae `tarifa_m2` y la vuelca sobre las tarifas de respaldo, igual que
 * `refreshTarifas()` del Constructor: cada fila pisa un valor puntual.
 */
export async function cargarTarifas(token: string): Promise<ResultadoTarifas> {
  const base: TablaTarifas = JSON.parse(JSON.stringify(TARIFAS_BASE))
  if (!URL_SUPABASE || !LLAVE_SUPABASE) {
    return { tabla: base, filas: 0, deLaNube: false, error: 'Sin Supabase configurado' }
  }
  try {
    const r = await fetch(
      `${URL_SUPABASE}/rest/v1/tarifa_m2?select=modelo_codigo,tier,moneda,familia,tarifa`,
      { headers: { apikey: LLAVE_SUPABASE, Authorization: `Bearer ${token}`, Accept: 'application/json' } },
    )
    if (!r.ok) return { tabla: base, filas: 0, deLaNube: false, error: `La tabla tarifa_m2 respondió ${r.status}` }
    const filas = (await r.json()) as FilaTarifa[]
    for (const f of filas) {
      const modelo = base[f.modelo_codigo]
      if (!modelo) continue
      const clave = f.moneda === 'CRC' ? `${f.tier}CRC` : f.tier
      const juego = (modelo[clave] as JuegoTarifas | undefined) ?? {}
      juego[f.familia as FamiliaTarifa] = Number(f.tarifa)
      modelo[clave] = juego
    }
    return { tabla: base, filas: filas.length, deLaNube: filas.length > 0 }
  } catch (e) {
    return { tabla: base, filas: 0, deLaNube: false, error: e instanceof Error ? e.message : 'No se pudo consultar' }
  }
}
