/**
 * Lee los precios por unidad directamente del .xlsx de la lista, sin pasar por
 * el archivo generado: es contra esto que se comprueba lo que cobra la app.
 *
 * Dos hojas de herrajes: la de LATAM en dólares y la de Costa Rica en colones.
 * Los rótulos de la hoja de CR dicen "Precios en USD" por copiar el encabezado,
 * pero los montos son colones, así que la moneda se fija acá. La excepción es
 * el bloque de la línea LUX, que en las dos hojas viene en pesos.
 *
 * Necesita el paquete `xlsx`, que NO está en package.json a propósito: el
 * workflow de publicación corre `npm ci` y agregarlo sin regenerar el
 * package-lock rompería el release. Se instala a mano cuando hace falta:
 *   npm i -D xlsx --no-save
 */
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

export interface PrecioDeLista {
  usd: number | null
  crc: number | null
}

function ultimaLinea(celda: unknown): string {
  const partes = String(celda ?? '').split(/[\r\n]+/).map((x) => x.trim()).filter(Boolean)
  return partes.length ? partes[partes.length - 1] : ''
}

export function leerListas(ruta: string): Map<string, PrecioDeLista> {
  let XLSX
  try {
    XLSX = require('xlsx')
  } catch {
    throw new Error('falta el paquete xlsx: corré  npm i -D xlsx --no-save')
  }
  const wb = XLSX.readFile(ruta)
  const salida = new Map<string, PrecioDeLista>()

  const guardar = (codigo: string, campo: 'usd' | 'crc', valor: number) => {
    const clave = codigo.toUpperCase()
    const a = salida.get(clave) ?? { usd: null, crc: null }
    if (a[campo] == null) a[campo] = Math.round(valor * 100) / 100
    salida.set(clave, a)
  }

  for (const [hoja, campo] of [['Herrajes Por Familia', 'usd'], ['Herrajes Por Familia CR', 'crc']] as const) {
    const f: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[hoja], { header: 1, blankrows: false })
    const iCab = f.findIndex((r) => (r || []).some((c) => ['CÓDIGO', 'CODIGO', 'CODIGO SAP'].includes(String(c ?? '').trim().toUpperCase())))
    const cab = f[iCab] || []
    cab.forEach((c, k) => {
      const rot = String(c ?? '').trim().toUpperCase()
      if (!['CÓDIGO', 'CODIGO', 'CODIGO SAP'].includes(rot)) return
      let iDesc = -1
      let iPrecio = -1
      for (let j = k + 1; j < Math.min(k + 5, cab.length); j++) {
        const r = String(cab[j] ?? '').trim().toUpperCase()
        if (r.startsWith('DESCRIPCI')) iDesc = j
        if (r.startsWith('PRECIO')) iPrecio = j
      }
      if (iDesc < 0 || iPrecio < 0) return
      // el bloque de LUX viene en pesos: ese no entra en esta comprobación
      const nota = f.slice(0, iCab).map((r) => String((r || [])[k] ?? '')).join(' ').toUpperCase()
      if (nota.includes('MXN')) return
      for (let i = iCab + 1; i < f.length; i++) {
        const codigo = ultimaLinea((f[i] || [])[k])
        const desc = String((f[i] || [])[iDesc] ?? '').trim()
        const precio = (f[i] || [])[iPrecio]
        if (!codigo || !desc || typeof precio !== 'number' || !Number.isFinite(precio)) continue
        guardar(codigo, campo, precio)
      }
    })
  }

  // los grabados láser: una sola hoja, en dólares
  const g: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets['Grabados Láser'], { header: 1, blankrows: false })
  const iCab = g.findIndex((r) => (r || []).some((c) => String(c ?? '').trim().toUpperCase() === 'CÓDIGO'))
  const cab = g[iCab] || []
  const kCod = cab.findIndex((c) => String(c ?? '').trim().toUpperCase() === 'CÓDIGO')
  const kDesc = cab.findIndex((c) => String(c ?? '').trim().toUpperCase().startsWith('DESCRIPCI'))
  const kPre = cab.findIndex((c) => String(c ?? '').trim().toUpperCase().startsWith('PRECIO'))
  for (let i = iCab + 1; i < g.length; i++) {
    const codigo = ultimaLinea((g[i] || [])[kCod])
    const desc = String((g[i] || [])[kDesc] ?? '').trim()
    const precio = (g[i] || [])[kPre]
    if (!codigo || !desc || typeof precio !== 'number') continue
    guardar(codigo, 'usd', precio)
  }

  return salida
}
