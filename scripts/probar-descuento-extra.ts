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

console.log('\n— un descuento propio de 0 o en blanco no cuenta')
{
  const t = totalesDe([mamparas, { ...herraje, descuentoPropioPct: 0 }], ficha, 0)
  ok(t.propios.length === 0 && Math.abs(t.gravable - 770) < 0.01, 'se comporta como si no estuviera')
}

console.log(mal === 0 ? '\nTodo cuadra.' : `\n${mal} caso(s) mal.`)
process.exit(mal === 0 ? 0 : 1)
