/**
 * Al invertir un área con cuarto PMR, el cuarto se va a la otra punta y su
 * divisor —panel + puerta + pilastra— tiene que irse con él: pasa a estar del
 * lado de la tira de baños, no contra el muro de la punta.
 *
 *   npm run probar-invertir-pmr
 */
import { crearTramos, invertirTramo, anchoTotal } from '../src/modulacion'
import { cuartoPmr, acumulado } from '../src/geometria'
import type { Config, Tramo } from '../src/types'

let mal = 0
const ok = (b: boolean, t: string) => { if (!b) mal++; console.log(`${b ? '✓' : '✕'} ${t}`) }

const config = {
  tipologia: 'PMR', modelo: 'REFORZADO', linea: 'LEEDER',
  claroCm: 666, profundidadCm: 135, profundidadLugarCm: 255, cantidad: 5, alturaCm: 200,
  puertaCm: 60, puertaAccesibleCm: 90, anchoAccesibleCm: 157, anchoPilastraCm: 24,
  orinales: 0, montaje: 'PISO_HEADRAIL', color: 'BLANCO',
  acabado: 'Laminado Compacto', terminacion: 'ZOCLO', espesorMm: 12, llevaAccesible: true,
} as unknown as Config

function contar(t: Tramo, titulo: string) {
  const c = cuartoPmr(t, config)
  if (!c) { console.log(`✕ ${titulo}: sin cuarto PMR`); mal++; return null }
  console.log(`\n── ${titulo}`)
  console.log(`   cabinas ${t.cabinas.map((x) => x.anchoCm).join(' | ')}   (total ${anchoTotal(t.cabinas)})`)
  console.log(`   muros: inicio ${t.muroInicio ? 'sí' : 'no'} · fin ${t.muroFin ? 'sí' : 'no'}`)
  console.log(`   cuarto: índice ${c.indice} · lado ${c.lado} · de ${c.desdeCm} a ${c.hastaCm}`)
  console.log(`   divisor: ${c.divisor.map((p) => `${p.tipo} ${p.desdeCm}→${p.hastaCm}`).join(' · ')}`)
  return c
}

const t0 = crearTramos('PMR', 666, 5, config, 'CR')[0]
const a = contar(t0, 'como se arma')

const t1 = invertirTramo(t0)
const b = contar(t1, 'invertido')

console.log('')
if (a && b) {
  ok(a.lado === 'inicio', 'sin invertir el cuarto arranca la tira')
  ok(b.lado === 'fin', 'invertido el cuarto cierra la tira')

  // El divisor separa el cuarto de la tira de baños: mira siempre hacia adentro.
  const bordeAdentroA = a.lado === 'inicio' ? a.hastaCm : a.desdeCm
  const bordeAdentroB = b.lado === 'inicio' ? b.hastaCm : b.desdeCm
  ok(bordeAdentroA === a.hastaCm, `sin invertir el divisor va en ${bordeAdentroA} (borde de adentro)`)
  ok(bordeAdentroB === b.desdeCm, `invertido el divisor va en ${bordeAdentroB} (borde de adentro)`)

  // El borde de adentro NUNCA es la punta de la tira: ahi esta el muro.
  const largo = anchoTotal(t1.cabinas)
  ok(bordeAdentroB !== largo, `invertido el divisor NO cae en la punta de la tira (${largo})`)
  ok(bordeAdentroA !== 0, 'sin invertir tampoco cae contra el muro de arranque')

  // El cuarto tiene que seguir midiendo lo mismo y quedar pegado a su muro
  ok(a.anchoCm === b.anchoCm, `el cuarto mide lo mismo en los dos sentidos (${a.anchoCm})`)
  ok(acumulado(t1.cabinas)[b.indice] === b.desdeCm, 'el cuarto arranca donde dice su geometría')
}

console.log(mal === 0 ? '\ntodo correcto' : `\n${mal} fallas`)
