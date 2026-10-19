/**
 * Un cubículo de REGADERA va más alto que el resto del área.
 *
 * Del plano de Bodega Pitic (Sanimax, Estándar): el cubículo de la regadera
 * lleva la puerta a 180 y el panel a 180, mientras los inodoros de al lado
 * siguen en 150. Antes marcar la cabina como Regadera solo cambiaba el
 * dibujito —la regadera en vez del inodoro— y ninguna altura.
 *
 * La pilastra y el panel que SEPARAN dos cabinas son una sola pieza, así que
 * llevan la más alta de las dos que cargan. En Estándar la pilastra ya es de
 * 180 y no cambia; en Reforzado se queda en 210, porque del otro lado sigue
 * cargando un cubículo de 210.
 *
 *   npm run probar-regaderas
 */
import { crearTramos, bom } from '../src/modulacion'
import { piezasDeArea } from '../src/exportar/piezas'
import { precioPieza } from '../src/tarifas'
import { tierDeColor, alturasDe } from '../src/catalog'
import type { Config, Tramo } from '../src/types'

let mal = 0
const ok = (b: boolean, t: string) => { if (!b) mal++; console.log(`${b ? '✓' : '✕'} ${t}`) }

function cfg(modelo: string): Config {
  return {
    tipologia: 'RECTA_ENTRE_MUROS', modelo, linea: 'LEEDER',
    claroCm: 270, profundidadCm: 150, cantidad: 3, alturaCm: 180,
    puertaCm: 60, anchoPilastraCm: 24, orinales: 0, anchoOrinalCm: 60,
    montaje: 'PISO_HEADRAIL', color: 'BLANCO', acabado: 'Laminado Compacto',
    terminacion: 'ZOCLO', espesorMm: 12, mgAnchoCm: 45, mgAlturaCm: 120, mamparasMG: [],
  } as unknown as Config
}

/** el caso del plano: tres cubículos y el primero es regadera */
function conRegadera(modelo: string): { tramos: Tramo[]; config: Config } {
  const config = cfg(modelo)
  const tramos = crearTramos('RECTA_ENTRE_MUROS', 270, 3, config, 'MX')
  tramos[0].cabinas[0] = { ...tramos[0].cabinas[0], tipo: 'regadera' }
  return { tramos, config }
}

for (const modelo of ['ESTANDAR', 'REFORZADO']) {
  const { tramos, config } = conRegadera(modelo)
  const a = alturasDe(modelo)
  const reg = alturasDe('REGADERAS')
  console.log(`\n── ${modelo}: puerta ${a.puerta} · panel ${a.panel} · pilastra ${a.pilastra}` +
    `   (regadera: ${reg.puerta}/${reg.panel}/${reg.pilastra})`)

  const piezas = piezasDeArea({ nombre: 'A', tramos, config } as never)
  const ver = (familia: string) =>
    piezas.filter((p) => p.familia === familia).map((p) => `${p.anchoCm}x${p.altoCm}`).sort()
  console.log(`   puertas   ${ver('PT').join(' ')}`)
  console.log(`   paneles   ${ver('PN').join(' ')}`)
  console.log(`   pilastras ${ver('PL').join(' ')}`)

  const puertas = piezas.filter((p) => p.familia === 'PT')
  ok(puertas.some((p) => p.altoCm === reg.puerta), `la puerta de la regadera va a ${reg.puerta}`)
  ok(puertas.some((p) => p.altoCm === a.puerta), 'las de los inodoros se quedan donde estaban')

  const paneles = piezas.filter((p) => p.familia === 'PN')
  ok(paneles.some((p) => p.altoCm === reg.panel), `el panel de la regadera va a ${reg.panel}`)

  const pilastras = piezas.filter((p) => p.familia === 'PL')
  const esperado = Math.max(a.pilastra, reg.pilastra)
  ok(
    pilastras.every((p) => p.altoCm === a.pilastra || p.altoCm === esperado),
    `las pilastras llevan la más alta de las dos (${esperado})`,
  )
  if (modelo === 'REFORZADO') {
    ok(pilastras.every((p) => p.altoCm === 210), 'en Reforzado la pilastra compartida se queda en 210')
  }

  // y la cotización tiene que seguir dando lo mismo que el despiece
  const precios = { moneda: 'USD' as const, tipoCambio: 1 }
  const pantalla = bom(tramos, config, precios).reduce((s, r) => s + r.cantidad * r.precioUnit, 0)
  const op = {
    modeloCodigo: config.modelo,
    tier: tierDeColor(config.color, undefined, config.linea, config.acabado),
    moneda: 'USD' as const, tipoCambio: 1, tarifas: undefined,
  }
  const total = piezas.reduce(
    (s, p) => s + precioPieza({ familia: p.familia, anchoCm: p.anchoCm, altoCm: p.altoCm }, op), 0,
  )
  ok(Math.abs(total - pantalla) <= 1, `la cotización cuadra con el despiece (${pantalla.toFixed(2)})`)

  // y tiene que cobrar MÁS que la misma área sin regadera: la pieza es más grande
  const sinReg = crearTramos('RECTA_ENTRE_MUROS', 270, 3, config, 'MX')
  const base = bom(sinReg, config, precios).reduce((s, r) => s + r.cantidad * r.precioUnit, 0)
  ok(pantalla > base, `cobra más que sin regadera (${base.toFixed(2)} → ${pantalla.toFixed(2)})`)
}

console.log(mal === 0 ? '\nTodo cuadra.' : `\n${mal} caso(s) mal.`)
process.exit(mal === 0 ? 0 : 1)
