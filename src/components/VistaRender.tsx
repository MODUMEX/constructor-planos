import { fotoDe, type Consulta } from '../renders'

/**
 * La foto del modelo con el color elegido. Si esa combinación exacta no tiene
 * render, muestra la más cercana y lo dice, para que nadie le enseñe al cliente
 * una foto que no es la que va a recibir.
 */
export default function VistaRender({
  consulta,
  alto = 260,
  titulo,
}: {
  consulta: Consulta
  alto?: number
  titulo?: string
}) {
  const foto = fotoDe(consulta)

  if (!foto) {
    return (
      <div className="render vacio-render" style={{ height: alto }}>
        <span>Sin render para esta combinación</span>
      </div>
    )
  }

  return (
    <figure className="render">
      <img src={foto.archivo} alt={titulo ?? 'Render del modelo'} style={{ height: alto }} />
      {(titulo || foto.referencia) && (
        <figcaption>
          {titulo}
          {foto.referencia && (
            <span className="referencia" title={foto.nota}>
              foto de referencia · {foto.nota}
            </span>
          )}
        </figcaption>
      )}
    </figure>
  )
}
