/**
 * Los precios de las piezas extra, en las tres monedas.
 *   npm run probar-extras
 */
import { precioDeExtra, catalogoDe } from '../src/extras'
import { HERRAJES, GRABADOS } from '../src/datos/articulos'
import type { Extra } from '../src/types'

const base = { modeloCodigo: 'REFORZADO', tier: 'linea' as const, tipoCambio: 512 }
const uno = (codigo: string, tipo: Extra['tipo'] = 'herraje'): Extra =>
  ({ id: 'x', tipo, codigo, descripcion: '', cantidad: 1 }) as unknown as Extra

console.log(`catálogo: ${HERRAJES.length} herrajes · ${GRABADOS.length} grabados`)
const con = (c: keyof (typeof HERRAJES)[number]) => HERRAJES.filter((a) => a[c] != null).length
console.log(`  con USD ${con('usd')} · con CRC ${con('crc')} · con MXN ${con('mxn')}`)

for (const c of ['KBDL', 'KU', 'KACE-S3', 'CERRADURA-S1', 'KFP-S3']) {
  const a = HERRAJES.find((x) => x.codigo === c)
  if (!a) { console.log(`  ✕ falta ${c}`); continue }
  const usd = precioDeExtra(uno(c), { ...base, moneda: 'USD' })
  const crc = precioDeExtra(uno(c), { ...base, moneda: 'CRC' })
  const mxn = precioDeExtra(uno(c), { ...base, moneda: 'MXN' })
  const propio = a.crc != null && Math.abs(crc.precio - a.crc) < 0.01
  console.log(
    `  ${c.padEnd(16)} USD ${usd.precio.toFixed(2).padStart(9)} · CRC ${crc.precio.toFixed(2).padStart(12)} ${propio ? '(lista CR)' : '(convertido)'} · MXN ${mxn.precio.toFixed(2).padStart(9)}${mxn.deLista ? '' : ' sin lista'}`,
  )
}

console.log('\ngrabado láser (no tiene lista de CR: se convierte)')
for (const c of ['GL03-HPL']) {
  const usd = precioDeExtra(uno(c, 'grabado'), { ...base, moneda: 'USD' })
  const crc = precioDeExtra(uno(c, 'grabado'), { ...base, moneda: 'CRC' })
  console.log(`  ${c}: USD ${usd.precio} · CRC ${crc.precio.toFixed(2)} (= USD × 512)`)
}

const sinNada = catalogoDe('herraje').filter((a) => a.usd == null && a.crc == null && a.mxn == null)
console.log(`\nartículos sin ningún precio: ${sinNada.length}`)
const soloUna = catalogoDe('herraje').filter((a) => [a.usd, a.crc, a.mxn].filter((x) => x != null).length === 1)
console.log(`artículos con precio en una sola lista: ${soloUna.length} · ${soloUna.map((a) => a.codigo).join(', ')}`)
