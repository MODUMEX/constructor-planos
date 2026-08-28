import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Usuario } from '../auth'
import type { Proyecto } from '../types'
import {
  abrirProyecto, borrarProyecto, codigoDe, guardarProyecto, listarProyectos, REVISIONES,
  siguienteNumero, type ProyectoEnLista, type Revision,
} from '../proyectos'

/**
 * Guardar y abrir proyectos. Cada revisión es su propia fila, así que sacar la
 * B no borra la A: el histórico del plano queda completo.
 *
 * Solo lista los proyectos que guardó el 2.0. Los del Constructor anterior
 * están en la misma tabla pero con otra estructura adentro, y abrirlos fallaría.
 */

interface Props {
  usuario: Usuario
  proyecto: Proyecto
  onAbrir: (p: Proyecto) => void
  onCambiarNumero: (numero: string) => void
  onCerrar: () => void
}

interface Aviso {
  ok: boolean
  mensaje: string
}

function fecha(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Proyectos({ usuario, proyecto, onAbrir, onCambiarNumero, onCerrar }: Props) {
  const [pestana, setPestana] = useState<'abrir' | 'guardar'>('abrir')
  const [lista, setLista] = useState<ProyectoEnLista[]>([])
  const [cargando, setCargando] = useState(true)
  const [trabajando, setTrabajando] = useState(false)
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [revision, setRevision] = useState<Revision>('A')
  const [confirmarBorrado, setConfirmarBorrado] = useState<number | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const recargar = useCallback(async () => {
    setCargando(true)
    const r = await listarProyectos(usuario)
    setCargando(false)
    if (!r.ok) {
      setAviso({ ok: false, mensaje: r.mensaje })
      setLista([])
      return
    }
    setLista(r.dato ?? [])
  }, [usuario])

  useEffect(() => {
    void recargar()
  }, [recargar])

  /** las revisiones que ya existen para el plano que está abierto */
  const revisionesDelPlano = useMemo(() => {
    const n = proyecto.numero.trim()
    return new Set(lista.filter((p) => p.numeroPlano === n).map((p) => p.revision))
  }, [lista, proyecto.numero])

  // al abrir la pestaña de guardar, se propone la primera revisión libre
  useEffect(() => {
    if (pestana !== 'guardar' || cargando) return
    const libre = REVISIONES.find((r) => !revisionesDelPlano.has(r))
    setRevision(libre ?? 'A')
  }, [pestana, cargando, revisionesDelPlano])

  const filtrada = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return lista
    return lista.filter((p) =>
      [p.numeroPlano, p.revision, p.obra, p.cliente, p.ubicacion].join(' ').toLowerCase().includes(q),
    )
  }, [lista, busqueda])

  async function guardar() {
    setTrabajando(true)
    setAviso(null)
    const r = await guardarProyecto(usuario, proyecto, revision)
    setTrabajando(false)
    setAviso({ ok: r.ok, mensaje: r.mensaje })
    if (r.ok) await recargar()
  }

  async function abrir(p: ProyectoEnLista) {
    setTrabajando(true)
    setAviso(null)
    const r = await abrirProyecto(usuario, p.proyectoId)
    setTrabajando(false)
    if (!r.ok || !r.dato) {
      setAviso({ ok: false, mensaje: r.mensaje })
      return
    }
    onAbrir(r.dato)
    onCerrar()
  }

  async function borrar(p: ProyectoEnLista) {
    setTrabajando(true)
    setAviso(null)
    const r = await borrarProyecto(usuario, p.proyectoId)
    setTrabajando(false)
    setAviso({ ok: r.ok, mensaje: r.ok ? `Se borró la revisión ${p.codigo}.` : r.mensaje })
    setConfirmarBorrado(null)
    if (r.ok) await recargar()
  }

  async function usarSiguienteNumero() {
    setTrabajando(true)
    const r = await siguienteNumero(usuario)
    setTrabajando(false)
    if (!r.ok || !r.dato) {
      setAviso({ ok: false, mensaje: r.mensaje })
      return
    }
    onCambiarNumero(r.dato)
    setAviso({ ok: true, mensaje: `Número de plano ${r.dato}. ${r.mensaje}` })
  }

  const codigo = codigoDe(proyecto.numero || '—', revision)
  const pisa = revisionesDelPlano.has(revision)

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-cab">
          <div>
            <h2>Proyectos</h2>
            <p className="sub" style={{ margin: 0 }}>
              Se guardan en la nube. Cada revisión queda aparte, así que la A no se pierde cuando nace la B.
            </p>
          </div>
          <button className="btn plano" onClick={onCerrar}>Cerrar</button>
        </header>

        <div className="modal-cuerpo">
          <div className="pildoras" style={{ marginBottom: 14 }}>
            <button
              className={`pildora ${pestana === 'abrir' ? 'on' : ''}`}
              onClick={() => setPestana('abrir')}
              type="button"
            >
              Abrir
            </button>
            <button
              className={`pildora ${pestana === 'guardar' ? 'on' : ''}`}
              onClick={() => setPestana('guardar')}
              type="button"
            >
              Guardar el de ahora
            </button>
          </div>

          {pestana === 'abrir' ? (
            <>
              <div className="campos" style={{ marginBottom: 12 }}>
                <div className="campo">
                  <label>Buscar</label>
                  <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Plano, obra, cliente o ubicación"
                  />
                </div>
              </div>

              {cargando ? (
                <p className="sub">Consultando…</p>
              ) : filtrada.length === 0 ? (
                <p className="sub">
                  {lista.length === 0
                    ? 'Todavía no hay proyectos guardados desde el 2.0.'
                    : 'Ningún proyecto calza con esa búsqueda.'}
                </p>
              ) : (
                <div className="tabla-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Plano</th>
                        <th>Rev.</th>
                        <th>Obra</th>
                        <th>Cliente</th>
                        <th>Estado</th>
                        <th>Actualizado</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {filtrada.map((p) => (
                        <tr key={p.proyectoId}>
                          <td className="num">{p.numeroPlano}</td>
                          <td className="num">{p.revision}</td>
                          <td style={{ fontWeight: 600 }}>{p.obra}</td>
                          <td>{p.cliente}</td>
                          <td>{p.estado}</td>
                          <td className="num">{fecha(p.actualizadoEl)}</td>
                          <td className="der">
                            {confirmarBorrado === p.proyectoId ? (
                              <>
                                <span className="aviso-inline">¿Borrar {p.codigo}?</span>
                                <button className="btn plano chico" onClick={() => setConfirmarBorrado(null)}>
                                  No
                                </button>
                                <button className="btn chico" onClick={() => void borrar(p)} disabled={trabajando}>
                                  Sí
                                </button>
                              </>
                            ) : (
                              <>
                                <button className="btn chico" onClick={() => void abrir(p)} disabled={trabajando}>
                                  Abrir
                                </button>
                                <button
                                  className="btn plano chico"
                                  onClick={() => setConfirmarBorrado(p.proyectoId)}
                                  disabled={trabajando}
                                >
                                  Borrar
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="campos">
                <div className="campo">
                  <label>N° de plano</label>
                  <input value={proyecto.numero} onChange={(e) => onCambiarNumero(e.target.value)} />
                </div>
                <div className="campo">
                  <label>Obra</label>
                  <input value={proyecto.obra} readOnly />
                </div>
              </div>

              <button className="btn plano chico" onClick={() => void usarSiguienteNumero()} disabled={trabajando}>
                Usar el siguiente número libre
              </button>

              <h4 style={{ margin: '22px 0 8px', color: 'var(--text-2)' }}>Revisión</h4>
              <p className="sub" style={{ marginTop: 0 }}>
                Las que ya existen salen marcadas. Guardar sobre una que existe la reemplaza.
              </p>
              <div className="pildoras">
                {REVISIONES.map((r) => (
                  <button
                    key={r}
                    className={`pildora ${revision === r ? 'on' : ''}`}
                    onClick={() => setRevision(r)}
                    type="button"
                  >
                    {r}
                    {revisionesDelPlano.has(r) && <span className="viejo">ya existe</span>}
                  </button>
                ))}
              </div>

              <div className="aviso-caja" style={{ marginTop: 18, maxWidth: 720 }}>
                <b>Se va a guardar como {codigo}</b>
                <span>
                  {proyecto.areas.length === 1
                    ? 'Una área'
                    : `${proyecto.areas.length} áreas`}
                  {' · '}
                  {pisa
                    ? 'Esa revisión ya existe: se reemplaza lo que tenga guardado.'
                    : 'Revisión nueva: no toca las anteriores.'}
                </span>
              </div>
            </>
          )}
        </div>

        <footer className="modal-pie">
          <span className="cuenta">
            {cargando ? 'cargando…' : `${lista.length} proyecto(s) del 2.0`}
          </span>
          <div className="sep" style={{ flex: 1 }} />
          <button className="btn" onClick={() => void recargar()} disabled={cargando || trabajando}>
            Recargar
          </button>
          {pestana === 'guardar' && (
            <button className="btn primario" onClick={() => void guardar()} disabled={trabajando}>
              {trabajando ? 'Guardando…' : pisa ? `Reemplazar ${codigo}` : `Guardar ${codigo}`}
            </button>
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
