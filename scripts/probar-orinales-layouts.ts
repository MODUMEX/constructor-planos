import { crearTramos } from '../src/modulacion'
import { piezasDeArea } from '../src/exportar/piezas'
import { mgMedidas } from '../src/catalog'
import type { Area, Config, TipologiaId } from '../src/types'

/**
 * Los dos layouts de solo orinales, contados por el despiece.
 *
 * El que cierra con mampara lleva UNA mampara por orinal: las de entre cada par
 * mas la que cierra la punta sin muro. El que va entre muros lleva N-1, porque
 * los dos extremos topan contra pared.
 */

const base: Config = {
  linea: 'LEEDER', modelo: 'ESTANDAR', acabado: 'Laminado Compacto', color: 'BLANCO',
  montaje: 'PISO_HEADRAIL', bisagra: 'GRAV', cerrojo: 'IND', herrajeAcabado: 'INOX',
  alturaCm: 150, profundidadCm: 150, anchoAccesibleCm: 150, anchoPilastraCm: 16,
  espesorMm: 12, terminacion: 'ZOCLO', kap: false, orinales: 0,
  mgAlturaCm: 120, mgAnchoCm: 60, tipologia: 'ORINALES',
} as Config

for (const tip of ['ORINALES', 'ORINALES_ENTRE_MUROS'] as TipologiaId[]) {
  for (const n of [3, 4]) {
    const config = { ...base, tipologia: tip }
    const tramos = crearTramos(tip, 240, n, config)
    const area: Area = { id: 'a', nombre: 'Orinales', piso: '1', config, tramos }
    const piezas = piezasDeArea(area)
    const mg = piezas.filter((p) => p.familia === 'MG')
    const otras = piezas.filter((p) => p.familia !== 'MG')
    const cab = tramos[0].cabinas
    console.log(`${tip} · ${n} orinales`)
    console.log(`  cabinas   : ${cab.length} (${[...new Set(cab.map((c) => c.tipo))].join(', ')})`)
    console.log(`  mamparas  : ${mg.length}  ${mg.length ? `(${mg[0].anchoCm}×${mg[0].altoCm}, subTipo ${mg[0].subTipo})` : ''}`)
    console.log(`  esperadas : ${tip === 'ORINALES' ? n : n - 1}`)
    console.log(`  otras     : ${otras.length ? otras.map((p) => p.familia).join(', ') : '— (sin paneles ni puertas)'}`)
    console.log(`  ${mg.length === (tip === 'ORINALES' ? n : n - 1) ? 'OK' : 'NO CUADRA'}\n`)
  }
}

console.log('medidas de mampara en LEEDER:', mgMedidas('LEEDER').map((m) => `${m.anchoCm}×${m.altoCm}`).join(', '))
console.log('medidas de mampara en SUPERIOR:', mgMedidas('SUPERIOR').map((m) => `${m.anchoCm}×${m.altoCm}`).join(', '))
