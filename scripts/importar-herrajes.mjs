import { readdirSync, statSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

/**
 * Toma las fotos de herrajes y arma el índice `src/datos/herrajes.ts`.
 *
 *   npm run herrajes            # usa ../Herrajes/HERRAJES, al lado del proyecto
 *   npm run herrajes -- "<otra carpeta>"
 *
 * La carpeta viene organizada por línea, tal como la mandó mercadeo:
 *
 *   HERRAJES/LEEDER/…            juego en acero inoxidable de LEEDER
 *   HERRAJES/SUPERIOR/…          el de Superior 2.0, que tiene piezas propias
 *   HERRAJES/NEGROS LEEDER/…     el juego negro
 *
 * Los negros son las mismas piezas de siempre pero en negro, y sirven para
 * todas las líneas: esas entradas salen sin `linea`, que es como se marca
 * "aplica a todas". Las de acero inoxidable sí van por línea, porque Superior
 * usa bisagra de autorretorno y su propia escuadra U.
 *
 * Los originales pesan hasta 6 MB cada uno, así que no van al repo: salen en
 * webp a 420 px, que es el ancho de la tarjeta.
 */

// con fileURLToPath en vez de .pathname, para que no se rompa si el proyecto
// vive en una carpeta con espacios o tildes —en OneDrive, por ejemplo
const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const SALIDA = join(RAIZ, 'public', 'herrajes')

const origen = process.argv[2] || join(RAIZ, '..', 'Herrajes', 'HERRAJES')

/**
 * De qué pieza es cada foto. El orden importa: se busca el primer token que
 * calce, así que los nombres largos van antes que los cortos —"cerrojo atras"
 * antes que "cerrojo"—. Las escuadras se reconocen por la letra sola, con
 * espacios a los lados.
 */
const PIEZAS = [
  ['cerrojo ocupacion', 'Cerrojo con indicador'],
  ['cerrojo con aviso', 'Cerrojo con indicador'],
  ['cerrojo atras', 'Contra del cerrojo'],
  ['cerrojo', 'Cerrojo'],
  ['bisagra', 'Bisagra'],
  ['abre puertas', 'Abrepuertas'],
  ['abrepuertas', 'Abrepuertas'],
  ['herrajes superior', 'Escuadras'],
  ['gancho', 'Gancho'],
  ['pata', 'Pata'],
  ['zoclo', 'Zoclo'],
  [' f ', 'Escuadra F'],
  [' t ', 'Escuadra T'],
  [' u ', 'Escuadra U'],
]

/** en qué orden se ven en la tira de la pantalla */
const ORDEN = [
  'Bisagra',
  'Cerrojo',
  'Cerrojo con indicador',
  'Contra del cerrojo',
  'Abrepuertas',
  'Gancho',
  'Escuadras',
  'Escuadra F',
  'Escuadra T',
  'Escuadra U',
  'Zoclo',
  'Pata',
]

/**
 * Fotos que hay que saltarse porque son la misma pieza repetida. Del zoclo de
 * LEEDER vinieron dos tomas y se queda la de tres cuartos, que es como están
 * fotografiadas las demás piezas.
 */
const IGNORAR = ['leeder/zoclo leeder.png']

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

/** la línea sale de la carpeta; las carpetas de negros no llevan línea */
function lineaDe(carpeta) {
  if (carpeta.startsWith('negros')) return null
  if (carpeta.includes('touchless')) return 'TOUCHLESS'
  if (carpeta.includes('superior')) return 'SUPERIOR'
  if (carpeta.includes('leeder')) return 'LEEDER'
  return null
}

function slug(pieza) {
  return sinTildes(pieza).replace(/[^a-z]+/g, '-')
}

if (!existsSync(origen)) {
  console.error(`No encuentro la carpeta de herrajes: ${origen}`)
  process.exit(1)
}

const fotos = []
const descartados = []
const vistos = new Set()

if (existsSync(SALIDA)) rmSync(SALIDA, { recursive: true })
mkdirSync(SALIDA, { recursive: true })

/**
 * Las fotos sin fondo van primero para que ganen el desempate contra la misma
 * pieza fotografiada sobre un fondo.
 */
const lista = archivos(origen).sort((a, b) => {
  const sf = (r) => (sinTildes(r).includes('sin fondo') ? 0 : 1)
  return sf(a) - sf(b) || a.localeCompare(b)
})

for (const ruta of lista) {
  const relativo = sinTildes(relative(origen, ruta).split(sep).join('/'))
  if (IGNORAR.includes(relativo)) {
    descartados.push({ relativo, motivo: 'repetida a propósito, ya hay otra toma de esa pieza' })
    continue
  }

  const carpeta = relativo.split('/')[0]
  const acabado = carpeta.startsWith('negros') ? 'NEGRO' : 'INOX'
  const linea = lineaDe(carpeta)

  if (acabado === 'INOX' && !linea) {
    descartados.push({ relativo, motivo: 'no se reconoce la línea de la carpeta' })
    continue
  }

  const nombre = ` ${sinTildes(relativo.split('/').pop()).replace(/[_.]/g, ' ')} `
  const pieza = PIEZAS.find(([token]) => nombre.includes(token))?.[1]
  if (!pieza) {
    descartados.push({ relativo, motivo: 'no se reconoce la pieza' })
    continue
  }

  const clave = `${acabado}|${linea ?? 'TODAS'}|${pieza}`
  if (vistos.has(clave)) {
    descartados.push({ relativo, motivo: `repetida, ya había foto para ${clave}` })
    continue
  }
  vistos.add(clave)

  const archivo = `${acabado.toLowerCase()}-${linea ? `${linea.toLowerCase()}-` : ''}${slug(pieza)}.webp`
  await sharp(ruta)
    .resize({ width: 420, withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .webp({ quality: 82 })
    .toFile(join(SALIDA, archivo))

  fotos.push({ ...(linea ? { linea } : {}), acabado, pieza, archivo: `herrajes/${archivo}` })
}

fotos.sort(
  (a, b) =>
    a.acabado.localeCompare(b.acabado) ||
    (a.linea ?? '').localeCompare(b.linea ?? '') ||
    ORDEN.indexOf(a.pieza) - ORDEN.indexOf(b.pieza),
)

const ts = `/* GENERADO por scripts/importar-herrajes.mjs — no editar a mano */

import type { HerrajeAcabado, Linea } from '../types'

/**
 * Fotos del juego de herrajes. Las de acero inoxidable van por línea, porque
 * Superior 2.0 tiene piezas propias. Las negras son las mismas piezas en negro
 * y sirven para todas las líneas: van sin \`linea\`.
 */
export const FOTOS_HERRAJES: { linea?: Linea; acabado: HerrajeAcabado; pieza: string; archivo: string }[] = ${JSON.stringify(
  fotos,
  null,
  2,
)}
`
writeFileSync(join(RAIZ, 'src', 'datos', 'herrajes.ts'), ts, 'utf8')

const porJuego = {}
for (const f of fotos) {
  const k = `${f.acabado}${f.linea ? ` ${f.linea}` : ' (todas las líneas)'}`
  porJuego[k] = (porJuego[k] ?? 0) + 1
}
console.log(`herrajes: ${fotos.length} fotos de ${lista.length} archivos`)
for (const [k, n] of Object.entries(porJuego)) console.log(`  ${k}: ${n}`)
for (const d of descartados) console.log(`  descartado: ${d.relativo} — ${d.motivo}`)
