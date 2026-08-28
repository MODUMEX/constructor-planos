import { readdirSync, statSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
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
 * Las fotos de herrajes tienen su propio importador,
 * `scripts/importar-herrajes.mjs`, porque van por línea y por acabado del juego.
 */

const RAIZ = new URL('..', import.meta.url).pathname.replace(/^\//, '')
const SALIDA = join(RAIZ, 'public', 'renders')

const origenRenders = process.argv[2] || 'C:/Users/NancyLizano/Downloads/Reeders/RENDER CON MARCA DE AGUA'

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

const indice = {}
const descartados = []
const fueraDeCatalogo = new Set()

if (existsSync(SALIDA)) rmSync(SALIDA, { recursive: true })
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

  if (!modelo || !color) {
    descartados.push({ relativo, motivo: !modelo ? 'no se reconoce el modelo' : 'no se reconoce el color' })
    continue
  }

  const clave = `${linea}|${modelo}|${acabado}|${color}`
  if (indice[clave]) {
    descartados.push({ relativo, motivo: `repetido, ya había foto para ${clave}` })
    continue
  }
  if (['blanco-antiguo', 'holly', 'lapis', 'esmalte-beige', 'esmalte-blanco'].includes(color)) fueraDeCatalogo.add(color)

  const salida = `${sinTildes(linea)}-${sinTildes(modelo).replace(/_/g, '')}-${acabado}-${color}.webp`
  await sharp(ruta).resize({ width: 1100, withoutEnlargement: true }).webp({ quality: 74 }).toFile(join(SALIDA, salida))
  indice[clave] = `renders/${salida}`
}

const ts = `/* GENERADO por scripts/importar-renders.mjs — no editar a mano */

/** clave: linea|modelo|acabado(lam|esm|inox)|color, valor: ruta dentro de public/ */
export const RENDERS: Record<string, string> = ${JSON.stringify(indice, null, 2)}

/**
 * Colores que vinieron en los renders de Superior 2.0 y que NO están en el
 * catálogo del Constructor, así que hoy no se pueden elegir. Quedan indexados
 * por si mercadeo confirma que entran a la lista.
 */
export const COLORES_FUERA_DE_CATALOGO = ${JSON.stringify([...fueraDeCatalogo].sort(), null, 2)}
`
writeFileSync(join(RAIZ, 'src', 'datos', 'renders.ts'), ts, 'utf8')

console.log(`renders: ${Object.keys(indice).length} de ${listaRenders.length} archivos`)
if (fueraDeCatalogo.size) console.log(`colores fuera de catálogo: ${[...fueraDeCatalogo].sort().join(', ')}`)
for (const d of descartados) console.log(`  descartado: ${d.relativo} — ${d.motivo}`)
