import { generarCSV } from '../src/exportar/csv'
import { crearTramos, nuevoId } from '../src/modulacion'
import { coloresMxPara, slugRenderMx } from '../src/coloresMx'
import { tierDeColor } from '../src/catalog'
import { fotoDe } from '../src/renders'
import type { Config, Proyecto } from '../src/types'

const base = (espesorMm: number): Config => ({
  linea: espesorMm === 3 ? 'SUPERIOR' : 'LEEDER',
  modelo: espesorMm === 3 ? 'SUP_ESTANDAR' : 'ESTANDAR',
  acabado: 'Laminado Compacto', color: '', montaje: 'PISO_HEADRAIL',
  bisagra: 'GRAV', cerrojo: 'IND', herrajeAcabado: 'NEGRO',
  alturaCm: 150, profundidadCm: 150, anchoAccesibleCm: 150, anchoPilastraCm: 16,
  espesorMm, terminacion: 'ZOCLO', kap: false, orinales: 0, mgAlturaCm: 120,
  tipologia: 'RECTA_MURO_IZQ',
})

for (const [linea, mm] of [['SUPERIOR', 3], ['LEEDER', 12]] as const) {
  const lista = coloresMxPara(linea)
  console.log(`\n=== ${mm} mm · ${lista.length} colores`)
  let conFoto = 0
  for (const c of lista) {
    const cfg = { ...base(mm), color: c.color, colorCodigo: c.codigoBase }
    const foto = fotoDe({ ...cfg, slugColor: slugRenderMx(c.color) })
    const propia = foto && !foto.referencia
    if (propia) conFoto++
    console.log(`  ${propia ? '📷' : '  '} ${c.codigoBase.padEnd(14)} ${c.color}${c.reservado ? '  ⚠ ' + c.reservado : ''}`)
  }
  console.log(`  → con foto propia: ${conFoto} de ${lista.length}`)
}

const elegido = coloresMxPara('LEEDER').find((c) => c.color === 'Alumina')!
const cfg = { ...base(12), color: elegido.color, colorCodigo: elegido.codigoBase }
const proyecto: Proyecto = {
  numero: '2001', paisFabricacion: 'MX', obra: 'Plaza Satélite', cliente: 'Grupo X',
  ubicacion: 'Estado de México', distribuidor: 'Modumex México', creadoPor: 'Dayanna Lizano',
  areas: [{ id: nuevoId('area'), nombre: 'Baño hombres', piso: 'PB', config: cfg, tramos: crearTramos('RECTA_MURO_IZQ', 420, 4, cfg) }],
}
const csv = generarCSV(proyecto).split('\n')
console.log('\n=== CSV México')
console.log(csv[0])
console.log(csv[1])
