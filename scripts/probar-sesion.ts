/**
 * La sesión de Supabase se renueva sola.
 *
 * El token dura una hora y la aplicación se queda abierta todo el día. Antes
 * solo se guardaba el access_token: pasada la hora, guardar un proyecto
 * devolvía "Supabase respondió 401" y el botón "+ Proyecto nuevo" —que guarda
 * antes de limpiar— moría con él.
 *
 * Acá se prueba, con un fetch de mentira, que:
 *   1. renovarSesion cambia el token y corre el vencimiento
 *   2. dos renovaciones a la vez salen como UNA sola, porque Supabase rota el
 *      refresh y la segunda usaría uno ya gastado
 *   3. un guardado que se topa con un 401 renueva y se reintenta solo
 *   4. si el refresh ya no sirve, el error se ve tal cual
 */
import { renovarSesion, type Usuario } from '../src/auth'
import { guardarProyecto } from '../src/proyectos'
import type { Proyecto } from '../src/types'

let fallos = 0
function revisar(que: string, bien: boolean, detalle = '') {
  console.log(`  ${bien ? '✓' : '✗'} ${que}${detalle ? ' · ' + detalle : ''}`)
  if (!bien) fallos++
}

const RENOVAR = '/auth/v1/token?grant_type=refresh_token'

function usuario(): Usuario {
  return {
    id: 'u1',
    email: 'dlizano@modumex.com',
    nombre: 'Dayanna',
    rol: 'Distribuidor',
    descuento: 0,
    ivaPorcentaje: 13,
    distribuidorId: '3',
    deLaNube: true,
    token: 'VIEJO',
    refresh: 'R1',
    expiraEl: Date.now() + 1000,
  }
}

const proyecto = {
  numero: '1042',
  paisFabricacion: 'CR',
  obra: 'Prueba',
  cliente: '',
  ubicacion: '',
  distribuidor: 'Pruebas',
  creadoPor: 'u1',
  areas: [{ id: 'a1', nombre: 'Área 1', piso: '', config: { linea: 'LEEDER', modelo: 'M1', terminacion: 'ZOCLO', acabado: 'Laminado Compacto', color: 'Blanco', kap: false, orinales: 0 }, tramos: [] }],
} as unknown as Proyecto

/** deja puesto un fetch de mentira y devuelve el registro de lo que se pidió */
function fingirFetch(responder: (url: string, n: number) => { status: number; cuerpo: unknown }) {
  const pedidos: string[] = []
  ;(globalThis as { fetch: unknown }).fetch = async (url: string) => {
    pedidos.push(String(url))
    const r = responder(String(url), pedidos.length)
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      statusText: '',
      json: async () => r.cuerpo,
      text: async () => JSON.stringify(r.cuerpo),
    } as unknown as Response
  }
  return pedidos
}

async function main() {
  console.log('\n1 · renovarSesion cambia el token')
  {
    const u = usuario()
    fingirFetch(() => ({ status: 200, cuerpo: { access_token: 'NUEVO', refresh_token: 'R2', expires_in: 3600 } }))
    const nuevo = await renovarSesion(u)
    revisar('devuelve el usuario renovado', nuevo?.token === 'NUEVO', String(nuevo?.token))
    revisar('también muta el que estaba en la mano', u.token === 'NUEVO')
    revisar('guarda el refresh nuevo', u.refresh === 'R2')
    revisar('el vencimiento se corre una hora', (u.expiraEl ?? 0) - Date.now() > 3_500_000)
  }

  console.log('\n2 · dos renovaciones a la vez son una sola llamada')
  {
    const u = usuario()
    const pedidos = fingirFetch(() => ({ status: 200, cuerpo: { access_token: 'N2', refresh_token: 'R3', expires_in: 3600 } }))
    const [a, b] = await Promise.all([renovarSesion(u), renovarSesion(u)])
    revisar('una sola ida a Supabase', pedidos.length === 1, `${pedidos.length} llamadas`)
    revisar('las dos reciben el token nuevo', a?.token === 'N2' && b?.token === 'N2')
  }

  console.log('\n3 · un guardado con el token vencido se reintenta solo')
  {
    const u = usuario()
    const pedidos = fingirFetch((url) => {
      if (url.includes(RENOVAR)) return { status: 200, cuerpo: { access_token: 'N3', refresh_token: 'R4', expires_in: 3600 } }
      // el primer guardado va con el token vencido
      return pedidos.filter((p) => !p.includes(RENOVAR)).length === 1
        ? { status: 401, cuerpo: { message: 'JWT expired' } }
        : { status: 200, cuerpo: [{ proyecto_id: 9, codigo: '1042-A', numero_plano: '1042', actualizado_el: 'hoy' }] }
    })
    const r = await guardarProyecto(u, proyecto, 'A')
    revisar('el guardado termina bien', r.ok, r.mensaje)
    revisar('hubo tres llamadas: guardar, renovar, guardar', pedidos.length === 3, `${pedidos.length}`)
    revisar('la del medio fue la renovación', (pedidos[1] ?? '').includes(RENOVAR))
    revisar('el token quedó renovado', u.token === 'N3')
  }

  console.log('\n4 · si el refresh ya no sirve, el error se ve entero')
  {
    const u = usuario()
    fingirFetch((url) =>
      url.includes(RENOVAR)
        ? { status: 400, cuerpo: { error: 'invalid_grant' } }
        : { status: 401, cuerpo: { message: 'JWT expired' } },
    )
    const r = await guardarProyecto(u, proyecto, 'A')
    revisar('no guarda', !r.ok)
    revisar('el mensaje dice qué pasó', r.mensaje.includes('401') && r.mensaje.includes('JWT expired'), r.mensaje)
  }

  console.log(fallos ? `\n${fallos} revisiones mal.\n` : '\nTodo cuadra.\n')
  process.exit(fallos ? 1 : 0)
}

void main()
