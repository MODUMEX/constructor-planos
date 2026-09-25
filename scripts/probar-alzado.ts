/**
 * El alzado de cada modelo, contra las fichas técnicas ABR-2026.
 *
 * La puerta NO cuelga a "pilastra − puerta" del suelo: cada modelo tiene su
 * hueco de piso y, cuando sobra altura, ese aire queda ARRIBA, bajo el refuerzo
 * de aluminio. En Reforzado son 30 y 30, no 60 abajo.
 *
 *   npm run probar-alzado
 */
import { alturasDe, alzadoDe } from '../src/catalog'

let mal = 0
const ok = (b: boolean, t: string) => { if (!b) mal++; console.log(`${b ? '✓' : '✕'} ${t}`) }

/** modelo, piso, aire de arriba, total con refuerzo — como lo acota la ficha */
const FICHAS: [string, number, number, number][] = [
  ['ESTANDAR', 30, 0, 180],
  ['ESTANDAR170', 10, 0, 180],
  ['REFORZADO', 30, 30, 214],
  ['KIDS', 20, 0, 150],
  ['SUP_ESTANDAR', 30, 0, 180],
  ['SUP_ESTANDAR170', 10, 0, 180],
  ['SUP_REFORZADO', 30, 30, 214],
]

for (const [modelo, piso, aire, total] of FICHAS) {
  const h = alturasDe(modelo)
  const a = alzadoDe(modelo)
  const aireReal = h.pilastra - a.pisoCm - h.puerta
  const totalReal = h.pilastra + a.refuerzoCm
  ok(a.pisoCm === piso, `${modelo}: la puerta arranca a ${a.pisoCm} del suelo (ficha: ${piso})`)
  ok(aireReal === aire, `${modelo}: quedan ${aireReal} arriba (ficha: ${aire})`)
  ok(totalReal === total, `${modelo}: alto total ${totalReal} (ficha: ${total})`)
}

// La trampa que había: dibujarlo con la resta.
const ref = alturasDe('REFORZADO')
ok(ref.pilastra - ref.puerta === 60, 'la resta pilastra − puerta da 60…')
ok(alzadoDe('REFORZADO').pisoCm === 30, '…pero la puerta va a 30: por eso no se usa la resta')

// Un modelo que no esté en la tabla no puede reventar el plano.
ok(alzadoDe('LO_QUE_SEA').pisoCm >= 0, 'un modelo desconocido no rompe el alzado')

console.log(mal === 0 ? '\ntodo correcto' : `\n${mal} fallas`)
process.exit(mal ? 1 : 0)
