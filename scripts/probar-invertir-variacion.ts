/**
 * Invertir un área de "variación panel".
 *
 * Al voltearla, la cabina de movilidad reducida se va a la otra punta y todo lo
 * suyo tiene que irse con ella: el panel hondo que hace de pared, las tres
 * piezas del frente —que además se dan vuelta, porque la puerta va SIEMPRE
 * pegada a ese panel— y el barrido de la puerta.
 *
 * Lo que NO puede cambiar es el DESPIECE: son las mismas piezas en otro orden.
 * Si al invertir aparece o desaparece una, es que algo se está fabricando mal.
 *
 *   npm run probar-invertir-variacion
 */
import { anchoTotal, crearTramos, invertirTramo } from '../src/modulacion'
import { cuartoPmr } from '../src/geometria'
import { piezasDeArea } from '../src/exportar/piezas'
import type { Area, Config, TipologiaId, Tramo } from '../src/types'

let fallos = 0
function revisar(que: string, bien: boolean, detalle = '') {
  console.log(`  ${bien ? '✓' : '✗'} ${que}${detalle ? ' · ' + detalle : ''}`)
  if (!bien) fallos++
}

function cfg(tipologia: TipologiaId): Config {
  return {
    linea: 'LEEDER', modelo: 'M1', acabado: 'Laminado Compacto', color: 'Blanco',
    montaje: 'PISO_HEADRAIL', bisagra: '', cerrojo: '', herrajeAcabado: 'INOX',
    alturaCm: 180, profundidadCm: 135, anchoAccesibleCm: 204, profundidadAccesibleCm: 180,
    puertaAccesibleCm: 100, anchoPilastraCm: 24, espesorMm: 12, terminacion: 'ZOCLO',
    kap: false, orinales: 0, mgAlturaCm: 120, tipologia,
  } as Config
}

/**
 * Las piezas de un tramo, ordenadas, para poder compararlas.
 *
 * La MANO de la puerta se ignora a propósito: espejar el área es justamente lo
 * que la cambia de lado, así que una PTAIZQ que pasa a PTADER es la misma
 * puerta. Lo que no puede cambiar es el resto.
 */
function despiece(t: Tramo, config: Config): string[] {
  const area = { id: 'a', nombre: 'A', piso: '1', config, tramos: [t] } as Area
  return piezasDeArea(area)
    .map((p) => `${p.subTipo.replace(/^PTA(IZQ|DER)/, 'PTA')} ${p.anchoCm}×${p.altoCm}`)
    .sort()
}

for (const id of ['MR_PANEL_U', 'MR_PANEL_L', 'MR_PANEL_E'] as const) {
  console.log(`\n── ${id}`)
  const config = cfg(id)
  const derecho = crearTramos(id, 500, 4, config, 'CR')[0]
  const vuelta = invertirTramo(derecho)

  const a = cuartoPmr(derecho, config)!
  const b = cuartoPmr(vuelta, config)!

  revisar('la accesible arranca la tira', a.indice === 0 && a.lado === 'inicio')
  revisar('invertida, la cierra', b.indice === vuelta.cabinas.length - 1 && b.lado === 'fin')
  revisar('mide lo mismo de las dos formas', a.anchoCm === b.anchoCm, `${a.anchoCm} vs ${b.anchoCm}`)
  revisar('la tira mide lo mismo', anchoTotal(derecho.cabinas) === anchoTotal(vuelta.cabinas))
  revisar('los muros se intercambian', derecho.muroInicio === vuelta.muroFin && derecho.muroFin === vuelta.muroInicio)

  // el frente: la puerta va SIEMPRE pegada al panel que separa de la tira
  const ordenA = a.frente.map((p) => p.tipo).join('·')
  const ordenB = b.frente.map((p) => p.tipo).join('·')
  revisar('derecha: pilastra, frente, puerta y cierre', ordenA === 'pilastra·frente·puerta·cierre', ordenA)
  revisar('invertida: se dan vuelta', ordenB === 'cierre·puerta·frente·pilastra', ordenB)
  // La de CIERRE es la que va contra el panel divisor: es contra ella que
  // cierra la puerta, porque una puerta nunca cierra contra un panel.
  revisar(
    'la de cierre queda pegada al panel',
    a.frente[a.frente.length - 1].tipo === 'cierre' &&
      a.frente[a.frente.length - 1].hastaCm === a.hastaCm &&
      b.frente[0].tipo === 'cierre' && b.frente[0].desdeCm === b.desdeCm,
  )
  revisar(
    'y la pilastra lateral, contra el muro o el cierre',
    a.frente[0].desdeCm === a.desdeCm && b.frente[b.frente.length - 1].hastaCm === b.hastaCm,
  )
  const sumaA = a.frente.reduce((s, p) => s + (p.hastaCm - p.desdeCm), 0)
  const sumaB = b.frente.reduce((s, p) => s + (p.hastaCm - p.desdeCm), 0)
  revisar('las tres suman el ancho de la cabina', sumaA === a.anchoCm && sumaB === b.anchoCm)

  // el panel hondo se va con ella
  revisar('el fondo de la accesible no cambia', a.profCm === b.profCm && a.profCm === 180)

  // y el despiece es EL MISMO
  const pa = despiece(derecho, config)
  const pb = despiece(vuelta, config)
  const soloA = pa.filter((x) => !pb.includes(x))
  const soloB = pb.filter((x) => !pa.includes(x))
  revisar(
    'el despiece es el mismo',
    pa.length === pb.length && soloA.length === 0 && soloB.length === 0,
    soloA.length || soloB.length ? `sobra derecha: ${soloA.join(', ')} | sobra invertida: ${soloB.join(', ')}` : `${pa.length} piezas`,
  )

  // invertir dos veces tiene que dejar todo como estaba
  const ida = invertirTramo(vuelta)
  revisar(
    'invertir dos veces vuelve al original',
    JSON.stringify(ida.cabinas.map((c) => c.anchoCm)) === JSON.stringify(derecho.cabinas.map((c) => c.anchoCm)) &&
      JSON.stringify(ida.pilastras) === JSON.stringify(derecho.pilastras),
  )
}

console.log(fallos ? `\n${fallos} revisiones mal.\n` : '\nTodo cuadra.\n')
process.exit(fallos ? 1 : 0)
