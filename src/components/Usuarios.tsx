import { useEffect, useState } from 'react'
import {
  crearUsuario, eliminarUsuario, guardarUsuario, listarUsuarios, ROLES_INTERNOS,
  type DatosUsuario, type UsuarioInterno,
} from '../usuarios'
import type { Rol, Usuario } from '../auth'

/**
 * Usuarios internos: Administradores y Vendedores. Solo el Super Admin entra
 * acá, igual que en la base.
 *
 * Los distribuidores no salen en esta lista: cada uno es una ficha de empresa
 * más su cuenta y se gestionan en la pantalla de Distribuidores.
 *
 * Qué puede cada rol, para tenerlo a la vista al asignarlo:
 *   Super Admin    todo, incluida esta pantalla
 *   Administrador  todo menos esta pantalla
 *   Vendedor       modula, cotiza, ve pedidos y distribuidores; sin precios ni medidas
 *   Distribuidor   solo lo suyo
 */

const VACIO: DatosUsuario = { nombre: '', email: '', rol: 'Vendedor', activo: true, password: '' }

const QUE_PUEDE: Record<string, string> = {
  'Super Admin': 'Todo, incluida esta pantalla de usuarios',
  Administrador: 'Todo menos esta pantalla de usuarios',
  Vendedor: 'Modula, cotiza y ve pedidos y distribuidores. Sin precios ni medidas',
  Distribuidor: 'Solo su propia información',
}

interface Props {
  usuario: Usuario
  onCerrar: () => void
}

export default function Usuarios({ usuario, onCerrar }: Props) {
  const [lista, setLista] = useState<UsuarioInterno[]>([])
  const [cargando, setCargando] = useState(true)
  const [edita, setEdita] = useState<DatosUsuario | null>(null)
  const [verClave, setVerClave] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [borrar, setBorrar] = useState<string | null>(null)
  const [aviso, setAviso] = useState<{ ok: boolean; mensaje: string } | null>(null)

  const esNuevo = edita !== null && edita.id === undefined

  useEffect(() => {
    let vivo = true
    listarUsuarios(usuario).then((r) => {
      if (!vivo) return
      setCargando(false)
      if (r.ok && r.dato) setLista(r.dato)
      else setAviso({ ok: false, mensaje: r.mensaje })
    })
    return () => { vivo = false }
  }, [usuario])

  function campo(k: keyof DatosUsuario, v: string | boolean | Rol) {
    setEdita((d) => (d ? { ...d, [k]: v } : d))
    setAviso(null)
  }

  function abrir(d: DatosUsuario) {
    setEdita(d)
    setVerClave(false)
    setAviso(null)
  }

  async function guardar() {
    if (!edita) return
    setGuardando(true)
    const r = edita.id
      ? await guardarUsuario(usuario, { ...edita, id: edita.id })
      : await crearUsuario(usuario, edita)
    setGuardando(false)
    setAviso({ ok: r.ok, mensaje: r.mensaje })
    if (!r.ok || !r.dato) return
    const guardado = r.dato
    setLista((l) => (edita.id ? l.map((x) => (x.id === guardado.id ? guardado : x)) : [...l, guardado]))
    setEdita(null)
    setVerClave(false)
  }

  async function quitar(id: string) {
    setGuardando(true)
    const r = await eliminarUsuario(usuario, id)
    setGuardando(false)
    setBorrar(null)
    setAviso({ ok: r.ok, mensaje: r.mensaje })
    if (r.ok) setLista((l) => l.filter((x) => x.id !== id))
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-cab">
          <div>
            <h2>Usuarios</h2>
            <p className="sub" style={{ margin: 0 }}>
              Administradores y Vendedores. Los distribuidores se gestionan en su propia pantalla.
            </p>
          </div>
          <button className="btn cerrar" onClick={onCerrar}>Cerrar</button>
        </header>

        <div className="modal-cuerpo">
          {edita ? (
            <>
              <h4>{esNuevo ? 'Nuevo usuario' : `Editar · ${edita.nombre}`}</h4>
              <div className="campos">
                <div className="campo">
                  <label>Nombre</label>
                  <input value={edita.nombre ?? ''} onChange={(e) => campo('nombre', e.target.value)} placeholder="Nombre y apellido" />
                </div>
                <div className="campo">
                  <label>Correo</label>
                  <input
                    value={edita.email ?? ''}
                    onChange={(e) => campo('email', e.target.value)}
                    placeholder="persona@modumex.com"
                    disabled={!esNuevo}
                  />
                  <span className="ayuda">
                    {esNuevo ? 'Con este correo entra a la app' : 'El correo de una cuenta ya creada no se cambia acá'}
                  </span>
                </div>
                <div className="campo">
                  <label>Contraseña</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      style={{ flex: 1 }}
                      type={verClave ? 'text' : 'password'}
                      value={edita.password ?? ''}
                      onChange={(e) => campo('password', e.target.value)}
                      placeholder={esNuevo ? 'Al menos 6 caracteres' : 'Dejala en blanco para no cambiarla'}
                      autoComplete="new-password"
                    />
                    <button
                      className="btn plano chico"
                      onClick={() => setVerClave((v) => !v)}
                      title={verClave ? 'Ocultar' : 'Ver lo que estás escribiendo'}
                    >
                      {verClave ? '🙈' : '👁'}
                    </button>
                  </div>
                  <span className="ayuda">
                    La contraseña que ya tiene no se puede ver: Supabase la guarda cifrada y nadie la
                    puede leer de vuelta. Si no la sabés, escribile una nueva y entregásela.
                  </span>
                </div>
                <div className="campo">
                  <label>Rol</label>
                  <select value={edita.rol ?? 'Vendedor'} onChange={(e) => campo('rol', e.target.value as Rol)}>
                    {ROLES_INTERNOS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <span className="ayuda">{QUE_PUEDE[edita.rol ?? 'Vendedor']}</span>
                </div>
                <div className="campo">
                  <label>Estado</label>
                  <select value={edita.activo === false ? 'no' : 'si'} onChange={(e) => campo('activo', e.target.value === 'si')}>
                    <option value="si">Activo</option>
                    <option value="no">Inactivo</option>
                  </select>
                  <span className="ayuda">Un inactivo no puede entrar</span>
                </div>
              </div>
            </>
          ) : (
            <div className="tabla-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cargando && <tr><td colSpan={5}>Cargando…</td></tr>}
                  {!cargando && lista.length === 0 && (
                    <tr><td colSpan={5}>No hay usuarios internos dados de alta.</td></tr>
                  )}
                  {lista.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>
                        {u.nombre || '—'}
                        {u.id === usuario.id && <span className="chip" style={{ marginLeft: 8 }}>vos</span>}
                      </td>
                      <td>{u.email || '—'}</td>
                      <td>{u.rol}</td>
                      <td>{u.activo ? 'Activo' : 'Inactivo'}</td>
                      <td className="der">
                        <button className="btn plano chico" onClick={() => abrir({ ...u })}>Editar</button>
                        {u.id !== usuario.id && (
                          borrar === u.id ? (
                            <>
                              <span className="aviso-inline">¿Seguro?</span>
                              <button className="btn plano chico" onClick={() => setBorrar(null)}>No</button>
                              <button className="btn chico" disabled={guardando} onClick={() => quitar(u.id)}>Sí, eliminar</button>
                            </>
                          ) : (
                            <button className="btn plano chico" onClick={() => setBorrar(u.id)}>Eliminar</button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
          <span className="cuenta">{edita ? '' : `${lista.length} usuario(s)`}</span>
          <div className="sep" style={{ flex: 1 }} />
          {edita ? (
            <>
              <button className="btn" onClick={() => { setEdita(null); setVerClave(false) }}>Cancelar</button>
              <button className="btn primario" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando…' : esNuevo ? 'Dar de alta' : 'Guardar cambios'}
              </button>
            </>
          ) : (
            <button className="btn primario" onClick={() => abrir({ ...VACIO })}>+ Nuevo usuario</button>
          )}
        </footer>
      </div>
    </div>
  )
}
