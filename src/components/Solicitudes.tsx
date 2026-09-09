import { useEffect, useState } from 'react'
import { aprobarSolicitud, listarSolicitudes, rechazarSolicitud, type Solicitud } from '../solicitudes'
import type { Rol, Usuario } from '../auth'
import type { Distribuidor } from '../distribuidores'

/**
 * Las cuentas que alguien pidió desde la pantalla de entrada. Un Administrador
 * o el Super Admin decide a quién admite, con qué rol y —si entra como
 * distribuidor— a qué ficha pertenece.
 *
 * Mientras la solicitud esté pendiente la cuenta existe en Supabase pero no
 * puede entrar. Rechazarla borra la cuenta.
 */

interface Props {
  usuario: Usuario
  distribuidores: Distribuidor[]
  onCerrar: () => void
  onResuelta: () => void
}

const ROLES: Rol[] = ['Distribuidor', 'Vendedor', 'Administrador', 'Super Admin']

export default function Solicitudes({ usuario, distribuidores, onCerrar, onResuelta }: Props) {
  const [lista, setLista] = useState<Solicitud[]>([])
  const [cargando, setCargando] = useState(true)
  const [elige, setElige] = useState<Record<string, { rol: Rol; distribuidorId: string }>>({})
  const [trabajando, setTrabajando] = useState<string | null>(null)
  const [rechaza, setRechaza] = useState<string | null>(null)
  const [aviso, setAviso] = useState<{ ok: boolean; mensaje: string } | null>(null)

  async function recargar() {
    setCargando(true)
    const r = await listarSolicitudes(usuario)
    setCargando(false)
    if (r.ok && r.dato) setLista(r.dato)
    else setAviso({ ok: false, mensaje: r.mensaje })
  }

  useEffect(() => { void recargar() }, [usuario])

  function opcion(id: string): { rol: Rol; distribuidorId: string } {
    return elige[id] ?? { rol: 'Distribuidor', distribuidorId: '' }
  }

  function cambiar(id: string, cambio: Partial<{ rol: Rol; distribuidorId: string }>) {
    setElige((e) => ({ ...e, [id]: { ...opcion(id), ...cambio } }))
    setAviso(null)
  }

  async function admitir(s: Solicitud) {
    const o = opcion(s.id)
    setTrabajando(s.id)
    const r = await aprobarSolicitud(usuario, {
      id: s.id,
      rol: o.rol,
      distribuidorId: o.rol === 'Distribuidor' ? Number(o.distribuidorId) || null : null,
    })
    setTrabajando(null)
    setAviso({ ok: r.ok, mensaje: r.ok ? `${s.nombre || s.email} ya puede entrar como ${o.rol}.` : r.mensaje })
    if (r.ok) {
      setLista((l) => l.filter((x) => x.id !== s.id))
      onResuelta()
    }
  }

  async function descartar(s: Solicitud) {
    setTrabajando(s.id)
    const r = await rechazarSolicitud(usuario, s.id)
    setTrabajando(null)
    setRechaza(null)
    setAviso({ ok: r.ok, mensaje: r.ok ? 'Solicitud rechazada y cuenta eliminada.' : r.mensaje })
    if (r.ok) {
      setLista((l) => l.filter((x) => x.id !== s.id))
      onResuelta()
    }
  }

  const activos = distribuidores.filter((d) => d.activo)

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-cab">
          <div>
            <h2>Solicitudes de cuenta</h2>
            <p className="sub" style={{ margin: 0 }}>
              Cuentas pedidas desde la pantalla de entrada. No entran hasta que las admitas.
            </p>
          </div>
          <button className="btn cerrar" onClick={onCerrar}>Cerrar</button>
        </header>

        <div className="modal-cuerpo">
          <div className="tabla-wrap">
            <table>
              <thead>
                <tr>
                  <th>Quién</th>
                  <th>Contacto</th>
                  <th>Entra como</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cargando && <tr><td colSpan={4}>Cargando…</td></tr>}
                {!cargando && lista.length === 0 && (
                  <tr><td colSpan={4}>No hay solicitudes esperando.</td></tr>
                )}
                {lista.map((s) => {
                  const o = opcion(s.id)
                  const faltaFicha = o.rol === 'Distribuidor' && !o.distribuidorId
                  return (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{s.nombre || '—'}</div>
                        <div className="ayuda">{s.nota || 'Sin comentario'}</div>
                      </td>
                      <td>
                        <div>{s.email}</div>
                        <div className="ayuda">{s.telefono || 'Sin teléfono'}</div>
                      </td>
                      <td>
                        <select value={o.rol} onChange={(e) => cambiar(s.id, { rol: e.target.value as Rol })}>
                          {ROLES.filter((r) => r !== 'Super Admin' || usuario.rol === 'Super Admin').map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        {o.rol === 'Distribuidor' && (
                          <>
                            <select
                              style={{ marginTop: 6 }}
                              value={o.distribuidorId}
                              onChange={(e) => cambiar(s.id, { distribuidorId: e.target.value })}
                            >
                              <option value="">¿De qué distribuidor?</option>
                              {activos.map((d) => (
                                <option key={d.distribuidorId} value={String(d.distribuidorId)}>{d.nombre}</option>
                              ))}
                            </select>
                            {faltaFicha && (
                              <div className="ayuda">
                                Sin ficha vería la lista entera: elegí a cuál pertenece.
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="der">
                        <button
                          className="btn chico"
                          disabled={trabajando === s.id || faltaFicha}
                          onClick={() => admitir(s)}
                        >
                          {trabajando === s.id ? '…' : 'Admitir'}
                        </button>
                        {rechaza === s.id ? (
                          <>
                            <span className="aviso-inline">¿Borrar la cuenta?</span>
                            <button className="btn plano chico" onClick={() => setRechaza(null)}>No</button>
                            <button className="btn plano chico" disabled={trabajando === s.id} onClick={() => descartar(s)}>
                              Sí, rechazar
                            </button>
                          </>
                        ) : (
                          <button className="btn plano chico" onClick={() => setRechaza(s.id)}>Rechazar</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {activos.length === 0 && (
            <div className="aviso-caja" style={{ marginTop: 16 }}>
              <b>No hay distribuidores activos</b>
              <span>
                Para admitir a alguien como Distribuidor hace falta su ficha. Dala de alta primero con
                el botón Distribuidores, o admitilo como Vendedor.
              </span>
            </div>
          )}

          {aviso && (
            <div className={`aviso-caja ${aviso.ok ? 'ok' : ''}`} style={{ marginTop: 16 }}>
              <b>{aviso.ok ? 'Listo' : 'No se pudo'}</b>
              <span>{aviso.mensaje}</span>
            </div>
          )}
        </div>

        <footer className="modal-pie">
          <span className="cuenta">{lista.length} esperando</span>
          <div className="sep" style={{ flex: 1 }} />
          <button className="btn" onClick={() => void recargar()}>↻ Actualizar</button>
        </footer>
      </div>
    </div>
  )
}
