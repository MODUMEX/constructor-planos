import { useMemo, useRef, useState } from 'react'
import type { Cabina, Config, Pais, Tramo } from '../types'
import { ANCHOS_PILASTRA, puertasPosibles, tipologia } from '../catalog'
import { anchoTotal, minimoDe, nuevaCabina, puertaSugerida, snap } from '../modulacion'
import { medidaCercana, PILASTRAS_INTERNAS, PUERTA_ACCESIBLE_MIN } from '../modulador'
import { Grupo, Item, Menu, Raya } from './Menu'
import {
  cajaDelPlano, cuartoPmr, ESPESOR_MURO, marcosDe, profundidadDeDivisor, profundidadDeTramo,
  profundidadDelLugar, pt, SOBRA_MURO_CM,
  type Marco,
} from '../geometria'
import { ALTO_ORINAL_CM, ALTO_REGADERA_CM, ALTO_WC_CM, ORINAL, REGADERA, WC } from '../assets/sanitarios'

/** medio alto de la zona invisible para agarrar una pilastra, en cm de plano */
const AGARRE_CM = 9

/**
 * Lo más delgada que se dibuja una pieza, en píxeles. El grueso de verdad son
 * 1,27 cm, que a la escala del plano no llega ni a un píxel; antes el piso era
 * de 3 y las piezas se veían mucho más gordas de lo que son.
 */
const MIN_PIEZA_PX = 1.5

export function formatear(cm: number, unidad: 'cm' | 'in'): string {
  if (unidad === 'cm') return `${Number.isInteger(cm) ? cm : cm.toFixed(1)}`
  const pulg = cm / 2.54
  const entero = Math.floor(pulg)
  const frac = Math.round((pulg - entero) * 16)
  if (frac === 0) return `${entero}″`
  if (frac === 16) return `${entero + 1}″`
  const g = (a: number, b: number): number => (b === 0 ? a : g(b, a % b))
  const d = g(frac, 16)
  return `${entero} ${frac / d}/${16 / d}″`
}

interface Props {
  tramos: Tramo[]
  config: Config
  /** dónde se fabrica: define qué medidas de puerta existen */
  pais: Pais
  unidad: 'cm' | 'in'
  verInodoros: boolean
  verCotas: boolean
  seleccion: string | null
  onSeleccion: (id: string | null) => void
  onCabinas: (tramoId: string, cabinas: Cabina[]) => void
  /** al arrastrar una pilastra: se elige su medida y el resto se reacomoda */
  onPilastra: (tramoId: string, indice: number, anchoCm: number) => void
  /** al elegir una medida de puerta: manda la puerta y las pilastras se adaptan */
  onPuerta: (tramoId: string, indice: number, anchoPuertaCm: number) => void

}

type MenuEstado =
  | { tipo: 'cabina'; tramoId: string; indice: number; x: number; y: number }
  | { tipo: 'panel'; tramoId: string; indice: number; x: number; y: number }
  | null

export default function EditorPlano({
  tramos,
  config,
  pais,
  unidad,
  verInodoros,
  verCotas,
  seleccion,
  onSeleccion,
  onCabinas,
  onPilastra,
  onPuerta,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [menu, setMenu] = useState<MenuEstado>(null)
  const [arrastrando, setArrastrando] = useState<string | null>(null)
  // lo que se está escribiendo en una cota: se aplica al salir del campo o con
  // Enter, no en cada tecla, para no remodular a media medida
  const [cotaEnCurso, setCotaEnCurso] = useState<{ clave: string; texto: string } | null>(null)
  const arrastre = useRef<{
    tramoId: string
    indice: number
    x0: number
    y0: number
    ax: number
    ay: number
    cabinas: Cabina[]
    escala: number
  } | null>(null)
  const arrastrePil = useRef<{
    tramoId: string
    indice: number
    x0: number
    y0: number
    ax: number
    ay: number
    escala: number
    ancho0: number
    extremo: boolean
  } | null>(null)

  const prof = config.profundidadCm
  const marcos = useMemo(() => marcosDe(tramos), [tramos])
  /** en esquina, nicho y U los muros de fondo de cada tramo ya forman el ángulo:
   *  dibujar además los laterales metería una pared en medio del baño */
  const conEsquina = tipologia(config.tipologia).esquinaCompartida
  /** grueso con el que se dibujan panel y pilastra: sale del espesor del material */
  const grueso = Math.max(config.espesorMm / 10, 0.3)

  /** el cuarto PMR llega más hondo que las cabinas: hay que encuadrarlo también */
  const profPmr = config.tipologia === 'PMR' ? profundidadDelLugar(config) : 0
  const caja = useMemo(
    () => cajaDelPlano(tramos, marcos, prof, 62, profPmr),
    [tramos, marcos, prof, profPmr],
  )

  function empezarArrastre(e: React.PointerEvent, tramo: Tramo, indice: number, m: Marco) {
    e.stopPropagation()
    const svg = svgRef.current
    if (!svg) return
    const r = svg.getBoundingClientRect()
    const escala = r.width / caja.w // px por cm
    arrastre.current = {
      tramoId: tramo.id,
      indice,
      x0: e.clientX,
      y0: e.clientY,
      ax: m.ax,
      ay: m.ay,
      cabinas: tramo.cabinas,
      escala,
    }
    setArrastrando(`${tramo.id}:${indice}`)
    try {
      (e.target as Element).setPointerCapture(e.pointerId)
    } catch {
      /* sin captura el arrastre sigue funcionando mientras el puntero esté sobre el plano */
    }
  }

  /** arrastre de una pilastra: cambia SU medida y el resto se reacomoda solo */
  function empezarArrastrePilastra(
    e: React.PointerEvent,
    tramo: Tramo,
    indice: number,
    m: Marco,
    ancho0: number,
    extremo: boolean,
  ) {
    e.stopPropagation()
    const svg = svgRef.current
    if (!svg) return
    const r = svg.getBoundingClientRect()
    arrastrePil.current = {
      tramoId: tramo.id,
      indice,
      x0: e.clientX,
      y0: e.clientY,
      ax: m.ax,
      ay: m.ay,
      escala: r.width / caja.w,
      ancho0,
      extremo,
    }
    setArrastrando(`pil:${tramo.id}:${indice}`)
    try {
      (e.target as Element).setPointerCapture(e.pointerId)
    } catch {
      /* sin captura el arrastre sigue mientras el puntero esté sobre el plano */
    }
  }

  function moviendo(e: React.PointerEvent) {
    const p = arrastrePil.current
    if (p) {
      const dx = (e.clientX - p.x0) / p.escala
      const dy = (e.clientY - p.y0) / p.escala
      // arrastrar hacia afuera engorda la pilastra por los dos lados
      const deseado = p.ancho0 + (dx * p.ax + dy * p.ay) * 2
      // A mano se puede llegar a CUALQUIER pilastra del catálogo en los extremos.
      // El buscador automático sigue prefiriendo las delgadas —que es lo normal
      // contra un muro—, pero hay planos que cierran con una ancha de relleno,
      // como los 55 del extremo derecho de algunos baños ya fabricados.
      const opciones = p.extremo ? ANCHOS_PILASTRA : PILASTRAS_INTERNAS
      onPilastra(p.tramoId, p.indice, medidaCercana(opciones, deseado))
      return
    }
    const a = arrastre.current
    if (!a) return
    const dx = (e.clientX - a.x0) / a.escala
    const dy = (e.clientY - a.y0) / a.escala
    const deltaCm = dx * a.ax + dy * a.ay
    // El panel va siempre centrado en su pilastra, así que arrastrarlo es
    // cambiar la MEDIDA de esa pilastra: se elige la de catálogo más cercana y
    // el buscador reacomoda el resto sin tocar las puertas.
    const t = tramoPorId(a.tramoId)
    const actual = t?.pilastras?.[a.indice + 1] ?? config.anchoPilastraCm
    const elegida = medidaCercana(PILASTRAS_INTERNAS, actual + deltaCm * 2)
    if (elegida !== actual) onPilastra(a.tramoId, a.indice + 1, elegida)
  }

  function terminarArrastre(e: React.PointerEvent) {
    if (arrastre.current) {
      try { (e.target as Element).releasePointerCapture(e.pointerId) } catch { /* ya liberado */ }
    }
    arrastre.current = null
    arrastrePil.current = null
    setArrastrando(null)
  }

  const tramoPorId = (id: string) => tramos.find((t) => t.id === id)

  function cambiarCabina(tramoId: string, indice: number, cambio: Partial<Cabina>) {
    const t = tramoPorId(tramoId)
    if (!t) return
    onCabinas(tramoId, t.cabinas.map((c, i) => (i === indice ? { ...c, ...cambio } : c)))
  }

  function cambiarPuerta(tramoId: string, indice: number, cambio: Partial<Cabina['puerta']>) {
    const t = tramoPorId(tramoId)
    if (!t) return
    onCabinas(tramoId, t.cabinas.map((c, i) => (i === indice ? { ...c, puerta: { ...c.puerta, ...cambio } } : c)))
  }

  /**
   * El vendedor escribió el ancho que quiere para una cabina. El ancho no es
   * una pieza: es la puerta más lo que le toca de las pilastras de cada lado.
   * Como la puerta manda, lo que se ajusta es la PILASTRA vecina, y se elige la
   * de catálogo que deje la cabina lo más cerca de lo pedido.
   */
  function pedirAncho(tramoId: string, indice: number, texto: string) {
    const t = tramoPorId(tramoId)
    const cab = t?.cabinas[indice]
    if (!t || !cab) return
    const pedido = Number(String(texto).replace(',', '.'))
    if (!Number.isFinite(pedido) || pedido <= 0) return

    const n = t.cabinas.length
    if (n < 2) return
    const anchoPil = (j: number) => t.pilastras?.[j] ?? config.anchoPilastraCm
    const cuerpo = cab.tipo === 'orinal' ? cab.anchoCm : cab.puerta.anchoCm

    // Todas las pilastras internas comparten medida, así que:
    //  · una cabina del medio tiene media pilastra a cada lado → ancho = pilastra + puerta
    //  · la primera y la última llevan su pilastra de extremo entera más media interna
    const primera = indice === 0
    const ultima = indice === n - 1
    const necesaria = primera
      ? (pedido - cuerpo - anchoPil(0)) * 2
      : ultima
        ? (pedido - cuerpo - anchoPil(n)) * 2
        : pedido - cuerpo

    const jMover = primera ? 1 : ultima ? n - 1 : indice + 1
    const elegida = medidaCercana(PILASTRAS_INTERNAS, necesaria)
    if (elegida !== anchoPil(jMover)) onPilastra(tramoId, jMover, elegida)
  }
  function centrarPanel(tramoId: string, indice: number) {
    const t = tramoPorId(tramoId)
    if (!t) return
    const izq = t.cabinas[indice]
    const der = t.cabinas[indice + 1]
    if (!izq || !der) return
    // el panel siempre va centrado en su pilastra: centrar es repartir el claro
    // parejo entre las dos cabinas, dándole a la pilastra la medida que cuadre
    const media = medidaCercana(PILASTRAS_INTERNAS, (izq.anchoCm + der.anchoCm) / 2 - izq.puerta.anchoCm)
    onPilastra(tramoId, indice + 1, media)
  }

  function agregarCabina(tramoId: string, indice: number) {
    const t = tramoPorId(tramoId)
    if (!t) return
    const vecina = t.cabinas[indice]
    const nuevoAncho = snap(vecina.anchoCm / 2)
    if (nuevoAncho < minimoDe(vecina)) return
    const copia = [...t.cabinas]
    copia[indice] = { ...vecina, anchoCm: nuevoAncho, puerta: { ...vecina.puerta, anchoCm: puertaSugerida(nuevoAncho) } }
    copia.splice(indice + 1, 0, nuevaCabina(snap(vecina.anchoCm - nuevoAncho)))
    onCabinas(tramoId, copia)
  }

  function quitarCabina(tramoId: string, indice: number) {
    const t = tramoPorId(tramoId)
    if (!t || t.cabinas.length <= 1) return
    const fuera = t.cabinas[indice]
    const copia = t.cabinas.filter((_, i) => i !== indice)
    const destino = Math.min(indice, copia.length - 1)
    copia[destino] = { ...copia[destino], anchoCm: snap(copia[destino].anchoCm + fuera.anchoCm) }
    copia[destino].puerta = { ...copia[destino].puerta, anchoCm: puertaSugerida(copia[destino].anchoCm) }
    onCabinas(tramoId, copia)
  }

  const unidadTxt = unidad === 'cm' ? ' cm' : ''

  return (
    <>
      <svg
        ref={svgRef}
        viewBox={`${caja.x} ${caja.y} ${caja.w} ${caja.h}`}
        style={{ width: '100%', maxWidth: 1180, height: 'auto', maxHeight: '100%', touchAction: 'none' }}
        onPointerMove={moviendo}
        onPointerUp={terminarArrastre}
        onPointerCancel={terminarArrastre}
        onClick={() => onSeleccion(null)}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          <pattern id="hatch" width={7} height={7} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1={0} y1={0} x2={0} y2={7} stroke="#8b98a8" strokeWidth={1.6} />
          </pattern>
        </defs>

        {tramos.map((tramo, ti) => {
          const m = marcos[ti]
          if (!m) return null
          const largo = anchoTotal(tramo.cabinas)
          // La cota grande es el CLARO del proyecto, un dato que no se mueve. No se
          // saca de la suma de las piezas: una tira que calza exacto mide un poco más
          // que el claro crudo, porque cada puerta traslapa sobre sus pilastras.
          const claro = tramo.claroCm && tramo.claroCm > 0 ? tramo.claroCm : largo
          // un tramo de puros orinales se dibuja con el fondo de la mampara, no con el de la cabina
          const prof = profundidadDeTramo(tramo, config.profundidadCm)
          // el cuarto accesible: se dibuja hasta el fondo del LUGAR, no de la cabina
          const cuarto = cuartoPmr(tramo, config)
          const profIni = cuarto && cuarto.indice === 0 ? cuarto.profCm : prof
          const horizontal = Math.abs(m.ax) === 1
          const acum: number[] = []
          let u = 0
          for (const c of tramo.cabinas) { acum.push(u); u += c.anchoCm }

          // El muro de fondo sobresale un poco de las piezas por los dos lados,
          // para que no termine al ras del último panel o pilastra.
          const muroA = pt(m, -SOBRA_MURO_CM, -ESPESOR_MURO)
          const muroB = pt(m, largo + SOBRA_MURO_CM, 0)

          return (
            <g key={tramo.id}>
              {/* muro de fondo */}
              <rect
                x={Math.min(muroA.x, muroB.x)}
                y={Math.min(muroA.y, muroB.y)}
                width={horizontal ? Math.abs(muroB.x - muroA.x) : ESPESOR_MURO}
                height={horizontal ? ESPESOR_MURO : Math.abs(muroB.y - muroA.y)}
                fill="url(#hatch)"
                stroke="#5c6a7a"
                strokeWidth={1.2}
              />

              {/* muros laterales del tramo */}
              {tramo.muroInicio && !conEsquina && (() => {
                const a = pt(m, -ESPESOR_MURO, -ESPESOR_MURO)
                const b = pt(m, 0, profIni + SOBRA_MURO_CM)
                return (
                  <rect
                    x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)}
                    width={horizontal ? ESPESOR_MURO : profIni + ESPESOR_MURO + SOBRA_MURO_CM}
                    height={horizontal ? profIni + ESPESOR_MURO + SOBRA_MURO_CM : ESPESOR_MURO}
                    fill="url(#hatch)" stroke="#5c6a7a" strokeWidth={1.2}
                  />
                )
              })()}
              {tramo.muroFin && !conEsquina && (() => {
                const a = pt(m, largo, -ESPESOR_MURO)
                const b = pt(m, largo + ESPESOR_MURO, prof + SOBRA_MURO_CM)
                return (
                  <rect
                    x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)}
                    width={horizontal ? ESPESOR_MURO : prof + ESPESOR_MURO + SOBRA_MURO_CM}
                    height={horizontal ? prof + ESPESOR_MURO + SOBRA_MURO_CM : ESPESOR_MURO}
                    fill="url(#hatch)" stroke="#5c6a7a" strokeWidth={1.2}
                  />
                )
              })()}

              {tramo.cabinas.map((cab, i) => {
                const u0 = acum[i]
                const u1 = u0 + cab.anchoCm
                const esq = pt(m, u0, 0)
                const esq2 = pt(m, u1, prof)
                const selecta = seleccion === cab.id

                // piso de la cabina: sirve de zona de clic
                const pisoX = Math.min(esq.x, esq2.x)
                const pisoY = Math.min(esq.y, esq2.y)
                const pisoW = Math.abs(esq2.x - esq.x)
                const pisoH = Math.abs(esq2.y - esq.y)

                // La puerta cuelga de la PILASTRA, no del límite de la cabina: el
                // límite cae en el centro de la pilastra, así que hay que correrse
                // hasta su cara. Las de los extremos van enteras dentro de su cabina.
                const n = tramo.cabinas.length
                const anchoPil = (j: number) => tramo.pilastras?.[j] ?? config.anchoPilastraCm
                const caraIzq = i === 0 ? anchoPil(0) : anchoPil(i) / 2
                const caraDer = i === n - 1 ? anchoPil(n) : anchoPil(i + 1) / 2

                // pivote de la puerta y hoja
                const pivU = cab.puerta.mano === 'der' ? u1 - caraDer : u0 + caraIzq
                const dir = cab.puerta.mano === 'der' ? -1 : 1
                const hoja = cab.puerta.anchoCm
                const pivote = pt(m, pivU, prof)
                const abre = cab.puerta.apertura === 'afuera' ? prof + hoja * 0.72 : prof - hoja * 0.72
                const extremo = pt(m, pivU + dir * hoja * 0.72, abre)
                const centro = pt(m, (u0 + u1) / 2, prof * 0.42)
                // la cota de la puerta va en horizontal, centrada en el vano
                const cotaPuerta = pt(m, (u0 + caraIzq + (u1 - caraDer)) / 2, prof)

                return (
                  <g key={cab.id}>
                    <rect
                      x={pisoX} y={pisoY} width={pisoW} height={pisoH}
                      fill={selecta ? 'rgba(46,111,217,.12)' : 'transparent'}
                      stroke={selecta ? '#2e6fd9' : 'transparent'}
                      strokeWidth={1.6}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => { e.stopPropagation(); onSeleccion(cab.id) }}
                      onContextMenu={(e) => {
                        e.preventDefault(); e.stopPropagation()
                        onSeleccion(cab.id)
                        setMenu({ tipo: 'cabina', tramoId: tramo.id, indice: i, x: e.clientX, y: e.clientY })
                      }}
                    />

                    {/* cota de la puerta: horizontal, centrada en el vano entre pilastras */}
                    {verCotas && cab.puerta.tipo !== 'ninguna' && cuarto?.indice !== i && (
                      <text
                        x={cotaPuerta.x} y={cotaPuerta.y + (horizontal ? 26 : 0)}
                        textAnchor="middle" fontSize={14} fill="#8fa2bb" pointerEvents="none"
                      >
                        {formatear(cab.puerta.anchoCm, unidad)}
                      </text>
                    )}

                    {/* sanitario: el dibujo real del catálogo, con el fluxómetro contra el muro */}
                    {verInodoros && cab.tipo !== 'vacia' && (() => {
                      const dibujo = cab.tipo === 'orinal' ? ORINAL : cab.tipo === 'regadera' ? REGADERA : WC
                      const alto = cab.tipo === 'orinal' ? ALTO_ORINAL_CM : cab.tipo === 'regadera' ? ALTO_REGADERA_CM : ALTO_WC_CM
                      const ancho = (alto * dibujo.ancho) / dibujo.alto
                      // el sanitario se apoya contra el muro, centrado en su cabina.
                      // En el cuarto accesible se entra por el COSTADO, así que el
                      // inodoro gira: se apoya contra el muro de afuera y mira hacia la
                      // puerta del divisor.
                      const enCuarto = cuarto?.indice === i
                      const esquina = enCuarto
                        ? pt(m, u0 + 6, cuarto.profCm / 2)
                        : pt(m, (u0 + u1) / 2, 6)
                      const giro = (Math.atan2(m.py, m.px) * 180) / Math.PI - 90 + (enCuarto ? -90 : 0)
                      return (
                        <image
                          href={dibujo.src}
                          x={esquina.x - ancho / 2}
                          y={esquina.y}
                          width={ancho}
                          height={alto}
                          pointerEvents="none"
                          transform={`rotate(${giro} ${esquina.x} ${esquina.y})`}
                        />
                      )
                    })()}
                    {cab.tipo === 'accesible' && (() => {
                      // en el cuarto el símbolo va abajo, para no caer sobre el inodoro girado
                      const s = cuarto?.indice === i ? pt(m, (u0 + u1) / 2, cuarto.profCm * 0.86) : centro
                      return (
                      <text
                        x={s.x} y={cuarto?.indice === i ? s.y : s.y + prof * 0.26} textAnchor="middle"
                        fontSize={26} fill="#8b98a8" pointerEvents="none"
                      >♿</text>
                      )
                    })()}


                    {/* puerta: hoja abierta a 45° más el arco de barrido */}
                    {cab.puerta.tipo !== 'ninguna' && cuarto?.indice !== i && (() => {
                      const cerrada = pt(m, pivU + dir * hoja, prof)
                      return (
                        <g
                          style={{ cursor: 'context-menu' }}
                          onContextMenu={(e) => {
                            e.preventDefault(); e.stopPropagation()
                            onSeleccion(cab.id)
                            setMenu({ tipo: 'cabina', tramoId: tramo.id, indice: i, x: e.clientX, y: e.clientY })
                          }}
                        >
                          <path
                            d={`M ${cerrada.x} ${cerrada.y} A ${hoja} ${hoja} 0 0 1 ${extremo.x} ${extremo.y}`}
                            fill="none"
                            stroke="#8fa3c4"
                            strokeWidth={1.4}
                            strokeDasharray="7 5"
                          />
                          <line
                            x1={pivote.x} y1={pivote.y} x2={extremo.x} y2={extremo.y}
                            stroke="#2a4c8f"
                            strokeWidth={2.6}
                            strokeLinecap="round"
                          />
                          <circle cx={pivote.x} cy={pivote.y} r={2.6} fill="#2a4c8f" />
                        </g>
                      )
                    })()}

                    {/* panel divisor a la derecha: esto es lo que se arrastra.
                        En el cuarto accesible ese panel ES el divisor, que va aparte y
                        en piezas: acá se deja solo la zona de agarre, sin la pieza, para
                        no tapar el hueco de la puerta del cuarto. */}
                    {i < tramo.cabinas.length - 1 && (() => {
                      // entre dos orinales el divisor es una mampara, con su propio fondo
                      const profDiv = profundidadDeDivisor(tramo, i, prof, config.mgAnchoCm)
                      const a = pt(m, u1 - grueso / 2, 0)
                      const b = pt(m, u1 + grueso / 2, profDiv)
                      const activo = arrastrando === `${tramo.id}:${i}`
                      return (
                        <g>
                          {cuarto?.indice !== i && (
                            <rect
                              x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)}
                              width={Math.max(Math.abs(b.x - a.x), MIN_PIEZA_PX)} height={Math.max(Math.abs(b.y - a.y), MIN_PIEZA_PX)}
                              fill={activo ? '#2e6fd9' : '#22303f'}
                            />
                          )}
                          {/* zona de agarre, más ancha que la pieza */}
                          <rect
                            x={horizontal ? Math.min(a.x, b.x) - 6 : Math.min(a.x, b.x)}
                            y={horizontal ? Math.min(a.y, b.y) : Math.min(a.y, b.y) - 6}
                            width={horizontal ? 14 : Math.abs(b.x - a.x)}
                            height={horizontal ? Math.abs(b.y - a.y) : 14}
                            fill="transparent"
                            style={{ cursor: horizontal ? 'col-resize' : 'row-resize' }}
                            onPointerDown={(e) => empezarArrastre(e, tramo, i, m)}
                            onContextMenu={(e) => {
                              e.preventDefault(); e.stopPropagation()
                              setMenu({ tipo: 'panel', tramoId: tramo.id, indice: i, x: e.clientX, y: e.clientY })
                            }}
                          />
                          {activo && (
                            <circle cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2} r={9} fill="#2e6fd9" opacity={0.28} />
                          )}
                          {/* cota del panel: va en vertical, a lo largo de la pieza */}
                          {verCotas && cuarto?.indice !== i && (() => {
                            const c = pt(m, u1, profDiv * 0.5)
                            return (
                              <text
                                x={c.x} y={c.y} textAnchor="middle" fontSize={14} fill="#7f8fa3"
                                pointerEvents="none"
                                transform={`rotate(${horizontal ? -90 : 0} ${c.x} ${c.y})`}
                              >
                                {formatear(profDiv, unidad)}
                              </text>
                            )
                          })()}
                        </g>
                      )
                    })()}

                    {/* extremos: panel de cierre cuando no hay muro, pilastra siempre */}
                    {i === 0 && !tramo.muroInicio && (() => {
                      const a = pt(m, -grueso / 2, 0)
                      const b = pt(m, grueso / 2, profIni)
                      return (
                        <rect
                          x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)}
                          width={Math.max(Math.abs(b.x - a.x), MIN_PIEZA_PX)} height={Math.max(Math.abs(b.y - a.y), MIN_PIEZA_PX)}
                          fill="#22303f" pointerEvents="none"
                        />
                      )
                    })()}
                    {i === tramo.cabinas.length - 1 && !tramo.muroFin && (() => {
                      const a = pt(m, largo - grueso / 2, 0)
                      const b = pt(m, largo + grueso / 2, prof)
                      return (
                        <rect
                          x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)}
                          width={Math.max(Math.abs(b.x - a.x), MIN_PIEZA_PX)} height={Math.max(Math.abs(b.y - a.y), MIN_PIEZA_PX)}
                          fill="#22303f" pointerEvents="none"
                        />
                      )
                    })()}

                    {/* cota de la cabina */}
                    {verCotas && (() => {
                      const c = pt(m, (u0 + u1) / 2, -ESPESOR_MURO - 22)
                      const ini = pt(m, u0, -ESPESOR_MURO - 14)
                      const fin = pt(m, u1, -ESPESOR_MURO - 14)
                      const rot = horizontal ? 0 : m.ay > 0 ? 90 : -90
                      return (
                        <g pointerEvents="none">
                          <line x1={ini.x} y1={ini.y} x2={fin.x} y2={fin.y} stroke="#4a5a72" strokeWidth={1} />
                          <line x1={ini.x} y1={ini.y - 4} x2={ini.x} y2={ini.y + 4} stroke="#4a5a72" strokeWidth={1} transform={horizontal ? undefined : `rotate(90 ${ini.x} ${ini.y})`} />
                          <line x1={fin.x} y1={fin.y - 4} x2={fin.x} y2={fin.y + 4} stroke="#4a5a72" strokeWidth={1} transform={horizontal ? undefined : `rotate(90 ${fin.x} ${fin.y})`} />
                          {/* la cota se escribe: al cambiarla se busca la pilastra que deje
                              la cabina de esa medida, sin tocar la puerta */}
                          <foreignObject x={c.x - 46} y={c.y - 20} width={92} height={26}
                            transform={rot ? `rotate(${rot} ${c.x} ${c.y})` : undefined}
                            pointerEvents="auto"
                          >
                            <input
                              className="cota-editable"
                              value={
                                cotaEnCurso?.clave === `${tramo.id}:${i}`
                                  ? cotaEnCurso.texto
                                  : formatear(cab.anchoCm, unidad)
                              }
                              style={{ fontWeight: selecta ? 700 : 400 }}
                              title="Ancho de la cabina: escribí la medida y dale Enter"
                              onFocus={() => onSeleccion(cab.id)}
                              onChange={(ev) => setCotaEnCurso({ clave: `${tramo.id}:${i}`, texto: ev.target.value })}
                              onBlur={() => {
                                if (cotaEnCurso?.clave === `${tramo.id}:${i}`) pedirAncho(tramo.id, i, cotaEnCurso.texto)
                                setCotaEnCurso(null)
                              }}
                              onKeyDown={(ev) => {
                                if (ev.key === 'Enter') ev.currentTarget.blur()
                                if (ev.key === 'Escape') { setCotaEnCurso(null); ev.currentTarget.blur() }
                              }}
                            />
                          </foreignObject>
                        </g>
                      )
                    })()}
                  </g>
                )
              })}

              {/* línea de frente y pilastras vistas en planta */}
              {tramo.cabinas.length > 0 && (() => {
                // la línea arranca DESPUÉS del cuarto accesible: adentro del cuarto
                // no hay frente de cabina
                const f0 = pt(m, cuarto ? cuarto.hastaCm : 0, prof)
                const f1 = pt(m, largo, prof)
                const cortes = [0, ...acum.slice(1), largo]
                return (
                  <g>
                    <line
                      x1={f0.x} y1={f0.y} x2={f1.x} y2={f1.y}
                      stroke="#9aa8b8" strokeWidth={1.2} strokeDasharray="10 7" pointerEvents="none"
                    />
                    {cortes.map((u2, k) => {
                      // La pilastra se dibuja con SU ancho (el de la pieza, 10–85 cm según
                      // catálogo), no con el espesor del material: son cosas distintas y
                      // dibujarla de 1.27 cm la volvía invisible en planta.
                      const ancho = Math.max(tramo.pilastras?.[k] ?? config.anchoPilastraCm, grueso)
                      // en los extremos se corre hacia adentro para no invadir el muro
                      const centro =
                        k === 0 ? u2 + ancho / 2 : k === cortes.length - 1 ? u2 - ancho / 2 : u2
                      const a = pt(m, centro - ancho / 2, prof - grueso)
                      const b = pt(m, centro + ancho / 2, prof)
                      const extremo = k === 0 || k === cortes.length - 1
                      const activa = arrastrando === `pil:${tramo.id}:${k}`
                      // En planta la pilastra es una tira del grueso del material: en
                      // pantalla quedan 3 o 4 píxeles, imposibles de agarrar. Por eso
                      // encima va una zona de agarre invisible, mucho más alta.
                      const g0 = pt(m, centro - ancho / 2, prof - AGARRE_CM)
                      const g1 = pt(m, centro + ancho / 2, prof + AGARRE_CM)
                      const cursor = horizontal ? 'ew-resize' : 'ns-resize'
                      return (
                        <g key={k}>
                          <rect
                            x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)}
                            width={Math.max(Math.abs(b.x - a.x), MIN_PIEZA_PX)} height={Math.max(Math.abs(b.y - a.y), MIN_PIEZA_PX)}
                            fill={activa ? '#2e6fd9' : '#3c4e63'} stroke="#5f7590" strokeWidth={0.5}
                            pointerEvents="none"
                          />
                          <rect
                            x={Math.min(g0.x, g1.x)} y={Math.min(g0.y, g1.y)}
                            width={Math.max(Math.abs(g1.x - g0.x), 8)} height={Math.max(Math.abs(g1.y - g0.y), 8)}
                            fill="transparent" pointerEvents="auto" style={{ cursor }}
                            onPointerDown={(e) => empezarArrastrePilastra(e, tramo, k, m, ancho, extremo)}
                          >
                            <title>{`Pilastra ${ancho} cm — arrastra para cambiar la medida`}</title>
                          </rect>
                          {verCotas && (
                            <text
                              x={(a.x + b.x) / 2}
                              y={(a.y + b.y) / 2 + (horizontal ? 26 : 0)}
                              textAnchor="middle" fontSize={14} fill="#7f8fa3" pointerEvents="none"
                            >
                              {formatear(ancho, unidad)}
                            </text>
                          )}
                        </g>
                      )
                    })}
                  </g>
                )
              })()}

              {/* ------------------------------------------------------------
                  El cuarto accesible. No es una cabina más ancha: llega hasta
                  el fondo del LUGAR y lo cierra un divisor modulado a lo largo
                  de esa profundidad, con la puerta del cuarto adentro. Por eso
                  el PMR se modula en las dos direcciones.
                  ------------------------------------------------------------ */}
              {cuarto && (() => {
                const u = cuarto.hastaCm
                const profC = cuarto.profCm
                // la pared opuesta del lugar: contra ella cierra el cuarto por el frente
                const pa = pt(m, cuarto.desdeCm - (tramo.muroInicio ? ESPESOR_MURO : 0), profC)
                const pb = pt(m, largo + SOBRA_MURO_CM, profC + ESPESOR_MURO)
                // la cota de la profundidad va por fuera del muro de arranque
                const c0 = pt(m, cuarto.desdeCm - ESPESOR_MURO - 24, 0)
                const c1 = pt(m, cuarto.desdeCm - ESPESOR_MURO - 24, profC)
                return (
                  <g pointerEvents="none">
                    <rect
                      x={Math.min(pa.x, pb.x)} y={Math.min(pa.y, pb.y)}
                      width={horizontal ? Math.abs(pb.x - pa.x) : ESPESOR_MURO}
                      height={horizontal ? ESPESOR_MURO : Math.abs(pb.y - pa.y)}
                      fill="url(#hatch)" stroke="#5c6a7a" strokeWidth={1.2}
                    />

                    {cuarto.divisor.map((pieza) => {
                      const largoPieza = pieza.hastaCm - pieza.desdeCm
                      const a = pt(m, u - grueso / 2, pieza.desdeCm)
                      const b = pt(m, u + grueso / 2, pieza.hastaCm)
                      const medio = pt(m, u, (pieza.desdeCm + pieza.hastaCm) / 2)

                      if (pieza.tipo === 'puerta') {
                        // la puerta del cuarto abre hacia el pasillo, no hacia adentro
                        const pivote = pt(m, u, pieza.desdeCm)
                        const cerrada = pt(m, u, pieza.hastaCm)
                        const extremo = pt(m, u + largoPieza * 0.72, pieza.desdeCm + largoPieza * 0.72)
                        return (
                          <g key={pieza.tipo}>
                            <path
                              d={`M ${cerrada.x} ${cerrada.y} A ${largoPieza} ${largoPieza} 0 0 0 ${extremo.x} ${extremo.y}`}
                              fill="none" stroke="#8fa3c4" strokeWidth={1.4} strokeDasharray="7 5"
                            />
                            <line
                              x1={pivote.x} y1={pivote.y} x2={extremo.x} y2={extremo.y}
                              stroke="#2a4c8f" strokeWidth={2.6} strokeLinecap="round"
                            />
                            <circle cx={pivote.x} cy={pivote.y} r={2.6} fill="#2a4c8f" />
                            {verCotas && (
                              <text
                                x={medio.x} y={medio.y} textAnchor="middle" fontSize={14} fill="#8fa3c4"
                                transform={`rotate(${horizontal ? -90 : 0} ${medio.x} ${medio.y})`}
                              >
                                {`PT ${formatear(largoPieza, unidad)}`}
                              </text>
                            )}
                          </g>
                        )
                      }

                      return (
                        <g key={pieza.tipo}>
                          <rect
                            x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)}
                            width={Math.max(Math.abs(b.x - a.x), MIN_PIEZA_PX)}
                            height={Math.max(Math.abs(b.y - a.y), MIN_PIEZA_PX)}
                            fill="#22303f"
                          />
                          {verCotas && (
                            <text
                              x={medio.x} y={medio.y} textAnchor="middle" fontSize={14} fill="#7f8fa3"
                              transform={`rotate(${horizontal ? -90 : 0} ${medio.x} ${medio.y})`}
                            >
                              {formatear(largoPieza, unidad)}
                            </text>
                          )}
                        </g>
                      )
                    })}

                    {verCotas && (
                      <>
                        <line x1={c0.x} y1={c0.y} x2={c1.x} y2={c1.y} stroke="#4a5a72" strokeWidth={1} />
                        <text
                          x={(c0.x + c1.x) / 2} y={(c0.y + c1.y) / 2 - 6} textAnchor="middle"
                          fontSize={14} fill="#8fa2bb"
                          transform={`rotate(${horizontal ? -90 : 0} ${(c0.x + c1.x) / 2} ${(c0.y + c1.y) / 2})`}
                        >
                          {`Fondo del lugar ${formatear(profC, unidad)}`}
                        </text>
                      </>
                    )}
                  </g>
                )
              })()}

              {/* cota total del tramo */}
              {verCotas && tramo.cabinas.length > 0 && (() => {
                const c = pt(m, claro / 2, -ESPESOR_MURO - 52)
                const ini = pt(m, 0, -ESPESOR_MURO - 44)
                const fin = pt(m, claro, -ESPESOR_MURO - 44)
                const rot = horizontal ? 0 : m.ay > 0 ? 90 : -90
                return (
                  <g pointerEvents="none">
                    <line x1={ini.x} y1={ini.y} x2={fin.x} y2={fin.y} stroke="#2c3d52" strokeWidth={1.2} />
                    <text
                      x={c.x} y={c.y} textAnchor="middle" fontSize={19}
                      fontFamily="ui-monospace, Consolas, monospace" fill="#1b2430" fontWeight={600}
                      transform={rot ? `rotate(${rot} ${c.x} ${c.y})` : undefined}
                    >
                      {formatear(claro, unidad)}{unidadTxt}
                    </text>
                  </g>
                )
              })()}
            </g>
          )
        })}
      </svg>

      {menu && menu.tipo === 'cabina' && (() => {
        const t = tramoPorId(menu.tramoId)
        const cab = t?.cabinas[menu.indice]
        if (!t || !cab) return null
        const cerrar = () => setMenu(null)
        return (
          <Menu
            pos={{ x: menu.x, y: menu.y }}
            titulo={`Cabina ${menu.indice + 1}`}
            detalle={`${formatear(cab.anchoCm, unidad)}${unidadTxt}`}
            onCerrar={cerrar}
          >
            <Grupo>Ancho de puerta</Grupo>
            <div className="anchos">
              {puertasPosibles(cab.anchoCm, pais)
                .filter(({ ancho }) => (cab.tipo === 'accesible' ? ancho >= PUERTA_ACCESIBLE_MIN : true))
                .map(({ ancho, cabe }) => (
                <button
                  key={ancho}
                  className={cab.puerta.anchoCm === ancho ? 'on' : ''}
                  disabled={!cabe}
                  title={cabe ? `Puerta de ${ancho} cm` : `No cabe en ${cab.anchoCm} cm`}
                  onClick={() => { onPuerta(menu.tramoId, menu.indice, ancho); cerrar() }}
                  type="button"
                >
                  {ancho}
                </button>
              ))}
            </div>
            <Raya />
            <Grupo>Apertura</Grupo>
            <Item activo={cab.puerta.apertura === 'adentro'} onClick={() => { cambiarPuerta(menu.tramoId, menu.indice, { apertura: 'adentro' }); cerrar() }}>
              Abre hacia adentro
            </Item>
            <Item activo={cab.puerta.apertura === 'afuera'} onClick={() => { cambiarPuerta(menu.tramoId, menu.indice, { apertura: 'afuera' }); cerrar() }}>
              Abre hacia afuera
            </Item>
            <Raya />
            <Grupo>Bisagra</Grupo>
            <Item activo={cab.puerta.mano === 'izq'} onClick={() => { cambiarPuerta(menu.tramoId, menu.indice, { mano: 'izq' }); cerrar() }}>
              A la izquierda
            </Item>
            <Item activo={cab.puerta.mano === 'der'} onClick={() => { cambiarPuerta(menu.tramoId, menu.indice, { mano: 'der' }); cerrar() }}>
              A la derecha
            </Item>
            <Raya />
            <Grupo>Tipo de cabina</Grupo>
            <Item activo={cab.tipo === 'normal'} onClick={() => { cambiarCabina(menu.tramoId, menu.indice, { tipo: 'normal' }); cerrar() }}>Inodoro</Item>
            <Item
              activo={cab.tipo === 'accesible'}
              disabled={cab.anchoCm < 150 && cab.tipo !== 'accesible'}
              onClick={() => { cambiarCabina(menu.tramoId, menu.indice, { tipo: 'accesible' }); cerrar() }}
            >
              Accesible {cab.anchoCm < 150 && cab.tipo !== 'accesible' ? '(necesita 150 cm)' : ''}
            </Item>
            <Item activo={cab.tipo === 'vacia'} onClick={() => { cambiarCabina(menu.tramoId, menu.indice, { tipo: 'vacia' }); cerrar() }}>Vacía</Item>
            <Item activo={cab.tipo === 'regadera'} onClick={() => { cambiarCabina(menu.tramoId, menu.indice, { tipo: 'regadera' }); cerrar() }}>Regadera</Item>
            <Item activo={cab.tipo === 'orinal'} onClick={() => { cambiarCabina(menu.tramoId, menu.indice, { tipo: 'orinal', puerta: { ...cab.puerta, tipo: 'ninguna' } }); cerrar() }}>Orinal</Item>
            <Raya />
            <Grupo>Puerta</Grupo>
            <Item activo={cab.puerta.tipo === 'puerta'} onClick={() => { cambiarPuerta(menu.tramoId, menu.indice, { tipo: 'puerta' }); cerrar() }}>Con puerta</Item>
            <Item activo={cab.puerta.tipo === 'ninguna'} onClick={() => { cambiarPuerta(menu.tramoId, menu.indice, { tipo: 'ninguna' }); cerrar() }}>Sin puerta</Item>
            <Raya />
            <Item onClick={() => { agregarCabina(menu.tramoId, menu.indice); cerrar() }}>Partir en dos cabinas</Item>
            <Item disabled={t.cabinas.length <= 1} onClick={() => { quitarCabina(menu.tramoId, menu.indice); cerrar() }}>
              Quitar esta cabina
            </Item>
          </Menu>
        )
      })()}

      {menu && menu.tipo === 'panel' && (() => {
        const t = tramoPorId(menu.tramoId)
        const cab = t?.cabinas[menu.indice]
        if (!t || !cab) return null
        const cerrar = () => setMenu(null)
        const der = t.cabinas[menu.indice + 1]
        return (
          <Menu
            pos={{ x: menu.x, y: menu.y }}
            titulo={`Panel entre ${menu.indice + 1} y ${menu.indice + 2}`}
            detalle={`${formatear(cab.anchoCm, unidad)} / ${formatear(der.anchoCm, unidad)}`}
            onCerrar={cerrar}
          >
            <Item onClick={() => { centrarPanel(menu.tramoId, menu.indice); cerrar() }} atajo="=">
              Centrar entre las dos cabinas
            </Item>
            <Raya />
            <Grupo>Recorte del panel</Grupo>
            <Item activo={cab.panel.recorte === 'ninguno'} onClick={() => { cambiarCabina(menu.tramoId, menu.indice, { panel: { ...cab.panel, recorte: 'ninguno' } }); cerrar() }}>Sin recorte</Item>
            <Item activo={cab.panel.recorte === 'simple'} onClick={() => { cambiarCabina(menu.tramoId, menu.indice, { panel: { ...cab.panel, recorte: 'simple' } }); cerrar() }}>Recorte simple</Item>
            <Item activo={cab.panel.recorte === 'doble'} onClick={() => { cambiarCabina(menu.tramoId, menu.indice, { panel: { ...cab.panel, recorte: 'doble' } }); cerrar() }}>Recorte doble</Item>
            <Raya />
            <Item
              activo={cab.panel.refuerzoBarra}
              onClick={() => { cambiarCabina(menu.tramoId, menu.indice, { panel: { ...cab.panel, refuerzoBarra: !cab.panel.refuerzoBarra } }); cerrar() }}
            >
              Reforzado para barra de apoyo
            </Item>
          </Menu>
        )
      })()}
    </>
  )
}
