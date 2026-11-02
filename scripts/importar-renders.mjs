import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

/**
 * Toma los renders que manda mercadeo, los baja a tamaño de pantalla y arma el
 * índice `src/datos/renders.ts`.
 *
 *   node scripts/importar-renders.mjs "<carpeta Reeders>"
 *
 * Los originales pesan 473 MB (PNG de 1920x1024), así que no van al repo:
 * salen en webp a 1100 px de ancho, que es más de lo que la tarjeta necesita.
 *
 * Con `--suma` no borra nada: deja el índice como está y solo agrega —o pisa—
 * lo que encuentre en la carpeta que se le pase. Es para las tandas sueltas
 * que manda mercadeo después, como los Touchless por alto, sin tener que
 * volver a bajar los 473 MB del paquete completo.
 *
 * Las fotos de herrajes tienen su propio importador,
 * `scripts/importar-herrajes.mjs`, porque van por línea y por acabado del juego.
 */

// fileURLToPath y no `.pathname`: la carpeta del proyecto tiene espacios y
// por ahí vienen escritos como %20, que no es una ruta que exista
const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const SALIDA = join(RAIZ, 'public', 'renders')
const INDICE = join(RAIZ, 'src', 'datos', 'renders.ts')

const argumentos = process.argv.slice(2).filter((a) => a !== '--suma')
const suma = process.argv.includes('--suma')
const origenRenders = argumentos[0] || 'C:/Users/NancyLizano/Downloads/Reeders/RENDER CON MARCA DE AGUA'

/** los ocho de línea más los dos de Superior, con los nombres de las fotos */
const COLORES = [
  ['gris metalizados', 'inox-satin'],
  ['gris metalizado', 'inox-satin'],
  ['gris metal', 'inox-satin'],
  ['fashion withe', 'blanco'],
  ['fashion white', 'blanco'],
  ['walnut heigthis', 'ambar-wood'],
  ['walnut heights', 'ambar-wood'],
  ['skyline walnut', 'nogal-grafito'],
  ['grafito nocturno', 'grafito-nocturno'],
  ['blanco antiguo', 'blanco-antiguo'],
  ['bco antiguo', 'blanco-antiguo'],
  ['blanco anti', 'blanco-antiguo'],
  ['blanco ant', 'blanco-antiguo'],
  ['bnco ant', 'blanco-antiguo'],
  ['neutral oak', 'neutral-oak'],
  ['gris oscuro', 'esmaltada-antigrafiti'],
  ['gris oscu', 'esmaltada-antigrafiti'],
  ['gris osc', 'esmaltada-antigrafiti'],
  ['alumina', 'gris'],
  ['skyline', 'nogal-grafito'],
  ['grafito', 'grafito-nocturno'],
  ['walnut', 'ambar-wood'],
  ['blanco', 'blanco'],
  ['bnco', 'blanco'],
  ['ebano', 'negro'],
  ['negro', 'negro'],
  ['holly', 'holly'],
  ['lapis', 'lapis'],
  ['beige', 'esmalte-beige'],
  ['bco', 'blanco'],
  ['gris', 'esmaltada-antigrafiti'],
]

/** carpeta -> el código con el que la tabla de tarifas conoce al modelo */
const MODELOS = [
  ['estandar 170', 'ESTANDAR170'],
  ['estandar170', 'ESTANDAR170'],
  ['reforzado 170', 'REFORZADO170'],
  ['mingitorios', '__ORINAL'],
  ['regaderas', '__REGADERA'],
  ['estandar', 'ESTANDAR'],
  ['reforzado', 'REFORZADO'],
  ['colgante', 'COLGANTE'],
  ['scudo', 'SCUDO'],
  ['kids', 'KIDS'],
]

const sinTildes = (s) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

function archivos(dir) {
  const salida = []
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta))
    else if (/\.(png|jpe?g)$/i.test(nombre)) salida.push(ruta)
  }
  return salida
}

/** el acabado sale del nombre del archivo, que es más confiable que la carpeta */
function acabadoDe(texto) {
  if (/\bacero\b/.test(texto)) return 'inox'
  if (/esm/.test(texto)) return 'esm'
  return 'lam'
}

function primerToken(tabla, texto) {
  for (const [token, valor] of tabla) if (texto.includes(token)) return valor
  return null
}

function lineaDe(relativo) {
  const t = sinTildes(relativo)
  if (t.startsWith('touchless')) return 'TOUCHLESS'
  if (t.startsWith('superior')) return 'SUPERIOR'
  return 'LEEDER'
}

/**
 * El alto de puerta y panel, cuando la foto es de un alto en particular.
 *
 * Solo Touchless S3 deja elegir el alto, y mercadeo manda una foto por cada
 * uno: "TOUCHLESS S3 170 - ALUMINA". Las del paquete original no traen el
 * número y son todas de 150, que es con lo que se renderizó esa tanda.
 *
 * Las demás líneas no eligen alto: una foto por modelo y color, sin alto en
 * la clave, y esa es la que sale siempre.
 */
function altoDe(nombreArchivo, linea) {
  if (linea !== 'TOUCHLESS') return null
  const m = nombreArchivo.match(/\b(170|180)\b/)
  return m ? Number(m[1]) : 150
}

/** lo que ya está en el índice, para el modo que suma en vez de rehacer */
function indicePrevio() {
  if (!suma || !existsSync(INDICE)) return { renders: {}, fuera: [] }
  const texto = readFileSync(INDICE, 'utf8')
  const renders = texto.match(/RENDERS: Record<string, string> = (\{[\s\S]*?\n\})/)
  const fuera = texto.match(/COLORES_FUERA_DE_CATALOGO = (\[[\s\S]*?\n\])/)
  return {
    renders: renders ? JSON.parse(renders[1]) : {},
    fuera: fuera ? JSON.parse(fuera[1]) : [],
  }
}

const previo = indicePrevio()
const indice = previo.renders
const descartados = []
const nuevos = new Set()
const pisados = []
const fueraDeCatalogo = new Set(previo.fuera)

if (!suma && existsSync(SALIDA)) rmSync(SALIDA, { recursive: true })
mkdirSync(SALIDA, { recursive: true })

const listaRenders = archivos(origenRenders).sort()
for (const ruta of listaRenders) {
  const relativo = relative(origenRenders, ruta).split(sep).join('/')
  const linea = lineaDe(relativo)
  const texto = sinTildes(relativo)
  const nombreArchivo = sinTildes(relativo.split('/').pop())

  const modelo = linea === 'TOUCHLESS' ? 'TL_S3' : primerToken(MODELOS, texto)
  const acabado = linea === 'SUPERIOR' ? acabadoDe(nombreArchivo) : 'lam'
  let color = acabado === 'inox' ? 'acero-inoxidable' : primerToken(COLORES, nombreArchivo)
  if (acabado === 'esm' && color === 'blanco') color = 'esmalte-blanco'
  const alto = altoDe(nombreArchivo, linea)

  if (!modelo || !color) {
    descartados.push({ relativo, motivo: !modelo ? 'no se reconoce el modelo' : 'no se reconoce el color' })
    continue
  }

  const clave = `${linea}|${modelo}|${acabado}|${color}${alto ? `|${alto}` : ''}`
  // Dos archivos de la misma combinación en la misma tanda: manda el primero.
  // Una que ya estaba del paquete anterior sí se pisa, que para eso se suma.
  if (nuevos.has(clave) || (indice[clave] && !suma)) {
    descartados.push({ relativo, motivo: `repetido, ya había foto para ${clave}` })
    continue
  }
  if (indice[clave]) pisados.push(clave)
  nuevos.add(clave)
  if (['blanco-antiguo', 'holly', 'lapis', 'esmalte-beige', 'esmalte-blanco'].includes(color)) fueraDeCatalogo.add(color)

  const salida = `${sinTildes(linea)}-${sinTildes(modelo).replace(/_/g, '')}-${acabado}-${color}${alto ? `-${alto}` : ''}.webp`
  await sharp(ruta).resize({ width: 1100, withoutEnlargement: true }).webp({ quality: 74 }).toFile(join(SALIDA, salida))
  indice[clave] = `renders/${salida}`
}

const ts = `/* GENERADO por scripts/importar-renders.mjs — no editar a mano */

/**
 * clave: linea|modelo|acabado(lam|esm|inox)|color[|alto], valor: ruta dentro
 * de public/. El alto lo llevan los modelos que lo dejan elegir —hoy solo
 * Touchless S3, con su foto de 150, de 170 y de 180—; los demás tienen una
 * sola foto por color y van sin alto.
 */
export const RENDERS: Record<string, string> = ${JSON.stringify(indice, null, 2)}

/**
 * Colores que vinieron en los renders de Superior 2.0 y que NO están en el
 * catálogo del Constructor, así que hoy no se pueden elegir. Quedan indexados
 * por si mercadeo confirma que entran a la lista.
 */
export const COLORES_FUERA_DE_CATALOGO = ${JSON.stringify([...fueraDeCatalogo].sort(), null, 2)}
`
writeFileSync(INDICE, ts, 'utf8')

console.log(`renders: ${Object.keys(indice).length} en el índice, ${nuevos.size} de ${listaRenders.length} archivos de esta tanda`)
if (pisados.length) console.log(`pisados: ${pisados.join(', ')}`)
if (fueraDeCatalogo.size) console.log(`colores fuera de catálogo: ${[...fueraDeCatalogo].sort().join(', ')}`)
for (const d of descartados) console.log(`  descartado: ${d.relativo} — ${d.motivo}`)
