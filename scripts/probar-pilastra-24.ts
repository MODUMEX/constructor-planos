/**
 * Las medidas mínimas de pilastra, que son REGLA y no preferencia.
 *
 * Del material de capacitación de Modumex (Módulo 6):
 *
 *   · CENTRAL  → mínimo 24 cm
 *   · ESQUINA  → mínimo 24 cm (la punta de la tira que NO topa contra pared)
 *   · A MURO   → sin mínimo; la medida sale de la ficha del modelo
 *
 * Antes la central de 24 era solo una preferencia: si el claro no daba, el
 * buscador bajaba a 19, 17 o 10 y lo avisaba. Ya no. Cuando no da, la tira NO
 * cierra y hay que mover otra cosa —menos cabinas, puerta más angosta o
 * corregir el claro—, que es justo lo que dice la regla.
 *
 *   npm run probar-pilastra-24
 */
import { crearTramos, anchoTotal } from '../src/modulacion'
import { tramoDesdeCentros } from '../src/descargas'
import { anchoDeOrinal } from '../src/geometria'
import { PILASTRA_MINIMA_CM } from '../src/modulador'
import type { Config, TipologiaId, Tramo } from '../src/types'

let mal = 0
const ok = (b: boolean, t: string) => { if (!b) mal++; console.log(`${b ? '✓' : '✕'} ${t}`) }

function cfg(claro: number, cantidad: number, orinales: number, tipologia: TipologiaId): Config {
  return {
    tipologia, modelo: 'REFORZADO', linea: 'LEEDER',
    claroCm: claro, profundidadCm: 150, cantidad, alturaCm: 200,
    puertaCm: 60, anchoPilastraCm: 24, orinales, anchoOrinalCm: 60,
    montaje: 'PISO_HEADRAIL', color: 'BLANCO', acabado: 'Laminado Compacto',
    terminacion: 'ZOCLO', espesorMm: 12,
  } as unknown as Config
}

/** las internas son las fronteras que separan dos cabinas: ni las puntas ni las del campo de orinales */
function internasDe(t: Tramo): number[] {
  const n = t.cabinas.length
  const salida: number[] = []
  for (let k = 1; k < n; k++) {
    if (t.cabinas[k - 1].tipo === 'orinal' || t.cabinas[k].tipo === 'orinal') continue
    salida.push(t.pilastras?.[k] ?? 0)
  }
  return salida
}

function ver(claro: number, cant: number, ori: number, nota: string, tipologia: TipologiaId = 'RECTA_ENTRE_MUROS') {
  const t = crearTramos(tipologia, claro, cant, cfg(claro, cant, ori, tipologia), 'CR')[0]
  const internas = internasDe(t)
  console.log(`\n── ${nota}: claro ${claro}, ${cant} cabinas${ori ? ` + ${ori} orinales` : ''}`)
  console.log(`   cabinas   ${t.cabinas.map((c, i) => (c.tipo === 'orinal' ? anchoDeOrinal(t, i, 24) : c.anchoCm)).join(' | ')}`)
  console.log(`   pilastras ${(t.pilastras ?? []).map((p) => (p === 1.27 ? 'MG' : p)).join(' · ')}   internas: ${internas.join(', ')}`)
  console.log(`   ${t.ajuste} · ${t.mensaje}`)
  return { t, internas }
}

console.log(`— la central nunca baja de ${PILASTRA_MINIMA_CM}`)
{
  const { internas, t } = ver(370, 4, 0, 'claro holgado')
  ok(internas.every((a) => a >= PILASTRA_MINIMA_CM), `todas las centrales llegan a ${PILASTRA_MINIMA_CM}`)
  ok(t.ajuste !== 'falta' && t.ajuste !== 'sobra', 'y la tira cierra')
}

console.log('\n— tampoco en un claro apretado: antes bajaba a 19 o a 10')
{
  // el de la lamina del Modulo 5 es 300 con 3 cabinas entre muros
  for (const [claro, cant] of [[300, 3], [323, 4], [269.5, 3], [178, 2]] as [number, number][]) {
    const { internas } = ver(claro, cant, 0, 'apretado')
    ok(internas.every((a) => a >= PILASTRA_MINIMA_CM),
      `claro ${claro}: ninguna central por debajo de ${PILASTRA_MINIMA_CM}`)
  }
}

console.log('\n— la punta CONTRA PARED sí puede ser chica')
{
  // dos muros: las dos puntas apoyan contra pared y salen de la ficha
  const { t } = ver(269.5, 3, 0, 'entre muros')
  const n = t.cabinas.length
  const puntas = [t.pilastras?.[0] ?? 0, t.pilastras?.[n] ?? 0]
  ok(puntas.some((p) => p < PILASTRA_MINIMA_CM), `alguna punta a muro baja de ${PILASTRA_MINIMA_CM}`)
  console.log(`   puntas: ${puntas.join(' y ')}`)
}

console.log('\n— pero la de ESQUINA no')
{
  // una isla no topa contra ninguna pared: sus dos puntas son esquinas
  const { t } = ver(290, 3, 0, 'isla, sin muros', 'ISLA')
  const n = t.cabinas.length
  const puntas = [t.pilastras?.[0] ?? 0, t.pilastras?.[n] ?? 0]
  ok(puntas.every((p) => p >= PILASTRA_MINIMA_CM),
    `las dos esquinas llegan a ${PILASTRA_MINIMA_CM}`)
  console.log(`   esquinas: ${puntas.join(' y ')}`)

  // con un solo muro, la punta de ese lado puede ser chica y la otra no
  const { t: t2 } = ver(295, 3, 0, 'un muro a la izquierda', 'RECTA_MURO_IZQ')
  const n2 = t2.cabinas.length
  ok((t2.pilastras?.[n2] ?? 0) >= PILASTRA_MINIMA_CM,
    `la punta libre llega a ${PILASTRA_MINIMA_CM}`)
  console.log(`   contra muro: ${t2.pilastras?.[0]} · esquina: ${t2.pilastras?.[n2]}`)
}

console.log('\n— y cuando no da, se dice en vez de inventar una pilastra chica')
{
  const { t, internas } = ver(420, 4, 2, 'cuatro cabinas y dos orinales en 4,20')
  ok(internas.every((a) => a >= PILASTRA_MINIMA_CM), 'las centrales siguen en regla')
  ok(t.ajuste === 'falta' || t.ajuste === 'sobra', 'y el plano avisa que no cierra')
  ok(anchoTotal(t.cabinas) > 0, 'la tira se arma igual, para poder corregirla a mano')
}

console.log('\n— lo que falta hasta 1 cm se resuelve con el herraje, y el plano lo dice')
{
  // Regla de Modumex: hasta 1 cm lo absorbe la instalación y hay que anotarlo;
  // de 1 a 5 va canaleta; más que eso, se corrige la modulación.
  const { t } = ver(345, 4, 0, 'queda 1 cm corto')
  ok(t.ajuste === 'exacto', 'cierra')
  ok((t.ajusteCm ?? 0) > 0 && (t.ajusteCm ?? 0) <= 1, 'y guarda cuánto hay que ajustar en obra')
  ok((t.mensaje ?? '').includes('ajuste'), 'el mensaje lo dice')

  const { t: exacto } = ver(330, 4, 0, 'calza justo')
  ok((exacto.ajusteCm ?? 0) === 0, 'y cuando calza justo no hay nada que anotar')
}

console.log('\n— el caso de Guillermo: 879 con 9 cabinas, por los DOS caminos')
{
  // La regla vale igual al repartir parejo que al modular desde las descargas,
  // y el muro puede estar de cualquiera de los dos lados. Antes la modulación
  // por centros tenía su propia lista y sacaba centrales de 10; y con un solo
  // muro se asumía que estaba a la izquierda, así que un Tipo L invertido
  // sacaba la esquina de 19.
  const centros = [50, 150, 250, 350, 450, 550, 650, 750, 835]
  for (const tip of ['RECTA_MURO_DER', 'RECTA_MURO_IZQ', 'ISLA', 'RECTA_ENTRE_MUROS'] as TipologiaId[]) {
    const c = cfg(879, 9, 0, tip)
    const base = crearTramos(tip, 879, 9, c, 'CR')[0]
    for (const t of [base, (() => {
      const con = { ...base, centrosCm: centros }
      const r = tramoDesdeCentros(con, c)
      return r ? { ...con, cabinas: r.cabinas, pilastras: r.pilastras } : con
    })()]) {
      const n = t.cabinas.length
      const p = t.pilastras ?? []
      const malas = p.filter((x, k) => {
        if (k === 0) return !t.muroInicio && x < PILASTRA_MINIMA_CM
        if (k === n) return !t.muroFin && x < PILASTRA_MINIMA_CM
        return x < PILASTRA_MINIMA_CM
      })
      ok(malas.length === 0, `${tip}: ninguna pilastra que cargue panel baja de ${PILASTRA_MINIMA_CM} · ${p.join(" · ")}`)
    }
  }
}

console.log(mal === 0 ? '\nTodo cuadra.' : `\n${mal} caso(s) mal.`)
process.exit(mal === 0 ? 0 : 1)
