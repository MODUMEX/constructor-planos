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
  /** el nombre de su distribuidor: es el que va al cajetín, sin poder elegir otro */
  distribuidorNombre?: string
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
  nombre: string | null
  descuento: number | null
  iva: number | null
  region: string | null
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
  let distribuidorNombre: string | undefined

  // el descuento y el IVA son del distribuidor, no del usuario
  if (perfil.distribuidor_id) {
    try {
      const dist = await pedir<Distribuidor>(
        `distribuidor?distribuidor_id=eq.${perfil.distribuidor_id}&select=nombre,descuento,iva,region`,
        token,
      )
      if (dist[0]) {
        distribuidorNombre = dist[0].nombre ?? undefined
        descuento = Number(dist[0].descuento ?? 0)
        // El IVA escrito a mano manda, incluso si es 0. En blanco va el de su
        // región: LATAM factura sin IVA y antes se le cobraba el 13 % de
        // Costa Rica por caer en el valor por omisión.
        ivaPorcentaje =
          dist[0].iva != null
            ? Number(dist[0].iva)
            : dist[0].region === 'LATAM'
              ? 0
              : IVA_CR
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
    distribuidorNombre,
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

/**
 * Los permisos de la app, espejo de las políticas de la base para que la
 * pantalla no ofrezca lo que la base va a rechazar:
 *
 *   Usuarios        → Super Admin           (política profiles_modify)
 *   Alturas/Precios → Super Admin + Admin   (es_admin_estricto)
 *   Distribuidores  → los dos + Vendedor    (es_admin, redefinido en el SQL 16)
 *
 * El Vendedor modula, cotiza y ve distribuidores y pedidos, pero no toca la
 * lista de precios ni las medidas. El Distribuidor solo ve lo suyo.
 */
export function esAdmin(u: Usuario | null): boolean {
  return !!u && (u.rol === 'Super Admin' || u.rol === 'Administrador')
}

/** solo el Super Admin da de alta y edita usuarios internos */
export function puedeUsuarios(u: Usuario | null): boolean {
  return u?.rol === 'Super Admin'
}

/** alturas de las piezas y lista de precios: Administrador y Super Admin */
export function puedeCatalogos(u: Usuario | null): boolean {
  return esAdmin(u)
}

/** la ficha de los distribuidores: también el Vendedor, que los atiende */
export function puedeDistribuidores(u: Usuario | null): boolean {
  return esAdmin(u) || u?.rol === 'Vendedor'
}
