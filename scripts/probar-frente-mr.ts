/**
 * El frente de la cabina accesible no puede salir más angosto que la pilastra
 * más chica del catálogo.
 *
 * Con laterales de 24, puerta de 100 y 150 de cubículo quedaba una pieza de
 * 2 cm, y se iba así al plano, al despiece y a la cotización. Ahora la
 * modulación no respeta una lateral elegida a mano que no deja frente
 * fabricable: usa la que sí cierra y la pantalla avisa del cambio. Si ni con
 * la más chica alcanza, no se inventa nada y queda el aviso.
 *
 *   npm run probar-frente-mr
 */
import { frenteAccesible, lateralesDelFrente } from '../src/modulacion'
import { cuartoPmr } from '../src/geometria'
import { ANCHOS_PILASTRA } from '../src/catalog'
import type { Cabina, Config, Tramo } from '../src/types'

let mal = 0
const ok = (b: boolean, t: string) => { if (!b) mal++; console.log(`${b ? '✓' : '✕'} ${t}`) }
const MINIMA = Math.min(...ANCHOS_PILASTRA)

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

console.log('— sin tocar nada: la modulación elige la lateral que cierra')
{
  const f = frenteAccesible(cab(150, 100), cfg())
  ok(f.pilastra === 19 && f.frente === 12, `150 con puerta de 100 → 19 · 12 · 100 · 19 (frente ${f.frente})`)
  ok(f.frente >= MINIMA, '  y el frente es una pieza de verdad')
  ok(lateralesDelFrente(150, 100) === 19, '  la automática es la de 19')
}

console.log('\n— el caso del plano: laterales cambiadas a 24 a mano')
{
  const c = cab(150, 100)
  const config = cfg({ pilastraLateralMrCm: 24 })
  const f = frenteAccesible(c, config)
  ok(f.pilastra === 19 && f.cierre === 19 && f.frente === 12,
    `la de 24 dejaba 2 cm de frente, así que manda la de ${f.pilastra} · frente ${f.frente}`)
  ok(f.frente >= MINIMA, '  la pieza del frente ya se puede fabricar')
  ok(f.pilastra * 2 + f.frente + f.puerta === 150, '  y el frente sigue cerrando los 150')
  ok(cuartoPmr(tramo(c), config)?.aviso == null, '  el plano ya no avisa, porque cierra')
}

console.log('\n— lo elegido a mano se respeta cuando sí cierra')
{
  const f = frenteAccesible(cab(180, 100), cfg({ pilastraLateralMrCm: 24 }))
  ok(f.pilastra === 24 && f.frente === 32, `180 con laterales de 24 → frente ${f.frente}`)
}
{
  const f = frenteAccesible(cab(150, 100), cfg({ pilastraLateralMrCm: 15, pilastraCierreMrCm: 24 }))
  ok(f.pilastra === 15 && f.cierre === 24 && f.frente === 11,
    `una de 15 y otra de 24 → frente ${f.frente}, cada una como se pidió`)
}

console.log('\n— cuando ni la más chica alcanza, no se inventa nada: se avisa')
for (const [ancho, puerta] of [[125, 100], [115, 100]] as const) {
  const c = cab(ancho, puerta)
  const config = cfg()
  const f = frenteAccesible(c, config)
  const aviso = cuartoPmr(tramo(c), config)?.aviso
  ok(aviso != null, `${ancho} con puerta de ${puerta} → frente ${f.frente} · avisa`)
}

console.log('\n— los que ya cerraban bien siguen sin aviso')
for (const [ancho, puerta] of [[204, 100], [150, 90], [180, 100]] as const) {
  const c = cab(ancho, puerta)
  const f = frenteAccesible(c, cfg())
  ok(f.frente >= MINIMA && cuartoPmr(tramo(c), cfg())?.aviso == null,
    `${ancho} con puerta de ${puerta} → frente ${f.frente}, sin aviso`)
}

console.log(mal === 0 ? '\nTodo cuadra.' : `\n${mal} caso(s) mal.`)
process.exit(mal === 0 ? 0 : 1)
