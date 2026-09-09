import type { Rol, Usuario } from './auth'
import { LLAVE_SUPABASE, URL_SUPABASE } from './entorno'

/**
 * Usuarios internos: Administradores y Vendedores. Solo el Super Admin entra
 * acá, igual que en la base, donde la política `profiles_modify` deja escribir
 * la tabla únicamente a ese rol.
 *
 * Los distribuidores NO se gestionan desde acá: cada uno es una ficha de
 * empresa más su cuenta, y eso vive en la pantalla de Distribuidores.
 *
 * Sobre las contraseñas: Supabase Auth las guarda cifradas con bcrypt, así que
 * NO se pueden leer de vuelta —ni desde acá, ni con la llave secreta, ni desde
 * el panel de Supabase—. Lo que se puede es ponerle una nueva y entregársela.
 * Por eso el ojito de la pantalla muestra la que se está escribiendo, no la que
 * el usuario tiene hoy.
 */

export interface UsuarioInterno {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
}

/** lo que se manda al dar de alta o editar */
export interface DatosUsuario extends Partial<UsuarioInterno> {
  password?: string
}

export interface Resultado<T> {
  ok: boolean
  dato?: T
  mensaje: string
}

/** los roles que se dan de alta desde esta pantalla */
export const ROLES_INTERNOS: Rol[] = ['Administrador', 'Vendedor', 'Super Admin']

interface Fila {
  id: string
  nombre: string | null
  email: string | null
  rol: string | null
  activo: boolean | null
}

const COLUMNAS = 'id,nombre,email,rol,activo'

function deFila(f: Fila): UsuarioInterno {
  return {
    id: f.id,
    nombre: f.nombre ?? '',
    email: f.email ?? '',
    rol: (f.rol ?? 'Distribuidor') as Rol,
    activo: f.activo !== false,
  }
}

function cabeceras(token: string): Record<string, string> {
  return {
    apikey: LLAVE_SUPABASE!,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

function sesionValida(u: Usuario | null): string | null {
  if (!u) return 'Hay que iniciar sesión.'
  if (u.rol !== 'Super Admin') return 'Solo el Super Admin gestiona usuarios.'
  if (!u.deLaNube || !u.token) {
    return 'Estás con una cuenta local de respaldo. Los usuarios viven en la nube.'
  }
  return null
}

export async function listarUsuarios(usuario: Usuario | null): Promise<Resultado<UsuarioInterno[]>> {
  if (!URL_SUPABASE || !LLAVE_SUPABASE) {
    return { ok: false, mensaje: 'Sin Supabase configurado: no hay lista de usuarios.' }
  }
  const falta = sesionValida(usuario)
  if (falta) return { ok: false, mensaje: falta }
  try {
    // los distribuidores se quedan fuera: se gestionan en su propia pantalla
    const r = await fetch(
      `${URL_SUPABASE}/rest/v1/profiles?select=${COLUMNAS}&rol=neq.Distribuidor&order=nombre.asc`,
      { headers: cabeceras(usuario!.token!) },
    )
    if (!r.ok) {
      const t = await r.text().catch(() => '')
      if (r.status === 401 || r.status === 403) {
        return { ok: false, mensaje: 'La base no te deja leer los usuarios: hace falta ser Super Admin.' }
      }
      return { ok: false, mensaje: `Supabase respondió ${r.status}. ${t.slice(0, 200)}` }
    }
    const filas = (await r.json()) as Fila[]
    return { ok: true, dato: filas.map(deFila), mensaje: `${filas.length} usuario(s)` }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'No se pudo consultar.' }
  }
}

/** llama a la Edge Function, que es la que tiene la llave secreta */
async function llamarGestion(
  usuario: Usuario | null,
  cuerpo: Record<string, unknown>,
): Promise<Resultado<{ id?: string }>> {
  if (!URL_SUPABASE || !LLAVE_SUPABASE) return { ok: false, mensaje: 'Sin Supabase configurado.' }
  const falta = sesionValida(usuario)
  if (falta) return { ok: false, mensaje: falta }
  try {
    const r = await fetch(`${URL_SUPABASE}/functions/v1/gestion-usuarios`, {
      method: 'POST',
      headers: cabeceras(usuario!.token!),
      body: JSON.stringify(cuerpo),
    })
    const rta = (await r.json().catch(() => ({}))) as { error?: string; id?: string }
    if (!r.ok) {
      if (r.status === 404) {
        return {
          ok: false,
          mensaje: 'Falta desplegar la Edge Function gestion-usuarios en Supabase: es la que crea las cuentas.',
        }
      }
      return { ok: false, mensaje: rta.error ?? `Supabase respondió ${r.status}.` }
    }
    return { ok: true, dato: rta, mensaje: 'Listo.' }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'No se pudo completar.' }
  }
}

export async function crearUsuario(usuario: Usuario | null, d: DatosUsuario): Promise<Resultado<UsuarioInterno>> {
  if (!(d.nombre ?? '').trim()) return { ok: false, mensaje: 'El nombre no puede ir en blanco.' }
  if (!(d.email ?? '').trim()) return { ok: false, mensaje: 'El correo es el usuario con el que entra: no puede ir en blanco.' }
  if ((d.password ?? '').length < 6) return { ok: false, mensaje: 'La contraseña tiene que tener al menos 6 caracteres.' }

  const r = await llamarGestion(usuario, {
    accion: 'crear',
    nombre: (d.nombre ?? '').trim(),
    email: (d.email ?? '').trim(),
    rol: d.rol ?? 'Vendedor',
    password: d.password,
    distribuidor_id: null,
  })
  if (!r.ok) return { ok: false, mensaje: r.mensaje }
  return {
    ok: true,
    dato: {
      id: r.dato?.id ?? '',
      nombre: (d.nombre ?? '').trim(),
      email: (d.email ?? '').trim(),
      rol: (d.rol ?? 'Vendedor') as Rol,
      activo: d.activo !== false,
    },
    mensaje: 'Usuario dado de alta con su cuenta de acceso.',
  }
}

export async function guardarUsuario(
  usuario: Usuario | null,
  d: DatosUsuario & { id: string },
): Promise<Resultado<UsuarioInterno>> {
  if (!(d.nombre ?? '').trim()) return { ok: false, mensaje: 'El nombre no puede ir en blanco.' }
  if (d.password && d.password.length < 6) return { ok: false, mensaje: 'La contraseña tiene que tener al menos 6 caracteres.' }
  if (d.id === usuario?.id && d.activo === false) {
    return { ok: false, mensaje: 'No te podés desactivar a vos misma: quedarías afuera.' }
  }

  const r = await llamarGestion(usuario, {
    accion: 'actualizar',
    id: d.id,
    nombre: (d.nombre ?? '').trim(),
    rol: d.rol,
    activo: d.activo !== false,
    ...(d.password ? { password: d.password } : {}),
  })
  if (!r.ok) return { ok: false, mensaje: r.mensaje }
  return {
    ok: true,
    dato: {
      id: d.id,
      nombre: (d.nombre ?? '').trim(),
      email: d.email ?? '',
      rol: (d.rol ?? 'Vendedor') as Rol,
      activo: d.activo !== false,
    },
    mensaje: d.password ? 'Cambios guardados, incluida la contraseña.' : 'Cambios guardados.',
  }
}

export async function eliminarUsuario(usuario: Usuario | null, id: string): Promise<Resultado<null>> {
  if (id === usuario?.id) return { ok: false, mensaje: 'No podés eliminar tu propia cuenta.' }
  const r = await llamarGestion(usuario, { accion: 'eliminar', id })
  return { ok: r.ok, mensaje: r.ok ? 'Usuario eliminado.' : r.mensaje }
}
