import { useMemo, useState } from 'react'
import type { Moneda } from '../types'
import { MODELOS } from '../catalog'
import {
  COMBOS_NORMALES, FAMILIAS, filasParaGuardar, guardarTarifas, modelosNormales, modelosUsdOnly,
  TIERS_USD_ONLY, type FamiliaTarifa, type JuegoTarifas, type ResultadoGuardado, type TablaTarifas,
} from '../tarifas'
import type { Usuario } from '../auth'

/**
 * Lista de precios por m², solo para Super Admin. Lo que se guarde acá va a la
 * tabla `tarifa_m2` y lo usa todo el mundo al cotizar, así que el botón pide
 * confirmación antes de escribir.
 */

const NOMBRE_TIER: Record<string, string> = {
  linea: 'Línea',
  lineaCR: 'Línea Costa Rica',
  especiales: 'Especiales',
  aceroInox: 'Acero inoxidable',
  antigrafiti: 'Antigrafiti',
}

/** el nombre del modelo, buscándolo en las tres líneas */
function etiquetaModelo(codigo: string): string {
  for (const linea of ['LEEDER', 'SUPERIOR', 'TOUCHLESS'] as const) {
    const m = MODELOS[linea].find((x) => x.codigo === codigo)
    if (m) return linea === 'LEEDER' ? m.nombre : `${m.nombre} · ${linea === 'SUPERIOR' ? 'Superior' : 'Touchless'}`
  }
  return codigo
}

interface Props {
  usuario: Usuario
  tabla: TablaTarifas
  onCambio: (tabla: TablaTarifas) => void
  onCerrar: () => void
  onRecargar: () => void
}

export default function EditorTarifas({ usuario, tabla, onCambio, onCerrar, onRecargar }: Props) {
  const [tier, setTier] = useState('linea')
  const [moneda, setMoneda] = useState<Moneda>('USD')
  const [tierSup, setTierSup] = useState<string>('linea')
  const [guardando, setGuardando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoGuardado | null>(null)
  const [verFilas, setVerFilas] = useState(false)
  const [confirmar, setConfirmar] = useState(false)

  const normales = useMemo(() => modelosNormales(tabla), [tabla])
  const usdOnly = useMemo(() => modelosUsdOnly(tabla), [tabla])
  const filas = useMemo(() => filasParaGuardar(tabla), [tabla])

  const juegoNormal = COMBOS_NORMALES.find((c) => c.tier === tier && c.moneda === moneda)?.juego ?? 'linea'
  const simbolo = moneda === 'CRC' ? '₡' : '$'

  function editar(modelo: string, juego: string, familia: FamiliaTarifa, valor: string) {
    const copia: TablaTarifas = { ...tabla, [modelo]: { ...tabla[modelo] } }
    const previo = copia[modelo][juego]
    const set: JuegoTarifas = previo && typeof previo !== 'boolean' ? { ...previo } : {}
    const n = parseFloat(valor)
    set[familia] = Number.isNaN(n) ? 0 : n
    copia[modelo][juego] = set
    onCambio(copia)
    setResultado(null)
  }

  function valor(modelo: string, juego: string, familia: FamiliaTarifa): string {
    const set = tabla[modelo]?.[juego]
    if (!set || typeof set === 'boolean') return ''
    const v = set[familia]
    return v == null ? '' : String(v)
  }

  async function guardar() {
    if (!usuario.token) {
      setResultado({ ok: false, filas: filas.length, mensaje: 'Hay que entrar con la cuenta de Supabase para guardar.' })
      return
    }
    setGuardando(true)
    setResultado(await guardarTarifas(usuario.token, tabla))
    setGuardando(false)
    setConfirmar(false)
  }

  const tabla_ = (modelos: string[], juego: string, sim: string) => (
    <div className="tabla-wrap">
      <table>
        <thead>
          <tr>
            <th>Modelo</th>
            {FAMILIAS.map((f) => (
              <th key={f.key} className="der">
                {f.label} ({sim}/m²)
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {modelos.map((m) => (
            <tr key={m}>
              <td style={{ fontWeight: 600 }}>{etiquetaModelo(m)}</td>
              {FAMILIAS.map((f) => (
                <td key={f.key} className="der">
                  <input
                    className="celda-precio num"
                    type="number"
                    min={0}
                    step="0.01"
                    value={valor(m, juego, f.key)}
                    onChange={(e) => editar(m, juego, f.key, e.target.value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-cab">
          <div>
            <h2>Lista de precios · por m²</h2>
            <p className="sub" style={{ margin: 0 }}>
              Se guarda en la tabla <span className="num">tarifa_m2</span> y la usa todo el mundo al cotizar.
            </p>
          </div>
          <button className="btn plano" onClick={onCerrar}>Cerrar</button>
        </header>

        <div className="modal-cuerpo">
          <h4>LEEDER y Touchless · tarifa propia en cada moneda</h4>
          <div className="pildoras" style={{ marginBottom: 12 }}>
            {['linea', 'especiales'].map((t) => (
              <button key={t} className={`pildora ${tier === t ? 'on' : ''}`} onClick={() => setTier(t)} type="button">
                {NOMBRE_TIER[t]}
              </button>
            ))}
            <span style={{ width: 12 }} />
            {(['USD', 'CRC'] as Moneda[]).map((m) => (
              <button key={m} className={`pildora ${moneda === m ? 'on' : ''}`} onClick={() => setMoneda(m)} type="button">
                {m === 'CRC' ? 'Colones' : 'Dólares'}
              </button>
            ))}
          </div>
          {tabla_(normales, juegoNormal, simbolo)}

          <h4 style={{ marginTop: 26 }}>Superior 2.0 · solo en dólares, convierte con el tipo de cambio</h4>
          <div className="pildoras" style={{ marginBottom: 12 }}>
            {TIERS_USD_ONLY.map((t) => (
              <button key={t} className={`pildora ${tierSup === t ? 'on' : ''}`} onClick={() => setTierSup(t)} type="button">
                {NOMBRE_TIER[t]}
              </button>
            ))}
          </div>
          {tabla_(usdOnly, tierSup, '$')}

          {verFilas && (
            <pre className="payload" style={{ marginTop: 16 }}>
              {JSON.stringify(filas.slice(0, 40), null, 1)}
              {filas.length > 40 ? `\n… y ${filas.length - 40} filas más` : ''}
            </pre>
          )}
        </div>

        <footer className="modal-pie">
          <span className="cuenta">{filas.length} tarifas en total</span>
          <div className="sep" style={{ flex: 1 }} />
          <button className="btn" onClick={() => setVerFilas(!verFilas)}>
            {verFilas ? 'Ocultar' : 'Ver'} lo que se guarda
          </button>
          <button className="btn" onClick={onRecargar} disabled={guardando}>Descartar y recargar</button>
          {confirmar ? (
            <>
              <span className="aviso-inline">¿Seguro? Cambia los precios de todos.</span>
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
