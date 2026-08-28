export type Rol = 'Super Admin' | 'Administrador' | 'Vendedor' | 'Distribuidor'

export interface Usuario {
  id: string
  email: string
  nombre: string
  rol: Rol
  /** descuento del distribuidor, en porcentaje */
  descuento: number
  /** IVA del distribuidor; si no trae, se usa el 13 % de Costa Rica */
  ivaPorcentaje: number
  distribuidorId: string | null
  /** true cuando la sesión vino de Supabase y no de una cuenta local */
  deLaNube: boolean
  /** token de la sesión, para leer tarifas y demás tablas */
  token?: string
}

const URL_SUPABASE = import.meta.env.VITE_SUPABASE_URL as string | undefined
const LLAVE_SUPABASE = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const hayNube = Boolean(URL_SUPABASE && LLAVE_SUPABASE)

export const IVA_CR = 13

/**
 * Cuentas locales de respaldo, para trabajar sin red. Solo se usan cuando no
 * hay Supabase configurado; con la nube activa, el login siempre pasa por ella.
 */
const CUENTAS: (Usuario & { clave: string })[] = [
  { id: 'local-1', email: 'dlizano@modumex.com', clave: 'modumex', nombre: 'Dayanna Lizano', rol: 'Super Admin', descuento: 0, ivaPorcentaje: IVA_CR, distribuidorId: null, deLaNube: false },
  { id: 'local-2', email: 'vendedor@modumex.com', clave: 'demo', nombre: 'Vendedor Demo', rol: 'Vendedor', descuento: 0, ivaPorcentaje: IVA_CR, distribuidorId: null, deLaNube: false },
  { id: 'local-3', email: 'distribuidor@demo.cr', clave: 'demo', nombre: 'Distribuidor Demo', rol: 'Distribuidor', descuento: 22, ivaPorcentaje: IVA_CR, distribuidorId: null, deLaNube: false },
]

interface Perfil {
  nombre: string | null
  rol: string | null
  distribuidor_id: string | null
  activo: boolean | null
}

interface Distribuidor {
  descuento: number | null
  iva: number | null
}

async function pedir<T>(ruta: string, token: string): Promise<T[]> {
  const r = await fetch(`${URL_SUPABASE}/rest/v1/${ruta}`, {
    headers: {
      apikey: LLAVE_SUPABASE!,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })
  if (!r.ok) throw new Error(`La consulta a ${ruta.split('?')[0]} falló (${r.status}).`)
  return (await r.json()) as T[]
}

async function entrarPorSupabase(email: string, clave: string): Promise<Usuario> {
  const respuesta = await fetch(`${URL_SUPABASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: LLAVE_SUPABASE! },
    body: JSON.stringify({ email, password: clave }),
  })
  if (!respuesta.ok) {
    const detalle = await respuesta.json().catch(() => null)
    const msg = (detalle?.error_description || detalle?.msg || '').toLowerCase()
    if (msg.includes('email not confirmed')) throw new Error('La cuenta todavía no confirmó el correo.')
    throw new Error('Correo o contraseña incorrectos.')
  }
  const sesion = await respuesta.json()
  const token: string = sesion.access_token
  const id: string = sesion.user?.id

  // el perfil vive en la tabla profiles, igual que en el Constructor actual
  const perfiles = await pedir<Perfil>(
    `profiles?id=eq.${id}&select=nombre,rol,distribuidor_id,activo`,
    token,
  )
  const perfil = perfiles[0]
  if (!perfil) throw new Error('La cuenta existe pero no tiene perfil asignado. Avisale a un administrador.')
  if (perfil.activo === false) throw new Error('La cuenta está desactivada.')

  const rol = (perfil.rol as Rol) || 'Distribuidor'
  let descuento = 0
  let ivaPorcentaje = IVA_CR

  // el descuento y el IVA son del distribuidor, no del usuario
  if (perfil.distribuidor_id) {
    try {
      const dist = await pedir<Distribuidor>(
        `distribuidor?distribuidor_id=eq.${perfil.distribuidor_id}&select=descuento,iva`,
        token,
      )
      if (dist[0]) {
        descuento = Number(dist[0].descuento ?? 0)
        if (dist[0].iva != null) ivaPorcentaje = Number(dist[0].iva)
      }
    } catch {
      /* si la tabla no responde, se cotiza sin descuento y con el IVA de Costa Rica */
    }
  }

  return {
    id,
    email: sesion.user?.email ?? email,
    nombre: perfil.nombre || sesion.user?.email || email,
    rol,
    descuento,
    ivaPorcentaje,
    distribuidorId: perfil.distribuidor_id,
    deLaNube: true,
    token,
  }
}

export async function iniciarSesion(email: string, clave: string): Promise<Usuario> {
  const correo = email.trim().toLowerCase()
  if (hayNube) return entrarPorSupabase(correo, clave)

  await new Promise((r) => setTimeout(r, 300))
  const cuenta = CUENTAS.find((c) => c.email === correo && c.clave === clave)
  if (!cuenta) throw new Error('Correo o contraseña incorrectos.')
  const { clave: _, ...usuario } = cuenta
  return usuario
}

export const CUENTAS_DEMO = CUENTAS.map((c) => ({ email: c.email, clave: c.clave, rol: c.rol }))

/** puede ver y editar precios y usuarios */
export function esAdmin(u: Usuario | null): boolean {
  return !!u && (u.rol === 'Super Admin' || u.rol === 'Administrador')
}
