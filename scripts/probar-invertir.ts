/**
 * Invertir un área es un ESPEJO: las mismas piezas, del otro lado.
 *
 * O sea que el despiece tiene que ser idéntico —salvo la mano de las puertas,
 * que justamente se espeja— y la tira tiene que seguir cerrando igual. Si algo
 * aparece, desaparece o cambia de medida, el pedido sale mal.
 *
 *   npm run probar-invertir
 */
import { crearTramos, anchoTotal, invertirTramo, reajustarConPuertas } from '../src/modulacion'
import { piezasDeArea } from '../src/exportar/piezas'
import type { Area, Config, TipologiaId, Tramo } from '../src/types'

let mal = 0
const ok = (b: boolean, t: string) => { if (!b) mal++; console.log(`${b ? '✓' : '✕'} ${t}`) }

function cfg(tipologia: string, orinales: number): Config {
  return {
    tipologia, modelo: 'REFORZADO', linea: 'LEEDER',
    claroCm: 420, profundidadCm: 150, profundidadLugarCm: 255, cantidad: 3, alturaCm: 200,
    puertaCm: 60, puertaAccesibleCm: 90, anchoAccesibleCm: 159, anchoPilastraCm: 24,
    orinales, anchoOrinalCm: 90, montaje: 'PISO_HEADRAIL', color: 'BLANCO',
    acabado: 'Laminado Compacto', terminacion: 'ZOCLO', espesorMm: 12,
    llevaAccesible: tipologia === 'PMR',
  } as unknown as Config
}

/** el despiece sin la mano de la puerta, que es lo único que el espejo cambia a propósito */
function piezas(t: Tramo, config: Config): string[] {
  return piezasDeArea({ id: 'a', nombre: 'A', piso: '', config, tramos: [t] } as unknown as Area)
    .map((p) => `${p.familia} ${p.anchoCm}×${p.altoCm}`)
    .sort()
}

function probar(tipologia: string, orinales: number, claro: number, cantidad: number) {
  const config = cfg(tipologia, orinales)
  const t0 = crearTramos(tipologia as TipologiaId, claro, cantidad, config, 'CR')[0]
  const inv = invertirTramo(t0)
  const a = piezas(t0, config)
  const b = piezas(inv, config)
  const igual = a.length === b.length && a.every((x, i) => x === b[i])
  const cierra = Math.abs(anchoTotal(t0.cabinas) - anchoTotal(inv.cabinas)) < 0.05
  console.log(`\n── ${tipologia}${orinales ? ` + ${orinales} orinales` : ''}`)
  console.log(`   normal   : ${t0.cabinas.map((c) => c.anchoCm).join(' | ')}`)
  console.log(`   invertido: ${inv.cabinas.map((c) => c.anchoCm).join(' | ')}`)
  ok(igual, 'el despiece es el mismo')
  if (!igual) {
    // se comparan las CANTIDADES: puede estar la misma pieza pero repetida distinto
    const contar = (xs: string[]) => xs.reduce<Record<string, number>>((m, x) => ({ ...m, [x]: (m[x] ?? 0) + 1 }), {})
    const ca = contar(a), cb = contar(b)
    for (const k of new Set([...Object.keys(ca), ...Object.keys(cb)])) {
      if ((ca[k] ?? 0) !== (cb[k] ?? 0)) console.log(`     ${k}:  normal ${ca[k] ?? 0}  ·  invertido ${cb[k] ?? 0}`)
    }
  }
  ok(cierra, 'la tira mide lo mismo')
  // y volver a invertir tiene que devolver exactamente lo de antes
  const vuelta = invertirTramo(inv)
  ok(piezas(vuelta, config).join('|') === a.join('|'), 'invertir dos veces deja todo como estaba')
}

probar('RECTA_ENTRE_MUROS', 0, 420, 3)
probar('RECTA_MURO_IZQ', 0, 420, 3)
probar('RECTA_MURO_IZQ', 3, 420, 3)
probar('PMR', 0, 500, 3)
probar('PMR', 3, 693, 4)


console.log('\n── y después de invertir se puede seguir editando')
{
  const config = cfg('PMR', 3)
  const t0 = crearTramos('PMR', 693, 4, config, 'CR')[0]
  const inv = { ...invertirTramo(t0), espejo: true }
  // mover una pilastra: la tira se desespeja, se modula y se vuelve a espejar
  const canonico = invertirTramo(inv)
  const n = inv.cabinas.length
  const fijas = Array.from({ length: n + 1 }, (_, k) => (k === n - 1 ? 24 : canonico.pilastras?.[k] ?? null))
  const r = reajustarConPuertas(
    canonico.cabinas, canonico.claroCm, 1, false, 162, fijas, canonico.pilastras,
    canonico.cabinas.map((c) => (c.tipo === 'orinal' ? 90 : null)),
  )
  ok(!!r, 'la tira invertida se sigue pudiendo modular')
  if (r) {
    const vuelto = invertirTramo({ ...canonico, ...r })
    console.log(`   quedó: ${vuelto.cabinas.map((c) => c.anchoCm).join(' | ')}`)
    ok(vuelto.cabinas[vuelto.cabinas.length - 1].tipo === 'accesible', 'el cuarto sigue del lado al que se invirtió')
    ok(vuelto.cabinas[0].tipo === 'orinal', 'y los orinales siguen del otro')
  }
}

console.log(mal === 0 ? '\nTodo cuadra.' : `\n${mal} caso(s) mal.`)
process.exit(mal === 0 ? 0 : 1)