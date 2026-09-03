/**
 * Alturas de las piezas por modelo, guardadas en la nube.
 *
 * La tabla de fábrica vive en `catalog.ts` y es la de la ficha LEEDER M1. Acá
 * se le encima lo que un administrador haya corregido, que se guarda como un
 * JSON en `app_config` bajo la clave `alturas_modelo` para que sea igual para
 * todo el mundo.
 *
 * Si la tabla `app_config` todavía no existe (falta correr el SQL) o no hay
 * Supabase, la app sigue con las alturas de fábrica: nunca se queda sin tabla.
 */

import { ALTURAS_POR_MODELO, aplicarAlturas, type AlturasModelo } from './catalog'

export const CLAVE_ALTURAS = 'alturas_modelo'

function variable(nombre: string): string | undefined {
  const meta = import.meta as unknown as { env?: Record<string, string | undefined> }
  return meta.env?.[nombre]
}

const URL_SUPABASE = variable('VITE_SUPABASE_URL')
const LLAVE_SUPABASE = variable('VITE_SUPABASE_ANON_KEY')

export type TablaAlturas = Record<string, AlturasModelo>

export interface ResultadoAlturas {
  tabla: TablaAlturas
  deLaNube: boolean
  error?: string
}

export interface GuardadoAlturas {
  ok: boolean
  mensaje: string
}

/** una copia de la tabla de fábrica, para poder editarla sin tocar el catálogo */
export function alturasDeFabrica(): TablaAlturas {
  return JSON.parse(JSON.stringify(ALTURAS_POR_MODELO))
}

/** deja fuera lo que sea igual a fábrica: solo se guardan las correcciones */
export function soloCambios(tabla: TablaAlturas): TablaAlturas {
  const cambios: TablaAlturas = {}
  for (const [modelo, a] of Object.entries(tabla)) {
    const base = ALTURAS_POR_MODELO[modelo]
    if (!base) continue
    const igual =
      base.puerta === a.puerta &&
      base.panel === a.panel &&
      base.pilastra === a.pilastra &&
      base.mingitorio === a.mingitorio
    if (!igual) cambios[modelo] = a
  }
  return cambios
}

function mezclar(cambios: TablaAlturas): TablaAlturas {
  const tabla = alturasDeFabrica()
  for (const [modelo, a] of Object.entries(cambios)) {
    if (!tabla[modelo]) continue
    tabla[modelo] = {
      puerta: Number(a.puerta) || tabla[modelo].puerta,
      panel: Number(a.panel) || tabla[modelo].panel,
      pilastra: Number(a.pilastra) || tabla[modelo].pilastra,
      mingitorio: Number(a.mingitorio) || tabla[modelo].mingitorio,
    }
  }
  return tabla
}

export async function cargarAlturas(token: string): Promise<ResultadoAlturas> {
  if (!URL_SUPABASE || !LLAVE_SUPABASE) {
    return { tabla: alturasDeFabrica(), deLaNube: false, error: 'Sin Supabase configurado' }
  }
  try {
    const r = await fetch(
      `${URL_SUPABASE}/rest/v1/app_config?clave=eq.${CLAVE_ALTURAS}&select=valor`,
      { headers: { apikey: LLAVE_SUPABASE, Authorization: `Bearer ${token}`, Accept: 'application/json' } },
    )
    if (!r.ok) {
      return { tabla: alturasDeFabrica(), deLaNube: false, error: `app_config respondió ${r.status}` }
    }
    const filas = (await r.json()) as { valor: string }[]
    if (filas.length === 0) return { tabla: alturasDeFabrica(), deLaNube: false }
    const tabla = mezclar(JSON.parse(filas[0].valor) as TablaAlturas)
    return { tabla, deLaNube: true }
  } catch (e) {
    return {
      tabla: alturasDeFabrica(),
      deLaNube: false,
      error: e instanceof Error ? e.message : 'No se pudo consultar',
    }
  }
}

export async function guardarAlturas(token: string, tabla: TablaAlturas): Promise<GuardadoAlturas> {
  if (!URL_SUPABASE || !LLAVE_SUPABASE) {
    return { ok: false, mensaje: 'Sin Supabase configurado: no hay dónde guardar.' }
  }
  const cambios = soloCambios(tabla)
  try {
    const r = await fetch(`${URL_SUPABASE}/rest/v1/app_config?on_conflict=clave`, {
      method: 'POST',
      headers: {
        apikey: LLAVE_SUPABASE,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify([{ clave: CLAVE_ALTURAS, valor: JSON.stringify(cambios) }]),
    })
    if (!r.ok) {
      const detalle = await r.text()
      return { ok: false, mensaje: `Supabase respondió ${r.status}. ${detalle.slice(0, 200)}` }
    }
    const n = Object.keys(cambios).length
    return {
      ok: true,
      mensaje: n === 0 ? 'Todo quedó en las alturas de fábrica.' : `${n} modelo(s) corregidos. Ya los usa todo el mundo.`,
    }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'No se pudo guardar.' }
  }
}

/** deja la tabla activa para que la usen el plano, el CSV y la cotización */
export function usarAlturas(tabla: TablaAlturas) {
  aplicarAlturas(tabla)
}
