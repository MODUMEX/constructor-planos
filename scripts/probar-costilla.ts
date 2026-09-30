/**
 * La COSTILLA: el soporte de una pieza de frente grande.
 *
 * Regla de Dayanna (30-sep-2026): *"es una pilastra costilla, se maneja como un
 * extra para dar soporte cuando el panel o pl mide más de 100cm, puede no
 * aparecer pero sí debe poder agregarse en la cotización. Y que salga un aviso
 * si se necesita cuando se está modulando"*.
 *
 * La medida NO es fija: la hoja de LEEDER dibuja una de 19 y hay planos con una
 * de 10 para una pilastra de 50. Y se puede cambiar por un refuerzo o por un
 * sándwich. Todo eso lo decide el cliente, así que la app **avisa** pero no
 * agrega nada sola.
 *
 *   npm run probar-costilla
 */
import { PIEZA_PIDE_COSTILLA_CM } from '../src/catalog'
import { esPorM2, etiquetaExtra, FAMILIAS_EXTRA, renglonesDeExtras } from '../src/extras'
import { crearTramos, piezasQuePidenCostilla } from '../src/modulacion'
import type { Config, Extra, TipologiaId, Tramo } from '../src/types'

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

console.log('\n2 · el aviso salta con una pieza de más de un metro')
{
  revisar('el tope es un metro', PIEZA_PIDE_COSTILLA_CM === 100)

  // El buscador no llega solo a una pieza tan grande, pero el vendedor sí:
  // arrastrando una pilastra puede pedir hasta un panel de relleno. Así que la
  // tira se arma a mano, que es justo el caso que hay que avisar.
  const config = cfg('RECTA_ENTRE_MUROS', { puertaCm: 60 })
  const base = crearTramos('RECTA_ENTRE_MUROS', 420, 4, config, 'CR')[0]
  const t: Tramo = { ...base, pilastras: [24, 120, 50, 150, 24] }
  const anchas = (t.pilastras ?? []).filter((a) => a > PIEZA_PIDE_COSTILLA_CM)
  const avisos = piezasQuePidenCostilla(t, config)
  console.log(`    pilastras: ${(t.pilastras ?? []).join(' | ')}`)
  revisar('hay dos que se pasan del metro', anchas.length === 2, anchas.join(' y '))
  revisar('avisa por cada una', avisos.length === 2, `${avisos.length} avisos`)
  if (avisos.length) console.log(`    ${avisos.join(' · ')}`)
  revisar('el aviso dice la medida', avisos.every((a) => /\d+ cm$/.test(a)))
  revisar(
    'distingue panel de pilastra',
    avisos.some((a) => /^La pilastra/.test(a)) && avisos.some((a) => /^El panel/.test(a)),
    avisos.join(' | '),
  )
  revisar('y dice dónde está cada una', avisos.every((a) => /entre la|de arranque|de cierre/.test(a)))
}

console.log('\n3 · una tira normal no avisa de nada')
{
  const config = cfg('RECTA_ENTRE_MUROS', { puertaCm: 60 })
  const t = crearTramos('RECTA_ENTRE_MUROS', 420, 4, config, 'CR')[0]
  console.log(`    pilastras: ${(t.pilastras ?? []).join(' | ')}`)
  revisar('sin piezas grandes no hay aviso', piezasQuePidenCostilla(t, config).length === 0)
  revisar(
    'y el panel de la cabina, que es más hondo que un metro, NO cuenta',
    config.profundidadCm > PIEZA_PIDE_COSTILLA_CM && piezasQuePidenCostilla(t, config).length === 0,
    `panel de ${config.profundidadCm}`,
  )
}

console.log('\n4 · el frente de la accesible también se mira')
{
  // 204 de ancho con puerta de 90 deja un frente de 95: no llega al tope
  const chico = cfg('MR_PANEL_U', {
    profundidadCm: 135, anchoAccesibleCm: 204, profundidadAccesibleCm: 180, puertaAccesibleCm: 100,
  })
  const tChico = crearTramos('MR_PANEL_U', 500, 4, chico, 'CR')[0]
  const acc = tChico.cabinas[0]
  console.log(`    accesible de ${acc.anchoCm} con puerta de ${acc.puerta.anchoCm}`)
  const avisosChico = piezasQuePidenCostilla(tChico, chico).filter((a) => /accesible/.test(a))
  revisar('un frente de 85 no pide soporte', avisosChico.length === 0, avisosChico.join(' · '))

  // con la cabina más ancha y la misma puerta, el frente pasa del metro
  const grande = cfg('MR_PANEL_U', {
    profundidadCm: 135, anchoAccesibleCm: 240, profundidadAccesibleCm: 180, puertaAccesibleCm: 100,
  })
  const tGrande = crearTramos('MR_PANEL_U', 560, 4, grande, 'CR')[0]
  const accG = tGrande.cabinas[0]
  const avisosGrande = piezasQuePidenCostilla(tGrande, grande).filter((a) => /accesible/.test(a))
  console.log(`    accesible de ${accG.anchoCm} con puerta de ${accG.puerta.anchoCm}`)
  revisar('un frente de más de un metro sí', avisosGrande.length === 1, avisosGrande.join(' · '))
}

console.log(fallos ? `\n${fallos} revisiones mal.\n` : '\nTodo cuadra.\n')
process.exit(fallos ? 1 : 0)
