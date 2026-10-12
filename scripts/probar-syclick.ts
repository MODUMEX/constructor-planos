/**
 * El Excel de Syclick: que el SKU se arme como manda la plataforma y que el
 * archivo abra de verdad.
 *
 * El libro se escribe a mano —un xlsx es un zip con XML— así que no alcanza
 * con revisar los datos: hay que volver a abrirlo y leerlo, que es lo que va
 * a hacer Excel y el importador de Syclick.
 */
import { writeFileSync, readFileSync, unlinkSync } from 'node:fs'
import { inflateRawSync } from 'node:zlib'
import { crearTramos } from '../src/modulacion'
import { generarSyclick, grupoSyclick, skuSyclick } from '../src/exportar/syclick'
import type { Area, Config, Proyecto, TipologiaId } from '../src/types'

let fallos = 0
function revisar(que: string, bien: boolean, detalle = '') {
  console.log(`  ${bien ? '✓' : '✗'} ${que}${detalle ? ' · ' + detalle : ''}`)
  if (!bien) fallos++
}

function cfg(extra: Partial<Config> = {}): Config {
  return {
    linea: 'LEEDER', modelo: 'REFORZADO', acabado: 'Laminado Compacto', color: 'Alumina',
    montaje: 'PISO_HEADRAIL', bisagra: '', cerrojo: '', herrajeAcabado: 'INOX',
    alturaCm: 180, profundidadCm: 150, anchoAccesibleCm: 150, anchoPilastraCm: 24,
    espesorMm: 12, terminacion: 'ZOCLO', kap: false, orinales: 0, mgAlturaCm: 120,
    tipologia: 'RECTA_ENTRE_MUROS' as TipologiaId, ...extra,
  } as Config
}

function proyectoDe(config: Config, cabinas = 4): Proyecto {
  const area: Area = {
    id: 'a1', nombre: 'Baño hombres', piso: 'Planta baja', config,
    tramos: crearTramos(config.tipologia, 370, cabinas, config, 'MX'),
  }
  return {
    numero: '1042', obra: 'Torre Escazú', cliente: 'EDIFICAR', ubicacion: '',
    distribuidor: 'ALUMAS', creadoPor: 'Dayanna', paisFabricacion: 'MX', areas: [area],
  }
}

console.log('\n1 · el SKU se arma como la plantilla de Syclick')
{
  const casos: [string, Config, number, string][] = [
    ['LEEDER Reforzado, Alumina (grupo 1)', cfg(), 4, 'L-M1-LC-RF-PL-G1'],
    ['LEEDER Estándar, Skyline (grupo 2)', cfg({ modelo: 'ESTANDAR', color: 'Skyline Walnut' }), 4, 'L-M1-LC-ST-PL-G2'],
    ['LEEDER Scudo', cfg({ modelo: 'SCUDO' }), 4, 'L-M1-LC-SC-PL-G1'],
    ['LEEDER Kids', cfg({ modelo: 'KIDS' }), 4, 'L-M1-LC-KD-PL-G1'],
    ['Imperial', cfg({ modelo: 'IMPERIAL' }), 4, 'L-M1-LC-IMP-PL-G1'],
    ['Regaderas', cfg({ modelo: 'REGADERAS' }), 4, 'L-M1-LC-RG-PL-G1'],
    ['Colgante', cfg({ modelo: 'COLGANTE' }), 4, 'L-M1-LC-CL-PL-G1'],
    ['Estándar 170', cfg({ modelo: 'ESTANDAR170' }), 4, 'L-M1-LC-ST170-PL-G1'],
    ['Superior 2.0 Reforzado', cfg({ linea: 'SUPERIOR', modelo: 'SUP_REFORZADO' }), 4, 'S-2-LC-RF-PL-G1'],
    ['Touchless S3 es LEEDER S3 Reforzado', cfg({ linea: 'TOUCHLESS', modelo: 'TL_S3' }), 4, 'L-S3-LC-RF-PL-G1'],
    ['Superior acero inoxidable', cfg({ linea: 'SUPERIOR', modelo: 'SUP_ESTANDAR', acabado: 'Acero Inoxidable', color: 'Acero Inoxidable' }), 4, 'S-2-A-ST-PL-AI'],
    ['Superior esmaltada', cfg({ linea: 'SUPERIOR', modelo: 'SUP_ESTANDAR', acabado: 'Esmaltada Antigrafiti', color: 'Blanco' }), 4, 'S-2-E-ST-PL-EA'],
    ['color especial con menos de 10 cabinas', cfg({ color: 'Verde Inventado' }), 4, 'L-M1-LC-RF-PL-CEN10'],
    ['el mismo con 10 o más', cfg({ color: 'Verde Inventado' }), 10, 'L-M1-LC-RF-PL-CEM10'],
    ['fórmica con menos de 10', cfg({ linea: 'SUPERIOR', modelo: 'SUP_ESTANDAR', acabado: 'Fórmica', color: 'White' }), 4, 'S-2-LC-ST-PL-FN10'],
  ]
  for (const [que, config, cabinas, esperado] of casos) {
    const sku = skuSyclick('PL', config, cabinas)
    revisar(que, sku === esperado, sku)
  }
  revisar('la mampara de orinal es PM', skuSyclick('MG', cfg(), 4).includes('-PM-'), skuSyclick('MG', cfg(), 4))
  revisar('el panel es PN', skuSyclick('PN', cfg(), 4).includes('-PN-'))
  revisar('la puerta es PT', skuSyclick('PT', cfg(), 4).includes('-PT-'))
}

console.log('\n2 · el corte de los 10 módulos')
{
  revisar('9 cabinas → MENOR', grupoSyclick(cfg({ color: 'X' }), 9) === 'CEN10')
  revisar('10 cabinas → MAYOR', grupoSyclick(cfg({ color: 'X' }), 10) === 'CEM10')
}

console.log('\n3 · el archivo abre y trae lo que tiene que traer')
{
  const p = proyectoDe(cfg(), 4)
  const bytes = generarSyclick(p)
  const tmp = 'syclick-prueba.xlsx'
  writeFileSync(tmp, bytes)

  // se vuelve a abrir como lo haría Excel: zip + XML
  const buf = readFileSync(tmp)
  let fin = buf.length - 22
  while (fin >= 0 && buf.readUInt32LE(fin) !== 0x06054b50) fin--
  revisar('es un zip válido', fin >= 0)
  const cuantos = buf.readUInt16LE(fin + 10)
  let q = buf.readUInt32LE(fin + 16)
  const dentro = new Map<string, Buffer>()
  for (let i = 0; i < cuantos; i++) {
    const metodo = buf.readUInt16LE(q + 10)
    const comprimido = buf.readUInt32LE(q + 20)
    const largoNombre = buf.readUInt16LE(q + 28)
    const nombre = buf.toString('utf8', q + 46, q + 46 + largoNombre)
    const inicio = buf.readUInt32LE(q + 42)
    const d = inicio + 30 + buf.readUInt16LE(inicio + 26) + buf.readUInt16LE(inicio + 28)
    const crudo = buf.subarray(d, d + comprimido)
    dentro.set(nombre, metodo === 8 ? inflateRawSync(crudo) : crudo)
    q += 46 + largoNombre + buf.readUInt16LE(q + 30) + buf.readUInt16LE(q + 32)
  }
  revisar('trae el workbook', dentro.has('xl/workbook.xml'))
  revisar('y las cuatro hojas', [1, 2, 3, 4].every((i) => dentro.has(`xl/worksheets/sheet${i}.xml`)))

  const libro = (dentro.get('xl/workbook.xml') ?? Buffer.alloc(0)).toString('utf8')
  for (const n of ['Datos generales', 'Áreas', 'Captura', 'Otros productos']) {
    revisar(`la hoja «${n}» se llama exactamente así`, libro.includes(`name="${n}"`))
  }

  const texto = (rel: string) => (dentro.get(rel) ?? Buffer.alloc(0)).toString('utf8')
  const captura = texto('xl/worksheets/sheet3.xml')
  const celdas = [...captura.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1])
  revisar('«Captura» lleva los encabezados de la plantilla',
    ['Área', 'SKU', 'Ancho (cm)', 'Alto (cm)', 'Remate inferior', 'Cantidad'].every((h) => celdas.includes(h)))
  revisar('y renglones con el SKU armado', celdas.some((c) => /^L-M1-LC-RF-(PL|PN|PT)-G1$/.test(c)),
    celdas.filter((c) => c.startsWith('L-M1')).slice(0, 3).join(' '))
  revisar('la pilastra lleva su remate', celdas.includes('ZOCLO'))

  const hojaAreas = texto('xl/worksheets/sheet2.xml')
  revisar('«Áreas» trae el área con su color', hojaAreas.includes('Baño hombres') && hojaAreas.includes('ALUMINA'))

  const filas = [...captura.matchAll(/<row /g)].length
  revisar('hay piezas capturadas', filas > 1, `${filas - 1} renglón(es)`)
  unlinkSync(tmp)
}

console.log('\n4 · un color especial manda la etiqueta y el color libre')
{
  const p = proyectoDe(cfg({ color: 'Verde Inventado' }), 4)
  const bytes = generarSyclick(p)
  const tmp = 'syclick-esp.xlsx'
  writeFileSync(tmp, bytes)
  const txt = readFileSync(tmp).toString('latin1')
  revisar('va la etiqueta del grupo', txt.includes('ESPECIAL MENOR A 10 MODULOS'))
  revisar('y el color de verdad en «Color libre»', txt.includes('Verde Inventado'))
  unlinkSync(tmp)
}

console.log(fallos ? `\n${fallos} revisiones mal.\n` : '\nTodo cuadra.\n')
process.exit(fallos ? 1 : 0)
