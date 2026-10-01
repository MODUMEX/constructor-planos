/**
 * Centros de carga: modular con las descargas que ya están en el piso.
 *
 * El caso de referencia es el plano FEDEX GUADALAJARA M1, de agosto de 2026:
 * un baño de 4,49 m de claro con la cabina de movilidad reducida al arranque y
 * tres cabinas normales. Las descargas están a 2,13 · 0,95 · 0,95 del muro, y
 * la mampara se dibujó alrededor de ellas: los divisores caen en el punto medio
 * de cada par y por eso las pilastras NO son todas iguales.
 */
import {
  avisosDeDescargas, corridaDeCentros, descargasDe, escalaDeTramo, fronterasDe,
  hayCentros, modularPorCentros, tramoDesdeCentros,
} from '../src/descargas'
import { anchoTotal, crearTramos } from '../src/modulacion'
import type { Config, Tramo, TipologiaId } from '../src/types'

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
    anchoAccesibleCm: 164,
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

/** dónde queda cada frontera de la tira, en cm del PLANO */
function fronterasReales(t: Tramo): number[] {
  const esc = escalaDeTramo(t)
  return fronterasDe(t).map((u) => Math.round((u / esc) * 10) / 10)
}

console.log('\n1 · una tira recta entre muros con tres descargas parejas')
{
  // claro de 300 con tres descargas cada 100: los divisores tienen que caer en
  // 100 y 200, o sea cabinas de 100
  const c = cfg('RECTA_ENTRE_MUROS')
  const t = crearTramos('RECTA_ENTRE_MUROS', 300, 3, c)[0]
  t.centrosCm = [50, 150, 250]
  revisar('el tramo trae centros', hayCentros(t))

  const r = tramoDesdeCentros(t, c)
  revisar('modula', r != null)
  if (r) {
    const armado: Tramo = { ...t, cabinas: r.cabinas, pilastras: r.pilastras }
    const fr = fronterasReales(armado)
    revisar('la primera frontera cae en 100', Math.abs(fr[1] - 100) <= 2, `${fr[1]}`)
    revisar('la segunda cae en 200', Math.abs(fr[2] - 200) <= 2, `${fr[2]}`)
    revisar('la tira cierra el claro', r.ajuste !== 'falta' && r.ajuste !== 'sobra', r.mensaje)
    revisar('quedaron tres cabinas', r.cabinas.length === 3)
  }
}

console.log('\n2 · descargas DESPAREJAS: las pilastras se acomodan')
{
  // el caso que motiva todo: la plomería no está pareja y las cabinas no
  // pueden medir lo mismo
  const c = cfg('RECTA_ENTRE_MUROS')
  const t = crearTramos('RECTA_ENTRE_MUROS', 300, 3, c)[0]
  t.centrosCm = [45, 150, 255]

  const r = tramoDesdeCentros(t, c)
  revisar('modula', r != null)
  if (r) {
    const armado: Tramo = { ...t, cabinas: r.cabinas, pilastras: r.pilastras }
    const fr = fronterasReales(armado)
    revisar('la primera frontera va al punto medio 97,5', Math.abs(fr[1] - 97.5) <= 2.5, `${fr[1]}`)
    revisar('la segunda al 202,5', Math.abs(fr[2] - 202.5) <= 2.5, `${fr[2]}`)
    // y los inodoros quedan centrados en su cabina
    const d = descargasDe(armado, c)
    revisar('las tres descargas entran en su cabina', d.length === 3 && d.every((x) => x.izqCm > 0 && x.derCm > 0))
    revisar('ninguna queda montada sobre una pieza', avisosDeDescargas(armado, c).length === 0,
      avisosDeDescargas(armado, c).join(' · '))
  }
}

console.log('\n3 · el plano FEDEX: variación panel con la accesible plantada')
{
  // claro 449, la accesible de 164 al arranque y tres cabinas; las descargas
  // del plano están a 213, 308 y 403 del muro
  const c = cfg('MR_PANEL_U', { puertaAccesibleCm: 90, anchoAccesibleCm: 164 })
  const t = crearTramos('MR_PANEL_U', 449, 4, c)[0]
  t.centrosCm = [null, 213, 308, 403]

  const corrida = corridaDeCentros(t, c)
  revisar('la corrida deja afuera a la accesible', !('problema' in corrida) && corrida.banos?.desde === 1,
    'problema' in corrida ? corrida.problema : `${corrida.banos?.desde}..${corrida.banos?.hasta}`)

  const r = tramoDesdeCentros(t, c)
  revisar('modula', r != null)
  if (r) {
    const armado: Tramo = { ...t, cabinas: r.cabinas, pilastras: r.pilastras }
    const fr = fronterasReales(armado)
    // los divisores del plano caen en 260,5 y 355,5 (puntos medios)
    revisar('el primer divisor cae en 260,5', Math.abs(fr[2] - 260.5) <= 3, `${fr[2]}`)
    revisar('el segundo en 355,5', Math.abs(fr[3] - 355.5) <= 3, `${fr[3]}`)
    revisar('la accesible no se movió', Math.abs(r.cabinas[0].anchoCm - t.cabinas[0].anchoCm) < 0.01,
      `${r.cabinas[0].anchoCm} vs ${t.cabinas[0].anchoCm}`)
    revisar('la tira sigue midiendo lo mismo', Math.abs(anchoTotal(r.cabinas) - anchoTotal(t.cabinas)) <= 5,
      `${anchoTotal(r.cabinas).toFixed(1)} vs ${anchoTotal(t.cabinas).toFixed(1)}`)
    const d = descargasDe(armado, c)
    revisar('las tres descargas entran en su cabina', d.length === 3 && d.every((x) => x.izqCm > 0 && x.derCm > 0))
    console.log('    piezas:', r.pilastras.map((p, i) => i === 0 ? `PI${p}` : `PT${r.cabinas[i]?.puerta.anchoCm ?? '-'} · PI${p}`).join(' · '))
  }
}

console.log('\n4 · una descarga mal puesta se avisa')
{
  const c = cfg('RECTA_ENTRE_MUROS')
  const t = crearTramos('RECTA_ENTRE_MUROS', 300, 3, c)[0]
  // la del medio pegada al divisor de la izquierda
  t.centrosCm = [50, 110, 250]
  const avisos = avisosDeDescargas(t, c)
  revisar('avisa que el inodoro queda montado', avisos.length > 0, avisos.join(' · '))

  // y una que cae fuera de su cabina
  const t2 = crearTramos('RECTA_ENTRE_MUROS', 300, 3, c)[0]
  t2.centrosCm = [50, 280, 250]
  revisar('avisa la que cae fuera', avisosDeDescargas(t2, c).some((a) => a.includes('fuera')),
    avisosDeDescargas(t2, c).join(' · '))
}

console.log('\n5 · los orinales también salen de sus descargas')
{
  // una tira de baños con el campo de orinales al final: las mamparas del campo
  // tienen que quedar en el punto medio de cada par de descargas
  const c = cfg('RECTA_ENTRE_MUROS', { orinales: 3, anchoOrinalCm: 60 })
  const t = crearTramos('RECTA_ENTRE_MUROS', 500, 2, c)[0]
  t.centrosCm = [50, 145, 250, 330, 420]

  const corrida = corridaDeCentros(t, c)
  revisar('ve los baños y el campo por separado',
    !('problema' in corrida) && corrida.banos?.hasta === 2 && corrida.orinales?.desde === 2,
    'problema' in corrida ? corrida.problema : JSON.stringify(corrida))

  const r = tramoDesdeCentros(t, c)
  revisar('modula', r != null)
  if (r) {
    const armado: Tramo = { ...t, cabinas: r.cabinas, pilastras: r.pilastras }
    const fr = fronterasReales(armado)
    revisar('la mampara entre los dos primeros orinales va al medio de 250 y 330',
      Math.abs(fr[3] - 290) <= 2.5, String(fr[3]))
    revisar('y la siguiente al medio de 330 y 420', Math.abs(fr[4] - 375) <= 2.5, String(fr[4]))
    revisar('la tira sigue cerrando el claro', r.ajuste !== 'falta' && r.ajuste !== 'sobra', r.mensaje)
    revisar('devuelve el ancho pedido de cada orinal', (r.anchosOrinal?.length ?? 0) === 3,
      (r.anchosOrinal ?? []).join(' · '))
    const d = descargasDe(armado, c)
    revisar('los cinco sanitarios entran en su lugar', d.length === 5 && d.every((x) => x.izqCm > 0 && x.derCm > 0))
  }
}

console.log('\n5b · un área de puros orinales')
{
  const c = cfg('ORINALES_ENTRE_MUROS', { orinales: 3 })
  const t = crearTramos('ORINALES_ENTRE_MUROS', 240, 3, c)[0]
  t.centrosCm = [45, 120, 195]
  const corrida = corridaDeCentros(t, c)
  revisar('no hay corrida de baños y sí campo de orinales',
    !('problema' in corrida) && corrida.banos === null && corrida.orinales?.hasta === 3,
    'problema' in corrida ? corrida.problema : JSON.stringify(corrida))

  const r = tramoDesdeCentros(t, c)
  revisar('modula', r != null)
  if (r) {
    const armado: Tramo = { ...t, cabinas: r.cabinas, pilastras: r.pilastras }
    const fr = fronterasReales(armado)
    revisar('la primera mampara va al medio de 45 y 120', Math.abs(fr[1] - 82.5) <= 2.5, String(fr[1]))
    revisar('la segunda al medio de 120 y 195', Math.abs(fr[2] - 157.5) <= 2.5, String(fr[2]))
    revisar('y el campo sigue midiendo lo mismo',
      Math.abs(anchoTotal(r.cabinas) - anchoTotal(t.cabinas)) < 0.6,
      `${anchoTotal(r.cabinas)} vs ${anchoTotal(t.cabinas)}`)
  }
}

console.log('\n5c · lo que todavía no se puede')
{
  // sin centros escritos no hay nada que perseguir
  const c = cfg('RECTA_ENTRE_MUROS')
  const t = crearTramos('RECTA_ENTRE_MUROS', 300, 3, c)[0]
  const sin = corridaDeCentros(t, c)
  revisar('sin centros pide los que faltan', 'problema' in sin && sin.problema.includes('Falta'),
    'problema' in sin ? sin.problema : 'moduló')

  // dos descargas pegadas no dejan lugar para la mampara
  const c2 = cfg('ORINALES_ENTRE_MUROS', { orinales: 3 })
  const t2 = crearTramos('ORINALES_ENTRE_MUROS', 240, 3, c2)[0]
  t2.centrosCm = [45, 120, 122]
  const r2 = modularPorCentros(t2, c2)
  revisar('avisa si un orinal queda aplastado', r2?.ajuste === 'falta', r2?.mensaje ?? 'sin resultado')
}

console.log(String.fromCharCode(10) + '6 · el panel queda en el medio y la descarga no se mueve')
{
  const c = cfg('RECTA_ENTRE_MUROS', { usaCentrosCarga: true })
  const t = crearTramos('RECTA_ENTRE_MUROS', 320, 3, c)[0]
  t.centrosCm = [55, 160, 265]
  const antes = descargasDe(t, c).map((d) => d.realCm)

  const r = tramoDesdeCentros(t, c)
  revisar('modula', r != null)
  if (r) {
    const armado: Tramo = { ...t, cabinas: r.cabinas, pilastras: r.pilastras }
    const fr = fronterasReales(armado)
    // el PANEL divisor se dibuja en la frontera, o sea en el centro de su pilastra:
    // ahi tiene que caer el punto medio de las dos descargas
    revisar('el panel 1 va al medio de 55 y 160', Math.abs(fr[1] - 107.5) <= 2.5, String(fr[1]))
    revisar('el panel 2 va al medio de 160 y 265', Math.abs(fr[2] - 212.5) <= 2.5, String(fr[2]))
    const despues = descargasDe(armado, c).map((d) => d.realCm)
    revisar('las descargas no se movieron', JSON.stringify(antes) === JSON.stringify(despues),
      antes.join() + ' vs ' + despues.join())
    const d = descargasDe(armado, c)
    revisar('y cada inodoro queda centrado en su cabina', d.every((x) => Math.abs(x.desvioCm) <= 2.5),
      d.map((x) => x.desvioCm).join(' · '))
  }
}

console.log(fallos ? `\n${fallos} revisiones mal.\n` : '\nTodo cuadra.\n')
process.exit(fallos ? 1 : 0)
