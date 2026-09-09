import type { Rol, Usuario } from './auth'
import type { Region } from './distribuidores'
import { LLAVE_SUPABASE, URL_SUPABASE } from './entorno'

/**
 * Solicitudes de cuenta: lo que alguien pidió desde la pantalla de entrada.
 *
 * Todo pasa por la Edge Function `gestion-usuarios` y no por la tabla, porque
 * `profiles` sigue siendo solo del Super Admin y acá también tiene que poder
 * entrar el Administrador. La función usa la llave secreta, que salta la RLS,
 * y verifica el rol de quien llama.
 */

export interface Solicitud {
  id: string
  nombre: string
  email: string
  telefono: string
  nota: string
  pedidaEl: string
}

export interface Resultado<T> {
  ok: boolean
  dato?: T
  mensaje: string
}

interface Fila {
  id: string
  nombre: string | null
  email: string | null
  telefono: string | null
  solicitud_nota: string | null
  creado_el: string | null
}

function puede(u: Usuario | null): string | null {
  if (!u) return 'Hay que iniciar sesión.'
  if (u.rol !== 'Super Admin' && u.rol !== 'Administrador') {
    return 'Solo un Administrador o el Super Admin resuelve las solicitudes.'
  }
  if (!u.deLaNube || !u.token) {
    return 'Estás con una cuenta local de respaldo. Las solicitudes viven en la nube.'
  }
  return null
}

async function llamar(usuario: Usuario | null, cuerpo: Record<string, unknown>): Promise<Resultado<Record<string, unknown>>> {
  if (!URL_SUPABASE || !LLAVE_SUPABASE) return { ok: false, mensaje: 'Sin Supabase configurado.' }
  const falta = puede(usuario)
  if (falta) return { ok: false, mensaje: falta }
  try {
    const r = await fetch(`${URL_SUPABASE}/functions/v1/gestion-usuarios`, {
      method: 'POST',
      headers: {
        apikey: LLAVE_SUPABASE,
        Authorization: `Bearer ${usuario!.token!}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(cuerpo),
    })
    const rta = (await r.json().catch(() => ({}))) as Record<string, unknown> & { error?: string }
    if (!r.ok) {
      if (r.status === 404) {
        return {
          ok: false,
          mensaje: 'Falta desplegar la Edge Function gestion-usuarios con las acciones de solicitudes.',
        }
      }
      return { ok: false, mensaje: rta.error ?? `Supabase respondió ${r.status}.` }
    }
    return { ok: true, dato: rta, mensaje: 'Listo.' }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'No se pudo completar.' }
  }
}

export async function listarSolicitudes(usuario: Usuario | null): Promise<Resultado<Solicitud[]>> {
  const r = await llamar(usuario, { accion: 'listar_solicitudes' })
  if (!r.ok) return { ok: false, mensaje: r.mensaje }
  const filas = (r.dato?.solicitudes ?? []) as Fila[]
  return {
    ok: true,
    dato: filas.map((f) => ({
      id: f.id,
      nombre: f.nombre ?? '',
      email: f.email ?? '',
      telefono: f.telefono ?? '',
      nota: f.solicitud_nota ?? '',
      pedidaEl: f.creado_el ?? '',
    })),
    mensaje: `${filas.length} solicitud(es)`,
  }
}

/** cuántas hay esperando, para el contador del botón; 0 si algo falla */
export async function contarSolicitudes(usuario: Usuario | null): Promise<number> {
  const r = await listarSolicitudes(usuario)
  return r.ok && r.dato ? r.dato.length : 0
}

/** los datos de empresa que se completan al admitir a un distribuidor nuevo */
export interface FichaNueva {
  nombre: string
  ubicacion?: string
  region?: Region | null
  pais?: string | null
  descuento?: number
  iva?: number | null
}

/**
 * Admite la solicitud. Si entra como Distribuidor, su ficha de empresa NACE
 * acá: el distribuidor se dio de alta solo y quien aprueba completa lo que
 * falta (ubicación, región, país, descuento, IVA). No se le pide contraseña
 * de nuevo: ya puso la suya al registrarse.
 *
 * El distribuidorId es para el otro caso: ligarlo a una ficha que ya existe.
 */
export async function aprobarSolicitud(
  usuario: Usuario | null,
  d: { id: string; rol: Rol; distribuidorId: number | null; ficha?: FichaNueva },
): Promise<Resultado<null>> {
  if (d.rol === 'Distribuidor' && !d.distribuidorId && !d.ficha?.nombre.trim()) {
    return { ok: false, mensaje: 'Poné el nombre de la empresa o elegí una ficha que ya exista.' }
  }
  const r = await llamar(usuario, {
    accion: 'aprobar_solicitud',
    id: d.id,
    rol: d.rol,
    distribuidor_id: d.distribuidorId,
    ficha: d.ficha,
  })
  return { ok: r.ok, mensaje: r.mensaje }
}

export async function rechazarSolicitud(usuario: Usuario | null, id: string): Promise<Resultado<null>> {
  const r = await llamar(usuario, { accion: 'rechazar_solicitud', id })
  return { ok: r.ok, mensaje: r.mensaje }
}
