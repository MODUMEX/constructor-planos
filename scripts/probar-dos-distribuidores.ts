/**
 * Un correo con DOS empresas.
 *
 * Lo que se prueba es el orden —la primera es la que manda— y que el descuento
 * y el IVA salgan de la empresa que toca, porque la cotización los busca en la
 * lista de fichas y esa lista la filtra la RLS: si de la segunda no se viera
 * la ficha, el respaldo tiene que ser SU descuento y no el de la primera.
 */
import { empresasDeFichas } from '../src/auth'

let fallos = 0
function revisar(que: string, bien: boolean, detalle = '') {
  console.log(`  ${bien ? '✓' : '✗'} ${que}${detalle ? ' · ' + detalle : ''}`)
  if (!bien) fallos++
}

const CR = { distribuidor_id: 7, nombre: 'Modumex Costa Rica', descuento: 22, iva: null, region: 'Costa Rica' }
const MX = { distribuidor_id: 3, nombre: 'Modumex México', descuento: 15, iva: null, region: 'México' }
const LAT = { distribuidor_id: 9, nombre: 'Modumex Panamá', descuento: 10, iva: 0, region: 'LATAM' }

console.log('\n1 · dos empresas: manda la del perfil, no la que devuelva la base')
{
  // la consulta con in.() puede devolverlas al revés, y aun así la primera
  // tiene que ser la que el perfil pone primero
  const r = empresasDeFichas(['3', '7'], [CR, MX])
  revisar('vienen las dos', r.length === 2, r.map((x) => x.nombre).join(' · '))
  revisar('primero la del perfil', r[0]?.nombre === 'Modumex México', r[0]?.nombre)
  revisar('después la segunda', r[1]?.nombre === 'Modumex Costa Rica', r[1]?.nombre)
}

console.log('\n2 · cada empresa con SU descuento y SU IVA')
{
  const r = empresasDeFichas(['7', '3'], [CR, MX])
  revisar('Costa Rica cobra 22 y factura 13', r[0]?.descuento === 22 && r[0]?.iva === 13, `${r[0]?.descuento} · ${r[0]?.iva}`)
  revisar('México cobra 15 y factura 16', r[1]?.descuento === 15 && r[1]?.iva === 16, `${r[1]?.descuento} · ${r[1]?.iva}`)
}

console.log('\n3 · el IVA escrito a mano manda, aunque sea 0')
{
  const r = empresasDeFichas(['9'], [LAT])
  revisar('LATAM con IVA 0 no cae en el 13 de Costa Rica', r[0]?.iva === 0, String(r[0]?.iva))
}

console.log('\n4 · una ficha que no se puede ver no deja hueco')
{
  // es lo que pasa si la RLS todavía no deja ver la segunda empresa
  const r = empresasDeFichas(['7', '3'], [CR])
  revisar('queda una sola', r.length === 1, r.map((x) => x.nombre).join(' · '))
  revisar('y es la primera', r[0]?.nombre === 'Modumex Costa Rica', r[0]?.nombre)
}

console.log('\n5 · un correo sin empresa, o con la segunda en blanco')
{
  revisar('sin ninguna, lista vacía', empresasDeFichas([null, undefined], [CR, MX]).length === 0)
  revisar('con una sola, un elemento', empresasDeFichas(['7', null], [CR, MX]).length === 1)
}

console.log(fallos ? `\n${fallos} caso(s) mal` : '\nTodo bien')
