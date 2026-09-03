import { useMemo, useRef, useState } from 'react'
import type { Cabina, Config, Tramo } from '../types'
import { puertasPosibles, tipologia } from '../catalog'
import { anchoTotal, minimoDe, moverDivisor, nuevaCabina, puertaSugerida, snap } from '../modulacion'
import { Grupo, Item, Menu, Raya } from './Menu'
import { cajaDelPlano, ESPESOR_MURO, marcosDe, profundidadDeTramo, pt, type Marco } from '../geometria'
import { ALTO_ORINAL_CM, ALTO_WC_CM, ORINAL, WC } from '../assets/sanitarios'

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
  unidad: 'cm' | 'in'
  verInodoros: boolean
  verCotas: boolean
  seleccion: string | null
  onSeleccion: (id: string | null) => void
  onCabinas: (tramoId: string, cabinas: Cabina[]) => void
}

type MenuEstado =
  | { tipo: 'cabina'; tramoId: string; indice: number; x: number; y: number }
  | { tipo: 'panel'; tramoId: string; indice: number; x: number; y: number }
  | null

export default function EditorPlano({
  tramos,
  config,
  unidad,
  verInodoros,
  verCotas,
  seleccion,
  onSeleccion,
  onCabinas,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [menu, setMenu] = useState<MenuEstado>(null)
  const [arrastrando, setArrastrando] = useState<string | null>(null)
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

  const prof = config.profundidadCm
  const marcos = useMemo(() => marcosDe(config.tipologia, tramos, prof), [config.tipologia, tramos, prof])
  /** en esquina, nicho y U los muros de fondo de cada tramo ya forman el ángulo:
   *  dibujar además los laterales metería una pared en medio del baño */
  const conEsquina = tipologia(config.tipologia).esquinaCompartida
  /** grueso con el que se dibujan panel y pilastra: sale del espesor del material */
  const grueso = Math.max(config.espesorMm / 10, 0.3)

  const caja = useMemo(() => cajaDelPlano(tramos, marcos, prof), [tramos, marcos, prof])

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

  function moviendo(e: React.PointerEvent) {
    const a = arrastre.current
    if (!a) return
    const dx = (e.clientX - a.x0) / a.escala
    const dy = (e.clientY - a.y0) / a.escala
    const deltaCm = dx * a.ax + dy * a.ay
    const nuevas = moverDivisor(a.cabinas, a.indice, deltaCm)
    onCabinas(a.tramoId, nuevas)
  }

  function terminarArrastre(e: React.PointerEvent) {
    if (arrastre.current) {
      try { (e.target as Element).releasePointerCapture(e.pointerId) } catch { /* ya liberado */ }
    }
    arrastre.current = null
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

  function centrarPanel(tramoId: string, indice: number) {
    const t = tramoPorId(tramoId)
    if (!t) return
    const izq = t.cabinas[indice]
    const der = t.cabinas[indice + 1]
    if (!izq || !der) return
    const suma = izq.anchoCm + der.anchoCm
    const mitad = snap(suma / 2)
    onCabinas(tramoId, moverDivisor(t.cabinas, indice, mitad - izq.anchoCm))
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
          // un tramo de puros orinales se dibuja con el fondo de la mampara, no con el de la cabina
          const prof = profundidadDeTramo(tramo, config.profundidadCm)
          const horizontal = Math.abs(m.ax) === 1
          const acum: number[] = []
          let u = 0
          for (const c of tramo.cabinas) { acum.push(u); u += c.anchoCm }

          const muroA = pt(m, 0, -ESPESOR_MURO)
          const muroB = pt(m, largo, 0)

          return (
            <g key={tramo.id}>
              {/* muro de fondo */}
              <rect
                x={Math.min(muroA.x, muroB.x)}
                y={Math.min(muroA.y, muroB.y)}
                width={horizontal ? largo : ESPESOR_MURO}
                height={horizontal ? ESPESOR_MURO : largo}
                fill="url(#hatch)"
                stroke="#5c6a7a"
                strokeWidth={1.2}
              />

              {/* muros laterales del tramo */}
              {tramo.muroInicio && !conEsquina && (() => {
                const a = pt(m, -ESPESOR_MURO, -ESPESOR_MURO)
                const b = pt(m, 0, prof)
                return (
                  <rect
                    x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)}
                    width={horizontal ? ESPESOR_MURO : prof + ESPESOR_MURO}
                    height={horizontal ? prof + ESPESOR_MURO : ESPESOR_MURO}
                    fill="url(#hatch)" stroke="#5c6a7a" strokeWidth={1.2}
                  />
                )
              })()}
              {tramo.muroFin && !conEsquina && (() => {
                const a = pt(m, largo, -ESPESOR_MURO)
                const b = pt(m, largo + ESPESOR_MURO, prof)
                return (
                  <rect
                    x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)}
                    width={horizontal ? ESPESOR_MURO : prof + ESPESOR_MURO}
                    height={horizontal ? prof + ESPESOR_MURO : ESPESOR_MURO}
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

                // pivote de la puerta y hoja
                const pivU = cab.puerta.mano === 'der' ? u1 : u0
                const dir = cab.puerta.mano === 'der' ? -1 : 1
                const hoja = cab.puerta.anchoCm
                const pivote = pt(m, pivU, prof)
                const abre = cab.puerta.apertura === 'afuera' ? prof + hoja * 0.72 : prof - hoja * 0.72
                const extremo = pt(m, pivU + dir * hoja * 0.72, abre)
                const centro = pt(m, (u0 + u1) / 2, prof * 0.42)

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

                    {/* sanitario: el dibujo real del catálogo, con el fluxómetro contra el muro */}
                    {verInodoros && cab.inodoro && cab.tipo !== 'regadera' && (() => {
                      const dibujo = cab.tipo === 'orinal' ? ORINAL : WC
                      const alto = cab.tipo === 'orinal' ? ALTO_ORINAL_CM : ALTO_WC_CM
                      const ancho = (alto * dibujo.ancho) / dibujo.alto
                      // el sanitario se apoya contra el muro, centrado en su cabina
                      const esquina = pt(m, (u0 + u1) / 2, 6)
                      const giro = (Math.atan2(m.py, m.px) * 180) / Math.PI - 90
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
                    {cab.tipo === 'accesible' && (
                      <text
                        x={centro.x} y={centro.y + prof * 0.26} textAnchor="middle"
                        fontSize={26} fill="#8b98a8" pointerEvents="none"
                      >♿</text>
                    )}
                    {cab.tipo === 'regadera' && (
                      <text x={centro.x} y={centro.y} textAnchor="middle" fontSize={22} fill="#8b98a8" pointerEvents="none">🚿</text>
                    )}

                    {/* puerta: hoja abierta a 45° más el arco de barrido */}
                    {cab.puerta.tipo !== 'ninguna' && (() => {
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
                            stroke={cab.puerta.tipo === 'cortina' ? '#7c8ea1' : '#2a4c8f'}
                            strokeWidth={4.5}
                            strokeDasharray={cab.puerta.tipo === 'cortina' ? '6 4' : undefined}
                            strokeLinecap="round"
                          />
                          <circle cx={pivote.x} cy={pivote.y} r={3.8} fill="#2a4c8f" />
                        </g>
                      )
                    })()}

                    {/* panel divisor a la derecha: esto es lo que se arrastra */}
                    {i < tramo.cabinas.length - 1 && (() => {
                      const a = pt(m, u1 - grueso / 2, 0)
                      const b = pt(m, u1 + grueso / 2, prof)
                      const activo = arrastrando === `${tramo.id}:${i}`
                      return (
                        <g>
                          <rect
                            x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)}
                            width={Math.max(Math.abs(b.x - a.x), 3)} height={Math.max(Math.abs(b.y - a.y), 3)}
                            fill={activo ? '#2e6fd9' : '#22303f'}
                          />
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
                        </g>
                      )
                    })()}

                    {/* extremos: panel de cierre cuando no hay muro, pilastra siempre */}
                    {i === 0 && !tramo.muroInicio && (() => {
                      const a = pt(m, -grueso / 2, 0)
                      const b = pt(m, grueso / 2, prof)
                      return (
                        <rect
                          x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)}
                          width={Math.max(Math.abs(b.x - a.x), 3)} height={Math.max(Math.abs(b.y - a.y), 3)}
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
                          width={Math.max(Math.abs(b.x - a.x), 3)} height={Math.max(Math.abs(b.y - a.y), 3)}
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
                          <text
                            x={c.x} y={c.y} textAnchor="middle" fontSize={17}
                            fontFamily="ui-monospace, Consolas, monospace"
                            fill={selecta ? '#15274b' : '#2c3d52'}
                            fontWeight={selecta ? 700 : 400}
                            transform={rot ? `rotate(${rot} ${c.x} ${c.y})` : undefined}
                          >
                            {formatear(cab.anchoCm, unidad)}{unidad === 'cm' ? '' : ''}
                          </text>
                        </g>
                      )
                    })()}
                  </g>
                )
              })}

              {/* línea de frente y pilastras vistas en planta */}
              {tramo.cabinas.length > 0 && (() => {
                const f0 = pt(m, 0, prof)
                const f1 = pt(m, largo, prof)
                const cortes = [0, ...acum.slice(1), largo]
                return (
                  <g pointerEvents="none">
                    <line x1={f0.x} y1={f0.y} x2={f1.x} y2={f1.y} stroke="#9aa8b8" strokeWidth={1.2} strokeDasharray="10 7" />
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
                      return (
                        <rect
                          key={k}
                          x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)}
                          width={Math.max(Math.abs(b.x - a.x), 3)} height={Math.max(Math.abs(b.y - a.y), 3)}
                          fill="#3c4e63" stroke="#5f7590" strokeWidth={0.8}
                        />
                      )
                    })}
                  </g>
                )
              })()}

              {/* cota total del tramo */}
              {verCotas && tramo.cabinas.length > 0 && (() => {
                const c = pt(m, largo / 2, -ESPESOR_MURO - 52)
                const ini = pt(m, 0, -ESPESOR_MURO - 44)
                const fin = pt(m, largo, -ESPESOR_MURO - 44)
                const rot = horizontal ? 0 : m.ay > 0 ? 90 : -90
                return (
                  <g pointerEvents="none">
                    <line x1={ini.x} y1={ini.y} x2={fin.x} y2={fin.y} stroke="#2c3d52" strokeWidth={1.2} />
                    <text
                      x={c.x} y={c.y} textAnchor="middle" fontSize={19}
                      fontFamily="ui-monospace, Consolas, monospace" fill="#1b2430" fontWeight={600}
                      transform={rot ? `rotate(${rot} ${c.x} ${c.y})` : undefined}
                    >
                      {formatear(largo, unidad)}{unidadTxt}
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
              {puertasPosibles(cab.anchoCm).map(({ ancho, cabe }) => (
                <button
                  key={ancho}
                  className={cab.puerta.anchoCm === ancho ? 'on' : ''}
                  disabled={!cabe}
                  title={cabe ? `Puerta de ${ancho} cm` : `No cabe en ${cab.anchoCm} cm`}
                  onClick={() => { cambiarPuerta(menu.tramoId, menu.indice, { anchoCm: ancho }); cerrar() }}
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
            <Item activo={cab.tipo === 'normal'} onClick={() => { cambiarCabina(menu.tramoId, menu.indice, { tipo: 'normal' }); cerrar() }}>Normal</Item>
            <Item
              activo={cab.tipo === 'accesible'}
              disabled={cab.anchoCm < 150 && cab.tipo !== 'accesible'}
              onClick={() => { cambiarCabina(menu.tramoId, menu.indice, { tipo: 'accesible' }); cerrar() }}
            >
              Accesible {cab.anchoCm < 150 && cab.tipo !== 'accesible' ? '(necesita 150 cm)' : ''}
            </Item>
            <Item activo={cab.tipo === 'ambulatoria'} onClick={() => { cambiarCabina(menu.tramoId, menu.indice, { tipo: 'ambulatoria' }); cerrar() }}>Ambulatoria</Item>
            <Item activo={cab.tipo === 'regadera'} onClick={() => { cambiarCabina(menu.tramoId, menu.indice, { tipo: 'regadera', puerta: { ...cab.puerta, tipo: 'cortina' } }); cerrar() }}>Regadera</Item>
            <Item activo={cab.tipo === 'orinal'} onClick={() => { cambiarCabina(menu.tramoId, menu.indice, { tipo: 'orinal', puerta: { ...cab.puerta, tipo: 'ninguna' } }); cerrar() }}>Orinal</Item>
            <Raya />
            <Grupo>Puerta y sanitario</Grupo>
            <Item activo={cab.puerta.tipo === 'puerta'} onClick={() => { cambiarPuerta(menu.tramoId, menu.indice, { tipo: 'puerta' }); cerrar() }}>Con puerta</Item>
            <Item activo={cab.puerta.tipo === 'cortina'} onClick={() => { cambiarPuerta(menu.tramoId, menu.indice, { tipo: 'cortina' }); cerrar() }}>Con cortina</Item>
            <Item activo={cab.puerta.tipo === 'ninguna'} onClick={() => { cambiarPuerta(menu.tramoId, menu.indice, { tipo: 'ninguna' }); cerrar() }}>Sin puerta</Item>
            <Item activo={cab.inodoro} onClick={() => { cambiarCabina(menu.tramoId, menu.indice, { inodoro: !cab.inodoro }); cerrar() }}>Dibujar inodoro</Item>
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
