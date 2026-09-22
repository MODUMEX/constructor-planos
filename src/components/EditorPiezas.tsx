import { useMemo, useState } from 'react'
import {
  ANCHOS_PILASTRA, anchosPanelFabrica, ANCHOS_PUERTA, ANCHOS_PUERTA_CR,
  escribirMedidaMG, LINEAS, mgFabrica, MODELOS, type FamiliaPieza, type PiezaEspecial,
} from '../catalog'
import { guardarPiezas, ordenar, type GuardadoPiezas } from '../piezas'
import type { Usuario } from '../auth'
import type { Linea } from '../types'

/**
 * Piezas especiales: las medidas que no están en las fichas.
 *
 * Se elige un modelo y se ven las cuatro familias con lo que se fabrica. Abajo
 * se puede dar de alta una medida que no exista, y a partir de ahí aparece en
 * los selectores del constructor para ese modelo.
 *
 * El precio no se pide, sale solo: se cobra la medida de catálogo de arriba
 * —un panel de 155 se cobra como uno de 165— así que cada pieza muestra con
 * cuál se va a cobrar antes de guardarla. Si la medida se pasa de la más
 * grande que existe no hay de dónde subirla y se cobran sus propios m².
 */

interface FamiliaInfo {
  key: FamiliaPieza
  label: string
  ayuda: string
  conAlto: boolean
}

const FAMILIAS: FamiliaInfo[] = [
  { key: 'PT', label: 'Puertas', ayuda: 'ancho de la hoja', conAlto: false },
  { key: 'PN', label: 'Paneles divisores', ayuda: 'es la profundidad de la cabina', conAlto: false },
  { key: 'PL', label: 'Pilastras', ayuda: 'ancho de la pilastra', conAlto: false },
  { key: 'MG', label: 'Mamparas de mingitorio', ayuda: 'ancho × alto', conAlto: true },
]

/** los anchos de ficha de esa familia para ese modelo */
function anchosDeFabrica(familia: FamiliaPieza, modelo: string): number[] {
  switch (familia) {
    case 'PT':
      return [...ANCHOS_PUERTA, ...ANCHOS_PUERTA_CR].sort((a, b) => a - b)
    case 'PN':
      return anchosPanelFabrica(modelo)
    case 'PL':
      return ANCHOS_PILASTRA
    default:
      return mgFabrica(modelo).map((m) => m.anchoCm)
  }
}

/** lo que se fabrica, en texto, para mostrarlo debajo del título */
function fabricaTexto(familia: FamiliaPieza, modelo: string): string {
  if (familia === 'MG') return mgFabrica(modelo).map(escribirMedidaMG).join(' · ')
  return anchosDeFabrica(familia, modelo).join(' · ')
}

/** con cuál medida de ficha se va a cobrar una especial */
function seCobraComo(familia: FamiliaPieza, modelo: string, ancho: number, alto: number): string {
  if (familia === 'MG') {
    const m = mgFabrica(modelo)
      .filter((x) => x.anchoCm >= ancho && x.altoCm >= alto)
      .sort((a, b) => a.anchoCm * a.altoCm - b.anchoCm * b.altoCm)[0]
    return m ? `${escribirMedidaMG(m)} cm` : 'sus propios m²'
  }
  const arriba = anchosDeFabrica(familia, modelo).filter((a) => a >= ancho).sort((a, b) => a - b)[0]
  if (arriba == null) return 'sus propios m²'
  // la puerta arrastra su regla vieja: 62 y 64 se cobran como 70, 92 y 94 como 100
  const tabla = { 62: 70, 64: 70, 92: 100, 94: 100 } as Record<number, number>
  return `${familia === 'PT' ? tabla[arriba] ?? arriba : arriba} cm`
}

interface Props {
  usuario: Usuario
  lista: PiezaEspecial[]
  deLaNube: boolean
  onCambio: (lista: PiezaEspecial[]) => void
  onCerrar: () => void
}

export default function EditorPiezas({ usuario, lista, deLaNube, onCambio, onCerrar }: Props) {
  const [linea, setLinea] = useState<Linea>('LEEDER')
  const [modelo, setModelo] = useState<string>(MODELOS.LEEDER[0].codigo)
  const [nuevos, setNuevos] = useState<Record<string, { ancho: string; alto: string }>>({})
  const [guardando, setGuardando] = useState(false)
  const [resultado, setResultado] = useState<GuardadoPiezas | null>(null)
  const [aviso, setAviso] = useState('')

  const delModelo = useMemo(
    () => lista.filter((p) => p.modelo.toUpperCase() === modelo.toUpperCase()),
    [lista, modelo],
  )

  function cambiarLinea(l: Linea) {
    setLinea(l)
    setModelo(MODELOS[l][0].codigo)
    setAviso('')
  }

  const campo = (familia: FamiliaPieza) => nuevos[familia] ?? { ancho: '', alto: '' }

  function escribir(familia: FamiliaPieza, cual: 'ancho' | 'alto', valor: string) {
    setNuevos({ ...nuevos, [familia]: { ...campo(familia), [cual]: valor } })
    setAviso('')
    setResultado(null)
  }

  function agregar(f: FamiliaInfo) {
    const { ancho, alto } = campo(f.key)
    const a = Number(ancho)
    const h = Number(alto)
    if (!Number.isFinite(a) || a <= 0) return setAviso('Poné el ancho en centímetros.')
    if (f.conAlto && (!Number.isFinite(h) || h <= 0)) return setAviso('La mampara necesita ancho y alto.')
    const etiqueta = f.conAlto ? `${a}x${h}` : String(a)
    const yaSeFabrica = f.conAlto
      ? mgFabrica(modelo).some((m) => m.anchoCm === a && m.altoCm === h)
      : anchosDeFabrica(f.key, modelo).includes(a)
    if (yaSeFabrica) {
      return setAviso(`${etiqueta} cm ya se fabrica en este modelo: no hay que darla de alta.`)
    }
    if (delModelo.some((p) => p.familia === f.key && p.anchoCm === a && (!f.conAlto || p.altoCm === h))) {
      return setAviso(`${etiqueta} cm ya está en la lista.`)
    }
    const pieza: PiezaEspecial = f.conAlto
      ? { familia: f.key, modelo, anchoCm: a, altoCm: h }
      : { familia: f.key, modelo, anchoCm: a }
    onCambio(ordenar([...lista, pieza]))
    setNuevos({ ...nuevos, [f.key]: { ancho: '', alto: '' } })
    setAviso('')
    setResultado(null)
  }

  function quitar(p: PiezaEspecial) {
    onCambio(
      lista.filter(
        (x) =>
          !(x.familia === p.familia && x.modelo === p.modelo &&
            x.anchoCm === p.anchoCm && x.altoCm === p.altoCm),
      ),
    )
    setResultado(null)
  }

  async function guardar() {
    if (!usuario.token) {
      setResultado({ ok: false, mensaje: 'Hay que entrar con la cuenta de Supabase para guardar.' })
      return
    }
    setGuardando(true)
    setResultado(await guardarPiezas(usuario.token, lista))
    setGuardando(false)
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-cab">
          <div>
            <h2>Piezas especiales · medidas fuera de ficha</h2>
            <p className="sub" style={{ margin: 0 }}>
              Se dan de alta por modelo y después aparecen en los selectores. El precio sale solo:
              se cobra la medida de catálogo de arriba.
            </p>
          </div>
          <button className="btn cerrar" onClick={onCerrar}>Cerrar</button>
        </header>

        <div className="modal-cuerpo">
          <div className="campos" style={{ marginBottom: 6 }}>
            <label className="campo">
              <span>Línea</span>
              <select value={linea} onChange={(e) => cambiarLinea(e.target.value as Linea)}>
                {LINEAS.map((l) => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </select>
            </label>
            <label className="campo">
              <span>Modelo</span>
              <select value={modelo} onChange={(e) => { setModelo(e.target.value); setAviso('') }}>
                {MODELOS[linea].map((m) => (
                  <option key={m.codigo} value={m.codigo}>{m.nombre}</option>
                ))}
              </select>
            </label>
          </div>

          {FAMILIAS.map((f) => {
            const propias = delModelo.filter((p) => p.familia === f.key)
            const { ancho, alto } = campo(f.key)
            const a = Number(ancho)
            const h = Number(alto)
            const listo = Number.isFinite(a) && a > 0 && (!f.conAlto || (Number.isFinite(h) && h > 0))
            return (
              <div key={f.key} style={{ marginTop: 18 }}>
                <h4 style={{ marginBottom: 2 }}>
                  {f.label} <span className="num">· {f.ayuda}</span>
                </h4>
                <p className="sub" style={{ margin: '0 0 8px' }}>
                  Se fabrican: {fabricaTexto(f.key, modelo)} cm
                </p>

                {propias.length > 0 && (
                  <div className="tabla-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Medida especial</th>
                          <th>Se cobra como</th>
                          <th className="der"> </th>
                        </tr>
                      </thead>
                      <tbody>
                        {propias.map((p) => (
                          <tr key={`${p.anchoCm}-${p.altoCm ?? 0}`}>
                            <td style={{ fontWeight: 600 }}>
                              {f.conAlto ? `${p.anchoCm} × ${p.altoCm}` : p.anchoCm} cm
                            </td>
                            <td className="num">
                              {seCobraComo(f.key, modelo, p.anchoCm, p.altoCm ?? 0)}
                            </td>
                            <td className="der">
                              <button className="btn" onClick={() => quitar(p)}>Quitar</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="campos" style={{ marginTop: 8, alignItems: 'flex-end' }}>
                  <label className="campo">
                    <span>Ancho (cm)</span>
                    <input
                      className="celda-precio num" type="number" min={1} step="1" value={ancho}
                      onChange={(e) => escribir(f.key, 'ancho', e.target.value)}
                    />
                  </label>
                  {f.conAlto && (
                    <label className="campo">
                      <span>Alto (cm)</span>
                      <input
                        className="celda-precio num" type="number" min={1} step="1" value={alto}
                        onChange={(e) => escribir(f.key, 'alto', e.target.value)}
                      />
                    </label>
                  )}
                  <button className="btn" onClick={() => agregar(f)}>Agregar</button>
                  {listo && (
                    <span className="num">
                      se va a cobrar como {seCobraComo(f.key, modelo, a, f.conAlto ? h : 0)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}

          {aviso && (
            <div className="aviso-caja" style={{ marginTop: 16 }}>
              <span>{aviso}</span>
            </div>
          )}
        </div>

        <footer className="modal-pie">
          <span className="cuenta">
            {deLaNube ? 'Piezas de la nube' : 'Todavía sin guardar en la nube'}
            {lista.length > 0 ? ` · ${lista.length} en total` : ''}
          </span>
          <div className="sep" style={{ flex: 1 }} />
          <button className="btn primario" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar en la nube'}
          </button>
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
