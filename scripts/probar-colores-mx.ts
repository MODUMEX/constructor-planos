/**
 * Los colores de México: sin repetidos, y sin romper el precio.
 *
 * La lista de materia prima trae el mismo color varias veces porque la planta
 * lo compra a varios proveedores y en varias calidades: "Alumina", "Aluminak
 * premium" y "ALUMINAV V2106 PREMIUM" son el mismo Alumina. Al distribuidor eso
 * no le dice nada, así que se juntan en uno.
 *
 * Lo que hay que cuidar es que el nombre con el que queda —el de la familia—
 * siga cayendo en el mismo GRUPO DE PRECIO y en la misma FOTO, o un color de
 * línea se cotizaría como especial.
 *
 *   npm run probar-colores-mx
 */
import {
  COLORES_MX, coloresMxAgrupados, coloresMxPara, esColorMx, grupoMx, slugRenderMx,
} from '../src/coloresMx'
import type { Linea } from '../src/types'

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

for (const linea of ['LEEDER', 'SUPERIOR'] as Linea[]) {
  console.log(`\n2 · ${linea}: los repetidos quedan en uno solo`)
  const sueltos = coloresMxPara(linea, true)
  const juntos = coloresMxAgrupados(linea, true)
  revisar('la lista se acorta', juntos.length < sueltos.length, `${sueltos.length} → ${juntos.length}`)
  revisar(
    'no quedan dos con el mismo nombre',
    new Set(juntos.map((c) => c.nombre)).size === juntos.length,
  )
  revisar(
    'ningún material se pierde',
    juntos.reduce((s, c) => s + 1 + c.tambien.length, 0) === sueltos.length,
  )
  revisar('el que se pide es uno de los de la familia', juntos.every((c) => sueltos.includes(c as never) || sueltos.some((x) => x.color === c.color)))

  console.log(`\n3 · ${linea}: el nombre que queda no cambia el precio ni la foto`)
  for (const c of juntos) {
    if (!c.tambien.length) continue
    const grupoFamilia = grupoMx(c.nombre, linea)
    const grupos = [c.color, ...c.tambien].map((n) => grupoMx(n, linea))
    revisar(
      `${c.nombre}: mismo grupo que sus materiales`,
      grupos.every((g) => g === grupoFamilia),
      `familia ${grupoFamilia} · materiales ${grupos.join(', ')}`,
    )
    const fotoFamilia = slugRenderMx(c.nombre)
    revisar(
      `${c.nombre}: misma foto`,
      [c.color, ...c.tambien].every((n) => slugRenderMx(n) === fotoFamilia),
      String(fotoFamilia),
    )
    revisar(`${c.nombre}: sigue siendo color de línea`, esColorMx(c.nombre))
  }
}

console.log('\n4 · los que NO son el mismo color quedan separados')
{
  const sup = coloresMxAgrupados('SUPERIOR', true).map((c) => c.nombre)
  revisar('Blanco Antiguo no se lo come Blanco', sup.includes('Blanco Antiguo') && sup.includes('Blanco'))
  revisar('Lapiz Blue y el lapislázuli van aparte', sup.includes('Lapiz Blue') && sup.includes('Lapizslasulli'))
  const led = coloresMxAgrupados('LEEDER', true).map((c) => c.nombre)
  for (const n of ['Fashion White', 'DESIGNER WHITE', 'Frosty', 'CALCUTTA MARBLE', 'MARMOL BLANCO COLOR CORE']) {
    revisar(`${n} sigue solo`, led.includes(n))
  }
}

console.log(fallos ? `\n${fallos} revisiones mal.\n` : '\nTodo cuadra.\n')
process.exit(fallos ? 1 : 0)
