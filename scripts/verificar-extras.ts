/**
 * Comprueba que lo que cobra la app por un herraje o un grabado es EXACTAMENTE
 * lo que dice la lista de precios, en dólares y en colones.
 *
 * No compara contra el archivo generado —eso sería comparar el generador
 * consigo mismo— sino contra el .xlsx leído de nuevo, celda por celda.
 *
 *   npm run verificar-extras "<ruta de la lista>.xlsx"
 */
import { precioDeExtra } from '../src/extras'
import { HERRAJES, GRABADOS } from '../src/datos/articulos'
import type { Extra } from '../src/types'
import { leerListas } from './leer-listas'

const TC = 512
const ruta = process.argv[2]
const lista = leerListas(ruta)

const uno = (codigo: string, tipo: Extra['tipo']): Extra =>
  ({ id: 'x', tipo, codigo, descripcion: '', cantidad: 1 }) as unknown as Extra

let mal = 0
let bien = 0
const avisos: string[] = []

function revisar(tipo: 'herraje' | 'grabado', codigo: string) {
  const enLista = lista.get(codigo.toUpperCase())
  if (!enLista) { avisos.push(`  ${codigo}: no está en la lista de mayo (viene de la de México)`); return }
  const o = { modeloCodigo: 'REFORZADO', tier: 'linea' as const, tipoCambio: TC }

  if (enLista.usd != null) {
    const { precio } = precioDeExtra(uno(codigo, tipo), { ...o, moneda: 'USD' })
    if (Math.abs(precio - enLista.usd) > 0.005) { mal++; console.log(`  ✕ ${codigo} USD: cobra ${precio} y la lista dice ${enLista.usd}`) } else bien++
  }
  if (enLista.crc != null) {
    const { precio } = precioDeExtra(uno(codigo, tipo), { ...o, moneda: 'CRC' })
    if (Math.abs(precio - enLista.crc) > 0.005) { mal++; console.log(`  ✕ ${codigo} CRC: cobra ${precio} y la lista dice ${enLista.crc}`) } else bien++
  } else if (enLista.usd != null) {
    // sin precio en colones, la regla es convertir desde el dólar
    const { precio } = precioDeExtra(uno(codigo, tipo), { ...o, moneda: 'CRC' })
    const esperado = enLista.usd * TC
    if (Math.abs(precio - esperado) > 0.005) { mal++; console.log(`  ✕ ${codigo} CRC convertido: cobra ${precio} y debería ser ${esperado}`) } else bien++
  }
}

console.log('— herrajes')
for (const a of HERRAJES) revisar('herraje', a.codigo)
console.log('— grabados láser (no tienen hoja de CR: se convierten con el tipo de cambio)')
for (const a of GRABADOS) revisar('grabado', a.codigo)

if (avisos.length) {
  console.log(`\n${avisos.length} artículo(s) que no están en esta lista:`)
  for (const a of avisos) console.log(a)
}
console.log(`\n${bien} precio(s) cuadran · ${mal} mal`)
process.exit(mal === 0 ? 0 : 1)
