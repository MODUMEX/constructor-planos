import { crearTramos, bom } from '../src/modulacion'
import { piezasDeArea } from '../src/exportar/piezas'
import type { Area, Config, TipologiaId } from '../src/types'

/**
 * Las mamparas no tienen que ser todas iguales. Se pide una de 45 en el medio y
 * se comprueba que salga asi en el despiece Y en la cotizacion, que son los dos
 * papeles que llegan a fabrica.
 */

const base = {
  linea: 'LEEDER', modelo: 'ESTANDAR', acabado: 'Laminado Compacto', color: 'BLANCO',
  montaje: 'PISO_HEADRAIL', bisagra: 'GRAV', cerrojo: 'IND', herrajeAcabado: 'INOX',
  alturaCm: 150, profundidadCm: 150, anchoAccesibleCm: 150, anchoPilastraCm: 16,
  espesorMm: 12, terminacion: 'ZOCLO', kap: false, orinales: 0,
  mgAlturaCm: 120, mgAnchoCm: 60,
} as unknown as Config

const casos: { tip: TipologiaId; n: number; mamparas?: (string | null)[]; espera: string }[] = [
  { tip: 'ORINALES', n: 4, espera: '4 de 60x120' },
  { tip: 'ORINALES_ENTRE_MUROS', n: 4, espera: '3 de 60x120' },
  { tip: 'ORINALES', n: 4, mamparas: [null, '45x120', null, null], espera: '3 de 60 y 1 de 45' },
  { tip: 'ORINALES_ENTRE_MUROS', n: 4, mamparas: ['45x120', null, '60x150'], espera: '45x120, 60x120 y 60x150' },
]

for (const c of casos) {
  const config = { ...base, tipologia: c.tip, mamparasMG: c.mamparas }
  const tramos = crearTramos(c.tip, 240, c.n, config)
  const area: Area = { id: 'a', nombre: 'Orinales', piso: '1', config, tramos }
  const mg = piezasDeArea(area).filter((p) => p.familia === 'MG')
  const cuenta = new Map<string, number>()
  mg.forEach((p) => {
    const k = `${p.anchoCm}x${p.altoCm}`
    cuenta.set(k, (cuenta.get(k) ?? 0) + 1)
  })
  const cot = bom(tramos, config).filter((r) => r.tipo === 'Mingitorio')
  console.log(`${c.tip} · ${c.n} orinales${c.mamparas ? ' · pedidas ' + JSON.stringify(c.mamparas) : ''}`)
  console.log(`  espera    : ${c.espera}`)
  console.log(`  despiece  : ${[...cuenta].map(([k, v]) => `${v}×${k}`).join(', ')}  (total ${mg.length})`)
  console.log(`  cotizacion: ${cot.map((r) => `${r.cantidad}×${r.sku}`).join(', ')}`)
  const totalCot = cot.reduce((s, r) => s + r.cantidad, 0)
  console.log(`  ${totalCot === mg.length ? 'OK · despiece y cotizacion coinciden' : 'NO CUADRA: ' + mg.length + ' vs ' + totalCot}\n`)
}
