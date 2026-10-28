/**
 * Las medidas que ofrece el Constructor contra la lista de precios de México.
 *
 * La lista de mayo 2026 trae el 165 y el 180 de ancho SOLO con el panel a 150
 * de alto —en Kids, a 130—. De 170 para arriba ningún panel pasa de 150, así
 * que el 180 x 180 de Touchless S3 no se fabrica.
 *
 *   npm run probar-medidas-mx
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

console.log('— el panel de cada modelo, a su alto')
for (const linea of ['LEEDER', 'SUPERIOR', 'TOUCHLESS'] as Linea[])
  for (const m of MODELOS[linea]) {
    const salen = anchosPanelFabrica(m.codigo)
    const esperado = PANEL_ESPERADO[m.codigo]
    ok(esperado != null && igual(salen, esperado),
      `${m.codigo} (panel de ${alturasDe(m.codigo).panel}) → ${salen.join(' ')}`)
  }

console.log('')
console.log('— Touchless S3 deja elegir el alto, y el panel cambia con él')
for (const alto of alturasElegibles('TL_S3')) {
  const salen = anchosPanelFabrica('TL_S3', alto)
  ok(igual(salen, alto === 150 ? CON_GRANDES : SIN_GRANDES), `a ${alto} de alto → ${salen.join(' ')}`)
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
