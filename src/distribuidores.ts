import type { Usuario } from './auth'

/**
 * Distribuidores, contra la misma tabla `distribuidor` que usa el Constructor
 * actual. El vendedor ya no escribe el nombre a mano en el cajetín: lo elige de
 * esta lista, y así el nombre que sale en el plano es siempre el mismo.
 *
 * Quién ve y quién puede dar de alta lo decide la base con sus políticas RLS:
 * Super Admin, Administrador y Vendedor ven y editan todos; un Distribuidor ve
 * solo el suyo y no puede crear.
 */

const URL_SUPABASE = import.meta.env.VITE_SUPABASE_URL as string | undefined
const LLAVE_SUPABASE = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const REGIONES = ['Costa Rica', 'LATAM', 'México'] as const
export type Region = (typeof REGIONES)[number]

export interface Distribuidor {
  distribuidorId: number
  nombre: string
  contacto: string
  email: string
  telefono: string
  ubicacion: string
  region: Region | null
  activo: boolean
}

export interface Resultado<T> {
  ok: boolean
  dato?: T
  mensaje: string
}

interface Fila {
  distribuidor_id: number
  nombre: string | null
  contacto: string | null
  email: string | null
  telefono: string | null
  ubicacion: string | null
  region: string | null
  activo: boolean | null
}

const COLUMNAS = 'distribuidor_id,nombre,contacto,email,telefono,ubicacion,region,activo'

function deFila(f: Fila): Distribuidor {
  return {
    distribuidorId: f.distribuidor_id,
    nombre: f.nombre ?? '',
    contacto: f.contacto ?? '',
    email: f.email ?? '',
    telefono: f.telefono ?? '',
    ubicacion: f.ubicacion ?? '',
    region: (REGIONES as readonly string[]).includes(f.region ?? '') ? (f.region as Region) : null,
    activo: f.activo !== false,
  }
}

function aFila(d: Partial<Distribuidor>) {
  return {
    nombre: (d.nombre ?? '').trim(),
    contacto: (d.contacto ?? '').trim() || null,
    email: (d.email ?? '').trim() || null,
    telefono: (d.telefono ?? '').trim() || null,
    ubicacion: (d.ubicacion ?? '').trim() || null,
    region: d.region ?? null,
    activo: d.activo !== false,
  }
}

function cabeceras(token: string, extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: LLAVE_SUPABASE!,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...extra,
  }
}

async function detalle(r: Response): Promise<string> {
  const t = await r.text().catch(() => '')
  if (r.status === 401 || r.status === 403) {
    return 'La base no te deja hacer este cambio: hace falta ser Administrador o Super Admin.'
  }
  return `Supabase respondió ${r.status}. ${t.slice(0, 200)}`
}

function sesionValida(u: Usuario | null): string | null {
  if (!u) return 'Hay que iniciar sesión.'
  if (!u.deLaNube || !u.token) {
    return 'Estás con una cuenta local de respaldo. La lista de distribuidores vive en la nube.'
  }
  return null
}

export async function listarDistribuidores(usuario: Usuario | null): Promise<Resultado<Distribuidor[]>> {
  if (!URL_SUPABASE || !LLAVE_SUPABASE) {
    return { ok: false, mensaje: 'Sin Supabase configurado: no hay lista de distribuidores.' }
  }
  const falta = sesionValida(usuario)
  if (falta) return { ok: false, mensaje: falta }
  try {
    const r = await fetch(
      `${URL_SUPABASE}/rest/v1/distribuidor?select=${COLUMNAS}&order=nombre.asc`,
      { headers: cabeceras(usuario!.token!) },
    )
    if (!r.ok) return { ok: false, mensaje: await detalle(r) }
    const filas = (await r.json()) as Fila[]
    return { ok: true, dato: filas.map(deFila), mensaje: `${filas.length} distribuidor(es)` }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'No se pudo consultar.' }
  }
}

export async function crearDistribuidor(usuario: Usuario | null, d: Partial<Distribuidor>): Promise<Resultado<Distribuidor>> {
  if (!URL_SUPABASE || !LLAVE_SUPABASE) return { ok: false, mensaje: 'Sin Supabase configurado.' }
  const falta = sesionValida(usuario)
  if (falta) return { ok: false, mensaje: falta }
  if (!(d.nombre ?? '').trim()) return { ok: false, mensaje: 'El nombre no puede ir en blanco.' }
  try {
    const r = await fetch(`${URL_SUPABASE}/rest/v1/distribuidor?select=${COLUMNAS}`, {
      method: 'POST',
      headers: cabeceras(usuario!.token!, { Prefer: 'return=representation' }),
      body: JSON.stringify([aFila(d)]),
    })
    if (!r.ok) return { ok: false, mensaje: await detalle(r) }
    const filas = (await r.json()) as Fila[]
    return { ok: true, dato: deFila(filas[0]), mensaje: 'Distribuidor dado de alta.' }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'No se pudo guardar.' }
  }
}

export async function guardarDistribuidor(usuario: Usuario | null, d: Distribuidor): Promise<Resultado<Distribuidor>> {
  if (!URL_SUPABASE || !LLAVE_SUPABASE) return { ok: false, mensaje: 'Sin Supabase configurado.' }
  const falta = sesionValida(usuario)
  if (falta) return { ok: false, mensaje: falta }
  if (!d.nombre.trim()) return { ok: false, mensaje: 'El nombre no puede ir en blanco.' }
  try {
    const r = await fetch(
      `${URL_SUPABASE}/rest/v1/distribuidor?distribuidor_id=eq.${d.distribuidorId}&select=${COLUMNAS}`,
      {
        method: 'PATCH',
        headers: cabeceras(usuario!.token!, { Prefer: 'return=representation' }),
        body: JSON.stringify(aFila(d)),
      },
    )
    if (!r.ok) return { ok: false, mensaje: await detalle(r) }
    const filas = (await r.json()) as Fila[]
    return { ok: true, dato: deFila(filas[0]), mensaje: 'Cambios guardados.' }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'No se pudo guardar.' }
  }
}
