/**
 * Banco de pruebas de la modulación contra DESPIECES REALES de abril 2026.
 *
 * Cada caso salió del PDF de un plano ya fabricado. Sirve para dos cosas:
 *  1. comprobar que las medidas usadas existen en el catálogo, y
 *  2. medir si el buscador de modulación reproduce esas mismas piezas.
 *
 *   node scripts/probar-modulacion.mjs
 */

const ANCHOS_PUERTA = [55, 60, 62, 64, 70, 75, 85, 90, 92, 94, 100]
const ANCHOS_PILASTRA = [10, 12, 15, 17, 19, 24, 30, 35, 40, 45, 50, 55, 60, 70, 85, 90, 100, 120]

/** casos reales: puertas y pilastras tal como salen del despiece del plano */
const CASOS = [
  { plano: 'CERVECERÍA 23446', area: 'Hombres', puertas: [60, 60], pilastras: [24, 24, 12] },
  { plano: 'CERVECERÍA 23446', area: 'Mujeres', puertas: [60, 60, 60], pilastras: [30, 30, 17, 15] },
  { plano: 'KG EMPLEADOS 23447', area: 'Mujeres', puertas: [60, 60], pilastras: [50, 50, 10] },
  { plano: 'KG EMPLEADOS 23447', area: 'Hombres', puertas: [60, 60], pilastras: [50, 45, 10] },
  { plano: 'KG 23448', area: 'Mujeres', puertas: [100, 60, 60, 60], pilastras: [45, 45, 24, 15, 10] },
]

const suma = (a) => a.reduce((s, x) => s + x, 0)

console.log('CASO'.padEnd(34) + 'PUERTAS'.padEnd(10) + 'PILASTRAS'.padEnd(12) + 'SUMA'.padEnd(9) + 'FUERA DE CATÁLOGO')
console.log('-'.repeat(92))

let fuera = 0
for (const c of CASOS) {
  const nP = c.puertas.length
  const nPil = c.pilastras.length
  const total = suma(c.puertas) + suma(c.pilastras)
  const malas = [
    ...c.puertas.filter((a) => !ANCHOS_PUERTA.includes(a)).map((a) => `PT${a}`),
    ...c.pilastras.filter((a) => !ANCHOS_PILASTRA.includes(a)).map((a) => `PI${a}`),
  ]
  if (malas.length) fuera++
  console.log(
    `${c.plano} · ${c.area}`.padEnd(34) +
      String(nP).padEnd(10) +
      String(nPil).padEnd(12) +
      `${total} cm`.padEnd(9) +
      (malas.length ? malas.join(', ') : '—'),
  )
}

console.log('\n--- estructura observada ---')
for (const c of CASOS) {
  const nP = c.puertas.length
  const nPil = c.pilastras.length
  const grandes = c.pilastras.filter((a) => a >= 24).length
  const chicas = c.pilastras.filter((a) => a < 24).length
  console.log(
    `${c.plano} · ${c.area}`.padEnd(34) +
      `puertas ${nP}, pilastras ${nPil} ` +
      `(${nPil === nP + 1 ? 'N+1 ✓' : 'NO es N+1 ✗'})  ` +
      `≥24: ${grandes}  <24: ${chicas}`,
  )
}

console.log('\n--- ¿cuántas pilastras distintas por caso? ---')
for (const c of CASOS) {
  const unicas = [...new Set(c.pilastras)].sort((a, b) => b - a)
  console.log(`${c.plano} · ${c.area}`.padEnd(34) + `${unicas.length} medidas: ${unicas.join(', ')}`)
}

console.log(`\nCasos con piezas fuera de catálogo: ${fuera} de ${CASOS.length}`)
