/**
 * Los m² del cuadro de piezas de la cotización.
 *
 * Lo que se prueba es que sean los m² COBRADOS y no los de la medida pedida:
 * una puerta se factura con el ancho de catálogo al que sube, así que el área
 * del cuadro tiene que cuadrar con el precio. Si un día los dos se calcularan
 * por caminos distintos, el cliente vería un total de m² que no explica lo que
 * está pagando.
 */
import { m2DePieza, precioPieza } from '../src/tarifas'
import { bom, crearTramos } from '../src/modulacion'
import { resumenDePiezas } from '../src/exportar/cotizacion'
import { espesorPorLinea } from '../src/catalog'
import type { Config, TipologiaId } from '../src/types'

let fallos = 0
function revisar(que: string, bien: boolean, detalle = '') {
  console.log(`  ${bien ? '✓' : '✗'} ${que}${detalle ? ' · ' + detalle : ''}`)
  if (!bien) fallos++
}

const cerca = (a: number, b: number) => Math.abs(a - b) < 1e-9

const o = { modeloCodigo: 'ESTANDAR', tier: 'linea' as const, moneda: 'USD' as const, tipoCambio: 1 }

console.log('\n1 · los m2 salen de la medida de CATALOGO, no de la pedida')
{
  // la puerta de 62 es de Costa Rica y existe; la de 61 no, y sube a la de 62
  const de62 = m2DePieza({ familia: 'PT', anchoCm: 62, altoCm: 150 }, o)
  const de61 = m2DePieza({ familia: 'PT', anchoCm: 61, altoCm: 150 }, o)
  revisar('una puerta de 61 se cobra como la de 62', cerca(de61, de62), `${de61} vs ${de62}`)

  const pl = m2DePieza({ familia: 'PL', anchoCm: 30, altoCm: 180 }, o)
  revisar('pilastra 30 × 180 = 0,54 m2', cerca(pl, 0.54), String(pl))

  const pn = m2DePieza({ familia: 'PN', anchoCm: 150, altoCm: 150 }, o)
  revisar('panel 150 × 150 = 2,25 m2', cerca(pn, 2.25), String(pn))
}

console.log('\n2 · los m2 explican el precio')
{
  // el precio es m2 × tarifa, así que el cociente tiene que dar la MISMA
  // tarifa para dos piezas distintas de la misma familia
  const a = { familia: 'PL' as const, anchoCm: 30, altoCm: 180 }
  const b = { familia: 'PL' as const, anchoCm: 50, altoCm: 180 }
  const tarifaA = precioPieza(a, o) / m2DePieza(a, o)
  const tarifaB = precioPieza(b, o) / m2DePieza(b, o)
  revisar('dos pilastras dan la misma tarifa por m2', Math.abs(tarifaA - tarifaB) < 0.01,
    `${tarifaA.toFixed(2)} vs ${tarifaB.toFixed(2)}`)
}

console.log('\n3 · el cuadro de un proyecto entero')
{
  const cfg = {
    linea: 'LEEDER', modelo: 'ESTANDAR', acabado: 'Laminado Compacto', color: 'BLANCO',
    montaje: 'PISO_HEADRAIL', bisagra: 'GRAV', herrajeAcabado: 'NEGRO', alturaCm: 150,
    profundidadCm: 150, anchoAccesibleCm: 150, puertaAccesibleCm: 90, anchoPilastraCm: 15,
    espesorMm: espesorPorLinea('LEEDER'), terminacion: 'ZOCLO', kap: false, orinales: 1,
    mgAlturaCm: 120, tipologia: 'RECTA_ENTRE_MUROS' as TipologiaId,
  } as unknown as Config
  const tramos = crearTramos('RECTA_ENTRE_MUROS', 450, 4, cfg, 'CR')
  const renglones = bom(tramos, cfg, { moneda: 'USD', tipoCambio: 1, pais: 'CR' })
  const filas = resumenDePiezas(renglones)
  for (const f of filas) console.log(`    ${f.tipo.padEnd(14)} ${String(f.cantidad).padStart(3)} · ${f.m2.toFixed(2)} m2`)

  revisar('ningún renglón del proyecto quedó sin m2',
    renglones.every((r) => (r.m2Unit ?? 0) > 0),
    renglones.filter((r) => !(r.m2Unit ?? 0)).map((r) => r.tipo).join(', ') || 'todos tienen')

  const delCuadro = filas.reduce((t, f) => t + f.m2, 0)
  const deLosRenglones = renglones.reduce((t, r) => t + (r.m2Unit ?? 0) * r.cantidad, 0)
  revisar('el cuadro suma lo mismo que los renglones', cerca(delCuadro, deLosRenglones),
    `${delCuadro.toFixed(4)} vs ${deLosRenglones.toFixed(4)}`)
  revisar('y da un número con sentido', delCuadro > 5 && delCuadro < 100, `${delCuadro.toFixed(2)} m2`)
}

console.log('\n4 · lo que se cobra por unidad no suma m2')
{
  // un herraje o un grabado no tienen área: tienen que quedar en cero y no
  // romper la suma
  const filas = resumenDePiezas([
    { sku: 'X', descripcion: 'Puerta', tipo: 'Puerta', cantidad: 2, precioUnit: 10, m2Unit: 0.9 },
    { sku: 'KBDL', descripcion: 'Herraje', tipo: 'Herraje', cantidad: 3, precioUnit: 5 },
  ])
  const pt = filas.find((f) => f.tipo === 'Puerta')
  const hj = filas.find((f) => f.tipo === 'Herraje')
  revisar('la puerta suma 1,8 m2', cerca(pt?.m2 ?? -1, 1.8), String(pt?.m2))
  revisar('el herraje suma 0', cerca(hj?.m2 ?? -1, 0), String(hj?.m2))
}

console.log(fallos ? `\n${fallos} caso(s) mal` : '\nTodo bien')
