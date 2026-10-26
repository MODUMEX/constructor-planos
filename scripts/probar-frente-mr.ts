/**
 * El frente de la cabina accesible: lateral, relleno, puerta y cierre.
 *
 * Dos pilastras pegadas una contra otra no se arman, así que lo que sobra del
 * frente no sale como pieza aparte: se corta junto con la lateral. En un
 * cubículo de 150 con puerta de 100 el rincón es UNA pilastra de 31, no una de
 * 19 más una de 12. Solo cuando el frente es tan ancho que ya es un PANEL va
 * aparte, apoyado contra la lateral.
 *
 *   npm run probar-frente-mr
 */
import { frenteAccesible } from '../src/modulacion'
import { cuartoPmr } from '../src/geometria'
import type { Cabina, Config, Tramo } from '../src/types'

let mal = 0
const ok = (b: boolean, t: string) => { if (!b) mal++; console.log(`${b ? '✓' : '✕'} ${t}`) }

const cab = (anchoCm: number, puertaCm: number) =>
  ({ id: 'c1', tipo: 'accesible', anchoCm, puerta: { anchoCm: puertaCm, mano: 'izq', abre: 'afuera' } }) as unknown as Cabina

const cfg = (extra: Record<string, unknown> = {}) => ({
  tipologia: 'MR_PANEL_E', modelo: 'ESTANDAR', linea: 'LEEDER',
  claroCm: 510, profundidadCm: 130, profundidadAccesibleCm: 150, cantidad: 5,
  alturaCm: 210, puertaCm: 60, puertaAccesibleCm: 100, anchoPilastraCm: 24,
  anchoAccesibleCm: 150, orinales: 0, montaje: 'PISO_HEADRAIL',
  color: 'ALUMINA 2103', acabado: 'Laminado Compacto', terminacion: 'ZOCLO',
  espesorMm: 12, mgAnchoCm: 45, mgAlturaCm: 120, mamparasMG: [], ...extra,
}) as unknown as Config

const tramo = (c: Cabina) => ({
  id: 't1', claroCm: 510, muroInicio: true, muroFin: true, cabinas: [c], pilastras: [],
}) as unknown as Tramo

console.log('— el rincón va de UNA pieza: dos pilastras pegadas no se arman')
for (const [ancho, puerta, esperada] of [[150, 100, 31], [150, 90, 41], [180, 100, 61], [204, 100, 85]] as const) {
  const c = cab(ancho, puerta)
  const f = frenteAccesible(c, cfg())
  ok(f.juntada && f.frente === 0 && f.pilastra === esperada,
    `${ancho} con puerta de ${puerta} → una sola de ${f.pilastra} (esperada ${esperada}), sin relleno`)
  ok(f.pilastra + f.frente + f.puerta + f.cierre === ancho, `  y el frente cierra los ${ancho}`)
  ok(cuartoPmr(tramo(c), cfg())?.aviso == null, '  sin aviso, porque cierra')
}

console.log('')
console.log('— la lateral puesta a mano también se junta con el relleno')
{
  const c = cab(150, 100)
  const config = cfg({ pilastraLateralMrCm: 24 })
  const f = frenteAccesible(c, config)
  ok(f.frente === 0 && f.pilastra + f.puerta + f.cierre === 150,
    `150 con lateral de 24 → ${f.pilastra} · ${f.puerta} · ${f.cierre}, sin el relleno de 2 cm`)
}

console.log('')
console.log('— cuando el frente es un PANEL de verdad, sí va aparte')
{
  const f = frenteAccesible(cab(300, 100), cfg())
  ok(!f.juntada && f.frente > 0,
    `300 → PL ${f.pilastra} + panel de ${f.frente} + PT ${f.puerta} + PL ${f.cierre}`)
}

console.log('')
console.log('— cuando ni la pieza más chica alcanza, no se inventa nada: se avisa')
{
  const c = cab(115, 100)
  const f = frenteAccesible(c, cfg())
  ok(cuartoPmr(tramo(c), cfg())?.aviso != null, `115 con puerta de 100 → frente ${f.frente} · avisa`)
}

console.log(mal === 0 ? '\nTodo cuadra.' : `\n${mal} caso(s) mal.`)
process.exit(mal === 0 ? 0 : 1)
