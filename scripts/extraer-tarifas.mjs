/**
 * Saca el bloque `preciosPorM2` del Constructor actual y lo deja como módulo TS.
 * Son las tarifas de respaldo: cuando hay Supabase, las de `tarifa_m2` mandan.
 *   node scripts/extraer-tarifas.mjs "..\Constructor de planos\Constructor de Planos.html"
 */
import { readFileSync, writeFileSync } from 'node:fs'

const origen = process.argv[2] ?? '../Constructor de planos/Constructor de Planos.html'
const html = readFileSync(origen, 'utf8')

const inicio = html.indexOf('preciosPorM2: {')
if (inicio < 0) {
  console.error('no encontré preciosPorM2 en el archivo')
  process.exit(1)
}

// recorro contando llaves hasta cerrar el objeto
let i = html.indexOf('{', inicio)
let nivel = 0
let fin = -1
for (let j = i; j < html.length; j++) {
  if (html[j] === '{') nivel++
  else if (html[j] === '}') {
    nivel--
    if (nivel === 0) {
      fin = j + 1
      break
    }
  }
}
const cuerpo = html.slice(i, fin)
const datos = eval(`(${cuerpo})`)

const modelos = Object.keys(datos)
console.log(`modelos: ${modelos.length} → ${modelos.join(', ')}`)

const salida = `/**
 * Tarifas por m² de respaldo, copiadas del Constructor actual con
 * \`npm run tarifas\`. Se usan cuando no hay Supabase; con la nube activa
 * las de la tabla \`tarifa_m2\` las reemplazan al entrar.
 *
 * Estructura: modelo → juego de tarifas → familia de pieza.
 * Los juegos son \`linea\` y \`especiales\` en dólares, con sus versiones
 * \`lineaCRC\`/\`especialesCRC\` en colones; los modelos \`usdOnly\` cotizan
 * en dólares y usan \`lineaCR\` para el precio de línea en Costa Rica.
 */
import type { TablaTarifas } from '../tarifas'

export const TARIFAS_BASE: TablaTarifas = ${JSON.stringify(datos, null, 2)}
`

const destino = 'src/datos/tarifas-base.ts'
writeFileSync(destino, salida, 'utf8')
console.log(`escrito ${destino} (${(salida.length / 1024).toFixed(1)} KB)`)
