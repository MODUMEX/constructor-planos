/**
 * La pieza del FRENTE cuando el claro se pasa de lo que cierra una pilastra.
 *
 * La pilastra más ancha del catálogo mide 120 cm. De ahí para arriba la pieza
 * tiene que ser un PANEL, y eso tiene que verse en las tres salidas: el precio,
 * el despiece que va al CIP y el código.
 *
 *   npm run probar-frente
 */
import { crearTramos, bom } from '../src/modulacion'
import { piezasDeArea } from '../src/exportar/piezas'
import { familiaDelFrente, medidasDeFrente } from '../src/catalog'
import { precioPieza } from '../src/tarifas'
import type { Area, Config } from '../src/types'

let mal = 0
const ok = (b: boolean, t: string) => { if (!b) mal++; console.log(`${b ? '✓' : '✕'} ${t}`) }

const config = {
  tipologia: 'RECTA_ENTRE_MUROS', modelo: 'REFORZADO', linea: 'LEEDER',
  claroCm: 420, profundidadCm: 150, cantidad: 3, alturaCm: 200,
  puertaCm: 60, anchoPilastraCm: 24, orinales: 0, montaje: 'PISO_HEADRAIL',
  color: 'BLANCO', acabado: 'Laminado Compacto', terminacion: 'ZOCLO', espesorMm: 12,
} as unknown as Config

console.log('— dónde está el corte')
const tope = Math.max(...medidasDeFrente('REFORZADO').filter((m) => m.familia === 'PL').map((m) => m.anchoCm))
console.log(`  la pilastra más ancha de Reforzado mide ${tope} cm`)
ok(familiaDelFrente(120, 'REFORZADO') === 'PL', '120 sigue siendo pilastra')
ok(familiaDelFrente(121, 'REFORZADO') === 'PN', '121 ya es panel')
console.log(`  paneles de relleno: ${medidasDeFrente('REFORZADO').filter((m) => m.familia === 'PN').map((m) => m.anchoCm).join(' ')}`)

// una tira normal y la misma con un frente de 150 en la frontera del medio
const tramos = crearTramos('RECTA_ENTRE_MUROS', 420, 3, config, 'CR')
const conPanel = tramos.map((t, i) =>
  i === 0 ? { ...t, pilastras: (t.pilastras ?? []).map((p, k) => (k === 1 ? 150 : p)) } : t,
)
const area = { id: 'a', nombre: 'Área 1', piso: '', config, tramos: conPanel } as unknown as Area

console.log('\n— la cotización')
const precios = { moneda: 'USD' as const, tipoCambio: 512, pais: 'CR' as const }
const renglones = bom(conPanel, config, precios)
const panel = renglones.find((r) => r.descripcion.startsWith(String.fromCharCode(80) + 'anel de frente'))
ok(!!panel, 'sale un renglón de panel de frente de 150')
if (panel) {
  console.log(`  ${panel.sku}  ${panel.descripcion}  × ${panel.cantidad}  ${panel.precioUnit.toFixed(2)}`)
  const alto = 210   // la altura de la pilastra en Reforzado
  const comoPanel = precioPieza({ familia: 'PN', anchoCm: 150, altoCm: alto }, { modeloCodigo: 'REFORZADO', tier: 'linea', moneda: 'USD', tipoCambio: 512 })
  const comoPilastra = precioPieza({ familia: 'PL', anchoCm: 150, altoCm: alto }, { modeloCodigo: 'REFORZADO', tier: 'linea', moneda: 'USD', tipoCambio: 512 })
  ok(Math.abs(panel.precioUnit - comoPanel) < 0.01, `se cobra con tarifa de PANEL (${comoPanel.toFixed(2)}), no de pilastra (${comoPilastra.toFixed(2)})`)
}
ok(!renglones.some((r) => r.sku.includes('PI') && r.descripcion.includes('150')), 'no queda ninguna pilastra de 150')

console.log('\n— el despiece que lee el CIP')
const piezas = piezasDeArea(area)
// el de FRENTE se reconoce por el alto: va a la altura de la pilastra,
// no a la del panel divisor
const frente = piezas.filter((p) => p.anchoCm === 150 && p.altoCm !== config.profundidadCm && p.altoCm > 150)
for (const p of frente) console.log(`  familia ${p.familia}  subTipo ${p.subTipo}  ${p.anchoCm} × ${p.altoCm}`)
ok(frente.length === 1 && frente[0].familia === 'PN', 'el frente de 150 sale como familia PN')
ok(frente[0]?.subTipo === 'PNCEN', 'y con subtipo PNCEN, porque divide dos cabinas')



console.log('\n— OJO: el código de un panel de frente y el de un panel divisor')
for (const r of renglones.filter((x) => x.sku.includes('-PN'))) {
  console.log(`  ${r.sku}   ${r.descripcion}   × ${r.cantidad}`)
}

console.log(mal === 0 ? '\nTodo cuadra.' : `\n${mal} caso(s) mal.`)
process.exit(mal === 0 ? 0 : 1)
