import { useState } from 'react'
import {
  crearDistribuidor, guardarDistribuidor, PAISES_DISTRIBUIDOR, REGIONES,
  type DatosDistribuidor, type Distribuidor, type Region,
} from '../distribuidores'
import type { Usuario } from '../auth'
import Ojo from './Ojo'

/**
 * Alta y edición de distribuidores. Es lo que el Constructor viejo tenía en su
 * pantalla de administración: el vendedor no escribe el nombre en el cajetín,
 * lo elige de acá.
 *
 * Dar de alta crea DOS cosas: la ficha de la empresa y la cuenta con la que el
 * distribuidor entra a la app, con rol restringido. Por eso el correo y la
 * contraseña son obligatorios al crearlo; al editar, la contraseña solo se toca
 * si se escribe una nueva.
 *
 * Un distribuidor no se borra, se desactiva: los planos viejos siguen llevando
 * su nombre y perderlo dejaría cajetines huérfanos. Los desactivados no salen
 * en el selector del proyecto, pero siguen en esta lista.
 */

const VACIO: DatosDistribuidor = {
  nombre: '', contacto: '', email: '', telefono: '', ubicacion: '', region: 'Costa Rica',
  pais: 'Costa Rica', descuento: 0, iva: null, activo: true, password: '',
}

interface Props {
  usuario: Usuario
  lista: Distribuidor[]
  onLista: (lista: Distribuidor[]) => void
  onCerrar: () => void
}

export default function Distribuidores({ usuario, lista, onLista, onCerrar }: Props) {
  const [edita, setEdita] = useState<DatosDistribuidor | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [verClave, setVerClave] = useState(false)
  const [aviso, setAviso] = useState<{ ok: boolean; mensaje: string } | null>(null)

  const esNuevo = edita !== null && edita.distribuidorId === undefined

  function campo(k: keyof DatosDistribuidor, v: string | number | boolean | Region | null) {
    setEdita((d) => (d ? { ...d, [k]: v } : d))
    setAviso(null)
  }

  async function guardar() {
    if (!edita) return
    setGuardando(true)
    const r = esNuevo
      ? await crearDistribuidor(usuario, edita)
      : await guardarDistribuidor(usuario, edita as DatosDistribuidor & { distribuidorId: number })
    setGuardando(false)
    setAviso({ ok: r.ok, mensaje: r.mensaje })
    if (!r.ok || !r.dato) return
    const nuevo = r.dato
    onLista(
      esNuevo
        ? [...lista, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre))
        : lista.map((x) => (x.distribuidorId === nuevo.distribuidorId ? nuevo : x)),
    )
    setEdita(null)
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-cab">
          <div>
            <h2>Distribuidores</h2>
            <p className="sub" style={{ margin: 0 }}>
              El nombre que se elige acá es el que sale en el cajetín del plano y en la cotización.
            </p>
          </div>
          <button className="btn cerrar" onClick={onCerrar}>Cerrar</button>
        </header>

        <div className="modal-cuerpo">
          {edita ? (
            <>
              <h4>{esNuevo ? 'Nuevo distribuidor' : `Editar · ${edita.nombre}`}</h4>
              <div className="campos">
                <div className="campo">
                  <label>Nombre</label>
                  <input value={edita.nombre ?? ''} onChange={(e) => campo('nombre', e.target.value)} placeholder="Modumex Costa Rica" />
                  <span className="ayuda">Como debe salir impreso</span>
                </div>
                <div className="campo">
                  <label>Contacto</label>
                  <input value={edita.contacto ?? ''} onChange={(e) => campo('contacto', e.target.value)} />
                </div>
                <div className="campo">
                  <label>Correo</label>
                  <input value={edita.email ?? ''} onChange={(e) => campo('email', e.target.value)} placeholder="distribuidor@empresa.com" />
                  <span className="ayuda">Con este correo entra a la app</span>
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
                      type="button"
                      className="btn plano chico"
                      onClick={() => setVerClave((v) => !v)}
                      title={verClave ? 'Ocultar' : 'Ver lo que estás escribiendo'}
                    >
                      <Ojo abierto={verClave} />
                    </button>
                  </div>
                  <span className="ayuda">
                    {esNuevo
                      ? 'Se le crea la cuenta con esta clave'
                      : 'La que ya tiene no se puede ver: Supabase la guarda cifrada. Si no la sabés, escribile una nueva y entregásela.'}
                  </span>
                </div>
                <div className="campo">
                  <label>Teléfono</label>
                  <input value={edita.telefono ?? ''} onChange={(e) => campo('telefono', e.target.value)} />
                </div>
                <div className="campo">
                  <label>Ubicación</label>
                  <input value={edita.ubicacion ?? ''} onChange={(e) => campo('ubicacion', e.target.value)} placeholder="San José, Costa Rica" />
                </div>
                <div className="campo">
                  <label>Región</label>
                  <select
                    value={edita.region ?? ''}
                    onChange={(e) => campo('region', (e.target.value || null) as Region | null)}
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
                  <select value={edita.pais ?? ''} onChange={(e) => campo('pais', e.target.value || null)}>
                    <option value="">Sin país</option>
                    {PAISES_DISTRIBUIDOR.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <span className="ayuda">Llena el País de la cotización</span>
                </div>
                <div className="campo">
                  <label>Descuento (%)</label>
                  <input
                    type="number" min={0} max={100} step="0.01"
                    value={edita.descuento ?? 0}
                    onChange={(e) => campo('descuento', e.target.value === '' ? 0 : Number(e.target.value))}
                  />
                  <span className="ayuda">Cae automático en su cotización</span>
                </div>
                <div className="campo">
                  <label>IVA (%)</label>
                  <input
                    type="number" min={0} max={100} step="0.01"
                    value={edita.iva ?? ''}
                    placeholder="Automático"
                    onChange={(e) => campo('iva', e.target.value === '' ? null : Number(e.target.value))}
                  />
                  <span className="ayuda">
                    En blanco = el de su región (Costa Rica 13, LATAM 0). Un 0 escrito a mano SÍ es 0.
                  </span>
                </div>
                <div className="campo">
                  <label>Estado</label>
                  <select value={edita.activo === false ? 'no' : 'si'} onChange={(e) => campo('activo', e.target.value === 'si')}>
                    <option value="si">Activo</option>
                    <option value="no">Inactivo</option>
                  </select>
                  <span className="ayuda">Los inactivos no salen para elegir</span>
                </div>
              </div>
            </>
          ) : (
            <div className="tabla-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Contacto</th>
                    <th>Ubicación</th>
                    <th>Región</th>
                    <th className="der">Desc.</th>
                    <th className="der">IVA</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lista.length === 0 && (
                    <tr><td colSpan={8}>Todavía no hay distribuidores dados de alta.</td></tr>
                  )}
                  {lista.map((d) => (
                    <tr key={d.distribuidorId}>
                      <td style={{ fontWeight: 600 }}>{d.nombre}</td>
                      <td>{d.contacto || '—'}</td>
                      <td>{d.ubicacion || '—'}</td>
                      <td>{d.region ?? '—'}</td>
                      <td className="der">{d.descuento ? d.descuento + '%' : '—'}</td>
                      <td className="der">{d.iva === null ? 'Auto' : d.iva + '%'}</td>
                      <td>{d.activo ? 'Activo' : 'Inactivo'}</td>
                      <td className="der">
                        <button className="btn plano chico" onClick={() => { setEdita({ ...d }); setVerClave(false); setAviso(null) }}>Editar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <footer className="modal-pie">
          <span className="cuenta">{lista.length} distribuidor(es)</span>
          <div className="sep" style={{ flex: 1 }} />
          {edita ? (
            <>
              <button className="btn" onClick={() => { setEdita(null); setAviso(null) }} disabled={guardando}>Cancelar</button>
              <button className="btn primario" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando…' : esNuevo ? 'Dar de alta' : 'Guardar cambios'}
              </button>
            </>
          ) : (
            <button className="btn primario" onClick={() => { setEdita({ ...VACIO }); setAviso(null) }}>+ Nuevo distribuidor</button>
          )}
        </footer>

        {aviso && (
          <div className={`aviso-caja ${aviso.ok ? 'ok' : ''}`} style={{ margin: '0 22px 18px' }}>
            <b>{aviso.ok ? 'Listo' : 'No se pudo'}</b>
            <span>{aviso.mensaje}</span>
          </div>
        )}
      </div>
    </div>
  )
}
