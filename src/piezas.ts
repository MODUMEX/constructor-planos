/**
 * Piezas especiales: medidas que no están en las fichas y que se dan de alta a
 * mano desde la pantalla Piezas.
 *
 * Viven en `app_config` bajo la clave `piezas_especiales`, igual que las
 * alturas, para que sean las mismas en todas las computadoras. Si no hay
 * Supabase o falta correr el SQL, la app arranca sin ninguna: el catálogo de
 * fábrica nunca depende de la nube.
 *
 * A diferencia de las alturas, acá también escribe el Vendedor (lo permite el
 * SQL 25). Es a propósito: el que cotiza es el que se topa con la medida rara.
 */

import { aplicarPiezasEspeciales, type FamiliaPieza, type PiezaEspecial } from './catalog'
import { LLAVE_SUPABASE, URL_SUPABASE } from './entorno'

export const CLAVE_PIEZAS = 'piezas_especiales'

export interface ResultadoPiezas {
  lista: PiezaEspecial[]
  deLaNube: boolean
  error?: string
}

export interface GuardadoPiezas {
  ok: boolean
  mensaje: string
}

const FAMILIAS: FamiliaPieza[] = ['PT', 'PN', 'PL', 'MG']

/** deja pasar solo lo que tiene forma de pieza, venga de donde venga */
export function limpiar(dato: unknown): PiezaEspecial[] {
  if (!Array.isArray(dato)) return []
  const vistas = new Set<string>()
  const buenas: PiezaEspecial[] = []
  for (const x of dato) {
    if (!x || typeof x !== 'object') continue
    const p = x as Record<string, unknown>
    const familia = String(p.familia || '').toUpperCase() as FamiliaPieza
    const modelo = String(p.modelo || '').toUpperCase()
    const anchoCm = Number(p.anchoCm)
    const altoCm = Number(p.altoCm)
    if (!FAMILIAS.includes(familia) || !modelo) continue
    if (!Number.isFinite(anchoCm) || anchoCm <= 0) continue
    if (familia === 'MG' && (!Number.isFinite(altoCm) || altoCm <= 0)) continue
    const clave = `${familia}|${modelo}|${anchoCm}|${familia === 'MG' ? altoCm : ''}`
    if (vistas.has(clave)) continue
    vistas.add(clave)
    buenas.push(familia === 'MG' ? { familia, modelo, anchoCm, altoCm } : { familia, modelo, anchoCm })
  }
  return buenas
}

export function ordenar(lista: PiezaEspecial[]): PiezaEspecial[] {
  return [...lista].sort(
    (a, b) =>
      a.modelo.localeCompare(b.modelo) ||
      FAMILIAS.indexOf(a.familia) - FAMILIAS.indexOf(b.familia) ||
      a.anchoCm - b.anchoCm ||
      (a.altoCm ?? 0) - (b.altoCm ?? 0),
  )
}

export async function cargarPiezas(token: string): Promise<ResultadoPiezas> {
  if (!URL_SUPABASE || !LLAVE_SUPABASE) {
    return { lista: [], deLaNube: false, error: 'Sin Supabase configurado' }
  }
  try {
    const r = await fetch(
      `${URL_SUPABASE}/rest/v1/app_config?clave=eq.${CLAVE_PIEZAS}&select=valor`,
      { headers: { apikey: LLAVE_SUPABASE, Authorization: `Bearer ${token}`, Accept: 'application/json' } },
    )
    if (!r.ok) return { lista: [], deLaNube: false, error: `app_config respondió ${r.status}` }
    const filas = (await r.json()) as { valor: string }[]
    if (filas.length === 0) return { lista: [], deLaNube: false }
    return { lista: ordenar(limpiar(JSON.parse(filas[0].valor))), deLaNube: true }
  } catch (e) {
    return { lista: [], deLaNube: false, error: e instanceof Error ? e.message : 'No se pudo consultar' }
  }
}

export async function guardarPiezas(token: string, lista: PiezaEspecial[]): Promise<GuardadoPiezas> {
  if (!URL_SUPABASE || !LLAVE_SUPABASE) {
    return { ok: false, mensaje: 'Sin Supabase configurado: no hay dónde guardar.' }
  }
  const limpia = limpiar(lista)
  try {
    const r = await fetch(`${URL_SUPABASE}/rest/v1/app_config?on_conflict=clave`, {
      method: 'POST',
      headers: {
        apikey: LLAVE_SUPABASE,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify([{ clave: CLAVE_PIEZAS, valor: JSON.stringify(limpia) }]),
    })
    if (!r.ok) {
      const detalle = await r.text()
      return { ok: false, mensaje: `Supabase respondió ${r.status}. ${detalle.slice(0, 200)}` }
    }
    return {
      ok: true,
      mensaje: limpia.length === 0
        ? 'No quedó ninguna pieza especial: todos los modelos usan solo las medidas de ficha.'
        : `${limpia.length} pieza(s) especial(es) guardadas. Ya las ve todo el mundo.`,
    }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'No se pudo guardar.' }
  }
}

/** deja la lista activa para los selectores, el plano y la cotización */
export function usarPiezas(lista: PiezaEspecial[]) {
  aplicarPiezasEspeciales(lista)
}
