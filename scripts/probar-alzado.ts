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
import { pieDePilastra } from '../src/exportar/pdf'

let mal = 0
const ok = (b: boolean, t: string) => { if (!b) mal++; console.log(`${b ? '✓' : '✕'} ${t}`) }

/** modelo, piso, aire de arriba, total con refuerzo — como lo acota la ficha */
const FICHAS: [string, number, number, number][] = [
  ['ESTANDAR', 30, 0, 180],
  ['ESTANDAR170', 10, 0, 180],
  ['REFORZADO', 30, 30, 214],
  // la pilastra es de 210, así que con la puerta a 30 del piso quedan 10 arriba
  ['REFORZADO170', 30, 10, 214],
  ['KIDS', 20, 0, 150],
  ['SUP_ESTANDAR', 30, 0, 180],
  ['SUP_ESTANDAR170', 10, 0, 180],
  ['SUP_REFORZADO', 30, 30, 214],
  // el Reforzado 170 de Superior NO es el de LEEDER: pilastra de 210 y el
  // panel a 10 del piso, así que cierra en 2,14 y no en 2,34
  ['SUP_REFORZADO170', 10, 30, 214],
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

console.log('')
console.log('— el pie de la pilastra: zoclo corrido, o una o dos patas repartidas')
{
  const redondo = (x: number) => Math.round(x * 100) / 100
  for (const ancho of [10, 12, 15, 17, 19, 24, 30, 60, 120]) {
    const pies = pieDePilastra(ancho, false)
    const cuantas = ancho >= 17 ? 2 : 1
    const aires = [
      pies[0].desdeCm,
      ...pies.slice(1).map((p, j) => p.desdeCm - (pies[j].desdeCm + pies[j].anchoCm)),
      ancho - (pies[pies.length - 1].desdeCm + pies[pies.length - 1].anchoCm),
    ].map(redondo)
    ok(pies.length === cuantas, `la de ${ancho} lleva ${pies.length} pata(s)`)
    ok(aires.every((a) => Math.abs(a - aires[0]) < 0.01) && aires[0] > 0,
      `  y los aires son iguales · ${aires.join(" / ")}`)
    ok(pies[pies.length - 1].desdeCm + pies[pies.length - 1].anchoCm <= ancho,
      '  sin salirse de la pieza')
  }
  const zoclo = pieDePilastra(24, true)
  ok(zoclo.length === 1 && zoclo[0].desdeCm === 0 && zoclo[0].anchoCm === 24,
    'el zoclo es uno solo y corre de lado a lado')
}

console.log(mal === 0 ? '\ntodo correcto' : `\n${mal} fallas`)
process.exit(mal ? 1 : 0)
