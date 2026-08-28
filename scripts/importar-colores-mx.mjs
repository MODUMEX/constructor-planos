import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { inflateRawSync } from 'node:zlib'

/**
 * Lee "colores x codigo.xlsx" (la lista de materia prima de la planta de
 * México) y arma `src/datos/colores-mx.ts`.
 *
 *   node scripts/importar-colores-mx.mjs "<ruta del xlsx>"
 *
 * Un xlsx es un zip con XML adentro, así que se abre sin librería: se saca
 * sharedStrings.xml (donde viven los textos) y sheet1.xml (las celdas), más los
 * comentarios, que son los que marcan el material descontinuado.
 */

const RAIZ = new URL('..', import.meta.url).pathname.replace(/^\//, '')
const origen = process.argv[2] || 'C:/Users/NancyLizano/Downloads/colores x codigo.xlsx'

/**
 * Un xlsx es un zip. Como acá solo hacen falta tres archivos de adentro, se
 * lee el directorio central y se descomprime lo justo, sin depender de
 * Expand-Archive (que no acepta la extensión .xlsx) ni de una librería.
 */
function abrirZip(ruta) {
  const buf = readFileSync(ruta)
  let fin = buf.length - 22
  while (fin >= 0 && buf.readUInt32LE(fin) !== 0x06054b50) fin--
  if (fin < 0) throw new Error(`${ruta} no parece un xlsx`)

  const cuantos = buf.readUInt16LE(fin + 10)
  let p = buf.readUInt32LE(fin + 16)
  const archivos = new Map()
  for (let i = 0; i < cuantos; i++) {
    const metodo = buf.readUInt16LE(p + 10)
    const comprimido = buf.readUInt32LE(p + 20)
    const largoNombre = buf.readUInt16LE(p + 28)
    const nombre = buf.toString('utf8', p + 46, p + 46 + largoNombre)
    const inicio = buf.readUInt32LE(p + 42)
    const datos = inicio + 30 + buf.readUInt16LE(inicio + 26) + buf.readUInt16LE(inicio + 28)
    const crudo = buf.subarray(datos, datos + comprimido)
    archivos.set(nombre, metodo === 8 ? inflateRawSync(crudo) : crudo)
    p += 46 + largoNombre + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32)
  }
  return archivos
}

const zip = abrirZip(origen)

const desescapar = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')

const leer = (rel) => (zip.get(rel) ?? Buffer.alloc(0)).toString('utf8')

const textos = [...leer('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
  desescapar([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join('')),
)

const hoja = leer('xl/worksheets/sheet1.xml')
const filas = {}
for (const fila of hoja.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
  const celdas = {}
  for (const c of fila[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const valor = (c[3] ?? '').match(/<v>([\s\S]*?)<\/v>/)?.[1]
    if (valor === undefined) continue
    celdas[c[1]] = /t="s"/.test(c[2]) ? textos[Number(valor)] : desescapar(valor)
  }
  filas[Number(fila[1])] = celdas
}

// los comentarios de la hoja son los que dicen qué material ya no se consigue
const descontinuadas = new Set()
for (const c of leer('xl/comments1.xml').matchAll(/<comment ref="([A-Z]+)(\d+)"[\s\S]*?<\/comment>/g)) {
  const texto = [...c[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join(' ')
  // "descont" a secas porque en la hoja hay dos escritos como "descontiinuado"
  if (/descont/i.test(texto)) descontinuadas.add(Number(c[2]))
}

const limpio = (s) => (s ?? '').replace(/\s+/g, ' ').trim()
const MM = { '3mm': 3, '6mm': 6, '9mm': 9, '12mm': 12, '12 mm': 12 }
/** notas que dicen que ese color no se le puede ofrecer a cualquiera */
const RESERVADO = /exclusiv|apartado|no utilizar|compra única|compra unica|especificado/i

const porClave = new Map()
for (const [n, f] of Object.entries(filas)) {
  const fila = Number(n)
  const color = limpio(f.E)
  const codigo = limpio(f.D)
  if (!color || !codigo || color === 'Color') continue

  const espesor = limpio(f.B)
  const nota = limpio(f.C)
  const clave = `${limpio(f.A)}|${color.toUpperCase()}|${espesor}`
  if (!porClave.has(clave)) {
    porClave.set(clave, {
      proveedor: limpio(f.A),
      color,
      espesor,
      espesorMm: MM[espesor] ?? null,
      presentaciones: [],
    })
  }
  const item = porClave.get(clave)
  // la nota va pegada a la medida, porque el mismo color puede tener una
  // lámina apartada para un cliente y otra libre
  item.presentaciones.push({ codigo, medida: limpio(f.F).toLowerCase(), ...(nota ? { nota } : {}) })
  if (descontinuadas.has(fila)) item.descontinuado = true
  if (nota && RESERVADO.test(nota) && !item.reservado) item.reservado = nota
}

/**
 * El tronco del código, que es lo que identifica al color y su espesor: los
 * códigos de un mismo color solo cambian en el sufijo de la medida de lámina
 * (7964-3-1, 7964-3-2, 7964-3-3 → 7964-3). Con eso el CIP sabe qué material es
 * y después elige la lámina que le convenga al cortar.
 */
function tronco(codigos) {
  let comun = codigos[0]
  for (const c of codigos.slice(1)) {
    let i = 0
    while (i < comun.length && i < c.length && comun[i] === c[i]) i++
    comun = comun.slice(0, i)
  }
  return comun.replace(/[-\s]+$/, '') || codigos[0]
}
for (const item of porClave.values()) item.codigoBase = tronco(item.presentaciones.map((p) => p.codigo))

const lista = [...porClave.values()].sort(
  (a, b) => a.proveedor.localeCompare(b.proveedor) || a.color.localeCompare(b.color) || (a.espesorMm ?? 99) - (b.espesorMm ?? 99),
)

const ts = `/* GENERADO por scripts/importar-colores-mx.mjs — no editar a mano */

/** un color de la lista de materia prima de la planta de México */
export interface ColorMX {
  proveedor: string
  color: string
  /** como viene en la lista: 3mm, 6mm, 9mm, 12mm o EX2 */
  espesor: string
  /** el mismo espesor en número; null en EX2, que no es un espesor simple */
  espesorMm: number | null
  /** el tronco del código, sin el sufijo de la medida de lámina */
  codigoBase: string
  /** cada medida de lámina tiene su propio código y su propia nota */
  presentaciones: { codigo: string; medida: string; nota?: string }[]
  /** ya no se consigue: viene de los comentarios de la hoja */
  descontinuado?: boolean
  /** apartado para un cliente o de uso restringido; el texto dice para quién */
  reservado?: string
}

export const COLORES_MX: ColorMX[] = ${JSON.stringify(lista, null, 2)}
`
writeFileSync(join(RAIZ, 'src', 'datos', 'colores-mx.ts'), ts, 'utf8')

const cuenta = (f) => lista.filter(f).length
console.log(`colores de México: ${lista.length} (proveedor · color · espesor)`)
console.log(`  descontinuados: ${cuenta((c) => c.descontinuado)}`)
console.log(`  reservados: ${cuenta((c) => c.reservado)}`)
for (const mm of [3, 6, 9, 12, null]) {
  console.log(`  ${mm ?? 'EX2'}: ${cuenta((c) => c.espesorMm === mm)}`)
}
