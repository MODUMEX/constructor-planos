import type { TipologiaId } from '../types'

/**
 * Dibujo esquemático de cada tipología, para que el vendedor vea
 * cómo queda antes de elegirla. Muro rayado, pilastras negras,
 * arco de puerta azul.
 */

const MURO = '#2b3542'
const PIEZA = '#15274b'
const ARCO = '#5f92dd'
const LIBRE = '#eef2f7'

function Muro({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="url(#rayado)" stroke={MURO} strokeWidth={1} />
    </g>
  )
}

/** una cabina vista en planta: panel divisor a la derecha + arco de puerta */
function CabinaH({ x, y, w, d, mano = 'der' }: { x: number; y: number; w: number; d: number; mano?: 'izq' | 'der' }) {
  const pivote = mano === 'der' ? x + w : x
  const dir = mano === 'der' ? -1 : 1
  const hoja = Math.min(w * 0.78, d * 0.9)
  return (
    <g>
      <rect x={x + w - 1.2} y={y} width={2.4} height={d} fill={PIEZA} />
      <path
        d={`M ${pivote} ${y + d} A ${hoja} ${hoja} 0 0 ${mano === 'der' ? 1 : 0} ${pivote + dir * hoja} ${y + d - hoja}`}
        fill="none"
        stroke={ARCO}
        strokeWidth={0.9}
        strokeDasharray="2 1.6"
      />
      <line x1={pivote} y1={y + d} x2={pivote + dir * hoja} y2={y + d - hoja} stroke={ARCO} strokeWidth={1.5} />
    </g>
  )
}

function CabinaV({ x, y, h, d, hacia = 'der' }: { x: number; y: number; h: number; d: number; hacia?: 'der' | 'izq' }) {
  const sx = hacia === 'der' ? x : x - d
  const hoja = Math.min(h * 0.78, d * 0.9)
  const frente = hacia === 'der' ? sx + d : sx
  const dir = hacia === 'der' ? -1 : 1
  return (
    <g>
      <rect x={sx} y={y + h - 1.2} width={d} height={2.4} fill={PIEZA} />
      <line x1={frente} y1={y + h} x2={frente + dir * hoja} y2={y + h - hoja} stroke={ARCO} strokeWidth={1.5} />
    </g>
  )
}

function Accesible({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(0.85)`} fill={MURO} opacity={0.5}>
      <circle cx={5} cy={2.4} r={2.1} />
      <path d="M2.4 6 h5.2 l1.6 6 h3.4 M4.6 12 a4.4 4.4 0 1 0 6.4 3" fill="none" stroke={MURO} strokeWidth={1.7} />
    </g>
  )
}

export default function PreviewTipologia({ id, size = 148 }: { id: TipologiaId; size?: number }) {
  const W = 120
  const H = 90
  const D = 26 // profundidad de cabina en el esquema
  const cuerpo = () => {
    switch (id) {
      case 'RECTA_ENTRE_MUROS':
        return (
          <>
            <Muro x={6} y={12} w={108} h={5} />
            <Muro x={6} y={17} w={5} h={D} />
            <Muro x={109} y={17} w={5} h={D} />
            {[0, 1, 2].map((i) => (
              <CabinaH key={i} x={11 + i * 32.7} y={17} w={32.7} d={D} />
            ))}
          </>
        )
      case 'RECTA_MURO_IZQ':
        return (
          <>
            <Muro x={6} y={12} w={100} h={5} />
            <Muro x={6} y={17} w={5} h={D} />
            {[0, 1, 2].map((i) => (
              <CabinaH key={i} x={11 + i * 31} y={17} w={31} d={D} />
            ))}
          </>
        )
      case 'RECTA_MURO_DER':
        return (
          <>
            <Muro x={14} y={12} w={100} h={5} />
            <Muro x={109} y={17} w={5} h={D} />
            {[0, 1, 2].map((i) => (
              <CabinaH key={i} x={14 + i * 31} y={17} w={31} d={D} mano="izq" />
            ))}
          </>
        )
      case 'ISLA':
        return (
          <>
            <Muro x={14} y={12} w={92} h={5} />
            <rect x={14} y={17} width={2.4} height={D} fill={PIEZA} />
            {[0, 1, 2].map((i) => (
              <CabinaH key={i} x={16 + i * 30} y={17} w={30} d={D} />
            ))}
          </>
        )
      case 'ESQUINA_IZQ':
        return (
          <>
            <Muro x={6} y={10} w={108} h={5} />
            <Muro x={6} y={15} w={5} h={70} />
            {[0, 1].map((i) => (
              <CabinaH key={i} x={11 + 34 + i * 34} y={15} w={34} d={D} />
            ))}
            <CabinaH x={11} y={15} w={34} d={D} mano="izq" />
            <Accesible x={17} y={22} />
            {[0, 1].map((i) => (
              <CabinaV key={i} x={11} y={41 + 3 + i * 20} h={20} d={D} />
            ))}
          </>
        )
      case 'ESQUINA_DER':
        return (
          <>
            <Muro x={6} y={10} w={108} h={5} />
            <Muro x={109} y={15} w={5} h={70} />
            {[0, 1, 2].map((i) => (
              <CabinaH key={i} x={6 + i * 34} y={15} w={34} d={D} mano="izq" />
            ))}
            {[0, 1].map((i) => (
              <CabinaV key={i} x={109} y={44 + i * 20} h={20} d={D} hacia="izq" />
            ))}
          </>
        )
      case 'NICHO_IZQ':
        return (
          <>
            <Muro x={6} y={10} w={108} h={5} />
            <Muro x={6} y={15} w={5} h={70} />
            <Muro x={6} y={80} w={40} h={5} />
            <rect x={11} y={15} width={35} height={65} fill={LIBRE} opacity={0.55} />
            {[0, 1].map((i) => (
              <CabinaV key={i} x={11} y={20 + i * 28} h={28} d={35} />
            ))}
            {[0, 1].map((i) => (
              <CabinaH key={i} x={46 + i * 34} y={15} w={34} d={D} />
            ))}
          </>
        )
      case 'NICHO_DER':
        return (
          <>
            <Muro x={6} y={10} w={108} h={5} />
            <Muro x={109} y={15} w={5} h={70} />
            <Muro x={74} y={80} w={40} h={5} />
            <rect x={74} y={15} width={35} height={65} fill={LIBRE} opacity={0.55} />
            {[0, 1].map((i) => (
              <CabinaV key={i} x={109} y={20 + i * 28} h={28} d={35} hacia="izq" />
            ))}
            {[0, 1].map((i) => (
              <CabinaH key={i} x={6 + i * 34} y={15} w={34} d={D} mano="izq" />
            ))}
          </>
        )
      case 'U_TRES_MUROS':
        return (
          <>
            <Muro x={6} y={10} w={108} h={5} />
            <Muro x={6} y={15} w={5} h={70} />
            <Muro x={109} y={15} w={5} h={70} />
            {[0, 1, 2].map((i) => (
              <CabinaH key={i} x={11 + i * 32.7} y={15} w={32.7} d={D} />
            ))}
            {[0, 1].map((i) => (
              <CabinaV key={i} x={11} y={44 + i * 20} h={20} d={24} />
            ))}
            {[0, 1].map((i) => (
              <CabinaV key={`d${i}`} x={109} y={44 + i * 20} h={20} d={24} hacia="izq" />
            ))}
          </>
        )
      case 'PMR':
        return (
          <>
            <Muro x={6} y={12} w={108} h={5} />
            <Muro x={6} y={17} w={5} h={56} />
            <rect x={11} y={17} width={46} height={54} fill="none" stroke={PIEZA} strokeWidth={2.2} />
            <Accesible x={26} y={36} />
            <line x1={11} y1={71} x2={34} y2={71} stroke={ARCO} strokeWidth={1.5} />
            {[0, 1].map((i) => (
              <CabinaH key={i} x={57 + i * 28} y={17} w={28} d={D} />
            ))}
          </>
        )
      case 'ORINALES':
        return (
          <>
            <Muro x={6} y={12} w={108} h={5} />
            <Muro x={6} y={17} w={5} h={22} />
            {[0, 1, 2, 3].map((i) => (
              <g key={i}>
                <rect x={11 + i * 26} y={17} width={2.4} height={22} fill={PIEZA} />
                <ellipse cx={11 + i * 26 + 13} cy={22} rx={5} ry={3.4} fill="none" stroke={MURO} strokeWidth={1.1} />
              </g>
            ))}
          </>
        )
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={size} height={(size * H) / W} role="img" aria-label={`Esquema ${id}`}>
      <defs>
        <pattern id="rayado" width={4} height={4} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1={0} y1={0} x2={0} y2={4} stroke={MURO} strokeWidth={1.1} />
        </pattern>
      </defs>
      {cuerpo()}
    </svg>
  )
}
