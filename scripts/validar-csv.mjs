/**
 * Valida un CSV contra las mismas reglas que usa el CIP para importarlo
 * (importarOCConstructorPlanos en Calculo_de_Materiales.html):
 *   · busca las columnas por nombre, en minúsculas
 *   · exige sku, cantidad y subtipo
 *   · decodifica el SKU con /LM1LCRF(PT|PN|PL|MG|CN)(\d+)/, donde el alto son
 *     los últimos tres dígitos y el resto es el ancho
 *   node scripts/validar-csv.mjs ruta.csv
 */
import { readFileSync } from 'node:fs'

const ruta = process.argv[2]
if (!ruta) {
  console.error('falta la ruta del CSV')
  process.exit(1)
}

function partirLinea(linea) {
  const out = []
  let cur = ''
  let enComillas = false
  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i]
    if (enComillas) {
      if (ch === '"') {
        if (linea[i + 1] === '"') { cur += '"'; i++ } else enComillas = false
      } else cur += ch
    } else if (ch === '"') enComillas = true
    else if (ch === ',') { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function decodificar(sku) {
  const m = (sku || '').toUpperCase().match(/LM1LCRF(PT|PN|PL|MG|CN)(\d+)/)
  if (!m) return null
  const num = m[2]
  if (num.length < 4) return { familia: m[1], ancho: 0, alto: Number(num) }
  return { familia: m[1], alto: Number(num.slice(-3)), ancho: Number(num.slice(0, -3)) }
}

const texto = readFileSync(ruta, 'utf8').replace(/^﻿/, '')
const lineas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
const cabecera = partirLinea(lineas[0]).map((h) => h.toLowerCase())
const col = (n) => cabecera.indexOf(n)

const iSku = col('sku'), iCant = col('cantidad'), iSub = col('subtipo')
const obligatorias = { sku: iSku, cantidad: iCant, subtipo: iSub }
const faltan = Object.entries(obligatorias).filter(([, v]) => v < 0).map(([k]) => k)

console.log(`Columnas (${cabecera.length}): ${cabecera.join(', ')}`)
if (faltan.length) {
  console.log(`✕ El CIP rechazaría el archivo: faltan ${faltan.join(', ')}`)
  process.exit(1)
}
console.log('✓ Encabezado reconocido por el CIP')

const opcionales = ['area', 'modelo', 'sistema', 'color', 'kap', 'obra', 'codigo', 'distribuidor', 'linea', 'acabado']
const sinLeer = opcionales.filter((n) => col(n) < 0)
console.log(sinLeer.length ? `⚠ El CIP no encontraría: ${sinLeer.join(', ')}` : '✓ Están las 14 columnas que el CIP busca')

let piezas = 0
let ignoradas = 0
const noDecodifican = []
const porFamilia = {}
const areas = new Set()
const iArea = col('area')

for (let i = 1; i < lineas.length; i++) {
  const c = partirLinea(lineas[i])
  const sku = c[iSku]
  const cant = parseInt(c[iCant], 10)
  const sub = (c[iSub] || '').toUpperCase()
  if (!sku || !cant || !sub) { ignoradas++; continue }
  const d = decodificar(sku)
  if (!d) { noDecodifican.push(sku); continue }
  piezas += cant
  porFamilia[d.familia] = (porFamilia[d.familia] ?? 0) + cant
  if (iArea >= 0) areas.add(c[iArea])
  console.log(`  ${sku.padEnd(22)} ${String(cant).padStart(3)} × ${sub.padEnd(10)} → ${d.familia} ${d.ancho} × ${d.alto} cm`)
}

console.log(`\nRenglones ignorados por el CIP: ${ignoradas}`)
console.log(noDecodifican.length ? `⚠ SKU que el CIP no decodifica: ${noDecodifican.join(', ')}` : '✓ Todos los SKU decodifican')
console.log(`Áreas: ${[...areas].join(' · ')}`)
console.log(`Piezas por familia: ${Object.entries(porFamilia).map(([f, n]) => `${f}=${n}`).join('  ')}`)
console.log(`Total de piezas: ${piezas}`)
