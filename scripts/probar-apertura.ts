/**
 * Hacia dónde abre la puerta de una cabina recién modulada.
 *
 * La regla es del PANEL —el fondo de la cabina—, no del ancho: con un panel de
 * menos de 135 la hoja abierta no cabe adentro. De 135 para arriba abre hacia
 * adentro, que es lo que se pide casi siempre para no invadir el pasillo.
 *
 *   npm run probar-apertura
 */
import { crearTramos, aperturaPorDefecto, PANEL_MIN_ADENTRO_CM } from '../src/modulacion'
import type { Config } from '../src/types'

let mal = 0
const ok = (b: boolean, t: string) => { if (!b) mal++; console.log(`${b ? '✓' : '✕'} ${t}`) }

console.log(`— el corte está en ${PANEL_MIN_ADENTRO_CM} cm de panel`)
ok(aperturaPorDefecto(134) === 'afuera', 'un panel de 134 abre hacia afuera')
ok(aperturaPorDefecto(135) === 'adentro', 'uno de 135 ya abre hacia adentro')
ok(aperturaPorDefecto(150) === 'adentro', 'y uno de 150 también')
ok(aperturaPorDefecto(undefined) === 'afuera', 'sin dato, hacia afuera: es lo seguro')

function cfg(profundidadCm: number): Config {
  return {
    tipologia: 'RECTA_ENTRE_MUROS', modelo: 'REFORZADO', linea: 'LEEDER',
    claroCm: 420, profundidadCm, cantidad: 4, alturaCm: 200,
    puertaCm: 60, anchoPilastraCm: 24, orinales: 0, montaje: 'PISO_HEADRAIL',
    color: 'BLANCO', acabado: 'Laminado Compacto', terminacion: 'ZOCLO', espesorMm: 12,
  } as unknown as Config
}

console.log('\n— y al modular un área de verdad')
for (const prof of [120, 130, 150, 180]) {
  const t = crearTramos('RECTA_ENTRE_MUROS', 420, 4, cfg(prof), 'CR')[0]
  const aperturas = [...new Set(t.cabinas.map((c) => c.puerta.apertura))]
  const esperado = prof >= 135 ? 'adentro' : 'afuera'
  console.log(`  panel ${String(prof).padStart(3)} → ${aperturas.join(' / ')}`)
  ok(aperturas.length === 1 && aperturas[0] === esperado, `con panel ${prof} todas abren hacia ${esperado}`)
}

console.log(mal === 0 ? '\nTodo cuadra.' : `\n${mal} caso(s) mal.`)
process.exit(mal === 0 ? 0 : 1)
