/**
 * Las medidas que ofrece el Constructor contra las DOS listas de precios de
 * mayo 2026: la de México y la internacional (LATAM y Costa Rica).
 *
 * Las dos traen la misma regla de panel —el 165 y el 180 de ancho solo con el
 * panel a 150 de alto o menos, así que el 180 x 180 de Touchless S3 no se
 * fabrica— y difieren en tres cosas, que la app respeta por país: el panel de
 * 95 de Imperial es solo de México, y los paneles de 90, 130 y 140 de alto del
 * S3 son solo de la internacional. La pilastra del Colgante 2.0 va de 220, el
 * único alto que las dos listas aceptan.
 *
 *   npm run probar-medidas
 */
import {
  alturasDe, alturasElegibles, anchosPanelFabrica, ANCHOS_PILASTRA, ANCHOS_PUERTA,
  mgMedidas, MODELOS,
} from '../src/catalog'
import type { Linea } from '../src/types'

let mal = 0
const ok = (b: boolean, t: string) => { if (!b) mal++; console.log(`${b ? '✓' : '✗'} ${t}`) }

const HASTA_140 = [55, 60, 85, 90, 95, 100, 110, 120, 130, 135, 140]
const CON_GRANDES = [...HASTA_140, 150, 165, 180]
const SIN_GRANDES = [...HASTA_140, 150]

// lo que trae la lista para cada modelo, a su propio alto de panel
const PANEL_ESPERADO: Record<string, number[]> = {
  ESTANDAR: CON_GRANDES, REFORZADO: CON_GRANDES, KIDS: CON_GRANDES,
  SUP_ESTANDAR: CON_GRANDES, SUP_REFORZADO: CON_GRANDES, SUP_COLGANTE: CON_GRANDES,
  ESTANDAR170: SIN_GRANDES, REFORZADO170: SIN_GRANDES, IMPERIAL: SIN_GRANDES,
  REGADERAS: SIN_GRANDES, SCUDO: SIN_GRANDES, COLGANTE: SIN_GRANDES,
  SUP_ESTANDAR170: SIN_GRANDES, SUP_REFORZADO170: SIN_GRANDES, TL_S3: SIN_GRANDES,
}

const igual = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i])

console.log('— el panel de cada modelo, a su alto, en cada país')
for (const pais of ['MX', 'CR'] as const)
  for (const linea of ['LEEDER', 'SUPERIOR', 'TOUCHLESS'] as Linea[])
    for (const m of MODELOS[linea]) {
      const salen = anchosPanelFabrica(m.codigo, undefined, pais)
      const esperado = m.codigo === 'IMPERIAL' && pais === 'CR'
        ? SIN_GRANDES.filter((a) => a !== 95)
        : PANEL_ESPERADO[m.codigo]
      ok(esperado != null && igual(salen, esperado),
        `${pais} · ${m.codigo} (panel de ${alturasDe(m.codigo).panel}) → ${salen.join(" ")}`)
    }

console.log('')
console.log('— el panel de 95 de Imperial es solo de México')
ok(anchosPanelFabrica('IMPERIAL', undefined, 'MX').includes(95), 'en México sí')
ok(!anchosPanelFabrica('IMPERIAL', undefined, 'CR').includes(95), 'en Costa Rica no')
ok(anchosPanelFabrica('ESTANDAR', undefined, 'CR').includes(95), 'y en los demás modelos sigue estando')

console.log('')
console.log('— los altos de pieza del S3 que se pueden elegir')
// el chip mueve puerta y panel juntos: la puerta de S3 solo existe a 150,
// 170 y 180 en las DOS listas, así que esos son los tres en los dos países
ok(alturasElegibles('TL_S3', 'MX').join(' ') === '150 170 180', `México → ${alturasElegibles("TL_S3", "MX").join(" ")}`)
ok(alturasElegibles('TL_S3', 'CR').join(' ') === '150 170 180', `internacional → ${alturasElegibles("TL_S3", "CR").join(" ")}`)
// el panel sí se fabrica más bajo en la internacional, y ahí llega a 180 de ancho
ok(igual(anchosPanelFabrica('TL_S3', 130, 'CR'), CON_GRANDES), 'el panel a 130 de alto llega a 180 de ancho')

console.log('— Touchless S3 deja elegir el alto, y el panel cambia con él')
for (const alto of alturasElegibles('TL_S3')) {
  const salen = anchosPanelFabrica('TL_S3', alto)
  ok(igual(salen, alto <= 150 ? CON_GRANDES : SIN_GRANDES), `a ${alto} de alto → ${salen.join(' ')}`)
}
ok(!anchosPanelFabrica('TL_S3', 180).includes(180), 'el 180 x 180 no existe')
ok(anchosPanelFabrica('TL_S3', 150).includes(180), 'pero el 180 x 150 sí')

console.log('')
console.log('— puertas, pilastras y mamparas de mingitorio')
ok(igual(ANCHOS_PUERTA, [55, 60, 70, 75, 85, 90, 100]), `puerta → ${ANCHOS_PUERTA.join(' ')}`)
ok(igual(ANCHOS_PILASTRA, [10, 12, 15, 17, 19, 24, 30, 35, 40, 45, 50, 55, 60, 70, 85, 90, 100, 120]),
  `pilastra → ${ANCHOS_PILASTRA.join(' ')}`)
ok(mgMedidas('LEEDER').map((m) => `${m.anchoCm}x${m.altoCm}`).join(' ') === '45x120 60x120 60x150',
  'LEEDER: 45x120 60x120 60x150')
ok(mgMedidas('SUPERIOR').map((m) => `${m.anchoCm}x${m.altoCm}`).join(' ') === '45x120 60x150',
  'Superior 2.0: 45x120 60x150, sin el 60x120')

console.log('')
console.log('— alturas de pilastra que la lista sí tiene')
for (const [modelo, validas] of [
  ['COLGANTE', [210, 220, 240, 260, 300]],
  ['SUP_COLGANTE', [210, 220, 240, 260, 300]],
  ['SCUDO', [210, 220, 240, 260, 270, 300]],
  ['IMPERIAL', [190]], ['KIDS', [150]],
  ['ESTANDAR', [180]], ['ESTANDAR170', [180]], ['REGADERAS', [180]],
  ['SUP_ESTANDAR', [180]], ['SUP_ESTANDAR170', [180]],
  ['REFORZADO', [210]], ['REFORZADO170', [210]], ['TL_S3', [210]],
  ['SUP_REFORZADO', [210]], ['SUP_REFORZADO170', [210]],
] as const) {
  const alto = alturasDe(modelo).pilastra
  ok((validas as readonly number[]).includes(alto), `${modelo} → pilastra de ${alto}`)
}

console.log(mal === 0 ? '\nTodo cuadra con la lista.' : `\n${mal} medida(s) fuera de la lista.`)
process.exit(mal === 0 ? 0 : 1)
