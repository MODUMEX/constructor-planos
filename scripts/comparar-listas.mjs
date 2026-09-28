import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const XLSX = require('xlsx')
const [A, B] = process.argv.slice(2)
const wa = XLSX.readFile(A), wb = XLSX.readFile(B)
let totales = 0
for (const h of wa.SheetNames) {
  if (!wb.Sheets[h]) { console.log(`${h}: solo en el primero`); continue }
  const fa = XLSX.utils.sheet_to_json(wa.Sheets[h], { header: 1, blankrows: true, raw: true })
  const fb = XLSX.utils.sheet_to_json(wb.Sheets[h], { header: 1, blankrows: true, raw: true })
  const difs = []
  const filas = Math.max(fa.length, fb.length)
  for (let i = 0; i < filas; i++) {
    const ra = fa[i] || [], rb = fb[i] || []
    for (let j = 0; j < Math.max(ra.length, rb.length); j++) {
      const x = ra[j], y = rb[j]
      const ig = typeof x === 'number' && typeof y === 'number'
        ? Math.abs(x - y) < 0.005
        : String(x ?? '').trim() === String(y ?? '').trim()
      if (!ig) difs.push({ fila: i + 1, col: j, x, y, rotulo: String(ra[1] ?? rb[1] ?? '').trim() })
    }
  }
  totales += difs.length
  if (!difs.length) { console.log(`${h.padEnd(24)} ✓ igual`); continue }
  const primera = Math.min(...difs.map((d) => d.fila))
  const cuadro = difs.filter((d) => d.fila <= 12).length
  console.log(`${h.padEnd(24)} ✕ ${difs.length} celda(s); la primera en la fila ${primera}; en el cuadro de arriba (filas 1-12): ${cuadro}`)
  const que = [...new Set(difs.map((d) => d.rotulo).filter(Boolean))]
  if (que.length) console.log(`     renglones afectados: ${que.slice(0, 8).join(' · ')}${que.length > 8 ? ` …(+${que.length - 8})` : ''}`)
}
console.log(`\nTOTAL de celdas distintas: ${totales}`)
