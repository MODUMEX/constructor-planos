import { useEffect, useState } from 'react'
import { aprobarSolicitud, listarSolicitudes, rechazarSolicitud, type FichaNueva, type Solicitud } from '../solicitudes'
import type { Rol, Usuario } from '../auth'
import { PAISES_DISTRIBUIDOR, REGIONES, type Distribuidor, type Region } from '../distribuidores'

/**
 * Las cuentas que alguien pidió desde la pantalla de entrada.
 *
 * El distribuidor se da de alta SOLO: pone su nombre, su empresa, su teléfono,
 * su correo y su contraseña. Acá un Administrador decide si lo admite y, recién
 * entonces, completa lo que él no puede saber: ubicación, región, país,
 * descuento e IVA. La ficha de la empresa nace en ese momento, así que no hay
 * que darla de alta antes ni volver a pedirle una contraseña.
 *
 * Mientras la solicitud esté pendiente la cuenta existe pero no entra.
 * Rechazarla borra la cuenta.
 */

interface Props {
  usuario: Usuario
  distribuidores: Distribuidor[]
  onCerrar: () => void
  onResuelta: () => void
}

const ROLES: Rol[] = ['Distribuidor', 'Vendedor', 'Administrador', 'Super Admin']

interface Eleccion {
  rol: Rol
  /** ficha existente a la que se lo liga; vacío = crearle una nueva */
  distribuidorId: string
  ficha: FichaNueva
}

export default function Solicitudes({ usuario, distribuidores, onCerrar, onResuelta }: Props) {
  const [lista, setLista] = useState<Solicitud[]>([])
  const [cargando, setCargando] = useState(true)
  const [elige, setElige] = useState<Record<string, Eleccion>>({})
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

  function opcion(s: Solicitud): Eleccion {
    return (
      elige[s.id] ?? {
        rol: 'Distribuidor',
        distribuidorId: '',
        // la empresa la escribió él al registrarse; el contacto es su nombre
        ficha: { nombre: s.nota || s.nombre, region: 'Costa Rica', pais: 'Costa Rica', descuento: 0, iva: null },
      }
    )
  }

  function cambiar(s: Solicitud, cambio: Partial<Eleccion>) {
    setElige((e) => ({ ...e, [s.id]: { ...opcion(s), ...cambio } }))
    setAviso(null)
  }

  function cambiarFicha(s: Solicitud, cambio: Partial<FichaNueva>) {
    const actual = opcion(s)
    setElige((e) => ({ ...e, [s.id]: { ...actual, ficha: { ...actual.ficha, ...cambio } } }))
    setAviso(null)
  }

  async function admitir(s: Solicitud) {
    const o = opcion(s)
    const esDistrib = o.rol === 'Distribuidor'
    setTrabajando(s.id)
    const r = await aprobarSolicitud(usuario, {
      id: s.id,
      rol: o.rol,
      distribuidorId: esDistrib && o.distribuidorId ? Number(o.distribuidorId) : null,
      ficha: esDistrib && !o.distribuidorId ? o.ficha : undefined,
    })
    setTrabajando(null)
    setAviso({
      ok: r.ok,
      mensaje: r.ok ? `${s.nombre || s.email} ya puede entrar como ${o.rol}.` : r.mensaje,
    })
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
              Se dieron de alta solos. Al admitirlos les completás los datos que faltan.
            </p>
          </div>
          <button className="btn cerrar" onClick={onCerrar}>Cerrar</button>
        </header>

        <div className="modal-cuerpo">
          {cargando && <p>Cargando…</p>}
          {!cargando && lista.length === 0 && <p>No hay solicitudes esperando.</p>}

          {lista.map((s) => {
            const o = opcion(s)
            const esDistrib = o.rol === 'Distribuidor'
            const nueva = esDistrib && !o.distribuidorId
            const faltaNombre = nueva && !o.ficha.nombre.trim()
            return (
              <div key={s.id} className="aviso-caja" style={{ display: 'block', marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <b style={{ fontSize: 15 }}>{s.nombre || '—'}</b>
                  <span className="ayuda">{s.email}</span>
                  <span className="ayuda">{s.telefono || 'Sin teléfono'}</span>
                  {s.nota && <span className="ayuda">Empresa: {s.nota}</span>}
                </div>

                <div className="campos" style={{ marginTop: 12 }}>
                  <div className="campo">
                    <label>Entra como</label>
                    <select value={o.rol} onChange={(e) => cambiar(s, { rol: e.target.value as Rol })}>
                      {ROLES.filter((r) => r !== 'Super Admin' || usuario.rol === 'Super Admin').map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  {esDistrib && activos.length > 0 && (
                    <div className="campo">
                      <label>Su empresa</label>
                      <select value={o.distribuidorId} onChange={(e) => cambiar(s, { distribuidorId: e.target.value })}>
                        <option value="">Crearle una ficha nueva</option>
                        {activos.map((d) => (
                          <option key={d.distribuidorId} value={String(d.distribuidorId)}>
                            Ligarlo a {d.nombre}
                          </option>
                        ))}
                      </select>
                      <span className="ayuda">Si ya trabajás con esa empresa, ligalo a la ficha que existe</span>
                    </div>
                  )}

                  {nueva && (
                    <>
                      <div className="campo">
                        <label>Nombre de la empresa</label>
                        <input
                          value={o.ficha.nombre}
                          onChange={(e) => cambiarFicha(s, { nombre: e.target.value })}
                          placeholder="Como debe salir impreso"
                        />
                        <span className="ayuda">Sale en el cajetín del plano</span>
                      </div>
                      <div className="campo">
                        <label>Ubicación</label>
                        <input
                          value={o.ficha.ubicacion ?? ''}
                          onChange={(e) => cambiarFicha(s, { ubicacion: e.target.value })}
                          placeholder="San José, Costa Rica"
                        />
                      </div>
                      <div className="campo">
                        <label>Región</label>
                        <select
                          value={o.ficha.region ?? ''}
                          onChange={(e) => cambiarFicha(s, { region: (e.target.value || null) as Region | null })}
                        >
                          <option value="">Sin región</option>
                          {REGIONES.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        <span className="ayuda">Define en qué moneda cotiza</span>
                      </div>
                      <div className="campo">
                        <label>País</label>
                        <select
                          value={o.ficha.pais ?? ''}
                          onChange={(e) => cambiarFicha(s, { pais: e.target.value || null })}
                        >
                          <option value="">Sin país</option>
                          {PAISES_DISTRIBUIDOR.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                      <div className="campo">
                        <label>Descuento (%)</label>
                        <input
                          type="number" min={0} max={100} step="0.01"
                          value={o.ficha.descuento ?? 0}
                          onChange={(e) => cambiarFicha(s, { descuento: e.target.value === '' ? 0 : Number(e.target.value) })}
                        />
                      </div>
                      <div className="campo">
                        <label>IVA (%)</label>
                        <input
                          type="number" min={0} max={100} step="0.01"
                          value={o.ficha.iva ?? ''}
                          placeholder="Automático"
                          onChange={(e) => cambiarFicha(s, { iva: e.target.value === '' ? null : Number(e.target.value) })}
                        />
                        <span className="ayuda">En blanco = el de su región</span>
                      </div>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
                  <button
                    className="btn primario"
                    disabled={trabajando === s.id || faltaNombre}
                    onClick={() => void admitir(s)}
                  >
                    {trabajando === s.id ? 'Admitiendo…' : 'Admitir'}
                  </button>
                  {rechaza === s.id ? (
                    <>
                      <span className="aviso-inline">¿Borrar la cuenta?</span>
                      <button className="btn" onClick={() => setRechaza(null)}>No</button>
                      <button className="btn" disabled={trabajando === s.id} onClick={() => void descartar(s)}>
                        Sí, rechazar
                      </button>
                    </>
                  ) : (
                    <button className="btn" onClick={() => setRechaza(s.id)}>Rechazar</button>
                  )}
                  {faltaNombre && <span className="ayuda">Ponele el nombre de la empresa</span>}
                </div>
              </div>
            )
          })}

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
