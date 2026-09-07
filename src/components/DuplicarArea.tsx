import { useState } from 'react'
import type { Area } from '../types'

/**
 * Repetir la modulación ya armada en otras áreas: el caso de una torre donde
 * todos los pisos llevan el mismo baño.
 *
 * Se pide el nombre de cada área nueva antes de crearlas, en vez de generar
 * "Área 2", "Área 3" y tener que renombrarlas una por una después. Lo que se
 * copia es el plano tal como quedó —cabinas, pilastras, puertas y las
 * ediciones hechas a mano—, no una modulación nueva desde cero.
 */

interface Fila {
  nombre: string
  piso: string
}

interface Props {
  base: Area
  onCrear: (filas: { nombre: string; piso: string }[]) => void
  onCerrar: () => void
}

/** "Baño de hombres 101" + 1 → "Baño de hombres 102", para no escribirlo entero */
function siguienteNombre(nombre: string, n: number): string {
  const m = nombre.match(/^(.*?)(\d+)(\D*)$/)
  if (!m) return nombre ? `${nombre} ${n + 1}` : ''
  const num = String(Number(m[2]) + n).padStart(m[2].length, '0')
  return `${m[1]}${num}${m[3]}`
}

export default function DuplicarArea({ base, onCrear, onCerrar }: Props) {
  const [filas, setFilas] = useState<Fila[]>([
    { nombre: siguienteNombre(base.nombre, 1), piso: base.piso },
  ])

  function cambiar(i: number, k: keyof Fila, v: string) {
    setFilas((f) => f.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  }

  function agregar() {
    setFilas((f) => [...f, { nombre: siguienteNombre(base.nombre, f.length + 1), piso: base.piso }])
  }

  function quitar(i: number) {
    setFilas((f) => f.filter((_, j) => j !== i))
  }

  const listas = filas.filter((f) => f.nombre.trim())
  const cabinas = base.tramos.reduce((s, t) => s + t.cabinas.length, 0)

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-cab">
          <div>
            <h2>Repetir esta modulación en otras áreas</h2>
            <p className="sub" style={{ margin: 0 }}>
              Se copia el plano de <b>{base.nombre || 'esta área'}</b> ({cabinas} cabinas) tal como está.
            </p>
          </div>
          <button className="btn cerrar" onClick={onCerrar}>Cerrar</button>
        </header>

        <div className="modal-cuerpo">
          <div className="tabla-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '55%' }}>Nombre del área</th>
                  <th>Piso</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        className="celda-precio"
                        style={{ width: '100%', textAlign: 'left', fontFamily: 'inherit' }}
                        value={f.nombre}
                        placeholder="Baño de hombres 202"
                        onChange={(e) => cambiar(i, 'nombre', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="celda-precio"
                        style={{ width: '100%', textAlign: 'left', fontFamily: 'inherit' }}
                        value={f.piso}
                        placeholder="Segundo piso"
                        onChange={(e) => cambiar(i, 'piso', e.target.value)}
                      />
                    </td>
                    <td className="der">
                      <button className="btn plano chico" onClick={() => quitar(i)} title="Quitar">✕</button>
                    </td>
                  </tr>
                ))}
                {filas.length === 0 && (
                  <tr><td colSpan={3}>Agregá al menos un área.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12 }}>
            <button className="btn chico" onClick={agregar}>+ Agregar área</button>
          </div>

          <div className="aviso-caja" style={{ marginTop: 18 }}>
            <b>Las copias quedan sueltas</b>
            <span>
              Después de crearlas, cambiarle algo a una no le cambia nada a las otras: cada área lleva su
              propio plano y su propio despiece en el PDF y en el CSV.
            </span>
          </div>
        </div>

        <footer className="modal-pie">
          <span className="cuenta">
            {listas.length === 0 ? 'Sin áreas por crear' : `${listas.length} área(s) nueva(s)`}
          </span>
          <div className="sep" style={{ flex: 1 }} />
          <button className="btn" onClick={onCerrar}>Cancelar</button>
          <button className="btn primario" onClick={() => onCrear(listas)} disabled={listas.length === 0}>
            Crear {listas.length || ''} {listas.length === 1 ? 'área' : 'áreas'}
          </button>
        </footer>
      </div>
    </div>
  )
}
