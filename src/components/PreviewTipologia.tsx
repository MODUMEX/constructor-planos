import type { TipologiaId } from '../types'

/**
 * Dibujo esquemático de cada tipología, para que el vendedor vea
 * cómo queda antes de elegirla. Muro rayado, pilastras negras,
 * arco de puerta azul.
 *
 * Lleva marcados el CLARO y la PROFUNDIDAD, que son las dos medidas que hay que
 * tomar en obra y las que después pide la app. Sin eso había que explicárselo
 * por teléfono a cada distribuidor.
 */

const MURO = '#2b3542'
const PIEZA = '#15274b'
const ARCO = '#5f92dd'
const COTA = '#7c879a'

/** profundidad de cabina en el esquema */
const D = 26
/** fondo de la cabina de movilidad reducida en las tipologías "variación panel" */
const DA = 35
/** la cara interna de la pared de fondo: de ahí arranca la tira */
const Y0 = 17
/** el ancho es el mismo en todas para que se vean a la misma escala */
const W = 132

/**
 * Hasta dónde llega el dibujo de cada tipología.
 *
 * El alto cambia porque el cuarto accesible toma todo el fondo del lugar y una
 * tira de orinales casi nada.
 */
const ALTO: Record<TipologiaId, number> = {
  RECTA_ENTRE_MUROS: 54,
  RECTA_MURO_IZQ: 54,
  RECTA_MURO_DER: 54,
  ISLA: 54,
  PMR: 88,
  ORINALES: 50,
  ORINALES_ENTRE_MUROS: 50,
  // llevan el barrido de la puerta del accesible, que es de 100 cm y se abre
  // entera hacia el pasillo
  MR_PANEL_E: 86,
  MR_PANEL_L: 86,
  MR_PANEL_U: 86,
}

function Muro({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return <rect x={x} y={y} width={w} height={h} fill="url(#rayado)" stroke={MURO} strokeWidth={1} />
}

function Panel({ x, y = Y0, d = D }: { x: number; y?: number; d?: number }) {
  return <rect x={x - 1.2} y={y} width={2.4} height={d} fill={PIEZA} />
}

/** cuánto se corre la punta de una hoja abierta a 45 grados */
const ABIERTA_45 = Math.SQRT1_2

/**
 * La hoja de una puerta abierta, con su arco de barrido. Abre 45 grados desde
 * su propio vano, igual que en el plano que después sale impreso.
 *
 * El arco va de la posición CERRADA a la abierta, no desde el gozne: dibujado
 * desde el gozne la cuerda daba el doble y la puerta se veía abierta de par en
 * par.
 *
 * `eje` dice sobre qué línea está cerrada: las de cabina van sobre el frente,
 * que es horizontal; la del cuarto accesible va sobre el divisor, que corre a
 * lo hondo. `dx` / `dy` son hacia dónde barre.
 */
function Puerta({
  x,
  y,
  hoja,
  dx,
  dy = -1,
  eje = 'x',
}: {
  /** el gozne */
  x: number
  y: number
  hoja: number
  dx: 1 | -1
  dy?: 1 | -1
  eje?: 'x' | 'y'
}) {
  const cerradaX = eje === 'x' ? x + dx * hoja : x
  const cerradaY = eje === 'x' ? y : y + dy * hoja
  const abiertaX = x + dx * hoja * ABIERTA_45
  const abiertaY = y + dy * hoja * ABIERTA_45
  const barrido = eje === 'x' ? (dx * dy > 0 ? 1 : 0) : (dx * dy > 0 ? 0 : 1)
  return (
    <g>
      <path
        d={`M ${cerradaX} ${cerradaY} A ${hoja} ${hoja} 0 0 ${barrido} ${abiertaX} ${abiertaY}`}
        fill="none"
        stroke={ARCO}
        strokeWidth={0.9}
        strokeDasharray="2 1.6"
      />
      <line x1={x} y1={y} x2={abiertaX} y2={abiertaY} stroke={ARCO} strokeWidth={1.5} />
    </g>
  )
}

/**
 * Una tira de cabinas.
 *
 * `muroIzq` / `muroDer` dicen si ese extremo topa contra pared, que es lo único
 * que cambia entre las cuatro tipologías rectas. De ahí sale dónde va panel: en
 * cada junta entre cabinas siempre, y en los extremos SOLO en el que queda
 * abierto, porque contra la pared no va panel de cierre.
 */
function Tira({
  x0,
  ancho,
  n,
  muroIzq,
  muroDer,
}: {
  x0: number
  ancho: number
  n: number
  muroIzq: boolean
  muroDer: boolean
}) {
  const w = ancho / n
  const hoja = Math.min(w * 0.74, D * 0.84)
  // el gozne va del lado cerrado: si la tira cierra contra pared a la derecha,
  // la puerta gira desde la izquierda
  const desdeIzq = muroDer && !muroIzq
  return (
    <g>
      {Array.from({ length: n + 1 }, (_, i) => {
        if (i === 0 && muroIzq) return null
        if (i === n && muroDer) return null
        return <Panel key={`p${i}`} x={x0 + i * w} />
      })}
      {Array.from({ length: n }, (_, i) => (
        <Puerta
          key={`d${i}`}
          x={desdeIzq ? x0 + i * w : x0 + (i + 1) * w}
          y={Y0 + D}
          hoja={hoja}
          dx={desdeIzq ? 1 : -1}
        />
      ))}
    </g>
  )
}

/**
 * Las tres "variación panel": la cabina de movilidad reducida es más honda que
 * las demás y su panel divisor hace de pared para la tira.
 *
 * Se entra por el FRENTE —pilastra lateral, panel y puerta—, no por el costado
 * como en el Tipo C. Lo que queda entre el fondo de esa cabina y el de las
 * otras es el RECESO, y ahí es donde se mete la tira de baños.
 */
function VariacionPanel({ muroIzq, muroDer }: { muroIzq: boolean; muroDer: boolean }) {
  const x0 = 11          // arranque de la cabina accesible
  const xPanel = 57      // el panel que la separa de la tira
  const xFin = 107       // dónde termina la tira
  const yFrente = Y0 + DA
  // el frente de la accesible, a escala de la hoja: 19 de pilastra, 85 de
  // panel y 100 de puerta sobre 204 de ancho
  const anchoAcc = xPanel - x0
  const pilastra = x0 + anchoAcc * (19 / 204)
  const puerta = x0 + anchoAcc * (104 / 204)
  const hoja = xPanel - puerta
  return (
    <g>
      <Muro x={muroIzq ? 6 : 10} y={12} w={(muroDer ? 112 : 108) - (muroIzq ? 6 : 10)} h={5} />
      {muroIzq && <Muro x={6} y={Y0} w={5} h={DA} />}
      {muroDer && <Muro x={xFin} y={Y0} w={5} h={D} />}
      {/* sin muro, la accesible cierra con su propio panel */}
      {!muroIzq && <Panel x={x0} y={Y0} d={DA} />}
      {/* el frente: la pilastra lateral, el panel y el vano de la puerta */}
      <rect x={x0} y={yFrente - 1.2} width={pilastra - x0} height={2.4} fill={PIEZA} />
      <rect x={pilastra} y={yFrente - 1.2} width={puerta - pilastra} height={2.4} fill={PIEZA} />
      {/* el gozne va del lado de la pilastra lateral y la hoja barre sobre su
          propio vano, hacia el pasillo */}
      <Puerta x={puerta} y={yFrente} hoja={hoja} dx={1} dy={1} />
      {/* el panel que hace de pared: corrido de todo el fondo de la accesible */}
      <Panel x={xPanel} y={Y0} d={DA} />
      <Accesible x={26} y={26} />
      {/* la tira, metida en el receso. Contra el panel no lleva panel de
          cierre: lleva la pilastra lateral que se le apoya encima */}
      <Tira x0={xPanel} ancho={xFin - xPanel} n={2} muroIzq muroDer={muroDer} />
      <Claro x1={x0} x2={muroDer ? xFin : xFin - 2} />
      <Profundidad y1={Y0} y2={yFrente} alto={ALTO.MR_PANEL_U} />
    </g>
  )
}

function Accesible({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(0.9)`} fill="none" stroke={MURO} opacity={0.55}>
      <circle cx={5} cy={2.4} r={2.1} fill={MURO} stroke="none" />
      <path d="M2.4 6 h5.2 l1.6 6 h3.4 M4.6 12 a4.4 4.4 0 1 0 6.4 3" strokeWidth={1.7} />
    </g>
  )
}

/** la cota del CLARO: horizontal, arriba de todo */
function Claro({ x1, x2 }: { x1: number; x2: number }) {
  const y = 9
  return (
    <g stroke={COTA} fill={COTA}>
      <line x1={x1} y1={y} x2={x2} y2={y} strokeWidth={0.7} />
      <line x1={x1} y1={y - 2.6} x2={x1} y2={y + 2.6} strokeWidth={0.7} />
      <line x1={x2} y1={y - 2.6} x2={x2} y2={y + 2.6} strokeWidth={0.7} />
      <text
        x={(x1 + x2) / 2}
        y={y - 2.6}
        textAnchor="middle"
        stroke="none"
        fontSize={6.2}
        fontFamily="system-ui, sans-serif"
        letterSpacing={0.5}
      >
        CLARO
      </text>
    </g>
  )
}

/**
 * La cota de la PROFUNDIDAD: la flecha va vertical a la derecha, pero la
 * palabra va horizontal abajo. Rotada no entra: "PROFUNDIDAD" es más larga que
 * el fondo de una cabina y quedaba cortada.
 */
function Profundidad({ y1, y2, alto }: { y1: number; y2: number; alto: number }) {
  const x = 120
  return (
    <g stroke={COTA} fill={COTA}>
      <line x1={x} y1={y1} x2={x} y2={y2} strokeWidth={0.7} />
      <line x1={x - 2.6} y1={y1} x2={x + 2.6} y2={y1} strokeWidth={0.7} />
      <line x1={x - 2.6} y1={y2} x2={x + 2.6} y2={y2} strokeWidth={0.7} />
      <line x1={x} y1={y2} x2={x} y2={alto - 8} strokeWidth={0.5} strokeDasharray="1.6 1.6" />
      <text
        x={131}
        y={alto - 1.6}
        textAnchor="end"
        stroke="none"
        fontSize={6.2}
        fontFamily="system-ui, sans-serif"
        letterSpacing={0.5}
      >
        PROFUNDIDAD
      </text>
    </g>
  )
}

export default function PreviewTipologia({ id, size = 220 }: { id: TipologiaId; size?: number }) {
  const H = ALTO[id]
  const cuerpo = () => {
    switch (id) {
      case 'RECTA_ENTRE_MUROS':
        return (
          <>
            <Muro x={6} y={12} w={106} h={5} />
            <Muro x={6} y={Y0} w={5} h={D} />
            <Muro x={107} y={Y0} w={5} h={D} />
            <Tira x0={11} ancho={96} n={3} muroIzq muroDer />
            <Claro x1={11} x2={107} />
            <Profundidad y1={Y0} y2={Y0 + D} alto={H} />
          </>
        )
      case 'RECTA_MURO_IZQ':
        return (
          <>
            <Muro x={6} y={12} w={102} h={5} />
            <Muro x={6} y={Y0} w={5} h={D} />
            <Tira x0={11} ancho={96} n={3} muroIzq muroDer={false} />
            <Claro x1={11} x2={107} />
            <Profundidad y1={Y0} y2={Y0 + D} alto={H} />
          </>
        )
      // Cierra contra pared a la DERECHA, así que el panel de cierre va del lado
      // IZQUIERDO, que es el extremo abierto. Contra la pared no va panel.
      case 'RECTA_MURO_DER':
        return (
          <>
            <Muro x={10} y={12} w={102} h={5} />
            <Muro x={107} y={Y0} w={5} h={D} />
            <Tira x0={11} ancho={96} n={3} muroIzq={false} muroDer />
            <Claro x1={11} x2={107} />
            <Profundidad y1={Y0} y2={Y0 + D} alto={H} />
          </>
        )
      case 'ISLA':
        return (
          <>
            <Muro x={10} y={12} w={98} h={5} />
            <Tira x0={13} ancho={92} n={3} muroIzq={false} muroDer={false} />
            <Claro x1={13} x2={105} />
            <Profundidad y1={Y0} y2={Y0 + D} alto={H} />
          </>
        )
      // El cuarto accesible toma TODO el fondo del lugar y se entra por el
      // COSTADO: la puerta va en el divisor, o sea sobre la profundidad. Al
      // frente lo que hay es la pared del lugar, no un vano.
      case 'PMR': {
        const xDiv = 56 // el divisor que separa el cuarto de las cabinas
        const yFin = 73 // la pared de enfrente
        const puertaDesde = 45
        const puertaHasta = 65
        return (
          <>
            <Muro x={6} y={12} w={106} h={5} />
            <Muro x={6} y={Y0} w={5} h={yFin - Y0} />
            <Muro x={6} y={yFin} w={51.2} h={5} />
            {/* el divisor: panel, el vano de la puerta, y la pilastra que cierra */}
            <Panel x={xDiv} y={Y0} d={puertaDesde - Y0} />
            <Panel x={xDiv} y={puertaHasta} d={yFin - puertaHasta} />
            {/* Una puerta no se cuelga nunca de un panel: el gozne va en la
                PILASTRA del divisor, que es la pieza de abajo. Desde ahí barre
                hacia el pasillo, que queda a la derecha. */}
            <Puerta
              x={xDiv} y={puertaHasta} hoja={puertaHasta - puertaDesde}
              dx={1} dy={-1} eje="y"
            />
            <Accesible x={26} y={44} />
            <Muro x={107} y={Y0} w={5} h={D} />
            <Tira x0={xDiv} ancho={51} n={2} muroIzq muroDer />
            <Claro x1={11} x2={107} />
            <Profundidad y1={Y0} y2={yFin} alto={H} />
          </>
        )
      }
      case 'MR_PANEL_E':
        return <VariacionPanel muroIzq={false} muroDer={false} />
      case 'MR_PANEL_L':
        return <VariacionPanel muroIzq muroDer={false} />
      case 'MR_PANEL_U':
        return <VariacionPanel muroIzq muroDer />
      case 'ORINALES':
        return (
          <>
            <Muro x={6} y={12} w={102} h={5} />
            <Muro x={6} y={Y0} w={5} h={22} />
            {[0, 1, 2, 3].map((i) => (
              <g key={i}>
                <Panel x={11 + (i + 1) * 24} y={Y0} d={22} />
                <ellipse cx={11 + i * 24 + 12} cy={22} rx={5} ry={3.4} fill="none" stroke={MURO} strokeWidth={1.1} />
              </g>
            ))}
            <Claro x1={11} x2={107} />
            <Profundidad y1={Y0} y2={Y0 + 22} alto={H} />
          </>
        )
      // igual que la anterior pero con pared al final: el último orinal no
      // necesita mampara de cierre porque topa contra el muro
      case 'ORINALES_ENTRE_MUROS':
        return (
          <>
            <Muro x={6} y={12} w={106} h={5} />
            <Muro x={6} y={Y0} w={5} h={22} />
            <Muro x={107} y={Y0} w={5} h={22} />
            {[0, 1, 2, 3].map((i) => (
              <g key={i}>
                {i < 3 && <Panel x={11 + (i + 1) * 24} y={Y0} d={22} />}
                <ellipse cx={11 + i * 24 + 12} cy={22} rx={5} ry={3.4} fill="none" stroke={MURO} strokeWidth={1.1} />
              </g>
            ))}
            <Claro x1={11} x2={107} />
            <Profundidad y1={Y0} y2={Y0 + 22} alto={H} />
          </>
        )
    }
  }

  return (
    // Se estira a la tarjeta en vez de ir a un tamaño fijo: así las cotas de
    // CLARO y PROFUNDIDAD se leen aunque la tarjeta sea chica.
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: '100%', maxWidth: size }}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Esquema ${id}`}
    >
      <defs>
        <pattern id="rayado" width={4} height={4} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1={0} y1={0} x2={0} y2={4} stroke={MURO} strokeWidth={1.1} />
        </pattern>
      </defs>
      {cuerpo()}
    </svg>
  )
}
