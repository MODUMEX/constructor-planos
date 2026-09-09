import type { Usuario } from './auth'

/**
 * Distribuidores, contra la misma tabla `distribuidor` que usa el Constructor
 * actual. El vendedor ya no escribe el nombre a mano en el cajetín: lo elige de
 * esta lista, y así el nombre que sale en el plano es siempre el mismo.
 *
 * Quién ve y quién puede dar de alta lo decide la base con sus políticas RLS:
 * Super Admin, Administrador y Vendedor ven y editan todos; un Distribuidor ve
 * solo el suyo y no puede crear.
 *
 * Dar de alta NO escribe la tabla directo: llama a la Edge Function
 * `gestion-usuarios`, que además de la ficha crea la CUENTA de acceso del
 * distribuidor (correo + contraseña, rol Distribuidor). Eso necesita la llave
 * secreta de Supabase, que vive en el servidor y nunca en el navegador.
 */

const URL_SUPABASE = import.meta.env.VITE_SUPABASE_URL as string | undefined
const LLAVE_SUPABASE = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const REGIONES = ['Costa Rica', 'LATAM', 'México'] as const
export type Region = (typeof REGIONES)[number]

/**
 * Los países que el Constructor viejo ofrecía para el distribuidor. Llena el
 * País de la cotización, y es distinto de la REGIÓN: la región decide la
 * moneda y el IVA automático, el país es el dato del cliente.
 */
export const PAISES_DISTRIBUIDOR = [
  'México', 'Guatemala', 'Honduras', 'El Salvador', 'Nicaragua', 'Costa Rica', 'Panamá',
  'Rep. Dominicana', 'Puerto Rico', 'Jamaica', 'Bahamas', 'Colombia', 'Chile', 'Uruguay', 'Perú',
] as const

/** lo que se manda al dar de alta o editar: la ficha más el acceso */
export interface DatosDistribuidor extends Partial<Distribuidor> {
  /** contraseña de la cuenta del distribuidor; obligatoria al darlo de alta */
  password?: string
}

export interface Distribuidor {
  distribuidorId: number
  nombre: string
  contacto: string
  email: string
  telefono: string
  ubicacion: string
  region: Region | null
  /** país del distribuidor; cae en el País de la cotización */
  pais: string | null
  /** descuento en % que cae automático en la cotización */
  descuento: number
  /** IVA en %; null = el automático de la región (Costa Rica 13, LATAM 0) */
  iva: number | null
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
  pais: string | null
  descuento: number | null
  iva: number | null
  activo: boolean | null
}

const COLUMNAS = 'distribuidor_id,nombre,contacto,email,telefono,ubicacion,region,pais,descuento,iva,activo'

function deFila(f: Fila): Distribuidor {
  return {
    distribuidorId: f.distribuidor_id,
    nombre: f.nombre ?? '',
    contacto: f.contacto ?? '',
    email: f.email ?? '',
    telefono: f.telefono ?? '',
    ubicacion: f.ubicacion ?? '',
    region: (REGIONES as readonly string[]).includes(f.region ?? '') ? (f.region as Region) : null,
    pais: f.pais ?? null,
    descuento: Number(f.descuento ?? 0),
    // ojo: 0 es un IVA válido (LATAM), así que solo null es "automático"
    iva: f.iva === null || f.iva === undefined ? null : Number(f.iva),
    activo: f.activo !== false,
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

/** llama a la Edge Function que tiene la llave secreta */
async function llamarGestion(usuario: Usuario | null, cuerpo: Record<string, unknown>): Promise<Resultado<{ distribuidor_id?: number }>> {
  if (!URL_SUPABASE || !LLAVE_SUPABASE) return { ok: false, mensaje: 'Sin Supabase configurado.' }
  const falta = sesionValida(usuario)
  if (falta) return { ok: false, mensaje: falta }
  try {
    const r = await fetch(`${URL_SUPABASE}/functions/v1/gestion-usuarios`, {
      method: 'POST',
      headers: cabeceras(usuario!.token!),
      body: JSON.stringify(cuerpo),
    })
    const cuerpoRta = (await r.json().catch(() => ({}))) as { error?: string; distribuidor_id?: number }
    if (!r.ok) {
      if (r.status === 404) {
        return {
          ok: false,
          mensaje:
            'Falta desplegar la Edge Function gestion-usuarios en Supabase: es la que crea la cuenta del distribuidor.',
        }
      }
      return { ok: false, mensaje: cuerpoRta.error ?? `Supabase respondió ${r.status}.` }
    }
    return { ok: true, dato: cuerpoRta, mensaje: 'Listo.' }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'No se pudo completar.' }
  }
}

/**
 * Da de alta la ficha del distribuidor Y su cuenta de acceso. El correo y la
 * contraseña son obligatorios: son con lo que el distribuidor entra a la app.
 */
export async function crearDistribuidor(usuario: Usuario | null, d: DatosDistribuidor): Promise<Resultado<Distribuidor>> {
  if (!(d.nombre ?? '').trim()) return { ok: false, mensaje: 'El nombre no puede ir en blanco.' }
  if (!(d.email ?? '').trim()) return { ok: false, mensaje: 'El correo es el usuario con el que entra: no puede ir en blanco.' }
  if ((d.password ?? '').length < 6) return { ok: false, mensaje: 'La contraseña tiene que tener al menos 6 caracteres.' }

  const r = await llamarGestion(usuario, {
    accion: 'crear_distribuidor',
    nombre: (d.nombre ?? '').trim(),
    contacto: (d.contacto ?? '').trim() || null,
    email: (d.email ?? '').trim(),
    telefono: (d.telefono ?? '').trim() || null,
    ubicacion: (d.ubicacion ?? '').trim() || null,
    region: d.region ?? null,
    pais: d.pais ?? null,
    descuento: d.descuento ?? 0,
    iva: d.iva ?? null,
    activo: d.activo !== false,
    password: d.password,
  })
  if (!r.ok) return { ok: false, mensaje: r.mensaje }
  return {
    ok: true,
    dato: {
      distribuidorId: Number(r.dato?.distribuidor_id ?? 0),
      nombre: (d.nombre ?? '').trim(),
      contacto: (d.contacto ?? '').trim(),
      email: (d.email ?? '').trim(),
      telefono: (d.telefono ?? '').trim(),
      ubicacion: (d.ubicacion ?? '').trim(),
      region: d.region ?? null,
      pais: d.pais ?? null,
      descuento: d.descuento ?? 0,
      iva: d.iva ?? null,
      activo: d.activo !== false,
    },
    mensaje: 'Distribuidor dado de alta con su cuenta de acceso.',
  }
}

/**
 * Guarda los cambios de la ficha. Si se escribe una contraseña nueva, también
 * se le cambia a su cuenta de acceso; si se deja en blanco, la de siempre.
 */
export async function guardarDistribuidor(usuario: Usuario | null, d: DatosDistribuidor & { distribuidorId: number }): Promise<Resultado<Distribuidor>> {
  if (!(d.nombre ?? '').trim()) return { ok: false, mensaje: 'El nombre no puede ir en blanco.' }
  if (d.password && d.password.length < 6) return { ok: false, mensaje: 'La contraseña tiene que tener al menos 6 caracteres.' }

  const r = await llamarGestion(usuario, {
    accion: 'actualizar_distribuidor',
    distribuidor_id: d.distribuidorId,
    nombre: (d.nombre ?? '').trim(),
    contacto: (d.contacto ?? '').trim() || null,
    email: (d.email ?? '').trim() || undefined,
    telefono: (d.telefono ?? '').trim() || null,
    ubicacion: (d.ubicacion ?? '').trim() || null,
    region: d.region ?? null,
    pais: d.pais ?? null,
    descuento: d.descuento ?? 0,
    iva: d.iva ?? null,
    activo: d.activo !== false,
    ...(d.password ? { password: d.password } : {}),
  })
  if (!r.ok) return { ok: false, mensaje: r.mensaje }
  return {
    ok: true,
    dato: {
      distribuidorId: d.distribuidorId,
      nombre: (d.nombre ?? '').trim(),
      contacto: (d.contacto ?? '').trim(),
      email: (d.email ?? '').trim(),
      telefono: (d.telefono ?? '').trim(),
      ubicacion: (d.ubicacion ?? '').trim(),
      region: d.region ?? null,
      pais: d.pais ?? null,
      descuento: d.descuento ?? 0,
      iva: d.iva ?? null,
      activo: d.activo !== false,
    },
    mensaje: d.password ? 'Cambios guardados, incluida la contraseña.' : 'Cambios guardados.',
  }
}
