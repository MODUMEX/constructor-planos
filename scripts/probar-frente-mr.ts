/**
 * El frente de la cabina accesible: lateral, relleno, puerta y cierre.
 *
 * Dos pilastras pegadas una contra otra no se arman, así que lo que sobra del
 * frente no sale como pieza aparte: se corta junto con la lateral. En un
 * cubículo de 150 con puerta de 100 el rincón es UNA pilastra, no una de 19
 * más una de 12. Y esa pieza baja a medida de catálogo —31 no se fabrica, sale
 * de 30— porque el centímetro que falta se cubre en obra. Solo cuando el
 * frente es tan ancho que ya es un PANEL va aparte, apoyado contra la lateral.
 *
 *   npm run probar-frente-mr
 */
import { frenteAccesible, rinconEnSandwich, soportesDe } from '../src/modulacion'
import { ANCHOS_PILASTRA, COSTILLA_MINIMA_CM } from '../src/catalog'
import { piezasDeArea } from '../src/exportar/piezas'
import { cuartoPmr } from '../src/geometria'
import type { Area, Cabina, Config, Tramo } from '../src/types'

let mal = 0
const ok = (b: boolean, t: string) => { if (!b) mal++; console.log(`${b ? '✓' : '✕'} ${t}`) }

const cab = (anchoCm: number, puertaCm: number) =>
  ({ id: 'c1', tipo: 'accesible', anchoCm, puerta: { anchoCm: puertaCm, mano: 'izq', abre: 'afuera' } }) as unknown as Cabina

const cfg = (extra: Record<string, unknown> = {}) => ({
  tipologia: 'MR_PANEL_E', modelo: 'ESTANDAR', linea: 'LEEDER',
  claroCm: 510, profundidadCm: 130, profundidadAccesibleCm: 150, cantidad: 5,
  alturaCm: 210, puertaCm: 60, puertaAccesibleCm: 100, anchoPilastraCm: 24,
  anchoAccesibleCm: 150, orinales: 0, montaje: 'PISO_HEADRAIL',
  color: 'ALUMINA 2103', acabado: 'Laminado Compacto', terminacion: 'ZOCLO',
  espesorMm: 12, mgAnchoCm: 45, mgAlturaCm: 120, mamparasMG: [], ...extra,
}) as unknown as Config

const tramo = (c: Cabina) => ({
  id: 't1', claroCm: 510, muroInicio: true, muroFin: true, cabinas: [c], pilastras: [],
}) as unknown as Tramo

console.log('— el rincón va de UNA pieza, y de medida de catálogo')
for (const [ancho, puerta, esperada] of [[150, 100, 30], [150, 90, 40], [180, 100, 60], [204, 100, 85]] as const) {
  const c = cab(ancho, puerta)
  const f = frenteAccesible(c, cfg())
  ok(f.juntada && f.frente === 0 && f.pilastra === esperada,
    `${ancho} con puerta de ${puerta} → una sola de ${f.pilastra} (esperada ${esperada}), sin relleno`)
  ok(ANCHOS_PILASTRA.includes(f.pilastra), `  y ${f.pilastra} es medida de catálogo`)
  ok(f.pilastra + f.frente + f.puerta + f.cierre <= ancho, `  sin pasarse de los ${ancho}`)
  ok(cuartoPmr(tramo(c), cfg())?.aviso == null, '  sin aviso, porque cierra')
}

console.log('')
console.log('— la lateral puesta a mano también se junta con el relleno')
{
  const c = cab(150, 100)
  const config = cfg({ pilastraLateralMrCm: 24 })
  const f = frenteAccesible(c, config)
  ok(f.frente === 0 && ANCHOS_PILASTRA.includes(f.pilastra) && f.pilastra + f.puerta + f.cierre <= 150,
    `150 con lateral de 24 → ${f.pilastra} · ${f.puerta} · ${f.cierre}, sin el relleno de 2 cm`)
}

console.log('')
console.log('— cuando el frente es un PANEL de verdad, sí va aparte')
{
  const f = frenteAccesible(cab(300, 100), cfg())
  ok(!f.juntada && f.frente > 0,
    `300 → PL ${f.pilastra} + panel de ${f.frente} + PT ${f.puerta} + PL ${f.cierre}`)
}

console.log('')
console.log('— cuando ni la pieza más chica alcanza, no se inventa nada: se avisa')
{
  const c = cab(115, 100)
  const f = frenteAccesible(c, cfg())
  ok(cuartoPmr(tramo(c), cfg())?.aviso != null, `115 con puerta de 100 → frente ${f.frente} · avisa`)
}

console.log('')
console.log('— la banda donde quedarían dos pilastras pegadas: se avisa y se dice por dónde salir')
{
  // Con puerta de 90 y lateral de 19 el relleno pasa de 101 a los 230 de
  // cabina y recién es PANEL pasados los 248: en esos 18 cm el despiece sacaba
  // dos pilastras canto con canto.
  const conf = cfg({ puertaAccesibleCm: 90, anchoAccesibleCm: 230, pilastraLateralMrCm: 19, pilastraCierreMrCm: 19 })
  const tope = Math.max(...ANCHOS_PILASTRA)
  for (const ancho of [230, 240, 248]) {
    const c = cab(ancho, 90)
    const f = frenteAccesible(c, conf)
    const aviso = cuartoPmr(tramo(c), conf)?.aviso
    ok(!f.juntada && f.frente <= tope && f.pilastra + f.frente > tope,
      `${ancho} → PL ${f.pilastra} + PL ${f.frente}: las dos juntas pasan de ${tope}`)
    ok(aviso != null && aviso.includes('costilla de 19'), '  y la pantalla avisa, con las dos salidas y el sándwich con costilla')
  }
  // justo afuera de la banda no tiene que avisar de esto
  for (const ancho of [228, 250]) {
    const c = cab(ancho, 90)
    const aviso = cuartoPmr(tramo(c), conf)?.aviso
    ok(aviso == null || !aviso.includes('una contra otra'), `${ancho} → fuera de la banda, sin ese aviso`)
  }
}

console.log('')
console.log('— y el sándwich sale solo: la costilla va al plano y al despiece')
{
  const conf = cfg({ puertaAccesibleCm: 90, anchoAccesibleCm: 240, pilastraLateralMrCm: 19, pilastraCierreMrCm: 19 })
  const c = cab(240, 90)
  const t = tramo(c)
  ok(rinconEnSandwich(t, conf, 0), 'el rincón de 240 se arma en sándwich')
  const sop = soportesDe(t, conf)
  ok(sop.length === 1, `${sop.length} soporte(s) en la tira`)
  ok(sop[0]?.tipo === 'costilla' && sop[0]?.anchoCm === COSTILLA_MINIMA_CM,
    `  y es una costilla de ${sop[0]?.anchoCm} cm`)
  const area = { id: 'a1', nombre: 'A', piso: '', config: conf, tramos: [t] } as unknown as Area
  // la lateral y la de cierre también miden 19, así que lo que se cuenta es
  // que haya UNA más que sin sándwich
  const plDe19 = (a: Area) => piezasDeArea(a).filter((x) => x.familia === 'PL' && x.anchoCm === COSTILLA_MINIMA_CM).length
  ok(plDe19(area) === 3, `  y el despiece la saca: ${plDe19(area)} PL de ${COSTILLA_MINIMA_CM} (lateral, cierre y costilla)`)

  // fuera de la banda el rincón cierra solo y no se cobra ninguna costilla
  const sinBanda = cfg({ puertaAccesibleCm: 90, anchoAccesibleCm: 300, pilastraLateralMrCm: 19, pilastraCierreMrCm: 19 })
  const t2 = tramo(cab(300, 90))
  ok(!rinconEnSandwich(t2, sinBanda, 0), 'a los 300 el relleno ya es panel: sin sándwich')
  const area2 = { id: 'a2', nombre: 'B', piso: '', config: sinBanda, tramos: [t2] } as unknown as Area
  ok(plDe19(area2) === 2, `  y el despiece no suma costilla: ${plDe19(area2)} PL de ${COSTILLA_MINIMA_CM}`)
}

console.log(mal === 0 ? '\nTodo cuadra.' : `\n${mal} caso(s) mal.`)
process.exit(mal === 0 ? 0 : 1)
