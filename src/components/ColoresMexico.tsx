import { useMemo } from 'react'
import type { Linea } from '../types'
import {
  claveMx, coloresMxPara, descontinuadosMx, espesorDeLinea, proveedoresMx, type ColorMX,
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
  onElegir,
}: {
  linea: Linea
  color: string
  onElegir: (c: ColorMX) => void
}) {
  const lista = useMemo(() => coloresMxPara(linea), [linea])
  const descontinuados = descontinuadosMx().filter((c) => c.espesorMm === espesorDeLinea(linea))

  return (
    <>
      <h4 style={{ margin: '28px 0 4px', color: 'var(--text-2)' }}>
        Color · lista de México · {espesorDeLinea(linea)} mm
      </h4>
      <p className="sub" style={{ marginTop: 0, marginBottom: 16 }}>
        {lista.length} colores de línea con código, los de {espesorDeLinea(linea)} mm, que son los que le
        corresponden a {linea === 'SUPERIOR' ? 'Superior 2.0' : linea === 'TOUCHLESS' ? 'Touchless S3' : 'LEEDER'}.
      </p>

      {proveedoresMx(lista).map((proveedor) => (
        <div key={proveedor} style={{ marginBottom: 16 }}>
          <h5 className="proveedor">{proveedor}</h5>
          <div className="colores-mx">
            {lista
              .filter((c) => c.proveedor === proveedor)
              .map((c) => (
                <button
                  key={claveMx(c)}
                  className={`color-mx ${color === c.color ? 'sel' : ''}`}
                  onClick={() => onElegir(c)}
                  type="button"
                >
                  <b>{c.color}</b>
                  <span className="cod">{c.codigoBase}</span>
                  <span className="medidas">{c.presentaciones.map((p) => p.medida).join(' · ')}</span>
                  {c.reservado && <span className="reservado">{c.reservado}</span>}
                </button>
              ))}
          </div>
        </div>
      ))}

      <div className="aviso-caja" style={{ maxWidth: 720, marginTop: 6 }}>
        <b>Lo que dice la lista original</b>
        <span>
          Los marcados en amarillo vienen apartados o especificados para un cliente: aparecen igual, pero la
          decisión de usarlos no es de la app.
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
