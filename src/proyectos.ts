import type { Usuario } from './auth'
import type { Proyecto } from './types'

/**
 * Guardar y abrir proyectos en Supabase, contra la misma tabla `proyecto`
 * que usa el Constructor actual.
 *
 * Cómo conviven las dos apps mientras el 2.0 no reemplace al viejo:
 *
 * - El proyecto entero viaja en `app_json`, que es la columna que la base ya
 *   tenía para esto ("detalle completo de la app para reconstruir al editar").
 * - El 2.0 marca los suyos con `app: 'cv2'` adentro del `app_json` y **lista
 *   solo esos**. La estructura del `app_json` del Constructor actual es otra y
 *   el 2.0 no la puede reconstruir, así que mostrarlos sería ofrecer algo que
 *   al abrirlo falla.
 * - La revisión va dentro del código —"1042-A", "1042-B"— y no partiendo el
 *   unique de `codigo`, porque el Constructor actual guarda con
 *   `onConflict: "codigo"` y quitarle ese unique lo rompe en producción.
 *   Las columnas `numero_plano` y `revision` (ver `Supabase/19_proyecto_revision.sql`)
 *   están para agrupar y listar.
 *
 * Quién ve qué no se decide acá sino en la base, con las políticas RLS que ya
 * existen: Super Admin, Administrador y Vendedor ven todos los proyectos; un
 * Distribuidor solo los de su distribuidor.
 */

const URL_SUPABASE = import.meta.env.VITE_SUPABASE_URL as string | undefined
const LLAVE_SUPABASE = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** con qué se marcan los proyectos del 2.0 dentro del app_json */
export const MARCA_APP = 'cv2'

/** versión del formato guardado, para poder migrar si el tipo `Proyecto` cambia */
export const FORMATO = 1

export type Revision = 'A' | 'B' | 'C' | 'D' | 'E'

export const REVISIONES: Revision[] = ['A', 'B', 'C', 'D', 'E']

/** "1042" + "B" -> "1042-B", que es lo que va en la columna `codigo` */
export function codigoDe(numeroPlano: string, revision: string): string {
  return `${numeroPlano.trim()}-${revision}`
}

export interface ProyectoEnLista {
  proyectoId: number
  codigo: string
  numeroPlano: string
  revision: string
  obra: string
  cliente: string
  ubicacion: string
  estado: string
  actualizadoEl: string
}

export interface Resultado<T> {
  ok: boolean
  dato?: T
  mensaje: string
}

interface FilaLista {
  proyecto_id: number
  codigo: string
  numero_plano: string | null
  revision: string | null
  nombre: string | null
  cliente: string | null
  ubicacion: string | null
  estado: string | null
  actualizado_el: string
}

function sinNube<T>(): Resultado<T> {
  return { ok: false, mensaje: 'Sin Supabase configurado: no hay dónde guardar ni de dónde abrir.' }
}

/** el guardado necesita una sesión de verdad: la RLS mira quién es el usuario */
function sesionValida(u: Usuario | null): string | null {
  if (!u) return 'Hay que iniciar sesión.'
  if (!u.deLaNube || !u.token) {
    return 'Estás con una cuenta local de respaldo. Para guardar en la nube hay que entrar con la cuenta de Supabase.'
  }
  return null
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
  return `Supabase respondió ${r.status}. ${t.slice(0, 200)}`
}

/**
 * Los proyectos que el 2.0 puede abrir, del más reciente al más viejo. El
 * filtro por `app_json->>app` es lo que deja fuera los del Constructor actual.
 */
export async function listarProyectos(usuario: Usuario | null): Promise<Resultado<ProyectoEnLista[]>> {
  if (!URL_SUPABASE || !LLAVE_SUPABASE) return sinNube()
  const falta = sesionValida(usuario)
  if (falta) return { ok: false, mensaje: falta }

  const campos = 'proyecto_id,codigo,numero_plano,revision,nombre,cliente,ubicacion,estado,actualizado_el'
  try {
    const r = await fetch(
      `${URL_SUPABASE}/rest/v1/proyecto?select=${campos}&app_json->>app=eq.${MARCA_APP}&order=actualizado_el.desc`,
      { headers: cabeceras(usuario!.token!) },
    )
    if (!r.ok) return { ok: false, mensaje: await detalle(r) }
    const filas = (await r.json()) as FilaLista[]
    const lista: ProyectoEnLista[] = filas.map((f) => ({
      proyectoId: f.proyecto_id,
      codigo: f.codigo,
      numeroPlano: f.numero_plano ?? f.codigo,
      revision: f.revision ?? 'A',
      obra: f.nombre ?? '',
      cliente: f.cliente ?? '',
      ubicacion: f.ubicacion ?? '',
      estado: f.estado ?? 'borrador',
      actualizadoEl: f.actualizado_el,
    }))
    return { ok: true, dato: lista, mensaje: `${lista.length} proyecto(s).` }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'No se pudo consultar.' }
  }
}

/**
 * El siguiente número de plano libre. Se calcula sobre **todos** los códigos,
 * no solo los del 2.0: `codigo` es unique en toda la tabla, así que si el
 * Constructor actual ya usó el 1042, el 2.0 no puede volver a usarlo.
 */
export async function siguienteNumero(usuario: Usuario | null): Promise<Resultado<string>> {
  if (!URL_SUPABASE || !LLAVE_SUPABASE) return sinNube()
  const falta = sesionValida(usuario)
  if (falta) return { ok: false, mensaje: falta }

  try {
    const r = await fetch(`${URL_SUPABASE}/rest/v1/proyecto?select=numero_plano,codigo`, {
      headers: cabeceras(usuario!.token!),
    })
    if (!r.ok) return { ok: false, mensaje: await detalle(r) }
    const filas = (await r.json()) as { numero_plano: string | null; codigo: string }[]
    let mayor = 0
    for (const f of filas) {
      // el código puede venir con revisión ("1042-B"); el número es lo de antes del guion
      const crudo = f.numero_plano ?? f.codigo.split('-')[0]
      const n = Number.parseInt(String(crudo).replace(/[^\d]/g, ''), 10)
      if (Number.isFinite(n) && n > mayor) mayor = n
    }
    return { ok: true, dato: String(mayor + 1), mensaje: `El último usado es el ${mayor}.` }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'No se pudo consultar.' }
  }
}

/** el código de línea con el que la modulación arma los SKU */
function codigoLinea(linea: string): string {
  if (linea === 'SUPERIOR') return 'SUP'
  if (linea === 'TOUCHLESS') return 'TL'
  return 'LDR'
}

/**
 * Guarda el proyecto. Es un upsert por `codigo`, igual que el Constructor
 * actual: guardar dos veces la misma revisión la sobreescribe, y cambiar de
 * revisión crea una fila nueva sin tocar la anterior.
 */
export async function guardarProyecto(
  usuario: Usuario | null,
  proyecto: Proyecto,
  revision: Revision,
): Promise<Resultado<ProyectoEnLista>> {
  if (!URL_SUPABASE || !LLAVE_SUPABASE) return sinNube()
  const falta = sesionValida(usuario)
  if (falta) return { ok: false, mensaje: falta }
  if (!proyecto.numero.trim()) return { ok: false, mensaje: 'Falta el número de plano.' }
  if (!proyecto.areas.length) return { ok: false, mensaje: 'El proyecto no tiene áreas.' }

  const u = usuario!
  const config = proyecto.areas[0].config
  const cabinas = proyecto.areas.flatMap((a) => a.tramos.flatMap((t) => t.cabinas))

  const fila = {
    codigo: codigoDe(proyecto.numero, revision),
    numero_plano: proyecto.numero.trim(),
    revision,
    nombre: proyecto.obra || `Plano ${proyecto.numero}`,
    cliente: proyecto.cliente || null,
    ubicacion: proyecto.ubicacion || null,
    // el dueño del proyecto es el distribuidor; un admin puede guardar sin uno
    distribuidor_id: u.distribuidorId ? Number(u.distribuidorId) : null,
    creado_por: u.id,
    // las columnas de resumen son para poder mirar la tabla sin abrir el JSON
    linea_codigo: codigoLinea(config.linea),
    modelo_codigo: config.modelo,
    terminacion: config.terminacion,
    acabado: config.acabado,
    color: config.color,
    cp: config.colorCodigo ?? null,
    repeticiones: proyecto.areas.length,
    kap: config.kap,
    mingitorios: cabinas.some((c) => c.tipo === 'orinal') || proyecto.areas.some((a) => a.config.orinales > 0),
    regaderas: cabinas.some((c) => c.tipo === 'regadera'),
    actualizado_el: new Date().toISOString(),
    app_json: { app: MARCA_APP, formato: FORMATO, proyecto },
  }

  try {
    const r = await fetch(`${URL_SUPABASE}/rest/v1/proyecto?on_conflict=codigo`, {
      method: 'POST',
      headers: cabeceras(u.token!, {
        // merge-duplicates es lo que convierte el insert en upsert
        Prefer: 'resolution=merge-duplicates,return=representation',
      }),
      body: JSON.stringify([fila]),
    })
    if (!r.ok) return { ok: false, mensaje: await detalle(r) }
    const filas = (await r.json()) as FilaLista[]
    const f = filas[0]
    return {
      ok: true,
      dato: f && {
        proyectoId: f.proyecto_id,
        codigo: f.codigo,
        numeroPlano: f.numero_plano ?? proyecto.numero,
        revision,
        obra: f.nombre ?? '',
        cliente: f.cliente ?? '',
        ubicacion: f.ubicacion ?? '',
        estado: f.estado ?? 'borrador',
        actualizadoEl: f.actualizado_el,
      },
      mensaje: `Guardado como ${fila.codigo}.`,
    }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'No se pudo guardar.' }
  }
}

/** Trae el proyecto completo desde el app_json para seguir editándolo. */
export async function abrirProyecto(usuario: Usuario | null, proyectoId: number): Promise<Resultado<Proyecto>> {
  if (!URL_SUPABASE || !LLAVE_SUPABASE) return sinNube()
  const falta = sesionValida(usuario)
  if (falta) return { ok: false, mensaje: falta }

  try {
    const r = await fetch(
      `${URL_SUPABASE}/rest/v1/proyecto?select=codigo,app_json&proyecto_id=eq.${proyectoId}`,
      { headers: cabeceras(usuario!.token!) },
    )
    if (!r.ok) return { ok: false, mensaje: await detalle(r) }
    const filas = (await r.json()) as { codigo: string; app_json: unknown }[]
    if (!filas.length) return { ok: false, mensaje: 'Ese proyecto ya no está o no tenés permiso de verlo.' }

    const guardado = filas[0].app_json as { app?: string; formato?: number; proyecto?: Proyecto } | null
    if (!guardado || guardado.app !== MARCA_APP || !guardado.proyecto) {
      return {
        ok: false,
        mensaje: `El proyecto ${filas[0].codigo} lo guardó el Constructor anterior, con otra estructura. El 2.0 no lo puede abrir.`,
      }
    }
    if (!guardado.proyecto.areas?.length) {
      return { ok: false, mensaje: `El proyecto ${filas[0].codigo} se guardó sin áreas.` }
    }
    return { ok: true, dato: guardado.proyecto, mensaje: `Abierto ${filas[0].codigo}.` }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'No se pudo abrir.' }
  }
}

/** Borra una revisión. Las demás revisiones del mismo plano no se tocan. */
export async function borrarProyecto(usuario: Usuario | null, proyectoId: number): Promise<Resultado<null>> {
  if (!URL_SUPABASE || !LLAVE_SUPABASE) return sinNube()
  const falta = sesionValida(usuario)
  if (falta) return { ok: false, mensaje: falta }

  try {
    const r = await fetch(`${URL_SUPABASE}/rest/v1/proyecto?proyecto_id=eq.${proyectoId}`, {
      method: 'DELETE',
      headers: cabeceras(usuario!.token!, { Prefer: 'return=minimal' }),
    })
    if (!r.ok) return { ok: false, mensaje: await detalle(r) }
    return { ok: true, mensaje: 'Revisión borrada.' }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'No se pudo borrar.' }
  }
}
