/**
 * El divisor del cuarto accesible: quién se estira cuando se cambia una pieza.
 *
 * La PILASTRA contra el muro se elige; el PANEL se lleva lo que quede. Por eso
 * el panel del cuarto es más largo que los de las demás cabinas.
 *
 *   npm run probar-pmr
 */
import { crearTramos, divisorDelCuarto, bom } from '../src/modulacion'
import { cuartoPmr } from '../src/geometria'
import { piezasDeArea } from '../src/exportar/piezas'
import type { Area, Config } from '../src/types'

let mal = 0
const ok = (b: boolean, t: string) => { if (!b) mal++; console.log(`${b ? '✓' : '✕'} ${t}`) }

function cfg(pilastraPmrCm?: number): Config {
  return {
    tipologia: 'PMR', modelo: 'REFORZADO', linea: 'LEEDER',
    claroCm: 600, profundidadCm: 150, profundidadLugarCm: 250, cantidad: 4, alturaCm: 200,
    puertaCm: 60, puertaAccesibleCm: 90, anchoAccesibleCm: 162, anchoPilastraCm: 24,
    orinales: 0, montaje: 'PISO_HEADRAIL', color: 'BLANCO', acabado: 'Laminado Compacto',
    terminacion: 'ZOCLO', espesorMm: 12, llevaAccesible: true, pilastraPmrCm,
  } as unknown as Config
}

function verDivisor(pilastraPedida: number | undefined, titulo: string) {
  const config = cfg(pilastraPedida)
  const tramo = crearTramos('PMR', 600, 4, config, 'CR')[0]
  const c = cuartoPmr(tramo, config)!
  console.log(`\n── ${titulo}`)
  console.log('  ' + c.divisor.map((p) => `${p.tipo} ${(p.hastaCm - p.desdeCm).toFixed(1)}`).join('  ·  '))
  const suma = c.divisor.reduce((s, p) => s + (p.hastaCm - p.desdeCm), 0)
  console.log(`  suma ${suma.toFixed(1)} · fondo del lugar ${c.profCm}`)
  ok(Math.abs(suma - c.profCm) < 0.05, 'el divisor cierra exacto contra el fondo')
  if (c.aviso) console.log(`  aviso: ${c.aviso}`)
  return { config, tramo, c }
}

console.log('— sin elegir nada: queda como antes')
const base = verDivisor(undefined, 'por defecto')
ok(base.c.panelCm === base.config.profundidadCm, `el panel arranca igual al de las demás cabinas (${base.config.profundidadCm})`)

console.log('\n— ahora se arrastra la pilastra, como las de la tira')
for (const p of [10, 24, 35]) {
  const r = verDivisor(p, `pilastra de ${p}`)
  ok(r.c.pilastraCm === p, `la pilastra quedó en ${p}`)
  ok(r.c.panelCm === 250 - 90 - p, `y el panel se estiró a ${250 - 90 - p}`)
}

console.log('\n— el panel del cuarto es más largo que los de las otras cabinas')
// con 10 el panel da justo 150, que es el de un baño normal; con 24 se ve la diferencia
const { config, tramo, c } = verDivisor(24, 'pilastra de 24')
ok(c.panelCm !== config.profundidadCm, `${c.panelCm} contra ${config.profundidadCm} de un baño normal`)

// Y en un cuarto más hondo sale MÁS LARGO que el de un baño, que es lo normal:
// el cuarto es más grande. Que salga más corto también es válido —el panel es
// lo que quede—, pero conviene tener el caso escrito.
const hondo = { ...cfg(24), profundidadLugarCm: 280 } as unknown as Config
const tHondo = crearTramos('PMR', 600, 4, hondo, 'CR')[0]
const cHondo = cuartoPmr(tHondo, hondo)!
console.log(`  cuarto de 280 de fondo → panel ${cHondo.panelCm}`)
ok(cHondo.panelCm > hondo.profundidadCm, `${cHondo.panelCm} es más largo que los ${hondo.profundidadCm} de un baño normal`)

console.log('\n— y eso tiene que verse en el despiece y en la cotización')
const area = { id: 'a', nombre: 'Área 1', piso: '', config, tramos: [tramo] } as unknown as Area
const piezas = piezasDeArea(area).filter((p) => p.familia === 'PN')
const medidas = [...new Set(piezas.map((p) => p.anchoCm))].sort((a, b) => a - b)
console.log(`  paneles del despiece: ${medidas.join(' · ')}`)
ok(medidas.includes(c.panelCm), `el de ${c.panelCm} está en el despiece`)

const renglones = bom([tramo], config, { moneda: 'USD', tipoCambio: 512, pais: 'CR' })
for (const r of renglones.filter((x) => x.tipo === 'Panel')) console.log(`  ${r.sku}  ${r.descripcion}  × ${r.cantidad}  ${r.precioUnit.toFixed(2)}`)
ok(renglones.some((r) => r.descripcion.includes('cuarto accesible')), 'la cotización lo cobra aparte')

console.log(mal === 0 ? '\nTodo cuadra.' : `\n${mal} caso(s) mal.`)
process.exit(mal === 0 ? 0 : 1)
