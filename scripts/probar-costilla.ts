/**
 * La COSTILLA: el soporte de una pieza de frente grande.
 *
 * Regla de modulación de Modumex (Módulo 6): **una pilastra de ESQUINA o A
 * MURO de más de 55 cm lleva refuerzo**. Las centrales no: esas trabajan
 * agarradas de los paneles de las dos cabinas.
 *
 * Al principio se había entendido "más de 100 cm" y sobre cualquier pieza; la
 * lámina de capacitación del 1-oct-2026 lo corrigió.
 *
 * La medida NO es fija: la hoja de LEEDER dibuja una de 19 y hay planos con una
 * de 10 para una pilastra de 50. Y se puede cambiar por un refuerzo o por un
 * sándwich. Todo eso lo decide el cliente, así que la app **avisa** pero no
 * agrega nada sola.
 *
 *   npm run probar-costilla
 */
import { COSTILLA_MINIMA_CM, PIEZA_PIDE_COSTILLA_CM } from '../src/catalog'
import { esPorM2, etiquetaExtra, FAMILIAS_EXTRA, renglonesDeExtras } from '../src/extras'
import { anchoDeSoporte, haySandwich, crearTramos, piezasQuePidenCostilla, soporteDe } from '../src/modulacion'
import { piezasDeArea } from '../src/exportar/piezas'
import type { Area, Config, Extra, TipologiaId, Tramo } from '../src/types'

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

console.log('\n1 · la costilla se puede cargar en la cotización')
{
  const fam = FAMILIAS_EXTRA.find((f) => f.tipo === 'costilla')
  revisar('existe como familia de extra', !!fam)
  revisar('se cobra por m², como una pilastra', esPorM2('costilla') && fam?.familia === 'PL')
  revisar('tiene su etiqueta', etiquetaExtra('costilla') === 'Costilla de soporte', etiquetaExtra('costilla'))

  // la medida NO es fija: se carga la que pida el cliente
  const extras: Extra[] = [
    { tipo: 'costilla', cantidad: 2, anchoCm: 19, altoCm: 150 },
    { tipo: 'costilla', cantidad: 1, anchoCm: 10, altoCm: 50 },
  ]
  const renglones = renglonesDeExtras(extras, { moneda: 'CRC', pais: 'CR', modelo: 'M1', linea: 'LEEDER', color: 'Blanco', acabado: 'Laminado Compacto' } as never)
  revisar('entran dos costillas de medidas distintas', renglones.length === 2, renglones.map((r) => r.descripcion).join(' | '))
  revisar('cada una con su cantidad', renglones[0]?.cantidad === 2 && renglones[1]?.cantidad === 1)
}

console.log('\n2 · el aviso salta DESDE los 50 cm, y solo en las de PUNTA')
{
  revisar('el tope son 50 cm', PIEZA_PIDE_COSTILLA_CM === 50)
  revisar('y la costilla mide 19 como mínimo', COSTILLA_MINIMA_CM === 19)

  // El buscador no llega solo a una pieza tan grande, pero el vendedor sí:
  // arrastrando una pilastra puede pedir hasta un panel de relleno.
  const config = cfg('RECTA_ENTRE_MUROS', { puertaCm: 60 })
  const base = crearTramos('RECTA_ENTRE_MUROS', 420, 4, config, 'CR')[0]
  const t: Tramo = { ...base, pilastras: [100, 120, 50, 150, 70] }
  const avisos = piezasQuePidenCostilla(t, config)
  console.log(`    pilastras: ${(t.pilastras ?? []).join(" | ")}`)
  if (avisos.length) console.log(`    ${avisos.join(" · ")}`)
  revisar('avisa por las dos de punta', avisos.length === 2, `${avisos.length} avisos`)
  revisar('y NO por las centrales, por grandes que sean',
    !avisos.some((a) => /entre la/.test(a)), avisos.join(' | '))
  revisar('el aviso dice la medida', avisos.every((a) => /\d+ cm$/.test(a)))
  revisar('y si es de esquina o a muro', avisos.every((a) => /\(a muro\)|\(de esquina\)/.test(a)),
    avisos.join(' | '))
}

console.log('\n2b · el límite justo: 50 pide, 45 no')
{
  const config = cfg('RECTA_ENTRE_MUROS', { puertaCm: 60 })
  const base = crearTramos('RECTA_ENTRE_MUROS', 420, 4, config, 'CR')[0]
  const t: Tramo = { ...base, pilastras: [50, 30, 30, 30, 24] }
  revisar('50 justo SÍ avisa: la regla es DESDE 50', piezasQuePidenCostilla(t, config).length === 1,
    piezasQuePidenCostilla(t, config).join(' · '))
  const chica: Tramo = { ...base, pilastras: [45, 30, 30, 30, 24] }
  revisar('y una de 45 no', piezasQuePidenCostilla(chica, config).length === 0,
    piezasQuePidenCostilla(chica, config).join(' · '))
}

console.log('\n3 · una tira normal no avisa de nada')
{
  const config = cfg('RECTA_ENTRE_MUROS', { puertaCm: 60 })
  const t = crearTramos('RECTA_ENTRE_MUROS', 370, 4, config, 'CR')[0]
  console.log(`    pilastras: ${(t.pilastras ?? []).join(" | ")}`)
  revisar('sin piezas grandes no hay aviso', piezasQuePidenCostilla(t, config).length === 0,
    piezasQuePidenCostilla(t, config).join(' · '))
  revisar('y el panel de la cabina, que es más hondo que el tope, NO cuenta',
    config.profundidadCm > PIEZA_PIDE_COSTILLA_CM && piezasQuePidenCostilla(t, config).length === 0,
    `panel de ${config.profundidadCm}`)
}

console.log('\n4 · el frente del cubículo de movilidad limitada también se mira')
{
  // 204 de ancho con puerta de 100 deja un frente de 66: pasa de 55
  const c = cfg('MR_PANEL_U', {
    profundidadCm: 135, anchoAccesibleCm: 204, profundidadAccesibleCm: 180, puertaAccesibleCm: 100,
  })
  const t = crearTramos('MR_PANEL_U', 500, 4, c, 'CR')[0]
  const acc = t.cabinas[0]
  console.log(`    cubículo de ${acc.anchoCm} con puerta de ${acc.puerta.anchoCm}`)
  const avisos = piezasQuePidenCostilla(t, c).filter((a) => /accesible/.test(a))
  revisar('un frente de 66 ya pide soporte', avisos.length === 1, avisos.join(' · '))

  // con la puerta más ancha el frente baja de 55 y deja de pedirlo
  const c2 = cfg('MR_PANEL_U', {
    profundidadCm: 135, anchoAccesibleCm: 164, profundidadAccesibleCm: 180, puertaAccesibleCm: 100,
  })
  const t2 = crearTramos('MR_PANEL_U', 450, 4, c2, 'CR')[0]
  const avisos2 = piezasQuePidenCostilla(t2, c2).filter((a) => /accesible/.test(a))
  revisar('un frente chico no', avisos2.length === 0, avisos2.join(' · '))
}

console.log('\n5 · los tres refuerzos: costilla, refuerzo y sándwich')
{
  const c = cfg('RECTA_MURO_IZQ', { puertaCm: 60 })
  const base = crearTramos('RECTA_MURO_IZQ', 370, 3, c, 'CR')[0]
  // la pilastra contra el muro se agranda a 100: pasa de 55 y pide refuerzo
  const t: Tramo = { ...base, pilastras: [100, 24, 24, 19] }

  revisar('sin elegir nada sale la costilla', soporteDe(t, c, 0) === 'costilla', String(soporteDe(t, c, 0)))
  revisar('y mide 19', anchoDeSoporte('costilla') === 19)
  revisar('el sándwich es una segunda pilastra de 24', anchoDeSoporte('sandwich') === 24)
  revisar('el refuerzo no lleva pieza: va en los herrajes', anchoDeSoporte('refuerzo') === 0)
  revisar('la pilastra chica del otro extremo no pide nada', soporteDe(t, c, 3) === null)

  // y lo que el vendedor elige manda
  const conRef: Tramo = { ...t, soportes: ['refuerzo', null, null, null] }
  revisar('elegir refuerzo lo cambia', soporteDe(conRef, c, 0) === 'refuerzo')

  // en el despiece: la costilla y el sándwich son material, el refuerzo no
  const pls = (tr: Tramo) => {
    const a: Area = { id: 'a', nombre: 'Baño', piso: '1', config: c, tramos: [tr] }
    return piezasDeArea(a).filter((p) => p.familia === 'PL').map((p) => p.anchoCm)
  }
  revisar('la costilla entra en el despiece', pls(t).filter((a) => a === 19).length === 2,
    pls(t).join(' · '))
  revisar('el refuerzo no agrega pieza', pls(conRef).filter((a) => a === 19).length === 1,
    pls(conRef).join(' · '))
  // El sándwich es panel + pilastra, así que SOLO existe en el Tipo C: en una
  // tira normal, elegirlo cae de vuelta en la costilla.
  const conSw: Tramo = { ...t, soportes: ['sandwich', null, null, null] }
  revisar('fuera del Tipo C el sándwich no existe y cae en costilla',
    soporteDe(conSw, c, 0) === 'costilla', String(soporteDe(conSw, c, 0)))
  revisar('y el despiece no trae la segunda pilastra de 24',
    pls(conSw).filter((a) => a === 24).length === 2, pls(conSw).join(' · '))

  const tipoC = cfg('PMR', { puertaCm: 60 })
  revisar('en el Tipo C sí se puede', haySandwich(tipoC))
  revisar('y en una tira normal no', !haySandwich(c))
}

console.log(fallos ? `\n${fallos} revisiones mal.\n` : '\nTodo cuadra.\n')
process.exit(fallos ? 1 : 0)
