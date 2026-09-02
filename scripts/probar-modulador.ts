/**
 * Mide el buscador de modulación contra los despieces REALES de abril 2026.
 *
 *   npm run probar-modulador
 *
 * Solo entran los casos de TIRA RECTA: las U son tres tramos y el despiece es
 * del área completa, así que no sirven para medir una tira sola.
 */

import { modularTira } from '../src/modulador'

interface Caso {
  nombre: string
  puertas: number
  murosPilastra: number
  /** lo que dice el despiece del plano ya fabricado */
  esperado: { puerta: number; pilastras: number[] }
}

const CASOS: Caso[] = [
  {
    nombre: 'CERVECERÍA 23446 · Hombres (1 muro)',
    puertas: 2,
    murosPilastra: 1,
    esperado: { puerta: 60, pilastras: [24, 24, 12] },
  },
  {
    nombre: 'CERVECERÍA 23446 · Mujeres (2 muros)',
    puertas: 3,
    murosPilastra: 2,
    esperado: { puerta: 60, pilastras: [30, 30, 17, 15] },
  },
]

const suma = (a: number[]) => a.reduce((s, x) => s + x, 0)
const ordenado = (a: number[]) => [...a].sort((x, y) => y - x).join(',')

let bien = 0
for (const c of CASOS) {
  const totalReal = c.esperado.puerta * c.puertas + suma(c.esperado.pilastras)
  // se despeja el claro que produce ese total: total = claro − muros + 1,5·puertas
  const claroCm = totalReal + c.murosPilastra - 1.5 * c.puertas

  const r = modularTira({ claroCm, puertas: c.puertas, murosPilastra: c.murosPilastra })
  console.log(`\n${c.nombre}`)
  console.log(`  claro deducido:  ${claroCm} cm`)
  console.log(`  esperado:        PT${c.esperado.puerta} × ${c.puertas} + PI ${c.esperado.pilastras.join(', ')}  = ${totalReal}`)
  if (!r) {
    console.log('  obtenido:        (sin solución)')
    continue
  }
  console.log(`  obtenido:        PT${r.anchoPuerta} × ${c.puertas} + PI ${r.pilastras.join(', ')}  = ${r.total}`)
  console.log(`  ajuste:          ${r.mensaje}`)

  const puertaOk = r.anchoPuerta === c.esperado.puerta
  const pilOk = ordenado(r.pilastras) === ordenado(c.esperado.pilastras)
  const totalOk = r.total === totalReal
  if (puertaOk && pilOk && totalOk) {
    bien++
    console.log('  → REPRODUCE el despiece')
  } else {
    const fallas = [
      !puertaOk ? 'puerta' : '',
      !pilOk ? `pilastras (esperadas ${ordenado(c.esperado.pilastras)}, salieron ${ordenado(r.pilastras)})` : '',
      !totalOk ? `total (${totalReal} vs ${r.total})` : '',
    ].filter(Boolean)
    console.log('  → NO reproduce: ' + fallas.join(' · '))
  }
}

console.log(`\n${bien} de ${CASOS.length} casos reproducidos`)
