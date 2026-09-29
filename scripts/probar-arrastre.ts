/**
 * Arrastrar una pilastra no puede desacomodar toda la tira.
 *
 * Antes, mover una volvía a repartir TODAS: se tocaba una y se movían las
 * otras cuatro, así que lo ya ajustado a mano se perdía. Ahora la diferencia
 * la absorbe UNA vecina y el resto se queda donde estaba.
 *
 *   npm run probar-arrastre
 */
import { anchoTotal, compensarPilastra, crearTramos } from '../src/modulacion'
import type { Config, TipologiaId } from '../src/types'

let fallos = 0
function revisar(que: string, bien: boolean, detalle = '') {
  console.log(`  ${bien ? '✓' : '✗'} ${que}${detalle ? ' · ' + detalle : ''}`)
  if (!bien) fallos++
}

function cfg(tipologia: TipologiaId, extra: Partial<Config> = {}): Config {
  return {
    linea: 'LEEDER', modelo: 'M1', acabado: 'Laminado Compacto', color: 'Blanco',
    montaje: 'PISO_HEADRAIL', bisagra: '', cerrojo: '', herrajeAcabado: 'INOX',
    alturaCm: 180, profundidadCm: 150, anchoAccesibleCm: 150, anchoPilastraCm: 24,
    espesorMm: 12, terminacion: 'ZOCLO', kap: false, orinales: 0, mgAlturaCm: 120,
    tipologia, ...extra,
  } as Config
}

console.log('\n1 · mover una pilastra mueve UNA vecina, no toda la tira')
{
  const config = cfg('RECTA_ENTRE_MUROS', { puertaCm: 60 })
  const t = crearTramos('RECTA_ENTRE_MUROS', 420, 4, config, 'CR')[0]
  const antes = [...(t.pilastras ?? [])]
  console.log(`    pilastras: ${antes.join(' | ')}`)

  // se agranda la segunda frontera
  const k = 2
  const masAncha = antes[k] + 5
  const r = compensarPilastra(t, config, k, masAncha)
  if (!r) {
    revisar('la vecina puede absorberlo', false, 'devolvió null')
  } else {
    console.log(`    después:   ${r.pilastras.join(' | ')}`)
    revisar('la que se movió queda con la medida pedida', r.pilastras[k] === masAncha)
    const cambiadas = r.pilastras.map((a, i) => (a !== antes[i] ? i : -1)).filter((i) => i >= 0)
    revisar('solo cambian DOS: la que se movió y una vecina', cambiadas.length === 2, `cambiaron ${cambiadas.join(', ')}`)
    revisar('la vecina es de al lado', Math.abs(cambiadas.find((i) => i !== k)! - k) === 1)
    const sumaAntes = antes.reduce((s, a) => s + a, 0)
    const sumaDespues = r.pilastras.reduce((s, a) => s + a, 0)
    revisar('la tira sigue midiendo lo mismo', sumaAntes === sumaDespues, `${sumaAntes} vs ${sumaDespues}`)
    const totalAntes = anchoTotal(t.cabinas)
    const totalDespues = anchoTotal(r.cabinas)
    revisar('y el claro también', Math.abs(totalAntes - totalDespues) < 0.05, `${totalAntes} vs ${totalDespues}`)
    revisar('las puertas no se tocan', r.cabinas.every((c, i) => c.puerta.anchoCm === t.cabinas[i].puerta.anchoCm))
  }
}

console.log('\n2 · una pilastra que el vendedor ya clavó no se toca')
{
  const config = cfg('RECTA_ENTRE_MUROS', { puertaCm: 60 })
  const t = crearTramos('RECTA_ENTRE_MUROS', 420, 4, config, 'CR')[0]
  const antes = [...(t.pilastras ?? [])]
  const k = 2
  // se clava la vecina de la izquierda: la diferencia la tiene que absorber otra
  const r = compensarPilastra(t, config, k, antes[k] + 5, [1])
  if (!r) {
    revisar('encuentra otra vecina', false, 'devolvió null')
  } else {
    revisar('la clavada queda intacta', r.pilastras[1] === antes[1], `${antes[1]} → ${r.pilastras[1]}`)
    const cambiadas = r.pilastras.map((a, i) => (a !== antes[i] ? i : -1)).filter((i) => i >= 0)
    revisar('siguen siendo dos las que se mueven', cambiadas.length === 2, `cambiaron ${cambiadas.join(', ')}`)
  }
}

console.log('\n3 · con la cabina accesible plantada, su frontera no se usa de vecina')
{
  const config = cfg('MR_PANEL_U', {
    profundidadCm: 135, anchoAccesibleCm: 204, profundidadAccesibleCm: 180, puertaAccesibleCm: 100,
  })
  const t = crearTramos('MR_PANEL_U', 500, 4, config, 'CR')[0]
  const antes = [...(t.pilastras ?? [])]
  console.log(`    pilastras: ${antes.join(' | ')}`)
  revisar('la frontera de la accesible vale 0', antes[0] === 0)
  const k = 2
  const r = compensarPilastra(t, config, k, antes[k] + 5)
  if (!r) {
    revisar('se puede compensar', false, 'devolvió null')
  } else {
    console.log(`    después:   ${r.pilastras.join(' | ')}`)
    revisar('la frontera de la accesible sigue en 0', r.pilastras[0] === 0)
    revisar('la accesible no cambia de ancho', r.cabinas[0].anchoCm === t.cabinas[0].anchoCm, `${t.cabinas[0].anchoCm} → ${r.cabinas[0].anchoCm}`)
    revisar('el claro se mantiene', Math.abs(anchoTotal(t.cabinas) - anchoTotal(r.cabinas)) < 0.05)
  }
}

console.log('\n4 · lo que no se puede compensar se devuelve a buscar')
{
  const config = cfg('RECTA_ENTRE_MUROS', { puertaCm: 60, orinales: 2 })
  const t = crearTramos('RECTA_ENTRE_MUROS', 500, 4, config, 'CR')[0]
  revisar('con orinales no se compensa acá', compensarPilastra(t, config, 1, 40) === null)

  const limpio = crearTramos('RECTA_ENTRE_MUROS', 420, 4, cfg('RECTA_ENTRE_MUROS', { puertaCm: 60 }), 'CR')[0]
  const c2 = cfg('RECTA_ENTRE_MUROS', { puertaCm: 60 })
  revisar('no moverla no cambia nada', compensarPilastra(limpio, c2, 2, limpio.pilastras![2]) === null)
  // una diferencia que ninguna vecina puede absorber
  revisar(
    'si ninguna vecina llega, devuelve null',
    compensarPilastra(limpio, c2, 2, limpio.pilastras![2] + 1000) === null,
  )
}

console.log(fallos ? `\n${fallos} revisiones mal.\n` : '\nTodo cuadra.\n')
process.exit(fallos ? 1 : 0)
