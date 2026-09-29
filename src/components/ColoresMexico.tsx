import { useMemo } from 'react'
import type { Linea } from '../types'
import {
  coloresMxAgrupados, descontinuadosMx, espesorDeLinea, type ColorMxAgrupado,
} from '../coloresMx'

/**
 * Lista de colores de la planta de México: la materia prima real, con su
 * código y las medidas de lámina en las que llega.
 *
 * La lista la manda la línea: los de 3 mm son solo para Superior 2.0 y los de
 * 12 mm para LEEDER (y Touchless, que es un LEEDER reforzado). Los otros
 * espesores de la lista original son de otros productos y no entran acá.
 */
export default function ColoresMexico({
  linea,
  color,
  verReservados,
  onElegir,
}: {
  linea: Linea
  color: string
  /** si se muestran los apartados para un cliente: solo adentro de Modumex */
  verReservados: boolean
  onElegir: (c: ColorMxAgrupado) => void
}) {
  const lista = useMemo(() => coloresMxAgrupados(linea, verReservados), [linea, verReservados])
  const descontinuados = descontinuadosMx().filter((c) => c.espesorMm === espesorDeLinea(linea))

  return (
    <>
      <h4 style={{ margin: '28px 0 4px', color: 'var(--text-2)' }}>
        Color · lista de México · {espesorDeLinea(linea)} mm
      </h4>
      <p className="sub" style={{ marginTop: 0, marginBottom: 16 }}>
        {lista.length} colores de línea, los que le corresponden a{' '}
        {linea === 'SUPERIOR' ? 'Superior 2.0' : linea === 'TOUCHLESS' ? 'Touchless S3' : 'LEEDER'}.
      </p>

      {/* Solo el NOMBRE del color.
          Quién nos vende el material, con qué código lo compramos y en qué
          medida de lámina llega son datos de adentro de Modumex: el
          distribuidor elige un color, no una materia prima. */}
      <div className="colores-mx">
        {lista.map((c) => (
          <button
            key={c.nombre}
            className={`color-mx ${color === c.nombre ? 'sel' : ''}`}
            onClick={() => onElegir(c)}
            type="button"
          >
            <b>{c.nombre}</b>
            {c.reservado && <span className="reservado">{c.reservado}</span>}
          </button>
        ))}
      </div>

      <div className="aviso-caja" style={{ maxWidth: 720, marginTop: 6 }}>
        <b>Lo que dice la lista original</b>
        <span>
          {/* el aviso de los apartados solo tiene sentido si se están viendo */}
          {verReservados
            ? 'Los marcados en amarillo vienen apartados o especificados para un cliente: aparecen igual, pero la decisión de usarlos no es de la app.'
            : 'Es el material de línea disponible.'}
          {descontinuados.length > 0 && (
            <>
              {' '}Quedaron afuera {descontinuados.length} descontinuados de este espesor:{' '}
              {descontinuados.map((c) => c.color).join(', ')}.
            </>
          )}
        </span>
      </div>
    </>
  )
}
