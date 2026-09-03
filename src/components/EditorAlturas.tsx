import { useState } from 'react'
import { LINEAS, MODELOS } from '../catalog'
import {
  alturasDeFabrica, guardarAlturas, soloCambios, type GuardadoAlturas, type TablaAlturas,
} from '../alturas'
import type { Usuario } from '../auth'

/**
 * Alturas de las piezas por modelo, solo para administradores. Es la pantalla
 * que en el Constructor viejo estaba en Catálogos: la altura de la puerta, del
 * panel, de la pilastra y de la mampara de mingitorio.
 *
 * Lo que se guarde acá va a `app_config` y lo usa todo el mundo al dibujar y al
 * cotizar, así que el botón pide confirmación antes de escribir.
 *
 * Ojo con las estimadas: SCUDO, COLGANTE y TL_S3 vienen del Constructor viejo
 * marcadas como estimadas y son las que hay que confirmar contra la ficha.
 */

const ESTIMADAS = new Set(['SCUDO', 'COLGANTE', 'TL_S3'])

const COLUMNAS: { key: keyof TablaAlturas[string]; label: string }[] = [
  { key: 'puerta', label: 'Puerta' },
  { key: 'panel', label: 'Panel' },
  { key: 'pilastra', label: 'Pilastra' },
  { key: 'mingitorio', label: 'Mampara MG' },
]

interface Props {
  usuario: Usuario
  tabla: TablaAlturas
  deLaNube: boolean
  onCambio: (tabla: TablaAlturas) => void
  onCerrar: () => void
}

export default function EditorAlturas({ usuario, tabla, deLaNube, onCambio, onCerrar }: Props) {
  const [guardando, setGuardando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [resultado, setResultado] = useState<GuardadoAlturas | null>(null)

  const cambios = soloCambios(tabla)
  const nCambios = Object.keys(cambios).length

  function editar(modelo: string, campo: keyof TablaAlturas[string], valor: string) {
    const n = parseInt(valor, 10)
    onCambio({ ...tabla, [modelo]: { ...tabla[modelo], [campo]: Number.isNaN(n) ? 0 : n } })
    setResultado(null)
  }

  function restablecer() {
    onCambio(alturasDeFabrica())
    setResultado(null)
  }

  async function guardar() {
    if (!usuario.token) {
      setResultado({ ok: false, mensaje: 'Hay que entrar con la cuenta de Supabase para guardar.' })
      setConfirmar(false)
      return
    }
    setGuardando(true)
    setResultado(await guardarAlturas(usuario.token, tabla))
    setGuardando(false)
    setConfirmar(false)
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-cab">
          <div>
            <h2>Alturas de las piezas · por modelo</h2>
            <p className="sub" style={{ margin: 0 }}>
              La pieza se fabrica a una sola altura: la resta por zoclo o por patas se hace en planta al cortar.
            </p>
          </div>
          <button className="btn plano" onClick={onCerrar}>Cerrar</button>
        </header>

        <div className="modal-cuerpo">
          <div className="aviso-caja" style={{ marginBottom: 16 }}>
            <b>Las marcadas «por confirmar» vienen estimadas del Constructor viejo</b>
            <span>
              Scudo, Colgante y Touchless S3 nunca se cotejaron contra la ficha. Las demás sí: Estándar y
              Reforzado PT70 = 150 y PI19 = 180, Imperial PI = 190, Kids PT = 130 y PI = 150.
            </span>
          </div>

          {LINEAS.map((linea) => (
            <div key={linea.id}>
              <h4 style={{ marginTop: 18 }}>{linea.nombre}</h4>
              <div className="tabla-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Modelo</th>
                      {COLUMNAS.map((c) => (
                        <th key={c.key} className="der">{c.label} (cm)</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MODELOS[linea.id].map((m) => {
                      const a = tabla[m.codigo]
                      if (!a) return null
                      return (
                        <tr key={m.codigo}>
                          <td style={{ fontWeight: 600 }}>
                            {m.nombre}
                            {ESTIMADAS.has(m.codigo) && (
                              <span className="nuevo" style={{ marginLeft: 8 }}>por confirmar</span>
                            )}
                          </td>
                          {COLUMNAS.map((c) => (
                            <td key={c.key} className="der">
                              <input
                                className="celda-precio num"
                                type="number"
                                min={0}
                                step="1"
                                value={a[c.key]}
                                onChange={(e) => editar(m.codigo, c.key, e.target.value)}
                              />
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        <footer className="modal-pie">
          <span className="cuenta">
            {deLaNube ? 'Alturas de la nube' : 'Alturas de fábrica'}
            {nCambios > 0 ? ` · ${nCambios} modelo(s) corregidos` : ''}
          </span>
          <div className="sep" style={{ flex: 1 }} />
          <button className="btn" onClick={restablecer} disabled={guardando}>↺ Restablecer fábrica</button>
          {confirmar ? (
            <>
              <span className="aviso-inline">¿Seguro? Cambia las medidas de todos.</span>
              <button className="btn" onClick={() => setConfirmar(false)}>No</button>
              <button className="btn primario" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando…' : 'Sí, guardar'}
              </button>
            </>
          ) : (
            <button className="btn primario" onClick={() => setConfirmar(true)} disabled={guardando}>
              Guardar en la nube
            </button>
          )}
        </footer>

        {resultado && (
          <div className={`aviso-caja ${resultado.ok ? 'ok' : ''}`} style={{ margin: '0 22px 18px' }}>
            <b>{resultado.ok ? 'Guardado' : 'No se guardó'}</b>
            <span>{resultado.mensaje}</span>
          </div>
        )}
      </div>
    </div>
  )
}
