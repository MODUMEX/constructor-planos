import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const XLSX = require('xlsx')
const [LISTA, ETIQUETA] = process.argv.slice(2)

// el cuadro de arriba de "L Std y Ref": la tarifa por m² de cada familia
const wb = XLSX.readFile(LISTA)
const f = XLSX.utils.sheet_to_json(wb.Sheets['L Std y Ref'], { header: 1, blankrows: true, raw: true })
const tarifa = {}
for (let i = 0; i < 12; i++) {
  const rot = String((f[i] || [])[1] ?? '').trim().toUpperCase()
  const linea = (f[i] || [])[2]
  if (typeof linea === 'number') tarifa[rot] = linea
}
const DE_FAMILIA = {
  PUERTA: 'PUERTAS', 'PANEL LATERAL': 'PANELES', PILASTRA: 'PILASTRAS',
  'PILASTRA REFORZADA': 'PL REFORZADA', MINGITORIO: 'MINGITORIOS',
}

let cuadran = 0, mal = 0
const ejemplos = []
for (let i = 12; i < f.length; i++) {
  const fila = f[i] || []
  const pieza = String(fila[1] ?? '').trim().toUpperCase()
  const ancho = fila[2], alto = fila[3], usd = fila[5]
  const clave = DE_FAMILIA[pieza]
  if (!clave || typeof ancho !== 'number' || typeof alto !== 'number' || typeof usd !== 'number') continue
  const esperado = ancho * alto * tarifa[clave]
  if (Math.abs(esperado - usd) < 0.02) cuadran++
  else {
    mal++
    if (ejemplos.length < 5) {
      const conQue = Object.entries(tarifa).find(([, v]) => Math.abs(ancho * alto * v - usd) < 0.02)
      ejemplos.push(`  fila ${i + 1}  ${pieza} ${ancho}×${alto}:  dice ${usd.toFixed(2)}, con su tarifa daría ${esperado.toFixed(2)}${conQue ? `  (está usando la de ${conQue[0]})` : ''}`)
    }
  }
}
console.log(`${ETIQUETA}`)
console.log(`   tarifas del cuadro: ${Object.entries(tarifa).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
console.log(`   renglones que cuadran con su propia tarifa: ${cuadran}`)
console.log(`   renglones que NO cuadran: ${mal}`)
for (const e of ejemplos) console.log(e)
