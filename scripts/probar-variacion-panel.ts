/**
 * Las tres tipologías "variación panel" de la hoja de LEEDER.
 *
 * Lo que las distingue de todo lo demás:
 *
 *   · la cabina de movilidad reducida es más HONDA que las otras; la diferencia
 *     es el RECESO en el que se mete la tira de baños;
 *   · se entra por el FRENTE: pilastra lateral + frente + puerta (19 + 85 + 100
 *     sobre 204 en la hoja), no por el costado como en el Tipo C;
 *   · su panel cuenta como una PARED para modular, así que en la U se
 *     descuentan 3 cm de herraje y no 2.
 */
import { claroAjustado } from '../src/catalog'
import {
  anchoAccesibleDe, crearTramos, frenteAccesible, pedidoDeModulacion, profundidadAccesible, recesoDe,
} from '../src/modulacion'
import type { Config, TipologiaId } from '../src/types'

let fallos = 0
function revisar(que: string, bien: boolean, detalle = '') {
  console.log(`  ${bien ? '✓' : '✗'} ${que}${detalle ? ' · ' + detalle : ''}`)
  if (!bien) fallos++
}

function cfg(tipologia: TipologiaId, extra: Partial<Config> = {}): Config {
  return {
    linea: 'LEEDER',
    modelo: 'M1',
    acabado: 'Laminado Compacto',
    color: 'Blanco',
    montaje: 'PISO_HEADRAIL',
    bisagra: '',
    cerrojo: '',
    herrajeAcabado: 'INOX',
    alturaCm: 180,
    profundidadCm: 135,
    anchoAccesibleCm: 204,
    profundidadAccesibleCm: 180,
    anchoPilastraCm: 24,
    espesorMm: 12,
    terminacion: 'ZOCLO',
    kap: false,
    orinales: 0,
    mgAlturaCm: 120,
    tipologia,
    ...extra,
  } as Config
}

const MUROS: Record<string, { muroInicio: boolean; muroFin: boolean }> = {
  MR_PANEL_E: { muroInicio: false, muroFin: false },
  MR_PANEL_L: { muroInicio: true, muroFin: false },
  MR_PANEL_U: { muroInicio: true, muroFin: true },
}

console.log('\n1 · el panel cuenta como una pared')
{
  // la regla de Dayanna: "si es en U se quitaría 3cm en lugar de 2cm por
  // herraje a muro, el resto es igual"
  for (const [id, esperado] of [['MR_PANEL_U', 3], ['MR_PANEL_L', 2], ['MR_PANEL_E', 1]] as const) {
    const p = pedidoDeModulacion(MUROS[id], cfg(id), true)
    revisar(`${id} descuenta ${esperado} cm`, p.murosPilastra === esperado, `da ${p.murosPilastra}`)
    revisar(`  y no se come el muro`, p.cuartoComeMuro === false)
  }
  // y las de siempre no cambian
  const u = pedidoDeModulacion({ muroInicio: true, muroFin: true }, cfg('RECTA_ENTRE_MUROS'), false)
  revisar('la U de siempre sigue en 2', u.murosPilastra === 2, `da ${u.murosPilastra}`)
  const pmr = pedidoDeModulacion({ muroInicio: true, muroFin: false }, cfg('PMR'), true)
  revisar('el Tipo C sigue comiéndose su muro', pmr.cuartoComeMuro === true && pmr.murosPilastra === 1)
}

console.log('\n2 · el fondo de la accesible y el receso')
{
  const c = cfg('MR_PANEL_U')
  revisar('la accesible va a 180', profundidadAccesible(c) === 180)
  revisar('las demás a 135', c.profundidadCm === 135)
  revisar('el receso es de 45', recesoDe(c) === 45, `${recesoDe(c)}`)
  // sin fondo propio no hay receso
  const sin = cfg('MR_PANEL_U', { profundidadAccesibleCm: undefined })
  revisar('sin fondo propio no hay receso', recesoDe(sin) === 0)
  // y nunca puede ser menos honda que las demás
  const corto = cfg('MR_PANEL_U', { profundidadAccesibleCm: 100 })
  revisar('nunca queda más corta que las demás', profundidadAccesible(corto) === 135)
}

console.log('\n3 · el frente: pilastra lateral + frente + puerta')
{
  const c = cfg('MR_PANEL_U', { puertaAccesibleCm: 100 })
  const tramos = crearTramos('MR_PANEL_U', 500, 3, c)
  const acc = tramos[0].cabinas[0]
  revisar('la accesible arranca la tira', acc?.tipo === 'accesible')
  revisar('y se planta en el ancho pedido', acc?.anchoCm === 204, `${acc?.anchoCm}`)
  const f = frenteAccesible(acc, c)
  revisar('la pilastra lateral es de 19', f.pilastra === 19, `${f.pilastra}`)
  revisar('la puerta es de 100', f.puerta === 100, `${f.puerta}`)
  revisar('el frente se lleva lo que queda: 85', f.frente === 85, `${f.frente}`)
  revisar('las tres suman el ancho', f.pilastra + f.frente + f.puerta === acc!.anchoCm)
}

console.log('\n4 · la tira del receso cierra el claro con el descuento nuevo')
{
  for (const id of ['MR_PANEL_E', 'MR_PANEL_L', 'MR_PANEL_U'] as const) {
    const c = cfg(id, { puertaAccesibleCm: 100 })
    const claro = 500
    const t = crearTramos(id, claro, 3, c)[0]
    const acc = t.cabinas[0]
    const resto = t.cabinas.slice(1)
    const pil = (t.pilastras ?? []).slice(1)
    const piezas = pil.reduce((s, a) => s + a, 0) + resto.reduce((s, cb) => s + cb.puerta.anchoCm, 0)
    const descuento = pedidoDeModulacion(MUROS[id], c, true).murosPilastra
    const objetivo = claroAjustado(claro - acc!.anchoCm, descuento, resto.length)
    const dif = Math.round((objetivo - piezas) * 10) / 10
    revisar(
      `${id}: las piezas del resto cuadran con el claro menos ${descuento} cm`,
      Math.abs(dif) <= 5,
      `objetivo ${objetivo.toFixed(1)} · piezas ${piezas.toFixed(1)} · dif ${dif}`,
    )
    revisar(`  ${id}: la accesible no se movió`, acc?.anchoCm === anchoAccesibleDe(c))
    revisar(`  ${id}: quedaron 3 lugares`, t.cabinas.length === 3, `${t.cabinas.length}`)
  }
}

console.log(fallos ? `\n${fallos} revisiones mal.\n` : '\nTodo cuadra.\n')
process.exit(fallos ? 1 : 0)
