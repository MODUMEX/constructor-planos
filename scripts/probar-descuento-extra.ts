/**
 * El descuento propio de una pieza extra.
 *
 * Los herrajes y los grabados casi nunca llevan el mismo descuento que las
 * mamparas. Si la pieza trae el suyo, ese REEMPLAZA al general para ese
 * renglón —no se suma encima— y el resto de la cotización sigue igual.
 *
 *   npm run probar-descuento-extra
 */
import { totalesDe } from '../src/exportar/cotizacion'
import type { Descuento, RenglonBOM } from '../src/types'

let mal = 0
const ok = (b: boolean, t: string) => { if (!b) mal++; console.log(`${b ? '✓' : '✕'} ${t}`) }
const dinero = (n: number) => n.toFixed(2)

const mamparas: RenglonBOM = { sku: 'LDR-PN150', descripcion: 'Panel', tipo: 'Panel', cantidad: 1, precioUnit: 1000 }
const herraje: RenglonBOM = { sku: 'KBDL', descripcion: 'Bisagra', tipo: 'Herraje', cantidad: 1, precioUnit: 100 }
const ficha: Descuento[] = [{ etiqueta: 'Descuento distribuidor', pct: 30 } as Descuento]

console.log('— sin descuento propio: todo va con el general')
{
  const t = totalesDe([mamparas, herraje], ficha, 0)
  console.log(`  neto ${dinero(t.neto)} · descuento ${dinero(t.descuento)} · gravable ${dinero(t.gravable)}`)
  ok(Math.abs(t.gravable - 770) < 0.01, '1100 menos 30% = 770')
  ok(t.propios.length === 0, 'no hay descuentos propios')
}

console.log('\n— el herraje con su propio 10%: reemplaza al 30%, no se suma')
{
  const conPropio = { ...herraje, descuentoPropioPct: 10 }
  const t = totalesDe([mamparas, conPropio], ficha, 0)
  console.log(`  neto ${dinero(t.neto)} · descuento ${dinero(t.descuento)} · gravable ${dinero(t.gravable)}`)
  console.log(`  cascada: ${t.pasos.map((p) => `${p.etiqueta} ${p.pct}% = ${dinero(p.monta)}`).join(' · ')}`)
  console.log(`  propios: ${t.propios.map((p) => `${p.pct}% sobre ${dinero(p.base)} = ${dinero(p.monta)}`).join(' · ')}`)
  ok(Math.abs(t.pasos[0].monta - 300) < 0.01, 'el 30% muerde solo los 1000 de mamparas')
  ok(Math.abs(t.propios[0].monta - 10) < 0.01, 'el herraje se lleva 10 y no 30')
  ok(Math.abs(t.gravable - 790) < 0.01, 'gravable 700 + 90 = 790')
  ok(Math.abs(t.descuento - 310) < 0.01, 'descuento total 310')
}

console.log('\n— dos herrajes con el mismo porcentaje se agrupan')
{
  const a = { ...herraje, descuentoPropioPct: 10 }
  const b = { ...herraje, sku: 'KCL', descuentoPropioPct: 10, precioUnit: 50 }
  const c = { ...herraje, sku: 'GL03-HPL', descuentoPropioPct: 5, precioUnit: 22 }
  const t = totalesDe([mamparas, a, b, c], ficha, 13)
  console.log(`  propios: ${t.propios.map((p) => `${p.pct}% sobre ${dinero(p.base)}`).join(' · ')}`)
  ok(t.propios.length === 2, 'quedan dos grupos: 5% y 10%')
  ok(Math.abs(t.propios.find((p) => p.pct === 10)!.base - 150) < 0.01, 'los dos del 10% suman 150')
  // y el IVA se cobra sobre lo que de verdad queda
  ok(Math.abs(t.iva - t.gravable * 0.13) < 0.01, 'el IVA sale del gravable')
}

console.log('\n— un 0 es CERO: la pieza no lleva ningún descuento')
{
  const t = totalesDe([mamparas, { ...herraje, descuentoPropioPct: 0 }], ficha, 0)
  ok(Math.abs(t.gravable - 800) < 0.01, 'gravable 700 de mamparas + 100 del herraje sin tocar')
  ok(t.aparte === 100, 'los 100 del herraje quedan fuera de la cascada')
}


console.log('\n— EL CASO DE MÓNICA: escribir 0 quiere decir CERO, no "el general"')
{
  // la cotización real: 7 541 696 de mamparas y 14 grabados GLPT de ₡8 768,42
  const obra: RenglonBOM = { sku: 'OBRA', descripcion: 'mamparas', tipo: 'Panel', cantidad: 1, precioUnit: 7541696 }
  const grabado: RenglonBOM = {
    sku: 'GLPT', descripcion: 'Grabado láser puerta partición', tipo: 'Grabado láser',
    cantidad: 14, precioUnit: 8768.42, descuentoPropioPct: 0,
  }
  const dist: Descuento[] = [{ etiqueta: 'Descuento distribuidor', pct: 25 } as Descuento]
  const t = totalesDe([obra, grabado], dist, 13)
  const dinero0 = (n: number) => Math.round(n).toLocaleString('es-CR')
  console.log(`  Neto                              ${dinero0(t.neto)}`)
  console.log(`  Piezas extra con descuento propio  -${dinero0(t.aparte)}`)
  for (const p of t.pasos) console.log(`  ${p.etiqueta} ${p.pct}%        -${dinero0(p.monta)}   →  ${dinero0(p.subtotal)}`)
  console.log(`  Piezas extra, ya con su descuento   ${dinero0(t.aparte)}`)
  console.log(`  Subtotal                          ${dinero0(t.gravable)}`)
  ok(Math.abs(t.neto - 7664454) < 1, 'el neto es 7 664 454')
  ok(Math.abs(t.pasos[0].monta - 1885424) < 1, 'el 25% muerde solo las mamparas: 1 885 424')
  ok(Math.abs(t.gravable - 5779030) < 1, 'el subtotal es 5 779 030, como lo esperaba Mónica')
}

console.log('\n— dejarlo en BLANCO sigue significando "va con el general"')
{
  const obra: RenglonBOM = { sku: 'OBRA', descripcion: 'mamparas', tipo: 'Panel', cantidad: 1, precioUnit: 7541696 }
  const grabado: RenglonBOM = { sku: 'GLPT', descripcion: 'grabado', tipo: 'Grabado láser', cantidad: 14, precioUnit: 8768.42 }
  const dist: Descuento[] = [{ etiqueta: 'Descuento distribuidor', pct: 25 } as Descuento]
  const t = totalesDe([obra, grabado], dist, 13)
  ok(t.aparte === 0, 'nada queda fuera de la cascada')
  ok(Math.abs(t.gravable - 5748341) < 1, 'el subtotal es 5 748 341: el 25% también le pega al grabado')
}

console.log(mal === 0 ? '\nTodo cuadra.' : `\n${mal} caso(s) mal.`)
process.exit(mal === 0 ? 0 : 1)