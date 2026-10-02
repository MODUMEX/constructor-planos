/**
 * Los colores de México: la CARTA manda, y sin romper el precio.
 *
 * Lo que la planta compra no es lo que se vende. La lista de materia prima
 * trae material de una sola compra, restos y cosas que no están en la carta, y
 * además el mismo color repetido porque se compra a varios proveedores y en
 * varias calidades: "Alumina", "Aluminak premium" y "ALUMINAV V2106 PREMIUM"
 * son el mismo Alumina.
 *
 * Así que lo que se ofrece sale de la carta —`ofrecidosMx`, la lista que dio
 * Dayanna el 1-oct-2026— y de ahí se busca con qué láminas se fabrica cada uno.
 * Lo que hay que cuidar es que el nombre con el que queda siga cayendo en el
 * mismo GRUPO DE PRECIO y en la misma FOTO que sus materiales.
 *
 *   npm run probar-colores-mx
 */
import {
  COLORES_MX, coloresMxAgrupados, coloresMxPara, eligeColorMx, esColorMx, grupoMx,
  ofrecidosMx, slugRenderMx,
} from '../src/coloresMx'
import { etiquetaTier, tierDeColor } from '../src/catalog'
import { fotoDe, SIN_FOTO_PROPIA } from '../src/renders'
import type { Acabado, Linea } from '../src/types'

let fallos = 0
function revisar(que: string, bien: boolean, detalle = '') {
  console.log(`  ${bien ? '✓' : '✗'} ${que}${detalle ? ' · ' + detalle : ''}`)
  if (!bien) fallos++
}

console.log('\n1 · no queda nada de la materia prima en los datos')
{
  const campos = Object.keys(COLORES_MX[0] ?? {})
  revisar('no hay proveedor', !campos.includes('proveedor'), campos.join(', '))
  revisar('no hay medidas de lámina', !campos.includes('presentaciones'))
  revisar('sigue el código, que lo usa el CIP', campos.includes('codigoBase'))
}

console.log('\n2 · se ofrece la CARTA, no la materia prima')
{
  // "Lines desglose.xlsx", hoja por línea; lo que no está acá es ESPECIAL y lo
  // escribe el cliente en su campo
  const leeder = [
    'Alumina', 'Fashion White', 'Ebano', 'Gris Metalizado', 'Skyline Walnut',
    'Walnut Heights', 'Grafito Nocturno',
    'Rosa Margenta', 'Rosa',
  ]
  const superior = [
    'Alumina', 'Fashion White', 'Ebano', 'Champaña Metalizado', 'Gris Metalizado',
    'Skyline Walnut', 'Walnut Heights', 'Lapis Blue', 'Holly Berry', 'Negro',
    'Blanco', 'Blanco Antiguo', 'Grafito Nocturno',
  ]
  for (const [linea, carta] of [['LEEDER', leeder], ['SUPERIOR', superior]] as [Linea, string[]][]) {
    const nombres = coloresMxAgrupados(linea, true, 'Laminado Compacto').map((c) => c.nombre)
    revisar(`${linea}: la carta completa y en ese orden`,
      JSON.stringify(nombres) === JSON.stringify(carta), nombres.join(" · "))
  }
  // lo que la planta compra pero no está en la carta NO se ofrece: eso se pide
  // como color especial, escrito a mano
  const led = coloresMxAgrupados('LEEDER', true, 'Laminado Compacto').map((c) => c.nombre)
  for (const n of ['Grey Oak', 'CALCUTTA MARBLE', 'DESIGNER WHITE', 'Frosty', 'Natural Almond', 'Platinum', 'Carbon', 'Italian Walnut', 'Whitec']) {
    revisar(`${n} no se ofrece en LEEDER`, !led.includes(n))
  }
  const sup = coloresMxAgrupados('SUPERIOR', true, 'Laminado Compacto').map((c) => c.nombre)
  for (const n of ['GRAPHITE NEBULA', 'Lapizslasulli', 'BLUE 8011 PREMIUM', 'Metalized brush', 'Satin']) {
    revisar(`${n} no se ofrece en Superior`, !sup.includes(n))
  }
}

console.log('\n3 · un color fuera de carta se cotiza especial')
{
  // es lo que escribe el cliente en "Color especial"
  revisar('un nombre inventado es especial', tierDeColor('Verde selva', 'MX', 'LEEDER') === 'especial')
  revisar('y uno que la planta compra pero no está en carta, también',
    tierDeColor('Natural Almond', 'MX', 'LEEDER') === 'especial',
    etiquetaTier(tierDeColor('Natural Almond', 'MX', 'LEEDER')))
}

console.log('\n4 · cada acabado tiene su lista y su tier')
{
  const esm = coloresMxAgrupados('SUPERIOR', true, 'Esmaltada Antigrafiti')
  revisar('la esmaltada son Blanco, Gris Claro y Beige',
    JSON.stringify(esm.map((c) => c.nombre)) === JSON.stringify(['Blanco', 'Gris Claro', 'Beige']),
    esm.map((c) => c.nombre).join(' · '))
  // el Blanco esmaltado NO es el Blanco laminado: no se lleva ni su código ni su grupo
  const blanco = esm.find((c) => c.nombre === 'Blanco')
  revisar('el Blanco esmaltado no toma el código del laminado', blanco?.codigoBase === '', blanco?.codigoBase)
  revisar('ni su grupo de precio',
    tierDeColor('Blanco', 'MX', 'SUPERIOR', 'Esmaltada Antigrafiti') === 'antigrafiti',
    etiquetaTier(tierDeColor('Blanco', 'MX', 'SUPERIOR', 'Esmaltada Antigrafiti')))

  const form = coloresMxAgrupados('SUPERIOR', true, 'Fórmica')
  revisar('la fórmica son dos',
    JSON.stringify(form.map((c) => c.nombre)) === JSON.stringify(['White', 'Folkstone']),
    form.map((c) => c.nombre).join(' · '))
  revisar('y se cobran como fórmica',
    form.every((c) => tierDeColor(c.nombre, 'MX', 'SUPERIOR', 'Fórmica') === 'formica'))

  revisar('el acero inoxidable no tiene lista', !eligeColorMx('Acero Inoxidable'))

  revisar('la esmaltada sí', eligeColorMx('Esmaltada Antigrafiti'))
}
console.log('\n5 · el nombre de la carta no cambia el precio ni la foto')
for (const linea of ['LEEDER', 'SUPERIOR'] as Linea[]) {
  const juntos = coloresMxAgrupados(linea, true, 'Laminado Compacto')
  for (const c of juntos) {
    if (!c.tambien.length) continue
    const grupoFamilia = grupoMx(c.nombre, linea)
    const grupos = [c.color, ...c.tambien].map((n) => grupoMx(n, linea))
    revisar(
      `${linea} · ${c.nombre}: mismo grupo que sus materiales`,
      grupos.every((g) => g === grupoFamilia),
      `carta ${grupoFamilia} · materiales ${grupos.join(', ')}`,
    )
    const fotoFamilia = slugRenderMx(c.nombre)
    revisar(
      `  misma foto`,
      [c.color, ...c.tambien].every((n) => slugRenderMx(n) === fotoFamilia),
      String(fotoFamilia),
    )
    revisar(`  sigue siendo color de México`, esColorMx(c.nombre))
  }
}

console.log('\n6 · el Skyline de la carta es uno solo')
{
  // La carta lleva un único skyline, así que el STD de 12 mm y el PREMIUM de
  // 3 mm son ese mismo color. La lámina "Skyline Walnut" está especificada
  // para un cliente, pero el color NO: la planta tiene la otra libre.
  const led = coloresMxAgrupados('LEEDER', true, 'Laminado Compacto')
  const sky = led.find((c) => c.nombre === 'Skyline Walnut')
  revisar('junta las dos láminas', (sky?.tambien.length ?? 0) === 1, (sky?.tambien ?? []).join(' · '))
  revisar('y no sale apartado para nadie', !sky?.reservado, sky?.reservado)
}
console.log('\n7 · lo apartado para un cliente no recorta la carta')
{
  // Hoy ningún color de la carta depende de una lámina apartada: el Skyline
  // Walnut tiene una especificada para un cliente y otra libre, así que el
  // color se ofrece igual, adentro y afuera de Modumex.
  const adentro = coloresMxAgrupados('LEEDER', true, 'Laminado Compacto').map((c) => c.nombre)
  const afuera = coloresMxAgrupados('LEEDER', false, 'Laminado Compacto').map((c) => c.nombre)
  revisar('el distribuidor ve la misma carta', JSON.stringify(adentro) === JSON.stringify(afuera), afuera.join(' · '))
  revisar('el Skyline Walnut sobrevive por su lámina libre', afuera.includes('Skyline Walnut'))

  // y un color de carta sin lámina cargada se ofrece igual: el color existe, lo
  // que falta es decir con qué material se fabrica, y eso lo pregunta el CIP
  const sup = coloresMxAgrupados('SUPERIOR', false, 'Laminado Compacto')
  const fw = sup.find((c) => c.nombre === 'Fashion White')
  revisar('el que no tiene lámina se ofrece igual', fw != null)
  revisar('  y sale sin código', fw?.codigoBase === '', fw?.codigoBase)
}

console.log('\n8 · la materia prima que respalda cada color')
for (const linea of ['LEEDER', 'SUPERIOR'] as Linea[]) {
  const sueltos = coloresMxPara(linea, true)
  const juntos = coloresMxAgrupados(linea, true, 'Laminado Compacto')
  const usados = juntos.flatMap((c) => (c.espesor ? [c.color, ...c.tambien] : []))
  revisar(`${linea}: no se repite ninguna lámina`, new Set(usados).size === usados.length)
  revisar(`  todas salen de la lista de la línea`, usados.every((n) => sueltos.some((s) => s.color === n)))
  const sinLamina = juntos.filter((c) => !c.espesor).map((c) => c.nombre)
  console.log(`    sin materia prima cargada: ${sinLamina.length ? sinLamina.join(' · ') : '(ninguno)'}`)
}

console.log('\n9 · cada color con SU foto')
{
  // la foto sale del color Y del acabado: el mismo "Blanco" no se ve igual
  // laminado que pintado
  revisar('el Blanco Antiguo tiene la suya, no la del Blanco',
    slugRenderMx('Blanco Antiguo') === 'blanco-antiguo', slugRenderMx('Blanco Antiguo'))
  revisar('el Lapis Blue de la carta encuentra la suya',
    slugRenderMx('Lapis Blue') === 'lapis', slugRenderMx('Lapis Blue'))
  revisar('el Blanco esmaltado no toma la foto del laminado',
    slugRenderMx('Blanco', 'Esmaltada Antigrafiti') === 'esmalte-blanco',
    slugRenderMx('Blanco', 'Esmaltada Antigrafiti'))
  revisar('y el Beige tiene la suya',
    slugRenderMx('Beige', 'Esmaltada Antigrafiti') === 'esmalte-beige')

  // y la foto que se nombra EXISTE: si no, se cae a una de referencia
  for (const [linea, acabado, modelo] of [
    ['LEEDER', 'Laminado Compacto', 'ESTANDAR'],
    ['SUPERIOR', 'Laminado Compacto', 'SUP_ESTANDAR'],
    ['SUPERIOR', 'Esmaltada Antigrafiti', 'SUP_ESTANDAR'],
  ] as [Linea, Acabado, string][]) {
    const sinFoto: string[] = []
    for (const c of coloresMxAgrupados(linea, true, acabado)) {
      // igual que en la app: sin render propio se pide un slug que no existe,
      // para que la foto de respaldo salga marcada
      const slug = slugRenderMx(c.nombre, acabado) ?? SIN_FOTO_PROPIA
      const f = fotoDe({ linea, modelo, acabado, color: c.nombre, slugColor: slug })
      if (!f) { sinFoto.push(c.nombre + ' (sin ninguna foto)'); continue }
      if (f.sinColor) {
        sinFoto.push(c.nombre)
        revisar(`  ${c.nombre}: avisa que la foto no es del color`, f.nota?.includes('no es de ese color') === true, f.nota)
      }
    }
    console.log(`    ${linea} · ${acabado} — sin foto propia: ${sinFoto.length ? sinFoto.join(" · ") : "(ninguno)"}`)
  }
}

console.log(fallos ? `\n${fallos} revisiones mal.\n` : '\nTodo cuadra.\n')
process.exit(fallos ? 1 : 0)
