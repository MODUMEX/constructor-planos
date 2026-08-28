import { tierDeColor } from '../src/catalog'
import { coloresMxPara } from '../src/coloresMx'
import { bom, crearTramos, totalBOM } from '../src/modulacion'
import type { Config } from '../src/types'

const cfg: Config = {
  linea: 'LEEDER', modelo: 'ESTANDAR', acabado: 'Laminado Compacto',
  color: 'Alumina', colorCodigo: '2103-12', montaje: 'PISO_HEADRAIL',
  bisagra: 'GRAV', cerrojo: 'IND', herrajeAcabado: 'INOX',
  alturaCm: 150, profundidadCm: 150, anchoAccesibleCm: 150, anchoPilastraCm: 16,
  espesorMm: 12, terminacion: 'ZOCLO', kap: false, orinales: 0, mgAlturaCm: 120,
  tipologia: 'RECTA_MURO_IZQ',
}
const tramos = crearTramos('RECTA_MURO_IZQ', 420, 4, cfg)

for (const linea of ['SUPERIOR', 'LEEDER'] as const) {
  const lista = coloresMxPara(linea)
  const espesores = [...new Set(lista.map((c) => c.espesor))]
  console.log(`${linea}: ${lista.length} colores, espesores ${espesores.join('/')}, tier ${tierDeColor(lista[0].color, 'MX')}`)
}

console.log('\ntier de Alumina:')
console.log('  en Costa Rica (no está en el catálogo):', tierDeColor('Alumina', 'CR'))
console.log('  en México:', tierDeColor('Alumina', 'MX'))

const enMx = totalBOM(bom(tramos, cfg, { moneda: 'USD', tipoCambio: 512, pais: 'MX' }))
const enCr = totalBOM(bom(tramos, cfg, { moneda: 'USD', tipoCambio: 512, pais: 'CR' }))
console.log(`\nmismo baño, mismo color:`)
console.log(`  como línea (México):   $${enMx.toFixed(2)}`)
console.log(`  como especial (antes): $${enCr.toFixed(2)}`)
