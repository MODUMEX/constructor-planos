/**
 * Las pilastras CENTRALES deberían medir 24 cm o más.
 *
 * Es lo que pide producción, pero no se puede exigir siempre: hay claros donde
 * con centrales de 24 no entran las cabinas pedidas. Así que va como
 * PREFERENCIA — primero se busca con 24 o más, y solo si no hay ninguna
 * solución se baja, avisándolo en el plano.
 *
 *   npm run probar-pilastra-24
 */
import { crearTramos, anchoTotal } from '../src/modulacion'
import { anchoDeOrinal } from '../src/geometria'
import { INTERNA_PREFERIDA_CM } from '../src/modulador'
import type { Config, Tramo } from '../src/types'

let mal = 0
const ok = (b: boolean, t: string) => { if (!b) mal++; console.log(`${b ? '✓' : '✕'} ${t}`) }

function cfg(claro: number, cantidad: number, orinales: number): Config {
  return {
    tipologia: 'RECTA_ENTRE_MUROS', modelo: 'REFORZADO', linea: 'LEEDER',
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

function ver(claro: number, cant: number, ori: number, nota: string) {
  const t = crearTramos('RECTA_ENTRE_MUROS', claro, cant, cfg(claro, cant, ori), 'CR')[0]
  const internas = internasDe(t)
  console.log(`\n── ${nota}: claro ${claro}, ${cant} cabinas${ori ? ` + ${ori} orinales` : ''}`)
  console.log(`   cabinas   ${t.cabinas.map((c, i) => (c.tipo === 'orinal' ? anchoDeOrinal(t, i, 24) : c.anchoCm)).join(' | ')}`)
  console.log(`   pilastras ${(t.pilastras ?? []).map((p) => (p === 1.27 ? 'MG' : p)).join(' · ')}   internas: ${internas.join(', ')}`)
  console.log(`   ${t.ajuste} · ${t.mensaje}`)
  return { t, internas }
}

console.log(`— donde el claro da, las centrales salen de ${INTERNA_PREFERIDA_CM} para arriba`)
{
  const { internas, t } = ver(520, 4, 0, 'claro holgado')
  ok(internas.every((a) => a >= INTERNA_PREFERIDA_CM), `todas las centrales llegan a ${INTERNA_PREFERIDA_CM}`)
  ok(!(t.mensaje ?? '').includes('No hay forma'), 'y no hace falta avisar nada')
}

console.log('\n— donde NO da, se baja pero se avisa en el plano')
{
  const { internas, t } = ver(420, 4, 2, 'el caso de la imagen')
  const angostas = internas.filter((a) => a < INTERNA_PREFERIDA_CM)
  ok(angostas.length > 0, 'hubo que usar centrales angostas')
  ok((t.mensaje ?? '').includes('No hay forma'), 'y el plano lo dice')
  ok(anchoTotal(t.cabinas) <= 420 + 4, 'la tira sigue entrando en el claro')
}

console.log('\n— el caso 323, que fue el que obligó a permitir las angostas')
{
  const { t } = ver(323, 4, 0, 'claro 323')
  ok(t.ajuste !== 'falta', 'sigue cerrando, no se rompe')
}

console.log(mal === 0 ? '\nTodo cuadra.' : `\n${mal} caso(s) mal.`)
process.exit(mal === 0 ? 0 : 1)
